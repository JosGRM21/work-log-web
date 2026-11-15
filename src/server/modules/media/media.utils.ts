import type { IncomingHttpHeaders } from 'node:http';
import busboy from 'busboy';
import sharp, { type Sharp } from 'sharp';
import { Transform, PassThrough, type Readable, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { AppError } from '../../core/errors/app-error.js';
import {
  detectMagicBytes,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  type DetectedMediaType,
} from './media.validator.js';
import { storage, type StorageDriver, type PutObjectResult } from '../../infra/storage/index.js';

sharp.cache(false);
sharp.concurrency(2);

export interface UploadedFileStreamResult {
  key: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  mediaType: 'image' | 'video';
  sizeBytes: number;
}

export interface MultipartUploadOptions {
  workId: string;
  currentImageCount: number;
  currentVideoCount: number;
  maxImagesLimit: number;
  maxVideosLimit: number;
  storageDriver?: StorageDriver;
}

export interface MultipartRequestStream extends Readable {
  headers: IncomingHttpHeaders;
  complete?: boolean;
}

interface QuotaReservationCallbacks {
  isAborted: () => boolean;
  reserveSlot: (mediaType: 'image' | 'video') => void;
  onStorageInitialized: (key: string, uploadPromise: Promise<PutObjectResult>) => void;
}

async function writeWithBackpressure(stream: PassThrough, chunk: Buffer): Promise<void> {
  if (stream.destroyed || stream.writableEnded) {
    throw new Error('Stream de procesamiento cerrado prematuramente.');
  }
  if (!stream.write(chunk)) {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        stream.off('drain', onDrain);
        stream.off('error', onError);
        stream.off('close', onClose);
      };
      const onDrain = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const onClose = () => {
        cleanup();
        reject(new Error('Stream de procesamiento cerrado antes de drenar.'));
      };
      stream.once('drain', onDrain);
      stream.once('error', onError);
      stream.once('close', onClose);
    });
  }
}

class MediaValidationTransform extends Transform {
  public totalBytes = 0;
  public detected: DetectedMediaType | null = null;
  public storageKey = '';
  public thumbKey: string | null = null;
  public storagePromise: Promise<PutObjectResult> | null = null;
  public thumbStoragePromise: Promise<PutObjectResult> | null = null;

  private headerBuffer: Buffer = Buffer.alloc(0);
  private maxSizeBytes: number = MAX_VIDEO_SIZE_BYTES;
  private mainInput: PassThrough | null = null;
  private thumbInput: PassThrough | null = null;
  private mainSharpInstance: Sharp | null = null;
  private thumbSharpInstance: Sharp | null = null;

  constructor(
    private readonly filename: string,
    private readonly workId: string,
    private readonly storageDriver: StorageDriver,
    private readonly abortSignal: AbortSignal,
    private readonly callbacks: QuotaReservationCallbacks,
  ) {
    super();
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.callbacks.isAborted()) {
      callback(new Error('Upload aborted'));
      return;
    }

    this.totalBytes += chunk.length;

    if (!this.detected) {
      this.headerBuffer = Buffer.concat([this.headerBuffer, chunk]);

      if (this.headerBuffer.length < 12) {
        callback();
        return;
      }

      const detectedType = detectMagicBytes(this.headerBuffer);
      if (!detectedType) {
        callback(
          AppError.badRequest(
            `El archivo "${this.filename}" tiene un formato o cabecera binaria no permitida (RNF-SEC-03). Formatos válidos: JPG, PNG, WebP, MP4, WebM.`,
          ),
        );
        return;
      }

      try {
        this.callbacks.reserveSlot(detectedType.mediaType);
      } catch (err) {
        callback(err as Error);
        return;
      }

      this.detected = detectedType;
      this.maxSizeBytes =
        detectedType.mediaType === 'image' ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;

      if (this.totalBytes > this.maxSizeBytes) {
        const mb = Math.round(this.maxSizeBytes / (1024 * 1024));
        callback(
          AppError.payloadTooLarge(
            `El archivo "${this.filename}" excede el tamaño máximo permitido de ${mb} MB (RNF-STOR-01).`,
          ),
        );
        return;
      }

      const assetUuid = randomUUID();

      if (detectedType.mediaType === 'image') {
        this.storageKey = `works/${this.workId}/${assetUuid}.webp`;
        this.thumbKey = `works/${this.workId}/${assetUuid}-thumb.webp`;

        this.mainInput = new PassThrough();
        this.thumbInput = new PassThrough();
        this.mainInput.on('error', () => {});
        this.thumbInput.on('error', () => {});

        this.mainSharpInstance = sharp()
          .rotate()
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80, effort: 4, smartSubsample: true });

        this.thumbSharpInstance = sharp()
          .rotate()
          .resize({ width: 480, height: 270, fit: 'cover' })
          .webp({ quality: 75 });

        this.mainSharpInstance.on('error', (err: Error) => {
          this.destroy(
            AppError.badRequest(`Error al procesar la imagen "${this.filename}": ${err.message}`),
          );
        });

