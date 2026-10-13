import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { storage as defaultStorage, type StorageDriver } from '../storage/index.js';
import {
  isValidUuid,
  validateMediaQuota,
  MAX_IMAGES_PER_WORK,
  MAX_VIDEOS_PER_WORK,
} from '../validators/media.validator.js';
import {
  parseAndUploadMultipartFiles,
  type MultipartRequestStream,
  type UploadedFileStreamResult,
} from '../utils/multipart.js';

export class MediaService {
  constructor(
    private readonly db: PrismaClient = defaultPrisma,
    private readonly storageDriver: StorageDriver = defaultStorage,
  ) { }

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

    const initialImageCount =
      initialCounts.find((c) => c.mediaType === 'image')?._count.id ?? 0;
    const initialVideoCount =
      initialCounts.find((c) => c.mediaType === 'video')?._count.id ?? 0;

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

        const currentImages =
          currentStats.find((c) => c.mediaType === 'image')?._count.id ?? 0;
        const currentVideos =
          currentStats.find((c) => c.mediaType === 'video')?._count.id ?? 0;

        validateMediaQuota(currentImages, currentVideos, incomingImages, incomingVideos);

        const maxSortOrder = currentStats.reduce(
          (max, item) =>
            item._max.sortOrder !== null && item._max.sortOrder > max ? item._max.sortOrder : max,
          -1,
        );

        let nextSortOrder = maxSortOrder + 1;
        const inserted = [];

        for (const file of uploadedFiles) {
          const asset = await tx.mediaAsset.create({
            data: {
              workItemId: workId,
              filePath: file.key,
              mediaType: file.mediaType,
              mimeType: file.mimeType,
              fileSizeBytes: BigInt(file.sizeBytes),
              sortOrder: nextSortOrder++,
            },
            select: {
              id: true,
              workItemId: true,
              filePath: true,
              mediaType: true,
              fileSizeBytes: true,
              sortOrder: true,
            },
          });
          inserted.push(asset);
        }

        return inserted;
      });

      return {
        uploaded: createdAssets.map((asset) => ({
          id: asset.id,
          work_id: asset.workItemId,
          url: this.storageDriver.getUrl(asset.filePath),
          type: asset.mediaType,
          size_bytes: Number(asset.fileSizeBytes),
          sort_order: asset.sortOrder,
        })),
      };
    } catch (error) {
      await Promise.allSettled(
        uploadedFiles.map((file) => this.storageDriver.deleteObject(file.key)),
      );
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
      },
    });

    if (!asset) {
      throw AppError.notFound('El recurso multimedia solicitado no existe.');
    }

    await this.db.mediaAsset.delete({
      where: { id },
    });

    try {
      await this.storageDriver.deleteObject(asset.filePath);
    } catch (error) {
      console.warn(`Advertencia al purgar archivo físico en storage: ${asset.filePath}`, error);
    }
  }
}

export const mediaService = new MediaService();