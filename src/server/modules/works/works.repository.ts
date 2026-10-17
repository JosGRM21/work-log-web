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
  getTotalMediaCount(): Promise<number>;
  getMediaCountsByWorkIds(
    workIds: string[],
  ): Promise<Array<{ workItemId: string; mediaType: string; _count: { id: number } }>>;
  findByIdWithMedia(id: string): Promise<{
    id: string;
    title: string;
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
    const whereClause: { status?: string } = {};
    if (query.status) {
      whereClause.status = query.status;
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
    await this.db.workItem.delete({
      where: { id },
    });
  }
}

export const workRepository = new WorkRepository();