        this.thumbSharpInstance.on('error', (err: Error) => {
          this.destroy(
            AppError.badRequest(
              `Error al generar la miniatura de "${this.filename}": ${err.message}`,
            ),
          );
        });

        this.mainInput.pipe(this.mainSharpInstance);
        this.thumbInput.pipe(this.thumbSharpInstance);

        this.storagePromise = this.storageDriver.putObject({
          key: this.storageKey,
          body: this.mainSharpInstance,
          mimeType: 'image/webp',
          signal: this.abortSignal,
        });

        this.thumbStoragePromise = this.storageDriver.putObject({
          key: this.thumbKey,
          body: this.thumbSharpInstance,
          mimeType: 'image/webp',
          signal: this.abortSignal,
        });

        this.callbacks.onStorageInitialized(this.storageKey, this.storagePromise);
        this.callbacks.onStorageInitialized(this.thumbKey, this.thumbStoragePromise);

        const initialChunk = this.headerBuffer;
        Promise.all([
          writeWithBackpressure(this.mainInput, initialChunk),
          writeWithBackpressure(this.thumbInput, initialChunk),
        ])
          .then(() => callback())
          .catch((err) => callback(err as Error));
        return;
      } else {
        this.storageKey = `works/${this.workId}/${assetUuid}.${detectedType.extension}`;
        this.storagePromise = this.storageDriver.putObject({
          key: this.storageKey,
          body: this,
          mimeType: detectedType.mimeType,
          signal: this.abortSignal,
        });

        this.callbacks.onStorageInitialized(this.storageKey, this.storagePromise);
        this.push(this.headerBuffer);
        callback();
        return;
      }
    }

    if (this.totalBytes > this.maxSizeBytes) {
      const mb = Math.round(this.maxSizeBytes / (1024 * 1024));
      callback(
        AppError.payloadTooLarge(
          `El archivo "${this.filename}" excede el tamaño máximo permitido de ${mb} MB (RNF-STOR-01).`,
        ),
      );
      return;
    }

    if (this.mainInput && this.thumbInput) {
      Promise.all([
        writeWithBackpressure(this.mainInput, chunk),
        writeWithBackpressure(this.thumbInput, chunk),
      ])
        .then(() => callback())
        .catch((err) => callback(err as Error));
    } else {
      this.push(chunk);
      callback();
    }
  }

  override _flush(callback: TransformCallback): void {
    if (!this.detected) {
      callback(
        AppError.badRequest(
          `El archivo "${this.filename}" está vacío o contiene una cabecera binaria incompleta.`,
        ),
      );
      return;
    }

    if (this.mainInput && this.thumbInput) {
      this.mainInput.end();
      this.thumbInput.end();
    }
    callback();
  }

  override _destroy(error: Error | null, callback: (error: Error | null) => void): void {
    if (error) {
      if (this.mainInput) {
        this.mainInput.destroy(error);
      }
      if (this.thumbInput) {
        this.thumbInput.destroy(error);
      }
      if (this.mainSharpInstance) {
        this.mainSharpInstance.destroy(error);
      }
      if (this.thumbSharpInstance) {
        this.thumbSharpInstance.destroy(error);
      }
    }
    callback(error);
  }
}

