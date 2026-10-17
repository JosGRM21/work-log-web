export { cn } from 'cn';

const esDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatWorkDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No definida';
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return esDateFormatter.format(date);
  } catch {
    return dateStr;
  }
}
