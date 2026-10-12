import type { Request } from 'express';
import busboy from 'busboy';
import { PassThrough, Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { AppError } from '../errors/app-error.js';
import {
    detectMagicBytes,
    MAX_IMAGE_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
    type DetectedMediaType,
} from '../validators/media.validator.js';
import { storage } from '../storage/index.js';

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
}

export function parseAndUploadMultipartFiles(
    req: Request,
    options: MultipartUploadOptions,
): Promise<UploadedFileStreamResult[]> {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'];
        if (
            !contentType ||
            !contentType.toLowerCase().includes('multipart/form-data')
        ) {
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
                    'Error al inicializar el procesador multipart: ' +
                    (err as Error).message,
                ),
            );
        }

        const uploadedResults: UploadedFileStreamResult[] = [];
        const filePromises: Promise<void>[] = [];
        let imageCount = options.currentImageCount;
        let videoCount = options.currentVideoCount;
        let hasEncounteredError = false;

        const abortAll = (error: Error) => {
            if (hasEncounteredError) return;
            hasEncounteredError = true;
            try {
                req.unpipe(bb);
            } catch {
                // Ignorar si ya fue desasociado
            }
            req.resume(); // Drenar el stream HTTP entrante
            reject(error);
        };

        bb.on(
            'file',
            (_fieldName: string, fileStream: Readable, info: busboy.FileInfo) => {
                if (hasEncounteredError) {
                    fileStream.resume();
                    return;
                }

                const filename = info.filename || 'archivo-multimedia';
                const filePromise = new Promise<void>((resolveFile, rejectFile) => {
                    let totalBytes = 0;
                    let headerBuffer = Buffer.alloc(0);
                    let detected: DetectedMediaType | null = null;
                    let maxSizeBytes = MAX_IMAGE_SIZE_BYTES;
                    let storageKey = '';
                    let storagePromise: Promise<{
                        key: string;
                        url: string;
                        sizeBytes: number;
                    }> | null = null;
                    let passThrough: PassThrough | null = null;
                    let fileAborted = false;

                    const abortFile = (err: Error) => {
                        if (fileAborted) return;
                        fileAborted = true;
                        fileStream.resume();
                        if (passThrough) {
                            passThrough.destroy(err);
                        }
                        rejectFile(err);
                    };

                    fileStream.on('data', (chunk: Buffer) => {
                        if (fileAborted || hasEncounteredError) return;
                        totalBytes += chunk.length;

                        // 1. Identificar cabecera real (magic bytes) en los primeros bytes
                        if (!detected) {
                            headerBuffer = Buffer.concat([headerBuffer, chunk]);
                            if (headerBuffer.length >= 12) {
                                detected = detectMagicBytes(headerBuffer);
                                if (!detected) {
                                    return abortFile(
                                        AppError.badRequest(
                                            `El archivo "${filename}" tiene un formato o cabecera binaria no permitida (RNF-SEC-03). Formatos válidos: JPG, PNG, WebP, MP4, WebM.`,
                                        ),
                                    );
                                }

                                // 2. Comprobar cuotas cuantitativas (RN-03)
                                if (detected.mediaType === 'image') {
                                    if (imageCount >= options.maxImagesLimit) {
                                        return abortFile(
                                            AppError.badRequest(
                                                `Se excedería el límite de ${options.maxImagesLimit} fotos permitidas por trabajo (RN-03).`,
                                            ),
                                        );
                                    }
                                    imageCount++;
                                    maxSizeBytes = MAX_IMAGE_SIZE_BYTES;
                                } else {
                                    if (videoCount >= options.maxVideosLimit) {
                                        return abortFile(
                                            AppError.badRequest(
                                                `Se excedería el límite de ${options.maxVideosLimit} videos permitidos por trabajo (RN-03).`,
                                            ),
                                        );
                                    }
                                    videoCount++;
                                    maxSizeBytes = MAX_VIDEO_SIZE_BYTES;
                                }

                                // Clave estructurada en almacenamiento
                                storageKey = `works/${options.workId}/${randomUUID()}.${detected.extension}`;

                                // Instanciar PassThrough con listener de error para evitar excepciones no controladas
                                passThrough = new PassThrough();
                                passThrough.on('error', () => {
                                    // Previene eventos de error huérfanos al abortar el pipeline
                                });

                                // Iniciar persistencia directa por streaming en el StorageDriver
                                storagePromise = storage.putObject({
                                    key: storageKey,
                                    body: passThrough,
                                    mimeType: detected.mimeType,
                                });

                                // Emitir el búfer inicial de cabecera ya acumulado
                                passThrough.write(headerBuffer);
                            }
                        } else if (passThrough) {
                            passThrough.write(chunk);
                        }

                        // 3. Comprobar límites de peso en tiempo de transmisión (RNF-STOR-01)
                        if (totalBytes > maxSizeBytes) {
                            const mb = Math.round(maxSizeBytes / (1024 * 1024));
                            return abortFile(
                                AppError.payloadTooLarge(
                                    `El archivo "${filename}" excede el tamaño máximo permitido de ${mb} MB (RNF-STOR-01).`,
                                ),
                            );
                        }
                    });

                    fileStream.on('end', async () => {
                        if (fileAborted || hasEncounteredError) return;

                        if (!detected || !passThrough) {
                            return abortFile(
                                AppError.badRequest(
                                    `El archivo "${filename}" está vacío o contiene una cabecera binaria incompleta.`,
                                ),
                            );
                        }

                        passThrough.end();

                        try {
                            const result = await storagePromise;
                            if (result) {
                                uploadedResults.push({
                                    key: result.key,
                                    url: result.url,
                                    mimeType: detected.mimeType,
                                    mediaType: detected.mediaType,
                                    sizeBytes: totalBytes,
                                });
                            }
                            resolveFile();
                        } catch (err) {
                            abortFile(err as Error);
                        }
                    });

                    fileStream.on('error', (err) => {
                        abortFile(err);
                    });
                });

                // Registrar el promise del archivo capturando el error sin re-lanzarlo
                filePromises.push(
                    filePromise.catch((err) => {
                        abortAll(err);
                    }),
                );
            },
        );

        bb.on('error', (err: Error) => {
            abortAll(err);
        });

        bb.on('close', async () => {
            if (hasEncounteredError) return;

            try {
                await Promise.all(filePromises);
                resolve(uploadedResults);
            } catch (err) {
                abortAll(err as Error);
            }
        });

        req.pipe(bb);
    });
}