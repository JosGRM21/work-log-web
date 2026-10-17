import React, { useCallback, useRef } from 'react';
import type { WorkItemSummary, WorkItemDetail } from '../../../shared/types.js';
import { formatWorkDate } from '@/lib/utils';
import { apiClient } from '../../api/client.js';
import { getCachedWorkDetail, setCachedWorkDetail } from '../../hooks/use-works.js';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  ArrowUpRight,
  Play,
  Calendar,
  Layers,
} from 'lucide-react';
import { STATUS_CONFIG } from '../../constants/status.js';

interface WorkCardProps {
  work: WorkItemSummary;
  onSelect: (id: string) => void;
  priority?: boolean;
}

const WorkCardComponent: React.FC<WorkCardProps> = ({ work, onSelect, priority = false }) => {
  const hasMedia = !!work.media_preview;
  const isVideo = work.media_preview?.type === 'video';
  const status = STATUS_CONFIG[work.status] || STATUS_CONFIG.pending;
  const totalMedia = (work.media_count?.images || 0) + (work.media_count?.videos || 0);
  const hoverTimerRef = useRef<number | null>(null);

  const handleClick = useCallback(() => {
    onSelect(work.id);
  }, [onSelect, work.id]);

  const handleMouseEnter = useCallback(() => {
    if (getCachedWorkDetail(work.id)) return;
    hoverTimerRef.current = window.setTimeout(async () => {
      try {
        const data = await apiClient.get<WorkItemDetail>(`/works/${work.id}`);
        setCachedWorkDetail(work.id, data);
      } catch {
        // Silently ignore prefetch failures
      }
    }, 150);
  }, [work.id]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  return (
    <article
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative cursor-pointer rounded-[28px] p-2.5 flex flex-col justify-between bg-gradient-to-b from-[#0b1936]/50 via-[#070b14] to-[#04060b] border border-white/[0.08] hover:border-[#4285F4]/45 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-15px_rgba(26,115,232,0.22)] select-none overflow-hidden"
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
                poster={work.media_preview?.thumbnail_url}
                className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-[transform,opacity] duration-700 ease-out"
                preload="none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060a12]/90 via-black/20 to-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg group-hover:bg-[#1a73e8] group-hover:border-[#4285F4] group-hover:scale-110 transition-[transform,background-color,border-color] duration-300">
                  <Play className="w-5 h-5 ml-0.5 fill-current" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <img
                src={work.media_preview!.thumbnail_url || work.media_preview!.url}
                alt={work.title}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                decoding="async"
                onError={(e) => {
                  if (
                    work.media_preview?.thumbnail_url &&
                    e.currentTarget.src !== work.media_preview.url
                  ) {
                    e.currentTarget.src = work.media_preview.url;
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060a12]/85 via-transparent to-black/25 opacity-90 group-hover:opacity-75 transition-opacity" />
            </div>
          )
        ) : (
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
                <VideoIcon className="w-3.5 h-3.5 text-[#c58af9]" />
                {work.media_count.videos}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cuerpo Tipográfico de la Tarjeta */}
      <div className="px-3.5 pt-4 pb-3 flex flex-col flex-1 justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[#80868b]">
            <span className="inline-flex items-center gap-1.5 text-[#9aa0a6] font-normal">
              <Calendar className="w-3.5 h-3.5 text-[#669df6]" />
              {formatWorkDate(work.reference_date)}
            </span>
          </div>

          <h3 className="text-[17px] sm:text-[18px] font-medium tracking-[-0.015em] text-[#f1f3f4] line-clamp-2 leading-[1.35] group-hover:text-[#8ab4f8] transition-colors font-heading">
            {work.title}
          </h3>
        </div>

        {/* Pie Interactivo Minimalista */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-xs font-medium text-[#80868b] group-hover:text-[#e8eaed] transition-colors">
            Explorar expediente
          </span>
          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#9aa0a6] flex items-center justify-center group-hover:bg-[#1a73e8] group-hover:border-[#4285F4] group-hover:text-white group-hover:shadow-[0_0_15px_rgba(26,115,232,0.5)] transition-[background-color,border-color,color,box-shadow] duration-300">
            <ArrowUpRight className="w-4 h-4 stroke-[2.2] transition-transform duration-300 group-hover:scale-115" />
          </div>
        </div>
      </div>
    </article>
  );
};

export const WorkCard = React.memo(WorkCardComponent, (prev, next) => {
  return (
    prev.onSelect === next.onSelect &&
    prev.priority === next.priority &&
    prev.work.id === next.work.id &&
    prev.work.status === next.work.status &&
    prev.work.title === next.work.title &&
    prev.work.reference_date === next.work.reference_date &&
    prev.work.media_preview?.url === next.work.media_preview?.url &&
    prev.work.media_preview?.thumbnail_url === next.work.media_preview?.thumbnail_url &&
    prev.work.media_preview?.type === next.work.media_preview?.type &&
    prev.work.media_count?.images === next.work.media_count?.images &&
    prev.work.media_count?.videos === next.work.media_count?.videos
  );
});