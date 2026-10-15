import { Buffer } from 'node:buffer';
import { AppError } from '../errors/app-error.js';
import { isValidUuid, type AllowedMediaType } from '../../shared/types.js';

export { isValidUuid, type AllowedMediaType };

export const MAX_IMAGE_SIZE_BYTES = Number(process.env.MAX_IMAGE_SIZE_BYTES) || 10485760; // 10 MB (RNF-STOR-01)
export const MAX_VIDEO_SIZE_BYTES = Number(process.env.MAX_VIDEO_SIZE_BYTES) || 157286400; // 150 MB (RNF-STOR-01)

export const MAX_IMAGES_PER_WORK = 20; // RN-03
export const MAX_VIDEOS_PER_WORK = 4; // RN-03

export interface DetectedMediaType {
  mimeType: string;
  mediaType: AllowedMediaType;
  extension: string;
}

export function detectMagicBytes(buffer: Buffer): DetectedMediaType | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // 1. JPEG: FF D8 FF
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

  // 3. WebP: "RIFF" (0-3) y "WEBP" (8-11)
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

  // 4. WebM (EBML): 1A 45 DF A3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { mimeType: 'video/webm', mediaType: 'video', extension: 'webm' };
  }

  // 5. MP4 (ISO Base Media File): Offset 4-7 "ftyp" (66 74 79 70)
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
