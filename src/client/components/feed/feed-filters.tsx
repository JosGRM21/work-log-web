import React from 'react';
import type { WorkStatus } from '../../../shared/types.js';
import { ArrowUpDown, LayoutGrid, ListTree } from 'lucide-react';

export type ViewMode = 'grid' | 'timeline';

interface FeedFiltersProps {
  currentStatus: WorkStatus | 'all';
  onStatusChange: (status: WorkStatus | 'all') => void;
  currentOrder: 'desc' | 'asc';
  onOrderToggle: () => void;
  totalResults?: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  counts?: {
    all: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
}

export const FeedFilters: React.FC<FeedFiltersProps> = ({
  currentStatus,
  onStatusChange,
  currentOrder,
  onOrderToggle,
  totalResults: _totalResults,
  viewMode,
  onViewModeChange,
  counts,
}) => {
  const filters: Array<{
    id: WorkStatus | 'all';
    label: string;
    count?: number;
    dotColor: string;
  }> = [
      {
        id: 'all',
        label: 'Todos',
        count: counts?.all,
        dotColor: 'bg-[#4285F4]',
      },
      {
        id: 'completed',
        label: 'Terminados',
        count: counts?.completed,
        dotColor: 'bg-[#34a853]',
      },
      {
        id: 'in_progress',
        label: 'En curso',
        count: counts?.in_progress,
        dotColor: 'bg-[#fbbc04]',
      },
      {
        id: 'pending',
        label: 'Por realizar',
        count: counts?.pending,
        dotColor: 'bg-[#9aa0a6]',
      },
    ];

  return (
    <div className="relative w-full pt-2 pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Izquierda: Cápsula segmentada de filtros por estado */}
        <div className="flex items-center overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <div
            role="tablist"
            aria-label="Filtrar obras por estado"
            className="inline-flex items-center gap-1 p-1.5 rounded-full bg-[#090d16] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            {filters.map((filter) => {
              const isActive = currentStatus === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onStatusChange(filter.id)}
                  className={`group relative h-9 px-4 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-200 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${isActive
                      ? 'bg-[#1a73e8] text-white shadow-[0_2px_14px_rgba(26,115,232,0.4)]'
                      : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.05]'
                    }`}
                >
                  {/* Indicador de color del estado */}
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-transform duration-200 ${isActive
                        ? 'bg-white scale-110'
                        : `${filter.dotColor} opacity-80 group-hover:opacity-100`
                      }`}
                  />

                  <span>{filter.label}</span>

                  {/* Contador numérico */}
                  {filter.count !== undefined && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] tabular-nums font-medium transition-colors ${isActive
                          ? 'bg-black/25 text-white'
                          : 'bg-white/[0.06] text-[#80868b] group-hover:text-[#c4c7c5]'
                        }`}
                    >
                      {filter.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Derecha: Orden cronológico y Selector de vista (solo iconos) */}
        <div className="flex items-center justify-end gap-2.5">
          {/* Botón de Orden Cronológico */}
          <button
            type="button"
            onClick={onOrderToggle}
            title="Invertir orden cronológico"
            className="group h-9 px-3.5 rounded-full bg-[#090d16] border border-white/[0.08] hover:border-[#4285F4]/40 hover:bg-white/[0.04] text-xs font-medium text-[#c4c7c5] hover:text-white transition-all inline-flex items-center gap-2 cursor-pointer select-none"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#669df6] transition-transform duration-200 group-hover:scale-110" />
            <span className="hidden sm:inline">{currentOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}</span>
          </button>

          {/* Conmutador de Vista (Cuadrícula / Cronología) - Solo iconos */}
          <div
            role="group"
            aria-label="Modo de visualización"
            className="inline-flex items-center p-1 rounded-full bg-[#090d16] border border-white/[0.08]"
          >
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              title="Vista en cuadrícula de tarjetas"
              aria-label="Vista en cuadrícula"
              className={`h-7 w-7 rounded-full inline-flex items-center justify-center transition-all duration-200 cursor-pointer select-none ${
                viewMode === 'grid'
                  ? 'bg-white/[0.14] text-white shadow-xs'
                  : 'text-[#80868b] hover:text-[#e8eaed] hover:bg-white/[0.04]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('timeline')}
              title="Vista en línea de tiempo cronológica"
              aria-label="Vista en línea de tiempo"
              className={`h-7 w-7 rounded-full inline-flex items-center justify-center transition-all duration-200 cursor-pointer select-none ${
                viewMode === 'timeline'
                  ? 'bg-white/[0.14] text-white shadow-xs'
                  : 'text-[#80868b] hover:text-[#e8eaed] hover:bg-white/[0.04]'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Línea divisoria inferior degradada sutil */}
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
};