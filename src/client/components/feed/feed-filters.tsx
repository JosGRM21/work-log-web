import React from 'react';
import type { WorkStatus } from '../../../shared/types.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, LayoutGrid, ListTree, Search, X, Filter } from 'lucide-react';

export type ViewMode = 'grid' | 'timeline';

interface FeedFiltersProps {
  currentStatus: WorkStatus | 'all';
  onStatusChange: (status: WorkStatus | 'all') => void;
  currentOrder: 'desc' | 'asc';
  onOrderToggle: () => void;
  totalResults: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
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
  totalResults,
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  counts,
}) => {
  const filters: Array<{ id: WorkStatus | 'all'; label: string; count?: number }> = [
    { id: 'all', label: 'Todos', count: counts?.all },
    { id: 'completed', label: 'Terminados', count: counts?.completed },
    { id: 'in_progress', label: 'En Curso', count: counts?.in_progress },
    { id: 'pending', label: 'Por Realizar', count: counts?.pending },
  ];

  return (
    <div className="flex flex-col gap-4 py-2 border-b border-border/80">
      {/* Fila Superior: Búsqueda y Modos de Vista */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input de Búsqueda en vivo */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar por nombre de obra o trabajo..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-10 text-xs sm:text-sm bg-card/60 border-border/80 rounded-xl focus-visible:ring-amber-500/30"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controles: Orden cronológico y Selector de Vista (Grid vs Timeline) */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOrderToggle}
            className="h-10 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-xl border-border/80 bg-card/60 shadow-xs"
            title="Invertir orden cronológico"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">
              {currentOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}
            </span>
            <span className="sm:hidden">{currentOrder === 'desc' ? 'Recientes' : 'Antiguos'}</span>
          </Button>

          {/* Selector de Modo de Vista */}
          <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/60">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onViewModeChange('grid')}
              className={`h-8 w-8 rounded-lg ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Vista Cuadrícula de Tarjetas"
              aria-label="Vista cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onViewModeChange('timeline')}
              className={`h-8 w-8 rounded-lg ${
                viewMode === 'timeline'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Vista Línea de Tiempo Cronológica"
              aria-label="Vista línea de tiempo"
            >
              <ListTree className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Fila Inferior: Pestañas de Estados con Badges de Conteo */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50">
          {filters.map((filter) => {
            const isActive = currentStatus === filter.id;
            return (
              <Button
                key={filter.id}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onStatusChange(filter.id)}
                className={`h-8 rounded-lg text-xs transition-all gap-1.5 ${
                  isActive
                    ? 'bg-card text-foreground font-semibold shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{filter.label}</span>
                {filter.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {filter.count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Filter className="w-3.5 h-3.5 text-amber-500" />
          <span>
            <strong className="text-foreground">{totalResults}</strong>{' '}
            {totalResults === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
      </div>
    </div>
  );
};
