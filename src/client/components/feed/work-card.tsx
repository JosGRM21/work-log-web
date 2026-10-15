import React from 'react';
import type { WorkItemSummary, WorkStatus } from '../../../shared/types.js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Video as VideoIcon, ArrowUpRight, Play, Calendar } from 'lucide-react';

interface WorkCardProps {
  work: WorkItemSummary;
  onClick: () => void;
}

const STATUS_CONFIG: Record<
  WorkStatus,
  { label: string; badgeClass: string; dotClass: string; ping: boolean }
> = {
  pending: {
    label: 'Por Realizar',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    dotClass: 'bg-amber-500',
    ping: false,
  },
  in_progress: {
    label: 'En Curso',
    badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25',
    dotClass: 'bg-cyan-500',
    ping: true,
  },
  completed: {
    label: 'Terminado',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    dotClass: 'bg-emerald-500',
    ping: false,
  },
};

export const WorkCard: React.FC<WorkCardProps> = ({ work, onClick }) => {
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

  const hasMedia = !!work.media_preview;
  const isVideo = work.media_preview?.type === 'video';
  const status = STATUS_CONFIG[work.status] || STATUS_CONFIG.pending;

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer overflow-hidden border border-border/80 bg-card hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between py-0 gap-0 rounded-2xl"
    >
      {/* Contenedor Visual de Miniatura 16:9 */}
      <div className="relative aspect-video w-full bg-slate-900/60 overflow-hidden flex items-center justify-center border-b border-border/60">
        {hasMedia ? (
          isVideo ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black/90">
              <video
                src={work.media_preview!.url}
                className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                preload="metadata"
              />
              {/* Overlay de degradado */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 ml-0.5 fill-current" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <img
                src={work.media_preview!.url}
                alt={work.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              {/* Overlay de degradado suave */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 p-6 text-center w-full h-full bg-muted/20">
            <ImageIcon className="w-10 h-10 opacity-30 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground/80">
              Sin registro visual preliminar
            </span>
          </div>
        )}

        {/* Badge de Estado flotante (Arriba Izquierda) */}
        <div className="absolute top-3 left-3 z-10">
          <Badge
            variant="outline"
            className={`backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold gap-1.5 shadow-sm ${status.badgeClass}`}
          >
            <span className="relative flex h-2 w-2">
              {status.ping && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status.dotClass}`} />
            </span>
            <span>{status.label}</span>
          </Badge>
        </div>

        {/* Pill de Fecha (Arriba Derecha) */}
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/10 shadow-sm">
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>{formatDate(work.reference_date)}</span>
          </div>
        </div>

        {/* Conteo de medios superpuesto (Abajo Izquierda) */}
        {(work.media_count.images > 0 || work.media_count.videos > 0) && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-2 px-2 py-0.5 rounded-lg bg-black/65 backdrop-blur-md text-[11px] font-medium text-white/90 border border-white/10">
            {work.media_count.images > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-amber-400" />
                {work.media_count.images}
              </span>
            )}
            {work.media_count.videos > 0 && (
              <span className="flex items-center gap-1">
                <VideoIcon className="w-3 h-3 text-cyan-400" />
                {work.media_count.videos}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cuerpo de la Tarjeta */}
      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
            Obra MIBITURVEN
          </span>
          <h3 className="text-base font-bold text-foreground line-clamp-2 leading-snug group-hover:text-amber-500 transition-colors">
            {work.title}
          </h3>
        </div>

        {/* Pie de Tarjeta / Botón interactivo */}
        <div className="pt-3 border-t border-border/70 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium group-hover:text-foreground transition-colors">
            Ver Ficha Técnica
          </span>
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300">
            <ArrowUpRight className="w-4 h-4 stroke-[2.2] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Card>
  );
};
