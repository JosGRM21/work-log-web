import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma as defaultPrisma } from '../../infra/db/client.js';
import { AppError } from '../../core/errors/app-error.js';
import { storage as defaultStorage, type StorageDriver } from '../../infra/storage/index.js';
import {
  isValidUuid,
  validateMediaQuota,
  validateFileSizeBytes,
  MAX_IMAGES_PER_WORK,
  MAX_VIDEOS_PER_WORK,
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
            thumbnail_url: this.storageDriver.getUrl(thumbKey),
            type: asset.mediaType,
            size_bytes: Number(asset.fileSizeBytes),
            sort_order: asset.sortOrder,
          };
        }),
      };
    } catch (error) {
      await Promise.allSettled(
        uploadedFiles.flatMap((file) => {
          const thumbKey = file.key.replace(/\.[^.]+$/, '-thumb.webp');
          return [
            this.storageDriver.deleteObject(file.key),
            this.storageDriver.deleteObject(thumbKey).catch(() => {}),
          ];
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
      const mime = (file.mimeType || '').toLowerCase();
      const isImg = mime.startsWith('image/');
      const isVid = mime.startsWith('video/');

      if (!isImg && !isVid) {
        throw AppError.badRequest(
          `El tipo MIME "${file.mimeType}" de "${file.filename}" no es válido. Formatos permitidos: imágenes y videos.`,
        );
      }

      const mediaType: AllowedMediaType = isImg ? 'image' : 'video';
      validateFileSizeBytes(file.sizeBytes, mediaType, file.filename);

      if (mediaType === 'image') {
        incomingImages++;
      } else {
        incomingVideos++;
      }

      let ext = isImg ? 'jpg' : 'mp4';
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('webm')) ext = 'webm';

      return {
        filename: file.filename,
        mimeType: file.mimeType,
        mediaType,
        sizeBytes: file.sizeBytes,
        thumbSizeBytes: file.thumbSizeBytes,
        extension: ext,
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
        maxSizeBytes: input.sizeBytes,
      });

      // Generar URL prefirmada para miniatura WebP (tanto para imágenes como para videos)
      const thumbKey = `works/${workId}/${uuid}-thumb.webp`;
      const presignedThumb = await this.storageDriver.createPresignedUploadUrl({
        key: thumbKey,
        mimeType: 'image/webp',
        maxSizeBytes: input.thumbSizeBytes || 2 * 1024 * 1024,
      });
      const thumbUploadUrl = presignedThumb.uploadUrl;

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

    const incomingImages = files.filter((f) => f.mediaType === 'image').length;
    const incomingVideos = files.filter((f) => f.mediaType === 'video').length;

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
        data: files.map((file) => ({
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
          thumbnail_url: this.storageDriver.getUrl(thumbKey),
          type: asset.mediaType,
          size_bytes: Number(asset.fileSizeBytes),
          sort_order: asset.sortOrder,
        };
      }),
    };
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

    await this.db.mediaAsset.delete({
      where: { id },
    });

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
    mimeType = 'image/webp',
  ): Promise<{ thumbnail_url: string }> {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El recurso multimedia solicitado no existe.');
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

    const thumbKey = asset.filePath.replace(/\.[^.]+$/, '-thumb.webp');
    await this.storageDriver.putObject({
      key: thumbKey,
      body: buffer,
      mimeType,
    });

    return {
      thumbnail_url: this.storageDriver.getUrl(thumbKey),
    };
  }
}

export const mediaService = new MediaService();
