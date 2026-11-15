export interface CachedMetrics {
  statusGroups: Array<{ status: string; _count: { id: number } }>;
  totalMedia: number;
  areas: string[];
  timestamp: number;
}

let cachedMetrics: CachedMetrics | null = null;
const METRICS_TTL_MS = 60_000; // 60 segundos de TTL

export function getCachedMetrics(): CachedMetrics | null {
  if (!cachedMetrics) return null;
  if (Date.now() - cachedMetrics.timestamp > METRICS_TTL_MS) {
    cachedMetrics = null;
    return null;
  }
  return cachedMetrics;
}

export function setCachedMetrics(
  statusGroups: Array<{ status: string; _count: { id: number } }>,
  totalMedia: number,
  areas: string[],
): void {
  cachedMetrics = {
    statusGroups,
    totalMedia,
    areas,
    timestamp: Date.now(),
  };
}

export function invalidateMetricsCache(): void {
  cachedMetrics = null;
}
