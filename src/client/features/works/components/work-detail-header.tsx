import React from 'react';
import type { WorkItemDetail } from '@shared/types.js';
import { cn, formatWorkDate } from '@/lib/utils';
import { STATUS_CONFIG } from '@/constants/status.js';
import { Button } from '@/components/ui/button';
import { Calendar, UploadCloud, Pencil, Trash2, X } from 'lucide-react';

interface WorkDetailHeaderProps {
  work: WorkItemDetail;
  isAuthenticated: boolean;
  activeTab: string;
  onToggleUpload: () => void;
  onEdit: (work: WorkItemDetail) => void;
  onDelete: (workId: string) => void;
  onClose: () => void;
}

export const WorkDetailHeader: React.FC<WorkDetailHeaderProps> = ({
  work,
  isAuthenticated,
  activeTab,
  onToggleUpload,
  onEdit,
  onDelete,
  onClose,
}) => {
  const statusInfo = STATUS_CONFIG[work.status] || STATUS_CONFIG.pending;

  return (
    <header className="px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:py-3 border-b border-white/[0.08] flex items-center justify-between gap-2 sm:gap-4 shrink-0 bg-[#080c14]/95 backdrop-blur-md z-20">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0',
            statusInfo.pillClass,
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            {statusInfo.ping && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
            )}
            <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', statusInfo.dotClass)} />
          </span>
          <span>{statusInfo.label}</span>
        </div>

        <span className="text-xs text-[#9aa0a6] inline-flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 text-[#4285F4] shrink-0" />
          <span className="truncate">{formatWorkDate(work.reference_date)}</span>
        </span>
      </div>

      {/* Acciones de la Barra Superior */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {isAuthenticated && (
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/[0.08]">
            <Button
              variant={activeTab === 'upload' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onToggleUpload}
              className={cn(
                'h-8 sm:h-7 px-2.5 sm:px-3 text-xs font-medium rounded-full gap-1.5 transition-colors',
                activeTab === 'upload'
                  ? 'bg-[#1a73e8] text-white hover:bg-[#1557b0]'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-white/10',
              )}
              title="Subir fotos o videos"
              aria-label="Subir fotos o videos"
            >
              <UploadCloud className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">
                {activeTab === 'upload' ? 'Cerrar Subida' : 'Subir Medios'}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(work)}
              className="h-8 sm:h-7 px-2.5 sm:px-3 text-xs font-medium rounded-full gap-1.5 text-[#9aa0a6] hover:text-white hover:bg-white/10 transition-colors"
              title="Editar información del trabajo"
              aria-label="Editar información del trabajo"
            >
              <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(work.id)}
              className="h-8 w-8 sm:h-7 sm:w-7 text-[#9aa0a6] hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
              title="Eliminar este trabajo"
              aria-label="Eliminar este trabajo"
            >
              <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 sm:h-8 sm:w-8 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/10 transition-colors"
          title="Cerrar modal (Esc)"
          aria-label="Cerrar modal"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};
