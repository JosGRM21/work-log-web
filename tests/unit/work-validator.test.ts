import { describe, it, expect } from 'vitest';
import {
  isValidUuid,
  parseDateOnly,
  validateDateCoherence,
  validateCreateWorkInput,
  validateUpdateWorkInput,
  parseListWorksQuery,
} from '../../src/server/modules/works/works.validator.js';
import { AppError } from '../../src/server/core/errors/app-error.js';

describe('Work Validator (Unit)', () => {
  describe('isValidUuid', () => {
    it('debe aceptar UUIDs v4 válidos', () => {
      expect(isValidUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
    });

    it('debe rechazar cadenas que no son UUID', () => {
      expect(isValidUuid('invalido-123')).toBe(false);
      expect(isValidUuid('')).toBe(false);
    });
  });

  describe('parseDateOnly', () => {
    it('debe parsear fechas en formato YYYY-MM-DD correctamente en UTC', () => {
      const parsed = parseDateOnly('2026-10-15', 'test_date');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.toISOString().startsWith('2026-10-15')).toBe(true);
    });

    it('debe devolver null para valores vacíos o nulos', () => {
      expect(parseDateOnly(null, 'test_date')).toBeNull();
      expect(parseDateOnly(undefined, 'test_date')).toBeNull();
      expect(parseDateOnly('', 'test_date')).toBeNull();
    });

    it('debe lanzar AppError 400 ante tipos incorrectos o fechas malformadas', () => {
      expect(() => parseDateOnly(12345, 'test_date')).toThrowError(AppError);
      expect(() => parseDateOnly('fecha-invalida', 'test_date')).toThrowError(AppError);
    });
  });

  describe('validateDateCoherence (RN-02)', () => {
    it('debe permitir endDate posterior o igual a startDate', () => {
      const start = new Date('2026-10-10');
      const end = new Date('2026-10-20');
      expect(() => validateDateCoherence(start, end)).not.toThrow();
      expect(() => validateDateCoherence(start, start)).not.toThrow();
    });

    it('debe lanzar AppError si endDate es anterior a startDate', () => {
      const start = new Date('2026-10-20');
      const end = new Date('2026-10-10');
      expect(() => validateDateCoherence(start, end)).toThrowError(AppError);
    });
  });

  describe('validateCreateWorkInput', () => {
    it('debe rechazar creaciones sin título o con título vacío', () => {
      expect(() => validateCreateWorkInput({ title: '   ' })).toThrowError(AppError);
      expect(() => validateCreateWorkInput({})).toThrowError(AppError);
    });

    it('debe rechazar títulos que excedan 150 caracteres', () => {
      const longTitle = 'a'.repeat(151);
      expect(() => validateCreateWorkInput({ title: longTitle })).toThrowError(AppError);
    });

    it('debe normalizar y asignar valores por defecto en payloads válidos', () => {
      const result = validateCreateWorkInput({
        title: ' Fabricación de Portón ',
        status: 'in_progress',
        start_date: '2026-10-01',
      });
      expect(result.title).toBe('Fabricación de Portón');
      expect(result.status).toBe('in_progress');
      expect(result.referenceDate).toBeInstanceOf(Date);
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeNull();
      expect(result.nextMaintenanceDate).toBeNull();
    });

    it('debe aceptar y parsear next_maintenance_date válida', () => {
      const result = validateCreateWorkInput({
        title: 'Mantenimiento Bomba',
        next_maintenance_date: '2026-12-15',
      });
      expect(result.nextMaintenanceDate).toBeInstanceOf(Date);
      expect(result.nextMaintenanceDate?.toISOString().startsWith('2026-12-15')).toBe(true);
    });

    it('debe rechazar next_maintenance_date con formato inválido', () => {
      expect(() =>
        validateCreateWorkInput({
          title: 'Mantenimiento Bomba',
          next_maintenance_date: 'fecha-incorrecta',
        }),
      ).toThrowError(AppError);
    });
  });

  describe('validateUpdateWorkInput', () => {
    it('debe fallar si el cuerpo está vacío', () => {
      expect(() => validateUpdateWorkInput({})).toThrowError(AppError);
    });

    it('debe aceptar campos parciales y normalizarlos', () => {
      const result = validateUpdateWorkInput({ status: 'completed' });
      expect(result.status).toBe('completed');
      expect(result.title).toBeUndefined();
    });

    it('debe aceptar y actualizar next_maintenance_date', () => {
      const result = validateUpdateWorkInput({ next_maintenance_date: '2027-01-20' });
      expect(result.nextMaintenanceDate).toBeInstanceOf(Date);
      expect(result.nextMaintenanceDate?.toISOString().startsWith('2027-01-20')).toBe(true);
    });

    it('debe permitir limpiar next_maintenance_date enviando null o vacío', () => {
      const resultNull = validateUpdateWorkInput({ next_maintenance_date: null });
      expect(resultNull.nextMaintenanceDate).toBeNull();

      const resultEmpty = validateUpdateWorkInput({ next_maintenance_date: '' });
      expect(resultEmpty.nextMaintenanceDate).toBeNull();
    });
  });

  describe('parseListWorksQuery', () => {
    it('debe aplicar paginación y orden por defecto', () => {
      const parsed = parseListWorksQuery({});
      expect(parsed.order).toBe('desc');
      expect(parsed.limit).toBe(20);
      expect(parsed.offset).toBe(0);
      expect(parsed.status).toBeUndefined();
    });

    it('debe rechazar límites fuera de rango o estados no permitidos', () => {
      expect(() => parseListWorksQuery({ limit: 150 })).toThrowError(AppError);
      expect(() => parseListWorksQuery({ status: 'archived' })).toThrowError(AppError);
    });
  });
});
