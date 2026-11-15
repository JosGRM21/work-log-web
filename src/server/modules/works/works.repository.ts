import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../infra/db/client.js';
import type { ListWorksQuery, CreateWorkDTO, UpdateWorkDTO } from './works.validator.js';
import { validateDateCoherence } from './works.validator.js';
import { AppError } from '../../core/errors/app-error.js';

export interface IWorkRepository {
  findMany(query: ListWorksQuery): Promise<
    Array<{
      id: string;
      title: string;
      area: string | null;
      status: string;
      referenceDate: Date;
      nextMaintenanceDate: Date | null;
      createdAt: Date;
      mediaAssets: Array<{
        filePath: string;
        mediaType: string;
        sortOrder: number;
      }>;
    }>
  >;
  getStatusGroupCounts(): Promise<Array<{ status: string; _count: { id: number } }>>;
  getStatusGroupCountsByArea(
    area: string,
  ): Promise<Array<{ status: string; _count: { id: number } }>>;
  getDistinctAreas(): Promise<string[]>;
  getTotalMediaCount(): Promise<number>;
  getMediaCountsByWorkIds(
    workIds: string[],
  ): Promise<Array<{ workItemId: string; mediaType: string; _count: { id: number } }>>;
  findByIdWithMedia(id: string): Promise<{
    id: string;
    title: string;
    area: string | null;
    description: string | null;
    status: string;
    referenceDate: Date;
    startDate: Date | null;
    endDate: Date | null;
    nextMaintenanceDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    mediaAssets: Array<{
      id: string;
      filePath: string;
      mediaType: string;
      fileSizeBytes: bigint;
      sortOrder: number;
      createdAt: Date;
    }>;
  } | null>;
  create(
    userId: string,
    data: CreateWorkDTO,
  ): Promise<{
    id: string;
    title: string;
    area: string | null;
    status: string;
    referenceDate: Date;
    createdAt: Date;
  }>;
  update(
    id: string,
    data: UpdateWorkDTO,
  ): Promise<{
    id: string;
    title: string;
    area: string | null;
    status: string;
    updatedAt: Date;
  }>;
  findByIdForDeletion(id: string): Promise<{
    id: string;
    mediaAssets: Array<{ filePath: string; mediaType: string }>;
  } | null>;
  delete(id: string): Promise<void>;
}

export class WorkRepository implements IWorkRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async findMany(query: ListWorksQuery) {
    const whereClause: {
      status?: string;
      area?: { equals: string; mode: 'insensitive' };
    } = {};
    if (query.status) {
      whereClause.status = query.status;
    }
    if (query.area) {
      whereClause.area = { equals: query.area, mode: 'insensitive' };
    }

    return this.db.workItem.findMany({
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
      select: {
        id: true,
        title: true,
        area: true,
        status: true,
        referenceDate: true,
        nextMaintenanceDate: true,
        createdAt: true,
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
    });
  }

  async getStatusGroupCounts() {
    return this.db.workItem.groupBy({
      by: ['status'],
      _count: { id: true },
    });
  }

  async getStatusGroupCountsByArea(area: string) {
    return this.db.workItem.groupBy({
      by: ['status'],
      where: { area: { equals: area, mode: 'insensitive' } },
      _count: { id: true },
    });
  }

  async getDistinctAreas() {
    const rows = await this.db.workItem.findMany({
      where: { area: { not: null } },
      select: { area: true },
      distinct: ['area'],
      orderBy: { area: 'asc' },
    });
    // Deduplicar sin distinguir mayúsculas/minúsculas para mantener coherencia con el filtro insensitive
    const canonicalByLower = new Map<string, string>();
    for (const row of rows) {
      const clean = row.area?.trim();
      if (!clean) continue;
      const lower = clean.toLowerCase();
      if (!canonicalByLower.has(lower)) {
        canonicalByLower.set(lower, clean);
      }
    }
    return Array.from(canonicalByLower.values()).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }

  async getTotalMediaCount() {
    return this.db.mediaAsset.count();
  }

  async getMediaCountsByWorkIds(workIds: string[]) {
    if (workIds.length === 0) return [];
    return this.db.mediaAsset.groupBy({
      by: ['workItemId', 'mediaType'],
      where: { workItemId: { in: workIds } },
      _count: { id: true },
    });
  }

  async findByIdWithMedia(id: string) {
    return this.db.workItem.findUnique({
      where: { id },
      include: {
        mediaAssets: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });
  }

  async create(userId: string, data: CreateWorkDTO) {
    return this.db.workItem.create({
      data: {
        userId,
        title: data.title,
        area: data.area,
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
        area: true,
        status: true,
        referenceDate: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: UpdateWorkDTO) {
    return this.db.$transaction(async (tx) => {
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
          ...(data.area !== undefined ? { area: data.area } : {}),
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
          area: true,
          status: true,
          updatedAt: true,
        },
      });
    });
  }

  async findByIdForDeletion(id: string) {
    return this.db.workItem.findUnique({
      where: { id },
      include: {
        mediaAssets: {
          select: {
            filePath: true,
            mediaType: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    try {
      await this.db.workItem.delete({
        where: { id },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw AppError.notFound('El trabajo solicitado no existe.');
      }
      throw error;
    }
  }
}

export const workRepository = new WorkRepository();
