import { AppError } from '../errors/app-error.js';
import { VALID_WORK_STATUSES, isValidUuid, type WorkStatus } from '../../shared/types.js';

export { VALID_WORK_STATUSES, isValidUuid, type WorkStatus };

export interface ListWorksQuery {
  status?: WorkStatus;
  order: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export interface CreateWorkDTO {
  title: string;
  description?: string | null;
  status: WorkStatus;
  referenceDate: Date;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface UpdateWorkDTO {
  title?: string;
  description?: string | null;
  status?: WorkStatus;
  referenceDate?: Date;
  startDate?: Date | null;
  endDate?: Date | null;
}

export function parseDateOnly(val: unknown, fieldName: string): Date | null {
  if (val === undefined || val === null || val === '') {
    return null;
  }
  if (typeof val !== 'string') {
    throw AppError.badRequest(
      `El campo "${fieldName}" debe ser una cadena con formato YYYY-MM-DD.`,
    );
  }

  const trimmed = val.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw AppError.badRequest(
      `El campo "${fieldName}" contiene una fecha inválida: "${val}". Use formato YYYY-MM-DD.`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    isNaN(utcDate.getTime()) ||
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    throw AppError.badRequest(
      `El campo "${fieldName}" contiene valores de fecha calendario inválidos: "${val}".`,
    );
  }

  return utcDate;
}

export function formatDateToIsoDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

export function validateDateCoherence(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
): void {
  if (startDate && endDate) {
    if (endDate.getTime() < startDate.getTime()) {
      throw AppError.badRequest(
        'Inconsistencia temporal (RN-02): la fecha de finalización (end_date) no puede ser anterior a la fecha de inicio (start_date).',
      );
    }
  }
}

export function parseListWorksQuery(query: Record<string, unknown>): ListWorksQuery {
  let status: WorkStatus | undefined;
  if (query.status !== undefined && query.status !== '') {
    const rawStatus = String(query.status).trim();
    if (!VALID_WORK_STATUSES.includes(rawStatus as WorkStatus)) {
      throw AppError.badRequest(
        `Estado no admitido "${rawStatus}". Valores permitidos: ${VALID_WORK_STATUSES.join(', ')}.`,
      );
    }
    status = rawStatus as WorkStatus;
  }

  let order: 'asc' | 'desc' = 'desc';
  if (query.order !== undefined && query.order !== '') {
    const rawOrder = String(query.order).toLowerCase().trim();
    if (rawOrder !== 'asc' && rawOrder !== 'desc') {
      throw AppError.badRequest('El parámetro "order" debe ser "desc" o "asc".');
    }
    order = rawOrder;
  }

  let limit = 20;
  if (query.limit !== undefined && query.limit !== '') {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
      throw AppError.badRequest('El parámetro "limit" debe ser un entero positivo entre 1 y 100.');
    }
    limit = parsedLimit;
  }

  let offset = 0;
  if (query.offset !== undefined && query.offset !== '') {
    const parsedOffset = Number(query.offset);
    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      throw AppError.badRequest('El parámetro "offset" debe ser un entero mayor o igual a 0.');
    }
    offset = parsedOffset;
  }

  return { status, order, limit, offset };
}

export function validateCreateWorkInput(body: Record<string, unknown>): CreateWorkDTO {
  const { title, description, status, reference_date, start_date, end_date } = body ?? {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw AppError.badRequest('El título (title) es obligatorio y no puede estar vacío.');
  }

  const cleanTitle = title.trim();
  if (cleanTitle.length > 150) {
    throw AppError.badRequest('El título (title) excede el límite máximo de 150 caracteres.');
  }

  let cleanStatus: WorkStatus = 'pending';
  if (status !== undefined && status !== null && status !== '') {
    const rawStatus = String(status).trim();
    if (!VALID_WORK_STATUSES.includes(rawStatus as WorkStatus)) {
      throw AppError.badRequest(
        `Estado inválido "${rawStatus}". Opciones válidas: ${VALID_WORK_STATUSES.join(', ')}.`,
      );
    }
    cleanStatus = rawStatus as WorkStatus;
  }

  let referenceDate: Date;
  if (reference_date !== undefined && reference_date !== null && reference_date !== '') {
    const parsedRef = parseDateOnly(reference_date, 'reference_date');
    if (!parsedRef) {
      throw AppError.badRequest('El campo "reference_date" no puede ser nulo si se suministra.');
    }
    referenceDate = parsedRef;
  } else {
    const now = new Date();
    referenceDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  const startDate = parseDateOnly(start_date, 'start_date');
  const endDate = parseDateOnly(end_date, 'end_date');

  validateDateCoherence(startDate, endDate);

  return {
    title: cleanTitle,
    description:
      description !== undefined && description !== null ? String(description).trim() : null,
    status: cleanStatus,
    referenceDate,
    startDate,
    endDate,
  };
}

export function validateUpdateWorkInput(body: Record<string, unknown>): UpdateWorkDTO {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    throw AppError.badRequest('Debe suministrar al menos un campo para actualizar.');
  }

  const result: UpdateWorkDTO = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      throw AppError.badRequest('El título (title) no puede estar vacío.');
    }
    const cleanTitle = body.title.trim();
    if (cleanTitle.length > 150) {
      throw AppError.badRequest('El título (title) no puede exceder 150 caracteres.');
    }
    result.title = cleanTitle;
  }

  if (body.description !== undefined) {
    result.description =
      body.description === null || body.description === '' ? null : String(body.description).trim();
  }

  if (body.status !== undefined) {
    const rawStatus = String(body.status).trim();
    if (!VALID_WORK_STATUSES.includes(rawStatus as WorkStatus)) {
      throw AppError.badRequest(
        `Estado inválido "${rawStatus}". Opciones válidas: ${VALID_WORK_STATUSES.join(', ')}.`,
      );
    }
    result.status = rawStatus as WorkStatus;
  }

  if (body.reference_date !== undefined) {
    const parsedRef = parseDateOnly(body.reference_date, 'reference_date');
    if (!parsedRef) {
      throw AppError.badRequest('El campo "reference_date" no puede ser nulo.');
    }
    result.referenceDate = parsedRef;
  }

  if (body.start_date !== undefined) {
    result.startDate = parseDateOnly(body.start_date, 'start_date');
  }

  if (body.end_date !== undefined) {
    result.endDate = parseDateOnly(body.end_date, 'end_date');
  }

  return result;
}