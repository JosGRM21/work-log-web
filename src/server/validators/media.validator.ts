import { Buffer } from 'node:buffer';
import { AppError } from '../errors/app-error.js';

export const MAX_IMAGE_SIZE_BYTES = Number(process.env.MAX_IMAGE_SIZE_BYTES) || 10485760; // 10 MB (RNF-STOR-01)
export const MAX_VIDEO_SIZE_BYTES = Number(process.env.MAX_VIDEO_SIZE_BYTES) || 157286400; // 150 MB (RNF-STOR-01)

export const MAX_IMAGES_PER_WORK = 20; // RN-03
export const MAX_VIDEOS_PER_WORK = 4; // RN-03

export type AllowedMediaType = 'image' | 'video';

export interface DetectedMediaType {
  mimeType: string;
  mediaType: AllowedMediaType;
  extension: string;
}

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_V4_REGEX.test(id);
}

/**
 * Inspecciona los primeros bytes del búfer binario para determinar el tipo MIME real.
 * Previene la ejecución de archivos maliciosos camuflados mediante extensiones (RNF-SEC-03).
 */
export function detectMagicBytes(buffer: Buffer): DetectedMediaType | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // 1. JPEG: Comienza con FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', mediaType: 'image', extension: 'jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', mediaType: 'image', extension: 'png' };
  }

  // 3. WebP: Bytes 0-3 son "RIFF" y bytes 8-11 son "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimeType: 'image/webp', mediaType: 'image', extension: 'webp' };
  }

  // 4. WebM (EBML Container): 1A 45 DF A3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { mimeType: 'video/webm', mediaType: 'video', extension: 'webm' };
  }

  // 5. MP4 (ISO Base Media File): Offset 4-7 contiene "ftyp" (66 74 79 70)
  if (
    buffer.length >= 8 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return { mimeType: 'video/mp4', mediaType: 'video', extension: 'mp4' };
  }

  return null;
}

/**
 * Valida la consistencia de cuotas cuantitativas por trabajo (RN-03).
 */
export function validateMediaQuota(
  currentImages: number,
  currentVideos: number,
  newImages: number,
  newVideos: number,
): void {
  if (currentImages + newImages > MAX_IMAGES_PER_WORK) {
    throw AppError.badRequest(
      `Límite de cuota excedido (RN-03): El trabajo no puede tener más de ${MAX_IMAGES_PER_WORK} imágenes (actuales: ${currentImages}, entrantes: ${newImages}).`,
    );
  }

  if (currentVideos + newVideos > MAX_VIDEOS_PER_WORK) {
    throw AppError.badRequest(
      `Límite de cuota excedido (RN-03): El trabajo no puede tener más de ${MAX_VIDEOS_PER_WORK} videos (actuales: ${currentVideos}, entrantes: ${newVideos}).`,
    );
  }
}

/**
 * Valida el límite de peso en bytes según la categoría del archivo (RNF-STOR-01).
 */
export function validateFileSizeBytes(
  sizeBytes: number,
  mediaType: AllowedMediaType,
  filename = 'archivo',
): void {
  const maxBytes = mediaType === 'image' ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
  if (sizeBytes > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw AppError.payloadTooLarge(
      `El archivo "${filename}" excede el límite máximo de ${limitMb} MB permitido para ${mediaType === 'image' ? 'imágenes' : 'videos'} (RNF-STOR-01).`,
    );
  }
}
