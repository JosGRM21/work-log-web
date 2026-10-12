import React from 'react';
import type { WorkStatus } from '../../../shared/types.js';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Layers } from 'lucide-react';

interface FeedFiltersProps {
    currentStatus: WorkStatus | 'all';
    onStatusChange: (status: WorkStatus | 'all') => void;
    currentOrder: 'desc' | 'asc';
    onOrderToggle: () => void;
    totalResults: number;
}

const STATUS_FILTERS: Array<{ id: WorkStatus | 'all'; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'pending', label: 'Por Realizar' },
    { id: 'in_progress', label: 'En Curso' },
    { id: 'completed', label: 'Terminados' },
];

export const FeedFilters: React.FC<FeedFiltersProps> = ({
    currentStatus,
    onStatusChange,
    currentOrder,
    onOrderToggle,
    totalResults,
}) => {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3 border-b border-border">
            {/* Pestañas de filtrado de estados */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50">
                {STATUS_FILTERS.map((filter) => {
                    const isActive = currentStatus === filter.id;
                    return (
                        <Button
                            key={filter.id}
                            variant={isActive ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onStatusChange(filter.id)}
                            className={`rounded-lg transition-all text-xs font-medium ${
                                isActive ? 'shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {filter.label}
                        </Button>
                    );
                })}
            </div>

            {/* Ordenación cronológica y contador */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                        <strong className="text-foreground">{totalResults}</strong> {totalResults === 1 ? 'proyecto' : 'proyectos'}
                    </span>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onOrderToggle}
                    className="text-xs text-muted-foreground hover:text-foreground gap-1.5 shadow-xs"
                    title="Alternar orden cronológico"
                >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>{currentOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}</span>
                </Button>
            </div>
        </div>
    );
};