import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { storage as defaultStorage, type StorageDriver } from '../storage/index.js';
import {
  type ListWorksQuery,
  type CreateWorkDTO,
  type UpdateWorkDTO,
  formatDateToIsoDateOnly,
  isValidUuid,
  validateDateCoherence,
} from '../validators/work.validator.js';
import type { AllowedMediaType, WorkStatus } from '../../shared/types.js';

export class WorkService {
  constructor(
    private readonly db: PrismaClient = defaultPrisma,
    private readonly storageDriver: StorageDriver = defaultStorage,
  ) {}

  async listWorks(query: ListWorksQuery) {
    const whereClause: { status?: string } = {};
    if (query.status) {
      whereClause.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.db.workItem.count({ where: whereClause }),
      this.db.workItem.findMany({
        where: whereClause,
        orderBy: [
          {
            referenceDate: query.order,
          },
          {
            createdAt: query.order,
          },
        ],
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
            take: 1,
          },
        },
      }),
    ]);

    const workIds = items.map((item) => item.id);
    const countsByWork =
      workIds.length > 0
        ? await this.db.mediaAsset.groupBy({
            by: ['workItemId', 'mediaType'],
            where: { workItemId: { in: workIds } },
            _count: { id: true },
          })
        : [];

    const mediaCountsMap = new Map<string, { images: number; videos: number }>();
    for (const row of countsByWork) {
      const entry = mediaCountsMap.get(row.workItemId) ?? { images: 0, videos: 0 };
      if (row.mediaType === 'image') {
        entry.images = row._count.id;
      } else if (row.mediaType === 'video') {
        entry.videos = row._count.id;
      }
      mediaCountsMap.set(row.workItemId, entry);
    }

    const formattedData = items.map((item) => {
      const firstMedia = item.mediaAssets[0];
      const mediaPreview = firstMedia
        ? {
            url: this.storageDriver.getUrl(firstMedia.filePath),
            type: firstMedia.mediaType as AllowedMediaType,
          }
        : null;

      const mediaCount = mediaCountsMap.get(item.id) ?? { images: 0, videos: 0 };

      return {
        id: item.id,
        title: item.title,
        status: item.status as WorkStatus,
        reference_date: formatDateToIsoDateOnly(item.referenceDate)!,
        next_maintenance_date: formatDateToIsoDateOnly(item.nextMaintenanceDate),
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

    const item = await this.db.workItem.findUnique({
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
      status: item.status as WorkStatus,
      reference_date: formatDateToIsoDateOnly(item.referenceDate)!,
      start_date: formatDateToIsoDateOnly(item.startDate),
      end_date: formatDateToIsoDateOnly(item.endDate),
      next_maintenance_date: formatDateToIsoDateOnly(item.nextMaintenanceDate),
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
      media: item.mediaAssets.map((asset) => ({
        id: asset.id,
        url: this.storageDriver.getUrl(asset.filePath),
        type: asset.mediaType as AllowedMediaType,
        size_bytes: Number(asset.fileSizeBytes),
        sort_order: asset.sortOrder,
        created_at: asset.createdAt.toISOString(),
      })),
    };
  }

  async createWork(userId: string, data: CreateWorkDTO) {
    const created = await this.db.workItem.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        status: data.status,
        referenceDate: data.referenceDate,
        startDate: data.startDate,
        endDate: data.endDate,
        nextMaintenanceDate: data.nextMaintenanceDate,
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
      status: created.status as WorkStatus,
      reference_date: formatDateToIsoDateOnly(created.referenceDate)!,
      created_at: created.createdAt.toISOString(),
    };
  }

  async updateWork(id: string, data: UpdateWorkDTO) {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const updated = await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; start_date: Date | null; end_date: Date | null }>
      >`
        SELECT id, start_date, end_date FROM "work_items" WHERE id = ${id}::uuid FOR UPDATE
      `;

      const existing = rows[0];
      if (!existing) {
        throw AppError.notFound('El trabajo solicitado no existe.');
      }

      const effectiveStartDate =
        data.startDate !== undefined ? data.startDate : existing.start_date;
      const effectiveEndDate = data.endDate !== undefined ? data.endDate : existing.end_date;

      validateDateCoherence(effectiveStartDate, effectiveEndDate);

      return tx.workItem.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.referenceDate !== undefined ? { referenceDate: data.referenceDate } : {}),
          ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
          ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
          ...(data.nextMaintenanceDate !== undefined
            ? { nextMaintenanceDate: data.nextMaintenanceDate }
            : {}),
        },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
        },
      });
    });

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status as WorkStatus,
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  async deleteWork(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const existing = await this.db.workItem.findUnique({
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

    const keysToPurge = existing.mediaAssets.map((asset) => asset.filePath);

    await this.db.workItem.delete({
      where: { id },
    });

    await Promise.allSettled(
      keysToPurge.map(async (key) => {
        try {
          await this.storageDriver.deleteObject(key);
        } catch (err) {
          console.warn(`No se pudo eliminar el archivo físico en storage: ${key}`, err);
        }
      }),
    );
  }
}

export const workService = new WorkService();
