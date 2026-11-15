import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { prisma as defaultPrisma } from '../../infra/db/client.js';
import { AppError } from '../../core/errors/app-error.js';
import { storage as defaultStorage, type StorageDriver } from '../../infra/storage/index.js';
import {
  isValidUuid,
  validateMediaQuota,
  validateFileSizeBytes,
  resolveAllowedMimeType,
  detectMagicBytes,
  MAX_IMAGES_PER_WORK,
  MAX_VIDEOS_PER_WORK,
  MAX_THUMBNAIL_SIZE_BYTES,
} from './media.validator.js';
import {
  parseAndUploadMultipartFiles,
  type MultipartRequestStream,
  type UploadedFileStreamResult,
} from './media.utils.js';
import type { AllowedMediaType } from '../../../shared/types.js';
import { invalidateMetricsCache } from '../../core/cache/metrics-cache.js';

export interface PresignFileInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  thumbSizeBytes?: number;
}

export interface ConfirmFileInput {
  key: string;
  mimeType: string;
  mediaType: AllowedMediaType;
  sizeBytes: number;
}

export class MediaService {
  constructor(
    private readonly db: PrismaClient = defaultPrisma,
    private readonly storageDriver: StorageDriver = defaultStorage,
  ) {}

  async uploadMedia(workId: string, reqStream: MultipartRequestStream) {
    if (!isValidUuid(workId)) {
      throw AppError.notFound('El trabajo solicitado no existe o el identificador es inválido.');
    }

    const work = await this.db.workItem.findUnique({
      where: { id: workId },
      select: { id: true },
    });

    if (!work) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const initialCounts = await this.db.mediaAsset.groupBy({
      by: ['mediaType'],
      where: { workItemId: workId },
      _count: { id: true },
    });

    const initialImageCount = initialCounts.find((c) => c.mediaType === 'image')?._count.id ?? 0;
    const initialVideoCount = initialCounts.find((c) => c.mediaType === 'video')?._count.id ?? 0;

    const uploadedFiles: UploadedFileStreamResult[] = await parseAndUploadMultipartFiles(
      reqStream,
      {
        workId,
        currentImageCount: initialImageCount,
        currentVideoCount: initialVideoCount,
        maxImagesLimit: MAX_IMAGES_PER_WORK,
        maxVideosLimit: MAX_VIDEOS_PER_WORK,
        storageDriver: this.storageDriver,
      },
    );

    if (uploadedFiles.length === 0) {
      throw AppError.badRequest(
        'No se recibieron archivos válidos en la solicitud (campo "files").',
      );
    }

    const incomingImages = uploadedFiles.filter((f) => f.mediaType === 'image').length;
    const incomingVideos = uploadedFiles.filter((f) => f.mediaType === 'video').length;

    try {
      const createdAssets = await this.db.$transaction(async (tx) => {
        const lockedWork = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "work_items" WHERE id = ${workId}::uuid FOR UPDATE
        `;
        if (lockedWork.length === 0) {
          throw AppError.notFound('El trabajo solicitado no existe.');
        }

        const currentStats = await tx.mediaAsset.groupBy({
          by: ['mediaType'],
          where: { workItemId: workId },
          _count: { id: true },
          _max: { sortOrder: true },
        });

        const currentImages = currentStats.find((c) => c.mediaType === 'image')?._count.id ?? 0;
        const currentVideos = currentStats.find((c) => c.mediaType === 'video')?._count.id ?? 0;

        validateMediaQuota(currentImages, currentVideos, incomingImages, incomingVideos);

        const maxSortOrder = currentStats.reduce(
          (max, item) =>
            item._max.sortOrder !== null && item._max.sortOrder > max ? item._max.sortOrder : max,
          -1,
        );

        let nextSortOrder = maxSortOrder + 1;
        const inserted = await tx.mediaAsset.createManyAndReturn({
          data: uploadedFiles.map((file) => ({
            workItemId: workId,
            filePath: file.key,
            mediaType: file.mediaType,
            mimeType: file.mimeType,
            fileSizeBytes: BigInt(file.sizeBytes),
            sortOrder: nextSortOrder++,
          })),
          select: {
            id: true,
            workItemId: true,
            filePath: true,
            mediaType: true,
            fileSizeBytes: true,
            sortOrder: true,
          },
        });

        return inserted;
      });

      invalidateMetricsCache();

      return {
        uploaded: createdAssets.map((asset) => {
          const thumbKey = asset.filePath.replace(/\.[^.]+$/, '-thumb.webp');
          return {
            id: asset.id,
            work_id: asset.workItemId,
            url: this.storageDriver.getUrl(asset.filePath),
            thumbnail_url:
              asset.mediaType === 'image' ? this.storageDriver.getUrl(thumbKey) : undefined,
            type: asset.mediaType,
            size_bytes: Number(asset.fileSizeBytes),
            sort_order: asset.sortOrder,
          };
        }),
      };
    } catch (error) {
      await Promise.allSettled(
        uploadedFiles.flatMap((file) => {
          if (file.mediaType === 'image') {
            const thumbKey = file.key.replace(/\.[^.]+$/, '-thumb.webp');
            return [
              this.storageDriver.deleteObject(file.key),
              this.storageDriver.deleteObject(thumbKey).catch(() => {}),
            ];
          }
          return [this.storageDriver.deleteObject(file.key)];
        }),
      );
      throw error;
    }
  }

  async presignMedia(workId: string, files: PresignFileInput[]) {
    if (!isValidUuid(workId)) {
      throw AppError.notFound('El trabajo solicitado no existe o el identificador es inválido.');
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw AppError.badRequest('Debe proporcionar al menos un archivo en la lista para presign.');
    }

    const work = await this.db.workItem.findUnique({
      where: { id: workId },
      select: { id: true },
    });

    if (!work) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    if (!this.storageDriver.createPresignedUploadUrl) {
      return {
        directUpload: false,
        uploads: [],
      };
    }

    const currentStats = await this.db.mediaAsset.groupBy({
      by: ['mediaType'],
      where: { workItemId: workId },
      _count: { id: true },
    });

    const currentImages = currentStats.find((c) => c.mediaType === 'image')?._count.id ?? 0;
    const currentVideos = currentStats.find((c) => c.mediaType === 'video')?._count.id ?? 0;

    let incomingImages = 0;
    let incomingVideos = 0;

    const validatedInputs = files.map((file) => {
      if (!file || typeof file !== 'object') {
        throw AppError.badRequest('Formato de descriptor de archivo inválido en presign.');
      }

      const filename =
        typeof file.filename === 'string' && file.filename.trim() ? file.filename.trim() : 'archivo';
      const resolvedMime = resolveAllowedMimeType(file.mimeType);

      if (!resolvedMime) {
        throw AppError.badRequest(
          `El tipo MIME "${String(file.mimeType)}" de "${filename}" no es válido. Formatos permitidos: JPG, PNG, WebP, MP4, WebM.`,
        );
      }

      validateFileSizeBytes(file.sizeBytes, resolvedMime.mediaType, filename);

      if (file.thumbSizeBytes !== undefined && file.thumbSizeBytes !== null) {
        if (
          !Number.isInteger(file.thumbSizeBytes) ||
          file.thumbSizeBytes <= 0 ||
          file.thumbSizeBytes > MAX_THUMBNAIL_SIZE_BYTES
        ) {
          throw AppError.badRequest(
            `El tamaño de miniatura para "${filename}" no es válido o excede 2 MB.`,
          );
        }
      }

      if (resolvedMime.mediaType === 'image') {
        incomingImages++;
      } else {
        incomingVideos++;
      }

      return {
        filename,
        mimeType: resolvedMime.mimeType,
        mediaType: resolvedMime.mediaType,
        sizeBytes: file.sizeBytes,
        thumbSizeBytes: file.thumbSizeBytes,
        extension: resolvedMime.extension,
      };
    });

    validateMediaQuota(currentImages, currentVideos, incomingImages, incomingVideos);

    const uploads = [];
    for (const input of validatedInputs) {
      const uuid = randomUUID();
      const key = `works/${workId}/${uuid}.${input.extension}`;
      const presigned = await this.storageDriver.createPresignedUploadUrl({
        key,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      });

      let thumbKey: string | undefined;
      let thumbUploadUrl: string | undefined;

      if (input.thumbSizeBytes && input.thumbSizeBytes > 0) {
        thumbKey = `works/${workId}/${uuid}-thumb.webp`;
        const presignedThumb = await this.storageDriver.createPresignedUploadUrl({
          key: thumbKey,
          mimeType: 'image/webp',
          sizeBytes: input.thumbSizeBytes,
        });
        thumbUploadUrl = presignedThumb.uploadUrl;
      }

      uploads.push({
        key: presigned.key,
        uploadUrl: presigned.uploadUrl,
        thumbKey,
        thumbUploadUrl,
        mimeType: input.mimeType,
        mediaType: input.mediaType,
        sizeBytes: input.sizeBytes,
        filename: input.filename,
      });
    }

    return {
      directUpload: true,
      uploads,
    };
  }

  async confirmMedia(workId: string, files: ConfirmFileInput[]) {
    if (!isValidUuid(workId)) {
      throw AppError.notFound('El trabajo solicitado no existe o el identificador es inválido.');
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw AppError.badRequest('Debe proporcionar al menos un archivo para confirmar.');
    }

    const work = await this.db.workItem.findUnique({
      where: { id: workId },
      select: { id: true },
    });

    if (!work) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const keyPattern = new RegExp(
      `^works/${workId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(jpg|png|webp|mp4|webm)$`,
      'i',
    );

    const seenKeys = new Set<string>();
    const validatedFiles: Array<{
      key: string;
      mimeType: string;
      mediaType: AllowedMediaType;
      sizeBytes: number;
    }> = [];

    const purgeCandidateKeys = async (keys: Iterable<string>) => {
      await Promise.allSettled(
        Array.from(keys).flatMap((key) => {
          const thumbKey = key.replace(/\.[^.]+$/, '-thumb.webp');
          return [
            this.storageDriver.deleteObject(key).catch(() => {}),
            this.storageDriver.deleteObject(thumbKey).catch(() => {}),
          ];
        }),
      );
    };

    try {
      for (const file of files) {
        if (!file || typeof file !== 'object' || typeof file.key !== 'string') {
          throw AppError.badRequest('Los datos de confirmación del archivo son inválidos.');
        }

        const normalizedKey = this.storageDriver.normalizeKey(file.key);
        const keyMatch = keyPattern.exec(normalizedKey);
        if (!keyMatch) {
          throw AppError.badRequest(
            `La clave de almacenamiento "${file.key}" no pertenece al trabajo solicitado o tiene un formato no autorizado.`,
          );
        }

        if (seenKeys.has(normalizedKey)) {
          throw AppError.badRequest(
            `La clave de almacenamiento "${normalizedKey}" está duplicada en la solicitud de confirmación.`,
          );
        }
        seenKeys.add(normalizedKey);

        const resolvedMime = resolveAllowedMimeType(file.mimeType);
        if (!resolvedMime || resolvedMime.mediaType !== file.mediaType) {
          throw AppError.badRequest(
            `El tipo MIME "${String(file.mimeType)}" o tipo de medio no es válido.`,
          );
        }

        if (keyMatch[1].toLowerCase() !== resolvedMime.extension) {
          throw AppError.badRequest(
            `La extensión de la clave "${normalizedKey}" no coincide con el tipo MIME "${resolvedMime.mimeType}".`,
          );
        }

        validateFileSizeBytes(file.sizeBytes, resolvedMime.mediaType, normalizedKey);

        const metadata = await this.storageDriver.headObject(normalizedKey);
        if (!metadata) {
          throw AppError.badRequest(
            `El archivo "${normalizedKey}" no existe en el almacenamiento físico.`,
          );
        }

        validateFileSizeBytes(metadata.sizeBytes, resolvedMime.mediaType, normalizedKey);

        validatedFiles.push({
          key: normalizedKey,
          mimeType: resolvedMime.mimeType,
          mediaType: resolvedMime.mediaType,
          sizeBytes: metadata.sizeBytes,
        });
      }

      const incomingImages = validatedFiles.filter((f) => f.mediaType === 'image').length;
      const incomingVideos = validatedFiles.filter((f) => f.mediaType === 'video').length;

      const createdAssets = await this.db.$transaction(async (tx) => {
        const lockedWork = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "work_items" WHERE id = ${workId}::uuid FOR UPDATE
        `;
        if (lockedWork.length === 0) {
          throw AppError.notFound('El trabajo solicitado no existe.');
        }

        const existingAssets = await tx.mediaAsset.findMany({
          where: {
            filePath: { in: Array.from(seenKeys) },
          },
          select: { filePath: true },
        });

        if (existingAssets.length > 0) {
          for (const existing of existingAssets) {
            seenKeys.delete(existing.filePath);
          }
          throw AppError.badRequest(
            `El archivo "${existingAssets[0].filePath}" ya fue confirmado previamente.`,
          );
        }

        const currentStats = await tx.mediaAsset.groupBy({
          by: ['mediaType'],
          where: { workItemId: workId },
          _count: { id: true },
          _max: { sortOrder: true },
        });

        const currentImages = currentStats.find((c) => c.mediaType === 'image')?._count.id ?? 0;
        const currentVideos = currentStats.find((c) => c.mediaType === 'video')?._count.id ?? 0;

        validateMediaQuota(currentImages, currentVideos, incomingImages, incomingVideos);

        const maxSortOrder = currentStats.reduce(
          (max, item) =>
            item._max.sortOrder !== null && item._max.sortOrder > max ? item._max.sortOrder : max,
          -1,
        );

        let nextSortOrder = maxSortOrder + 1;
        const inserted = await tx.mediaAsset.createManyAndReturn({
          data: validatedFiles.map((file) => ({
            workItemId: workId,
            filePath: file.key,
            mediaType: file.mediaType,
            mimeType: file.mimeType,
            fileSizeBytes: BigInt(file.sizeBytes),
            sortOrder: nextSortOrder++,
          })),
          select: {
            id: true,
            workItemId: true,
            filePath: true,
            mediaType: true,
            fileSizeBytes: true,
            sortOrder: true,
          },
        });

        return inserted;
      });

      invalidateMetricsCache();

      return {
        uploaded: createdAssets.map((asset) => {
          const thumbKey = asset.filePath.replace(/\.[^.]+$/, '-thumb.webp');
          return {
            id: asset.id,
            work_id: asset.workItemId,
            url: this.storageDriver.getUrl(asset.filePath),
            thumbnail_url:
              asset.mediaType === 'image' ? this.storageDriver.getUrl(thumbKey) : undefined,
            type: asset.mediaType,
            size_bytes: Number(asset.fileSizeBytes),
            sort_order: asset.sortOrder,
          };
        }),
      };
    } catch (error) {
      if (seenKeys.size > 0) {
        await purgeCandidateKeys(seenKeys);
      }
      throw error;
    }
  }

  async deleteMedia(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El recurso multimedia solicitado no existe.');
    }

    const asset = await this.db.mediaAsset.findUnique({
      where: { id },
      select: {
        id: true,
        filePath: true,
        mediaType: true,
      },
    });

    if (!asset) {
      throw AppError.notFound('El recurso multimedia solicitado no existe.');
    }

    try {
      await this.db.mediaAsset.delete({
        where: { id },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw AppError.notFound('El recurso multimedia solicitado no existe.');
      }
      throw error;
    }

    invalidateMetricsCache();

    try {
      await this.storageDriver.deleteObject(asset.filePath);
      const thumbKey = asset.filePath.replace(/\.[^.]+$/, '-thumb.webp');
      await this.storageDriver.deleteObject(thumbKey).catch(() => {});
    } catch (error) {
      console.warn(`Advertencia al purgar archivo físico en storage: ${asset.filePath}`, error);
    }
  }

  async uploadThumbnail(
    id: string,
    buffer: Buffer,
  ): Promise<{ thumbnail_url: string }> {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El recurso multimedia solicitado no existe.');
    }

    const detected = detectMagicBytes(buffer);
    if (!detected || detected.mediaType !== 'image') {
      throw AppError.badRequest(
        'La miniatura proporcionada no es una imagen válida (JPG, PNG o WebP).',
      );
    }

    const asset = await this.db.mediaAsset.findUnique({
      where: { id },
      select: {
        id: true,
        filePath: true,
      },
    });

    if (!asset) {
      throw AppError.notFound('El recurso multimedia solicitado no existe.');
    }

    let optimizedThumb: Buffer;
    try {
      optimizedThumb = await sharp(buffer)
        .rotate()
        .resize({ width: 480, height: 270, fit: 'cover' })
        .webp({ quality: 75 })
        .toBuffer();
    } catch (err) {
      throw AppError.badRequest(
        `No fue posible procesar la imagen de miniatura: ${(err as Error).message}`,
      );
    }

    const thumbKey = asset.filePath.replace(/\.[^.]+$/, '-thumb.webp');
    await this.storageDriver.putObject({
      key: thumbKey,
      body: optimizedThumb,
      mimeType: 'image/webp',
    });

    return {
      thumbnail_url: this.storageDriver.getUrl(thumbKey),
    };
  }
}

export const mediaService = new MediaService();
