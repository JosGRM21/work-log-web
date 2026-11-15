import { AppError } from '../../core/errors/app-error.js';
import { storage as defaultStorage, type StorageDriver } from '../../infra/storage/index.js';
import {
  type ListWorksQuery,
  type CreateWorkDTO,
  type UpdateWorkDTO,
  formatDateToIsoDateOnly,
  isValidUuid,
} from './works.validator.js';
import type { AllowedMediaType, WorkStatus } from '../../../shared/types.js';
import {
  getCachedMetrics,
  setCachedMetrics,
  invalidateMetricsCache,
} from '../../core/cache/metrics-cache.js';
import {
  workRepository as defaultRepository,
  type IWorkRepository,
} from './works.repository.js';

export class WorkService {
  constructor(
    private readonly repository: IWorkRepository = defaultRepository,
    private readonly storageDriver: StorageDriver = defaultStorage,
  ) {}

  async listWorks(query: ListWorksQuery) {
    const cached = getCachedMetrics();
    let statusGroups: Array<{ status: string; _count: { id: number } }>;
    let totalMedia: number;
    let areas: string[];

    const itemsPromise = this.repository.findMany(query);
    const areaGroupsPromise = query.area
      ? this.repository.getStatusGroupCountsByArea(query.area)
      : Promise.resolve(null);
    let items: Awaited<typeof itemsPromise>;
    let areaStatusGroups: Awaited<typeof areaGroupsPromise>;

    if (cached) {
      statusGroups = cached.statusGroups;
      totalMedia = cached.totalMedia;
      areas = cached.areas;
      [items, areaStatusGroups] = await Promise.all([itemsPromise, areaGroupsPromise]);
    } else {
      const [fetchedItems, fetchedAreaGroups, fetchedStatusGroups, fetchedTotalMedia, fetchedAreas] =
        await Promise.all([
          itemsPromise,
          areaGroupsPromise,
          this.repository.getStatusGroupCounts(),
          this.repository.getTotalMediaCount(),
          this.repository.getDistinctAreas(),
        ]);
      items = fetchedItems;
      areaStatusGroups = fetchedAreaGroups;
      statusGroups = fetchedStatusGroups;
      totalMedia = fetchedTotalMedia;
      areas = fetchedAreas;
      setCachedMetrics(statusGroups, totalMedia, areas);
    }

    const summary = {
      completed: 0,
      in_progress: 0,
      pending: 0,
      total_media: totalMedia,
    };
    for (const group of statusGroups) {
      if (group.status === 'completed') summary.completed = group._count.id;
      else if (group.status === 'in_progress') summary.in_progress = group._count.id;
      else if (group.status === 'pending') summary.pending = group._count.id;
    }

    let filteredSummary: { completed: number; in_progress: number; pending: number } | undefined;
    let total: number;

    if (areaStatusGroups) {
      filteredSummary = {
        completed: 0,
        in_progress: 0,
        pending: 0,
      };
      for (const group of areaStatusGroups) {
        if (group.status === 'completed') filteredSummary.completed = group._count.id;
        else if (group.status === 'in_progress') filteredSummary.in_progress = group._count.id;
        else if (group.status === 'pending') filteredSummary.pending = group._count.id;
      }
      total = query.status
        ? (areaStatusGroups.find((g) => g.status === query.status)?._count.id ?? 0)
        : filteredSummary.completed + filteredSummary.in_progress + filteredSummary.pending;
    } else {
      total = query.status
        ? (statusGroups.find((g) => g.status === query.status)?._count.id ?? 0)
        : summary.completed + summary.in_progress + summary.pending;
    }

    const workIds = items.map((item) => item.id);
    const countsByWork = await this.repository.getMediaCountsByWorkIds(workIds);

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
            thumbnail_url: this.storageDriver.getUrl(
              firstMedia.filePath.replace(/\.[^.]+$/, '-thumb.webp'),
            ),
            type: firstMedia.mediaType as AllowedMediaType,
          }
        : null;

      const mediaCount = mediaCountsMap.get(item.id) ?? { images: 0, videos: 0 };

      return {
        id: item.id,
        title: item.title,
        area: item.area ?? null,
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
        summary,
        ...(filteredSummary ? { filtered_summary: filteredSummary } : {}),
        areas,
      },
    };
  }

  async getWorkById(id: string) {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El trabajo solicitado no existe o el identificador es inválido.');
    }

    const item = await this.repository.findByIdWithMedia(id);

    if (!item) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    return {
      id: item.id,
      title: item.title,
      area: item.area ?? null,
      description: item.description,
      status: item.status as WorkStatus,
      reference_date: formatDateToIsoDateOnly(item.referenceDate)!,
      start_date: formatDateToIsoDateOnly(item.startDate),
      end_date: formatDateToIsoDateOnly(item.endDate),
      next_maintenance_date: formatDateToIsoDateOnly(item.nextMaintenanceDate),
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
      media: item.mediaAssets.map((asset) => {
        return {
          id: asset.id,
          url: this.storageDriver.getUrl(asset.filePath),
          thumbnail_url: this.storageDriver.getUrl(
            asset.filePath.replace(/\.[^.]+$/, '-thumb.webp'),
          ),
          type: asset.mediaType as AllowedMediaType,
          size_bytes: Number(asset.fileSizeBytes),
          sort_order: asset.sortOrder,
          created_at: asset.createdAt.toISOString(),
        };
      }),
    };
  }

  async createWork(userId: string, data: CreateWorkDTO) {
    const created = await this.repository.create(userId, data);

    invalidateMetricsCache();

    return {
      id: created.id,
      title: created.title,
      area: created.area ?? null,
      status: created.status as WorkStatus,
      reference_date: formatDateToIsoDateOnly(created.referenceDate)!,
      created_at: created.createdAt.toISOString(),
    };
  }

  async updateWork(id: string, data: UpdateWorkDTO) {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const updated = await this.repository.update(id, data);

    invalidateMetricsCache();

    return {
      id: updated.id,
      title: updated.title,
      area: updated.area ?? null,
      status: updated.status as WorkStatus,
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  async deleteWork(id: string): Promise<void> {
    if (!isValidUuid(id)) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const existing = await this.repository.findByIdForDeletion(id);

    if (!existing) {
      throw AppError.notFound('El trabajo solicitado no existe.');
    }

    const keysToPurge: string[] = [];
    for (const asset of existing.mediaAssets) {
      keysToPurge.push(asset.filePath);
      keysToPurge.push(asset.filePath.replace(/\.[^.]+$/, '-thumb.webp'));
    }

    await this.repository.delete(id);

    invalidateMetricsCache();

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
