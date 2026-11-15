import { describe, it, expect } from 'vitest';
import { WorkRepository } from '../../src/server/modules/works/works.repository.js';

describe('WorkRepository (Unit)', () => {
  describe('getDistinctAreas', () => {
    it('debe deduplicar áreas sin distinguir mayúsculas/minúsculas ni espacios y ordenarlas en español', async () => {
      const mockDb = {
        workItem: {
          findMany: async () => [
            { area: 'Caldera' },
            { area: '  caldera  ' },
            { area: 'CALDERA' },
            { area: 'Área Norte' },
            { area: 'área norte' },
            { area: '   ' },
            { area: null },
            { area: 'Subestación' },
          ],
        },
      } as unknown as ConstructorParameters<typeof WorkRepository>[0];

      const repo = new WorkRepository(mockDb);
      const areas = await repo.getDistinctAreas();

      expect(areas).toEqual(['Área Norte', 'Caldera', 'Subestación']);
    });
  });

  describe('delete', () => {
    it('debe mapear error P2025 de Prisma a AppError.notFound (404)', async () => {
      const mockDb = {
        workItem: {
          delete: async () => {
            throw Object.assign(new Error('Record to delete does not exist.'), { code: 'P2025' });
          },
        },
      } as unknown as ConstructorParameters<typeof WorkRepository>[0];

      const repo = new WorkRepository(mockDb);

      await expect(repo.delete('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).rejects.toMatchObject({
        statusCode: 404,
        errorCode: 'NOT_FOUND',
      });
    });
  });
});
