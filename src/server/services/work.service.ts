import { prisma } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { storage } from '../storage/index.js';
import {
  type ListWorksQuery,
  type CreateWorkDTO,
  type UpdateWorkDTO,
  formatDateToIsoDateOnly,
  isValidUuid,
  validateDateCoherence,
} from '../validators/work.validator.js';

export function resolvePublicMediaUrl(filePath: string): string {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  if (filePath.startsWith('/uploads/') || filePath.startsWith('/media/')) {
    return filePath;
  }
  return storage.getUrl(filePath);
}

function extractStorageKey(filePath: string): string {
  let key = filePath.replace(/^https?:\/\/[^/]+/, '');
  key = key
    .replace(/^\/uploads\//, '')
    .replace(/^\/media\//, '')
    .replace(/^\/+/, '');
  return key;
}

export class WorkService {
  async listWorks(query: ListWorksQuery) {
    const whereClause: { status?: string } = {};
    if (query.status) {
      whereClause.status = query.status;
    }

    const [total, items] = await Promise.all([
      prisma.workItem.count({ where: whereClause }),
      prisma.workItem.findMany({
        where: whereClause,
        orderBy: {
          referenceDate: query.order,
        },
        skip: query.offset,
        take: query.limit,
        include: {
          mediaAssets: {
            select: {
              filePath: true,
              mediaType: true,
              sortOrder: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      }),
    ]);

    const formattedData = items.map((item) => {
      const firstMedia = item.mediaAssets[0];
      const mediaPreview = firstMedia
        ? {
            url: resolvePublicMediaUrl(firstMedia.filePath),
            type: firstMedia.mediaType,
          }
        : null;

      const mediaCount = {
        images: item.mediaAssets.filter((m) => m.mediaType === 'image').length,
        videos: item.mediaAssets.filter((m) => m.mediaType === 'video').length,
      };

      return {
        id: item.id,
        title: item.title,
        status: item.status,
        reference_date: formatDateToIsoDateOnly(item.referenceDate),
        media_preview: mediaPreview,
        media_count: mediaCount,
        created_at: item.createdAt.toISOString(),
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }

  async getWorkById(id: string) {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El trabajo solicitado no existe o el identificador es inválido.');
    }

    const item = await prisma.workItem.findUnique({
      where: { id },
      include: {
        mediaAssets: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!item) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      reference_date: formatDateToIsoDateOnly(item.referenceDate),
      start_date: formatDateToIsoDateOnly(item.startDate),
      end_date: formatDateToIsoDateOnly(item.endDate),
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
      media: item.mediaAssets.map((asset) => ({
        id: asset.id,
        url: resolvePublicMediaUrl(asset.filePath),
        type: asset.mediaType,
        size_bytes: Number(asset.fileSizeBytes),
        sort_order: asset.sortOrder,
        created_at: asset.createdAt.toISOString(),
      })),
    };
  }

  async createWork(userId: string, data: CreateWorkDTO) {
    const created = await prisma.workItem.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        status: data.status,
        referenceDate: data.referenceDate,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      select: {
        id: true,
        title: true,
        status: true,
        referenceDate: true,
        createdAt: true,
      },
    });

    return {
      id: created.id,
      title: created.title,
      status: created.status,
      reference_date: formatDateToIsoDateOnly(created.referenceDate),
      created_at: created.createdAt.toISOString(),
    };
  }

  async updateWork(id: string, data: UpdateWorkDTO) {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const existing = await prisma.workItem.findUnique({
      where: { id },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!existing) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const effectiveStartDate = data.startDate !== undefined ? data.startDate : existing.startDate;
    const effectiveEndDate = data.endDate !== undefined ? data.endDate : existing.endDate;

    validateDateCoherence(effectiveStartDate, effectiveEndDate);

    const updated = await prisma.workItem.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.referenceDate !== undefined ? { referenceDate: data.referenceDate } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  async deleteWork(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const existing = await prisma.workItem.findUnique({
      where: { id },
      include: {
        mediaAssets: {
          select: {
            filePath: true,
          },
        },
      },
    });

    if (!existing) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const filesToPurge = existing.mediaAssets.map((asset) => extractStorageKey(asset.filePath));

    // Borrado en cascada a nivel de BD (ON DELETE CASCADE)
    await prisma.workItem.delete({
      where: { id },
    });

    // Purga física de archivos en Storage sin bloquear la respuesta si algún binario ya no existía
    await Promise.allSettled(
      filesToPurge.map(async (key) => {
        try {
          await storage.deleteObject(key);
        } catch (err) {
          console.warn(`No se pudo eliminar el archivo físico en storage: ${key}`, err);
        }
      }),
    );
  }
}

export const workService = new WorkService();
