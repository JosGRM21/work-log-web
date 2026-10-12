import type { Request } from 'express';
import { prisma } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { storage } from '../storage/index.js';
import {
  isValidUuid,
  MAX_IMAGES_PER_WORK,
  MAX_VIDEOS_PER_WORK,
} from '../validators/media.validator.js';
import { parseAndUploadMultipartFiles, type UploadedFileStreamResult } from '../utils/multipart.js';

export function extractStorageKey(filePath: string): string {
  let key = filePath.replace(/^https?:\/\/[^/]+/, '');
  key = key
    .replace(/^\/uploads\//, '')
    .replace(/^\/media\//, '')
    .replace(/^\/+/, '');
  return key;
}

export class MediaService {
  async uploadMedia(workId: string, req: Request) {
    if (!isValidUuid(workId)) {
      throw AppError.notFound('El trabajo solicitado no existe o el identificador es inválido.');
    }

    const work = await prisma.workItem.findUnique({
      where: { id: workId },
      select: { id: true },
    });

    if (!work) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    // Consultar recursos multimedia existentes para calcular cuotas y sort_order
    const existingAssets = await prisma.mediaAsset.findMany({
      where: { workItemId: workId },
      select: {
        mediaType: true,
        sortOrder: true,
      },
      orderBy: {
        sortOrder: 'desc',
      },
    });

    const currentImageCount = existingAssets.filter((a) => a.mediaType === 'image').length;
    const currentVideoCount = existingAssets.filter((a) => a.mediaType === 'video').length;
    const initialSortOrder = existingAssets.length > 0 ? existingAssets[0].sortOrder + 1 : 0;

    let uploadedFiles: UploadedFileStreamResult[] = [];

    try {
      uploadedFiles = await parseAndUploadMultipartFiles(req, {
        workId,
        currentImageCount,
        currentVideoCount,
        maxImagesLimit: MAX_IMAGES_PER_WORK,
        maxVideosLimit: MAX_VIDEOS_PER_WORK,
      });
    } catch (error) {
      // Si la carga falló, purgar cualquier binario persistido en este intento
      if (uploadedFiles.length > 0) {
        await Promise.allSettled(uploadedFiles.map((file) => storage.deleteObject(file.key)));
      }
      throw error;
    }

    if (uploadedFiles.length === 0) {
      throw AppError.badRequest(
        'No se recibieron archivos válidos en la solicitud (campo "files").',
      );
    }

    // Persistencia transaccional en la base de datos
    let currentOrder = initialSortOrder;
    const createdAssets = await prisma.$transaction(
      uploadedFiles.map((file) =>
        prisma.mediaAsset.create({
          data: {
            workItemId: workId,
            filePath: file.url,
            mediaType: file.mediaType,
            mimeType: file.mimeType,
            fileSizeBytes: BigInt(file.sizeBytes),
            sortOrder: currentOrder++,
          },
          select: {
            id: true,
            workItemId: true,
            filePath: true,
            mediaType: true,
            fileSizeBytes: true,
            sortOrder: true,
          },
        }),
      ),
    );

    return {
      uploaded: createdAssets.map((asset) => ({
        id: asset.id,
        work_id: asset.workItemId,
        url: asset.filePath,
        type: asset.mediaType,
        size_bytes: Number(asset.fileSizeBytes),
        sort_order: asset.sortOrder,
      })),
    };
  }

  async deleteMedia(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El recurso multimedia solicitado no existe.');
    }

    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: {
        id: true,
        filePath: true,
      },
    });

    if (!asset) {
      throw AppError.notFound('El recurso multimedia solicitado no existe.');
    }

    // 1. Eliminación en base de datos
    await prisma.mediaAsset.delete({
      where: { id },
    });

    // 2. Purga física en el sistema de almacenamiento (RN-04)
    const key = extractStorageKey(asset.filePath);
    try {
      await storage.deleteObject(key);
    } catch (error) {
      console.warn(`Advertencia al purgar archivo físico en storage: ${key}`, error);
    }
  }
}

export const mediaService = new MediaService();
