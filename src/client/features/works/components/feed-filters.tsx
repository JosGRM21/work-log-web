import React, { useMemo, useRef } from 'react';
import type { WorkStatus } from '@shared/types.js';
import { STATUS_CONFIG } from '@/constants/status.js';
import { cn } from '@/lib/utils';
import { ArrowUpDown, MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FeedFiltersProps {
  currentStatus: WorkStatus | 'all';
  onStatusChange: (status: WorkStatus | 'all') => void;
  currentArea: string | 'all';
  availableAreas: string[];
  onAreaChange: (area: string | 'all') => void;
  currentOrder: 'desc' | 'asc';
  onOrderToggle: () => void;
  counts?: {
    all: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
}

const FeedFiltersComponent: React.FC<FeedFiltersProps> = ({
  currentStatus,
  onStatusChange,
  currentArea,
  availableAreas,
  onAreaChange,
  currentOrder,
  onOrderToggle,
  counts,
}) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filters: Array<{
    id: WorkStatus | 'all';
    label: string;
    count?: number;
    dotColor: string;
  }> = useMemo(
    () => [
      {
        id: 'all',
        label: 'Todos',
        count: counts?.all,
        dotColor: 'bg-[#4285F4]',
      },
      {
        id: 'completed',
        label: STATUS_CONFIG.completed.label,
        count: counts?.completed,
        dotColor: STATUS_CONFIG.completed.dotClass,
      },
      {
        id: 'in_progress',
        label: STATUS_CONFIG.in_progress.label,
        count: counts?.in_progress,
        dotColor: STATUS_CONFIG.in_progress.dotClass,
      },
      {
        id: 'pending',
        label: STATUS_CONFIG.pending.label,
        count: counts?.pending,
        dotColor: STATUS_CONFIG.pending.dotClass,
      },
    ],
    [counts?.all, counts?.completed, counts?.in_progress, counts?.pending],
  );

  const handleSelectStatus = (index: number, id: WorkStatus | 'all') => {
    onStatusChange(id);
    tabRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const isNext = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const isPrev = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!isNext && !isPrev) return;

    e.preventDefault();
    const total = filters.length;
    const nextIndex = isNext ? (currentIndex + 1) % total : (currentIndex - 1 + total) % total;
    onStatusChange(filters[nextIndex].id);
    const nextTab = tabRefs.current[nextIndex];
    nextTab?.focus();
    nextTab?.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  };

  const isAreaFiltered = currentArea !== 'all';

  return (
    <div className="relative w-full pt-0.5 pb-4 sm:pt-2 sm:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-4">
        {/* Izquierda: Riel horizontal nativo táctil en móvil, cápsula segmentada en sm+ */}
        <div
          role="tablist"
          aria-label="Filtrar obras por estado"
          className="-mx-4 px-4 py-1 -my-1 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 sm:mx-0 sm:my-0 sm:inline-flex sm:w-auto sm:gap-1 sm:p-1 sm:rounded-full sm:bg-[#090d16] sm:border sm:border-white/[0.08] sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:overflow-visible self-stretch sm:self-start"
        >
          {filters.map((filter, index) => {
            const isActive = currentStatus === filter.id;
            return (
              <button
                key={filter.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleSelectStatus(index, filter.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={cn(
                  'group relative h-9 px-3 sm:px-3.5 md:px-4 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-200 inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer select-none touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/60',
                  isActive
                    ? 'bg-[#1a73e8] text-white border border-[#4285F4]/60 sm:border-transparent shadow-[0_3px_14px_-2px_rgba(26,115,232,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] sm:shadow-[0_2px_14px_rgba(26,115,232,0.4)]'
                    : 'bg-[#090d16] border border-white/[0.08] text-[#9aa0a6] hover:text-white hover:border-white/15 hover:bg-white/[0.04] sm:bg-transparent sm:border-transparent sm:hover:bg-white/[0.05]',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-transform duration-200 shrink-0',
                    isActive
                      ? 'bg-white scale-110'
                      : `${filter.dotColor} opacity-85 group-hover:opacity-100`,
                  )}
                />
                <span>{filter.label}</span>

                {filter.count !== undefined && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-5 px-1.5 rounded-full text-[11px] tabular-nums font-medium transition-colors shrink-0',
                      isActive
                        ? 'bg-black/25 text-white'
                        : 'bg-white/[0.06] text-[#80868b] group-hover:text-[#c4c7c5]',
                    )}
                  >
                    {filter.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Derecha: Selector de Área y Orden cronológico (tamaño compacto en móvil, sin sobredimensionar) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-auto self-start sm:self-auto sm:justify-end">
          <Select
            value={currentArea}
            onValueChange={(val) => onAreaChange((val as string) || 'all')}
          >
            <SelectTrigger
              aria-label="Filtrar trabajos por área"
              className={cn(
                'w-auto min-w-[130px] max-w-[190px] sm:min-w-[155px] sm:max-w-[215px] data-[size=default]:h-8 sm:data-[size=default]:h-9 rounded-full border border-white/[0.08] px-2.5 sm:px-3.5 text-xs font-medium transition-all cursor-pointer select-none touch-manipulation focus-visible:ring-2 focus-visible:ring-[#4285F4]/60',
                isAreaFiltered
                  ? 'bg-[#1a73e8]/18 dark:bg-[#1a73e8]/18 border-[#4285F4]/60 text-white shadow-[0_0_12px_rgba(26,115,232,0.25)]'
                  : 'bg-[#090d16] dark:bg-[#090d16] hover:border-[#4285F4]/40 hover:bg-white/[0.04] dark:hover:bg-white/[0.04] text-[#c4c7c5] hover:text-white',
              )}
            >
              <MapPin className="w-3.5 h-3.5 text-[#669df6] shrink-0" />
              <SelectValue placeholder="Todas las áreas">
                {isAreaFiltered ? (
                  <span className="truncate">{currentArea}</span>
                ) : (
                  <>
                    <span className="truncate sm:hidden">Área: Todas</span>
                    <span className="truncate hidden sm:inline">Todas las áreas</span>
                  </>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              align="start"
              sideOffset={6}
              className="border border-white/10 bg-[#0c121e] text-white min-w-[140px] sm:min-w-[200px]"
            >
              <SelectItem value="all">Todas las áreas</SelectItem>
              {availableAreas.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Botón de Orden Cronológico */}
          <button
            type="button"
            onClick={onOrderToggle}
            title="Invertir orden cronológico"
            aria-label={
              currentOrder === 'desc'
                ? 'Orden: Más recientes primero. Pulsar para cambiar a más antiguos.'
                : 'Orden: Más antiguos primero. Pulsar para cambiar a más recientes.'
            }
            className={cn(
              'group h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-xs font-medium border transition-all inline-flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none touch-manipulation active:scale-[0.97] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/60',
              currentOrder === 'asc'
                ? 'bg-[#1a73e8]/18 border-[#4285F4]/60 text-white shadow-[0_0_12px_rgba(26,115,232,0.25)]'
                : 'bg-[#090d16] border-white/[0.08] hover:border-[#4285F4]/40 hover:bg-white/[0.04] text-[#c4c7c5] hover:text-white',
            )}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#669df6] transition-transform duration-200 group-hover:scale-110 shrink-0" />
            <span className="sm:hidden">
              {currentOrder === 'desc' ? 'Recientes' : 'Antiguos'}
            </span>
            <span className="hidden sm:inline">
              {currentOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}
            </span>
          </button>
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

export const FeedFilters = React.memo(FeedFiltersComponent);
