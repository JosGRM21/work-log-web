import type { WorkItemSummary } from '@shared/types.js';

export interface AreaWorkGroup {
  key: string;
  areaLabel: string;
  isUnassigned: boolean;
  works: WorkItemSummary[];
}

export const UNASSIGNED_AREA_LABEL = 'Sin área asignada';

/**
 * Agrupa trabajos por área normalizando mayúsculas/minúsculas y espacios,
 * preservando el orden cronológico relativo dentro de cada grupo y ubicando
 * los trabajos sin área al final.
 */
export function groupWorksByArea(
  works: WorkItemSummary[],
  availableAreas: string[] = [],
): AreaWorkGroup[] {
  const canonicalNameByKey = new Map<string, string>();
  for (const area of availableAreas) {
    const clean = area.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!canonicalNameByKey.has(key)) {
      canonicalNameByKey.set(key, clean);
    }
  }

  const groupsByKey = new Map<string, AreaWorkGroup>();
  const unassignedWorks: WorkItemSummary[] = [];

  for (const work of works) {
    const cleanArea = work.area?.trim() ?? '';
    if (!cleanArea) {
      unassignedWorks.push(work);
      continue;
    }

    const key = cleanArea.toLowerCase();
    const existingGroup = groupsByKey.get(key);
    if (existingGroup) {
      existingGroup.works.push(work);
    } else {
      groupsByKey.set(key, {
        key,
        areaLabel: canonicalNameByKey.get(key) ?? cleanArea,
        isUnassigned: false,
        works: [work],
      });
    }
  }

  const sortedGroups = Array.from(groupsByKey.values()).sort((a, b) =>
    a.areaLabel.localeCompare(b.areaLabel, 'es', { sensitivity: 'base' }),
  );

  if (unassignedWorks.length > 0) {
    sortedGroups.push({
      key: '__unassigned__',
      areaLabel: UNASSIGNED_AREA_LABEL,
      isUnassigned: true,
      works: unassignedWorks,
    });
  }

  return sortedGroups;
}
