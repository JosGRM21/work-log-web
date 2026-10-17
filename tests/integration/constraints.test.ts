import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../../src/server/infra/db/client.js';

describe('PostgreSQL Check Constraints (Integration)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('chk_work_items_dates debe impedir end_date < start_date en la BD', async () => {
    const user = await prisma.user.findFirst();
    expect(user).toBeTruthy();

    await expect(
      prisma.$executeRawUnsafe(`
        INSERT INTO "work_items" ("user_id", "title", "status", "start_date", "end_date")
        VALUES ('${user!.id}', 'Test Fallo Fechas', 'in_progress', '2026-10-10', '2026-10-01');
      `),
    ).rejects.toThrow();
  });

  it('chk_work_items_status debe rechazar estados fuera de enum en la BD', async () => {
    const user = await prisma.user.findFirst();
    expect(user).toBeTruthy();

    await expect(
      prisma.$executeRawUnsafe(`
        INSERT INTO "work_items" ("user_id", "title", "status")
        VALUES ('${user!.id}', 'Test Fallo Estado', 'archived');
      `),
    ).rejects.toThrow();
  });

  it('chk_media_assets_type debe rechazar tipos multimedia ajenos a image/video', async () => {
    let work = await prisma.workItem.findFirst();
    if (!work) {
      const user = await prisma.user.findFirst();
      expect(user).toBeTruthy();
      work = await prisma.workItem.create({
        data: {
          userId: user!.id,
          title: 'Trabajo Temporal Constraints',
          status: 'pending',
          referenceDate: new Date(),
        },
      });
    }
    expect(work).toBeTruthy();

    await expect(
      prisma.$executeRawUnsafe(`
        INSERT INTO "media_assets" ("work_item_id", "file_path", "media_type", "mime_type", "file_size_bytes")
        VALUES ('${work!.id}', '/uploads/audio.mp3', 'audio', 'audio/mpeg', 1024);
      `),
    ).rejects.toThrow();
  });
});
