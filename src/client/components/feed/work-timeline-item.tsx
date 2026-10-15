import React from 'react';
import type { WorkItemSummary, WorkStatus } from '../../../shared/types.js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Video as VideoIcon, ArrowRight, Calendar, Play } from 'lucide-react';

interface WorkTimelineItemProps {
  work: WorkItemSummary;
  onClick: () => void;
  isLast?: boolean;
}

const STATUS_CONFIG: Record<WorkStatus, { label: string; badgeClass: string; dotClass: string }> = {
  pending: {
    label: 'Por Realizar',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    dotClass: 'bg-amber-500 ring-amber-500/30',
  },
  in_progress: {
    label: 'En Curso',
    badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25',
    dotClass: 'bg-cyan-500 ring-cyan-500/30 animate-pulse',
  },
  completed: {
    label: 'Terminado',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    dotClass: 'bg-emerald-500 ring-emerald-500/30',
  },
};

export const WorkTimelineItem: React.FC<WorkTimelineItemProps> = ({
  work,
  onClick,
  isLast = false,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const status = STATUS_CONFIG[work.status] || STATUS_CONFIG.pending;
  const hasMedia = !!work.media_preview;
  const isVideo = work.media_preview?.type === 'video';

  return (
    <div className="relative flex items-start gap-4 sm:gap-6 group">
      {/* Nodo y Línea de Conexión Vertical */}
      <div className="flex flex-col items-center self-stretch">
        <div
          className={`w-3.5 h-3.5 rounded-full ring-4 mt-5 transition-transform group-hover:scale-125 ${status.dotClass}`}
        />
        {!isLast && (
          <div className="w-0.5 bg-border/80 flex-1 my-1 group-hover:bg-amber-500/40 transition-colors" />
        )}
      </div>

      {/* Ficha Horizontal de Hito */}
      <Card
        onClick={onClick}
        className="flex-1 cursor-pointer p-4 sm:p-5 mb-4 border border-border/80 bg-card hover:border-amber-500/40 hover:shadow-md transition-all duration-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        {/* Miniatura y Detalles */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative w-20 h-16 sm:w-24 sm:h-18 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 border border-border/70 flex items-center justify-center">
            {hasMedia ? (
              <>
                <img
                  src={work.media_preview!.url}
                  alt={work.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="w-4 h-4 text-amber-400 fill-current" />
                  </div>
                )}
              </>
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
            )}
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                MIBITURVEN S.A.
              </span>
              <span className="text-muted-foreground/40">•</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <Calendar className="w-3 h-3 text-amber-500" />
                <span>{formatDate(work.reference_date)}</span>
              </div>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-amber-500 transition-colors">
              {work.title}
            </h4>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              {work.media_count.images > 0 && (
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-amber-500" />
                  {work.media_count.images} {work.media_count.images === 1 ? 'foto' : 'fotos'}
                </span>
              )}
              {work.media_count.videos > 0 && (
                <span className="flex items-center gap-1">
                  <VideoIcon className="w-3 h-3 text-cyan-500" />
                  {work.media_count.videos} {work.media_count.videos === 1 ? 'video' : 'videos'}
                </span>
              )}
              {work.media_count.images === 0 && work.media_count.videos === 0 && (
                <span className="text-muted-foreground/60">Sin medios adjuntos</span>
              )}
            </div>
          </div>
        </div>

        {/* Badge de Estado y Botón de Apertura */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <Badge variant="outline" className={`text-xs font-semibold ${status.badgeClass}`}>
            {status.label}
          </Badge>
          <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Card>
    </div>
  );
};