export function parseAndUploadMultipartFiles(
  req: MultipartRequestStream,
  options: MultipartUploadOptions,
): Promise<UploadedFileStreamResult[]> {
  const storageDriver = options.storageDriver ?? storage;
  const maxAllowedFiles = options.maxImagesLimit + options.maxVideosLimit;

  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.toLowerCase().includes('multipart/form-data')) {
      return reject(
        AppError.badRequest(
          'La solicitud debe incluir la cabecera Content-Type: multipart/form-data.',
        ),
      );
    }

    let bb: busboy.Busboy;
    try {
      bb = busboy({
        headers: req.headers,
        limits: {
          files: maxAllowedFiles,
          fields: 10,
          parts: maxAllowedFiles + 10,
        },
      });
    } catch (err) {
      return reject(
        AppError.badRequest(
          'Error al inicializar el procesador multipart: ' + (err as Error).message,
        ),
      );
    }

    const uploadedResults: Array<{ index: number; result: UploadedFileStreamResult }> = [];
    const activeUploads = new Map<string, Promise<PutObjectResult>>();
    const abortController = new AbortController();
    const filePromises: Promise<void>[] = [];

    let fileSequence = 0;
    let imageCount = options.currentImageCount;
    let videoCount = options.currentVideoCount;
    let hasEncounteredError = false;
    let isMultipartDone = false;

    const cleanupReqListeners = () => {
      req.off('aborted', onClientAbort);
      req.off('close', onReqClose);
    };

    const rollbackAndReject = async (error: Error) => {
      if (hasEncounteredError) return;
      hasEncounteredError = true;
      cleanupReqListeners();
      abortController.abort();

      try {
        req.unpipe(bb);
      } catch {
        // Ignorar si ya fue desacoplado
      }
      req.resume();

      // Esperar a que las promesas de escritura en curso finalicen o aborten antes de borrar en storage
      if (activeUploads.size > 0) {
        await Promise.allSettled(Array.from(activeUploads.values()));
      }

      const keysToPurge = new Set<string>();
      for (const { result: r } of uploadedResults) {
        keysToPurge.add(r.key);
        if (r.mediaType === 'image') {
          keysToPurge.add(r.key.replace(/\.[^.]+$/, '-thumb.webp'));
        }
      }
      for (const key of activeUploads.keys()) {
        keysToPurge.add(key);
      }

      if (keysToPurge.size > 0) {
        await Promise.allSettled(
          Array.from(keysToPurge).map((key) => storageDriver.deleteObject(key)),
        );
      }

      reject(error);
    };

    const onClientAbort = () => {
      if (!isMultipartDone && !hasEncounteredError) {
        void rollbackAndReject(
          AppError.badRequest('La conexión fue cerrada antes de completar la subida.'),
        );
      }
    };

    const onReqClose = () => {
      if (req.complete === false) {
        onClientAbort();
      }
    };

    req.once('aborted', onClientAbort);
    req.once('close', onReqClose);

    bb.on('filesLimit', () => {
      void rollbackAndReject(
        AppError.badRequest(
          `Se excedió el límite máximo de archivos permitidos en una sola solicitud (${maxAllowedFiles}).`,
        ),
      );
    });

    bb.on('partsLimit', () => {
      void rollbackAndReject(
        AppError.badRequest('Demasiadas partes en la solicitud multipart.'),
      );
    });

    bb.on('file', (fieldName: string, fileStream: Readable, info: busboy.FileInfo) => {
      if (hasEncounteredError) {
        fileStream.resume();
        return;
      }

      if (fieldName !== 'files') {
        fileStream.resume();
        void rollbackAndReject(
          AppError.badRequest(
            `Nombre de campo multipart no permitido ("${fieldName}"). Utilice el campo "files".`,
          ),
        );
        return;
      }

      const filename = info.filename || 'archivo-multimedia';
      const currentFileIndex = fileSequence++;

      const validatorTransform = new MediaValidationTransform(
        filename,
        options.workId,
        storageDriver,
        abortController.signal,
        {
          isAborted: () => hasEncounteredError,
          reserveSlot: (mediaType) => {
            if (mediaType === 'image') {
              if (imageCount >= options.maxImagesLimit) {
                throw AppError.badRequest(
                  `Se excedería el límite de ${options.maxImagesLimit} fotos permitidas por trabajo (RN-03).`,
                );
              }
              imageCount++;
            } else {
              if (videoCount >= options.maxVideosLimit) {
                throw AppError.badRequest(
                  `Se excedería el límite de ${options.maxVideosLimit} videos permitidos por trabajo (RN-03).`,
                );
              }
              videoCount++;
            }
          },
          onStorageInitialized: (key, uploadPromise) => {
            activeUploads.set(key, uploadPromise);
          },
        },
      );

      const fileTask = (async () => {
        try {
          await pipeline(fileStream, validatorTransform);
          if (validatorTransform.storagePromise && validatorTransform.detected) {
            const [storedMain, storedThumb] = await Promise.all([
              validatorTransform.storagePromise,
              validatorTransform.thumbStoragePromise ?? Promise.resolve(null),
            ]);
            activeUploads.delete(validatorTransform.storageKey);
            if (validatorTransform.thumbKey) {
              activeUploads.delete(validatorTransform.thumbKey);
            }
            uploadedResults.push({
              index: currentFileIndex,
              result: {
                key: storedMain.key,
                url: storedMain.url,
                thumbnailUrl: storedThumb?.url,
                mimeType: validatorTransform.thumbKey
                  ? 'image/webp'
                  : validatorTransform.detected.mimeType,
                mediaType: validatorTransform.detected.mediaType,
                sizeBytes: storedMain.sizeBytes,
              },
            });
          }
        } catch (err) {
          fileStream.resume();
          if (validatorTransform.storagePromise) {
            await validatorTransform.storagePromise.catch(() => {});
          }
          if (validatorTransform.thumbStoragePromise) {
            await validatorTransform.thumbStoragePromise.catch(() => {});
          }
          throw err;
        }
      })();

      filePromises.push(
        fileTask.catch((err) => {
          return rollbackAndReject(err as Error);
        }),
      );
    });

    bb.on('error', (err: Error) => {
      void rollbackAndReject(err);
    });

    bb.on('close', async () => {
      try {
        await Promise.all(filePromises);
        isMultipartDone = true;
        cleanupReqListeners();
        if (!hasEncounteredError) {
          const orderedResults = uploadedResults
            .sort((a, b) => a.index - b.index)
            .map((item) => item.result);
          resolve(orderedResults);
        }
      } catch (err) {
        await rollbackAndReject(err as Error);
      }
    });

    req.pipe(bb);
  });
}
