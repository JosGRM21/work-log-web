import React from 'react';
import type { WorkItemSummary, WorkStatus } from '../../../shared/types.js';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  ArrowUpRight,
  Play,
  Calendar,
  Layers,
} from 'lucide-react';

interface WorkCardProps {
  work: WorkItemSummary;
  onClick: () => void;
}

const STATUS_CONFIG: Record<
  WorkStatus,
  {
    label: string;
    pillClass: string;
    dotClass: string;
    glowColor: string;
    ping: boolean;
  }
> = {
  pending: {
    label: 'Por realizar',
    pillClass: 'bg-black/65 text-[#e8eaed] border-white/15',
    dotClass: 'bg-[#9aa0a6]',
    glowColor: 'from-white/[0.06]',
    ping: false,
  },
  in_progress: {
    label: 'En curso',
    pillClass: 'bg-[#081836]/80 text-[#8ab4f8] border-[#4285F4]/35',
    dotClass: 'bg-[#4285F4] shadow-[0_0_8px_#4285F4]',
    glowColor: 'from-[#1a73e8]/25',
    ping: true,
  },
  completed: {
    label: 'Terminado',
    pillClass: 'bg-[#062014]/80 text-[#81c995] border-[#34a853]/35',
    dotClass: 'bg-[#34a853] shadow-[0_0_8px_#34a853]',
    glowColor: 'from-[#34a853]/15',
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
  const totalMedia = (work.media_count?.images || 0) + (work.media_count?.videos || 0);

  return (
    <article
      onClick={onClick}
      className="group relative cursor-pointer rounded-[28px] p-2.5 flex flex-col justify-between bg-gradient-to-b from-[#0b1936]/50 via-[#070b14] to-[#04060b] border border-white/[0.08] hover:border-[#4285F4]/45 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-15px_rgba(26,115,232,0.22)] select-none overflow-hidden"
    >
      {/* Destello luminoso superior estilo Google One AI Card */}
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#669df6]/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Contenedor Visual Enmarcado (16:9) */}
      <div className="relative aspect-video w-full rounded-[20px] bg-[#04070f] overflow-hidden ring-1 ring-white/[0.07]">
        {hasMedia ? (
          isVideo ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                src={work.media_preview!.url}
                className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                preload="none"
              />
              {/* Viñeta oscura suave */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#060a12]/90 via-black/20 to-black/30" />

              {/* Botón Play central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg group-hover:bg-[#1a73e8] group-hover:border-[#4285F4] group-hover:scale-110 transition-all duration-300">
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
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              {/* Viñeta inferior suave para fundir la foto con la tarjeta */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#060a12]/85 via-transparent to-black/25 opacity-90 group-hover:opacity-75 transition-opacity" />
            </div>
          )
        ) : (
          /* Estado sin imagen con atmósfera azul sutil */
          <div
            className={`relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br ${status.glowColor} via-[#060a14] to-[#03050a]`}
          >
            <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-2.5 group-hover:border-[#4285F4]/30 group-hover:bg-[#1a73e8]/10 transition-colors">
              <Layers className="w-5 h-5 text-[#669df6]" />
            </div>
            <span className="text-[11px] font-medium tracking-wide text-[#80868b]">
              Expediente sin vista previa
            </span>
          </div>
        )}

        {/* Cápsula de Estado (Arriba Izquierda) */}
        <div className="absolute top-3 left-3 z-10">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md shadow-xs ${status.pillClass}`}
          >
            <span className="relative flex h-1.5 w-1.5">
              {status.ping && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${status.dotClass}`} />
            </span>
            <span>{status.label}</span>
          </div>
        </div>

        {/* Cápsula Compacta de Conteo Multimedia (Arriba Derecha) */}
        {totalMedia > 0 && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[11px] font-medium text-[#e8eaed] border border-white/12 tabular-nums">
            {work.media_count.images > 0 && (
              <span className="flex items-center gap-1" title="Fotografías">
                <ImageIcon className="w-3 h-3 text-[#669df6]" />
                {work.media_count.images}
              </span>
            )}
            {work.media_count.videos > 0 && (
              <span className="flex items-center gap-1" title="Videos">
                <VideoIcon className="w-3 h-3 text-[#c58af9]" />
                {work.media_count.videos}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cuerpo Tipográfico de la Tarjeta */}
      <div className="px-3.5 pt-4 pb-3 flex flex-col flex-1 justify-between gap-5">
        <div className="space-y-2">
          {/* Metadatos: Fecha */}
          <div className="flex items-center gap-2 text-xs text-[#80868b]">
            <span className="inline-flex items-center gap-1.5 text-[#9aa0a6] font-normal">
              <Calendar className="w-3.5 h-3.5 text-[#669df6]" />
              {formatDate(work.reference_date)}
            </span>
          </div>

          {/* Título de la Obra */}
          <h3 className="text-[17px] sm:text-[18px] font-medium tracking-[-0.015em] text-[#f1f3f4] line-clamp-2 leading-[1.35] group-hover:text-[#8ab4f8] transition-colors font-heading">
            {work.title}
          </h3>
        </div>

        {/* Pie Interactivo Minimalista */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-xs font-medium text-[#80868b] group-hover:text-[#e8eaed] transition-colors">
            Explorar expediente
          </span>

          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#9aa0a6] flex items-center justify-center group-hover:bg-[#1a73e8] group-hover:border-[#4285F4] group-hover:text-white group-hover:shadow-[0_0_15px_rgba(26,115,232,0.5)] transition-all duration-300">
            <ArrowUpRight className="w-4 h-4 stroke-[2.2] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>
    </article>
  );
};