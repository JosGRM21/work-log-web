import { describe, it, expect } from 'vitest';
import {
  groupWorksByArea,
  UNASSIGNED_AREA_LABEL,
} from '../../src/client/features/works/utils/group-works-by-area.js';
import type { WorkItemSummary } from '../../src/shared/types.js';

function makeWork(overrides: Partial<WorkItemSummary> & { id: string; title: string }): WorkItemSummary {
  return {
    area: null,
    status: 'completed',
    reference_date: '2026-11-10',
    next_maintenance_date: null,
    media_preview: null,
    media_count: { images: 0, videos: 0 },
    created_at: '2026-11-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('groupWorksByArea (Unit)', () => {
  it('retorna arreglo vacío si no hay trabajos', () => {
    expect(groupWorksByArea([], ['Taller', 'Caldera'])).toEqual([]);
  });

  it('agrupa por área ordenada alfabéticamente en español, preserva el orden interno y ubica sin área al final', () => {
    const works: WorkItemSummary[] = [
      makeWork({ id: '1', title: 'Trabajo Taller 1', area: 'Taller', reference_date: '2026-11-15' }),
      makeWork({ id: '2', title: 'Trabajo Sin Área', area: null, reference_date: '2026-11-14' }),
      makeWork({ id: '3', title: 'Trabajo Área Norte', area: 'Área Norte', reference_date: '2026-11-13' }),
      makeWork({ id: '4', title: 'Trabajo Taller 2', area: '  taller ', reference_date: '2026-11-12' }),
      makeWork({ id: '5', title: 'Trabajo Caldera', area: 'caldera', reference_date: '2026-11-11' }),
      makeWork({ id: '6', title: 'Trabajo Área Vacía', area: '   ', reference_date: '2026-11-10' }),
    ];

    const groups = groupWorksByArea(works, ['Caldera', 'Taller', 'Área Norte']);

    expect(groups.map((g) => g.areaLabel)).toEqual([
      'Área Norte',
      'Caldera',
      'Taller',
      UNASSIGNED_AREA_LABEL,
    ]);

    expect(groups[0].isUnassigned).toBe(false);
    expect(groups[0].works.map((w) => w.id)).toEqual(['3']);

    expect(groups[1].works.map((w) => w.id)).toEqual(['5']);
    expect(groups[2].works.map((w) => w.id)).toEqual(['1', '4']);

    expect(groups[3].isUnassigned).toBe(true);
    expect(groups[3].works.map((w) => w.id)).toEqual(['2', '6']);
  });

  it('usa el nombre recortado del primer trabajo cuando availableAreas no contiene el área', () => {
    const works: WorkItemSummary[] = [
      makeWork({ id: '1', title: 'Trabajo A', area: '  Subestación Eléctrica  ' }),
      makeWork({ id: '2', title: 'Trabajo B', area: 'subestación eléctrica' }),
    ];

    const groups = groupWorksByArea(works);

    expect(groups).toHaveLength(1);
    expect(groups[0].areaLabel).toBe('Subestación Eléctrica');
    expect(groups[0].works.map((w) => w.id)).toEqual(['1', '2']);
  });
});
