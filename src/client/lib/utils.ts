export { cn } from 'cn';

const esDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function getTodayLocalIso(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateOnly(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!parts) return null;
  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatWorkDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No definida';
  const date = parseLocalDateOnly(dateStr);
  if (!date) return dateStr;
  return esDateFormatter.format(date);
}

/**
 * Calcula la duración inclusiva en días entre dos fechas YYYY-MM-DD.
 */
export function calculateWorkDuration(
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  fallbackToToday = false,
): string | null {
  if (!startStr) return null;
  const resolvedEnd = endStr || (fallbackToToday ? getTodayLocalIso() : null);
  if (!resolvedEnd) return null;

  const start = parseLocalDateOnly(startStr);
  const end = parseLocalDateOnly(resolvedEnd);
  if (!start || !end) return null;

  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return null;

  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays === 1 ? '1 día' : `${diffDays} días`;
}
