import type { IncomingHttpHeaders } from 'node:http';
import busboy from 'busboy';
import { Transform, type Readable, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { AppError } from '../errors/app-error.js';
import {
  detectMagicBytes,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  type DetectedMediaType,
} from '../validators/media.validator.js';
import { storage, type StorageDriver, type PutObjectResult } from '../storage/index.js';

export interface UploadedFileStreamResult {
  key: string;
  url: string;
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
}

interface QuotaReservationCallbacks {
  isAborted: () => boolean;
  reserveSlot: (mediaType: 'image' | 'video') => void;
  onStorageInitialized: (key: string, uploadPromise: Promise<PutObjectResult>) => void;
}

class MediaValidationTransform extends Transform {
  public totalBytes = 0;
  public detected: DetectedMediaType | null = null;
  public storageKey = '';
  public storagePromise: Promise<PutObjectResult> | null = null;

  private headerBuffer: Buffer = Buffer.alloc(0);
  private maxSizeBytes: number = MAX_VIDEO_SIZE_BYTES;

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

      this.storageKey = `works/${this.workId}/${randomUUID()}.${detectedType.extension}`;
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

    if (this.totalBytes > this.maxSizeBytes) {
      const mb = Math.round(this.maxSizeBytes / (1024 * 1024));
      callback(
        AppError.payloadTooLarge(
          `El archivo "${this.filename}" excede el tamaño máximo permitido de ${mb} MB (RNF-STOR-01).`,
        ),
      );
      return;
    }

    this.push(chunk);
    callback();
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
    callback();
  }
}

export function parseAndUploadMultipartFiles(
  req: MultipartRequestStream,
  options: MultipartUploadOptions,
): Promise<UploadedFileStreamResult[]> {
  const storageDriver = options.storageDriver ?? storage;

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
      bb = busboy({ headers: req.headers });
    } catch (err) {
      return reject(
        AppError.badRequest(
          'Error al inicializar el procesador multipart: ' + (err as Error).message,
        ),
      );
    }

    const uploadedResults: UploadedFileStreamResult[] = [];
    const activeKeys = new Set<string>();
    const abortController = new AbortController();
    const filePromises: Promise<void>[] = [];

    let imageCount = options.currentImageCount;
    let videoCount = options.currentVideoCount;
    let hasEncounteredError = false;

    const rollbackAndReject = async (error: Error) => {
      if (hasEncounteredError) return;
      hasEncounteredError = true;
      abortController.abort();

      try {
        req.unpipe(bb);
      } catch {
        // Ignorar si ya fue desacoplado
      }
      req.resume();

      const keysToPurge = new Set<string>([...uploadedResults.map((r) => r.key), ...activeKeys]);

      if (keysToPurge.size > 0) {
        await Promise.allSettled(
          Array.from(keysToPurge).map((key) => storageDriver.deleteObject(key)),
        );
      }

      reject(error);
    };

    bb.on('file', (_fieldName: string, fileStream: Readable, info: busboy.FileInfo) => {
      if (hasEncounteredError) {
        fileStream.resume();
        return;
      }

      const filename = info.filename || 'archivo-multimedia';

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
          onStorageInitialized: (key) => {
            activeKeys.add(key);
          },
        },
      );

      const fileTask = (async () => {
        try {
          await pipeline(fileStream, validatorTransform);
          if (validatorTransform.storagePromise && validatorTransform.detected) {
            const stored = await validatorTransform.storagePromise;
            activeKeys.delete(validatorTransform.storageKey);
            uploadedResults.push({
              key: stored.key,
              url: stored.url,
              mimeType: validatorTransform.detected.mimeType,
              mediaType: validatorTransform.detected.mediaType,
              sizeBytes: validatorTransform.totalBytes,
            });
          }
        } catch (err) {
          fileStream.resume();
          if (validatorTransform.storagePromise) {
            await validatorTransform.storagePromise.catch(() => {});
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
        if (!hasEncounteredError) {
          resolve(uploadedResults);
        }
      } catch (err) {
        await rollbackAndReject(err as Error);
      }
    });

    req.pipe(bb);
  });
}
