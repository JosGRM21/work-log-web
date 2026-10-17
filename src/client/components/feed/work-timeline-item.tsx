import React, { useCallback, useRef } from 'react';
import type { WorkItemSummary, WorkItemDetail } from '../../../shared/types.js';
import { formatWorkDate } from '@/lib/utils';
import { apiClient } from '../../api/client.js';
import { getCachedWorkDetail, setCachedWorkDetail } from '../../hooks/use-works.js';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  ArrowUpRight,
  Calendar,
  Play,
  Layers,
} from 'lucide-react';
import { STATUS_CONFIG } from '../../constants/status.js';

interface WorkTimelineItemProps {
  work: WorkItemSummary;
  onSelect: (id: string) => void;
  isLast?: boolean;
  priority?: boolean;
}

const WorkTimelineItemComponent: React.FC<WorkTimelineItemProps> = ({
  work,
  onSelect,
  isLast = false,
  priority = false,
}) => {
  const status = STATUS_CONFIG[work.status] || STATUS_CONFIG.pending;
  const hasMedia = !!work.media_preview;
  const isVideo = work.media_preview?.type === 'video';
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
    <div className="relative flex items-start gap-4 sm:gap-6 group">
      {/* Eje Vertical y Nodo Luminoso */}
      <div className="flex flex-col items-center self-stretch pt-7">
        <div
          className={`w-3 h-3 rounded-full ring-4 transition-transform duration-300 group-hover:scale-125 ${status.dotClass} ${status.nodeRing}`}
        />
        {!isLast && (
          <div className="w-px bg-gradient-to-b from-white/15 via-white/[0.07] to-white/15 flex-1 my-2 group-hover:from-[#4285F4]/60 group-hover:via-[#4285F4]/25 transition-colors" />
        )}
      </div>

      {/* Tarjeta Horizontal Estilo Google AI */}
      <article
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 cursor-pointer p-3.5 sm:p-4 mb-4 rounded-[26px] bg-gradient-to-b from-[#0b1936]/45 via-[#070b14] to-[#04060b] border border-white/[0.08] hover:border-[#4285F4]/45 hover:shadow-[0_16px_38px_-12px_rgba(26,115,232,0.2)] hover:-translate-y-0.5 transition-[transform,border-color,box-shadow] duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden select-none"
      >
        <div
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#669df6]/35 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />

        {/* Miniatura Enmarcada + Información */}
        <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
          <div className="relative w-24 h-18 sm:w-32 sm:h-20 rounded-[16px] bg-[#04070f] overflow-hidden shrink-0 ring-1 ring-white/[0.08] flex items-center justify-center">
            {hasMedia ? (
              isVideo ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    src={work.media_preview!.url}
                    poster={work.media_preview?.thumbnail_url}
                    className="w-full h-full object-cover opacity-80"
                    preload="none"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-7 h-7 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
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
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              )
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#669df6]" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 text-[#9aa0a6]">
                <Calendar className="w-3.5 h-3.5 text-[#669df6]" />
                {formatWorkDate(work.reference_date)}
              </span>
              <span className="text-white/20">•</span>
              <span className="text-[11px] font-medium tracking-wide text-[#669df6]/90">
                MIBITURVEN S.A.
              </span>
            </div>

            <h4 className="text-base sm:text-[17px] font-medium tracking-[-0.015em] text-[#f1f3f4] truncate group-hover:text-[#8ab4f8] transition-colors font-heading">
              {work.title}
            </h4>

            <div className="flex items-center gap-3 text-xs text-[#80868b] tabular-nums">
              {work.media_count.images > 0 && (
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-[#669df6]" />
                  {work.media_count.images}{' '}
                  {work.media_count.images === 1 ? 'fotografía' : 'fotografías'}
                </span>
              )}
              {work.media_count.videos > 0 && (
                <span className="flex items-center gap-1">
                  <VideoIcon className="w-3.5 h-3.5 text-[#c58af9]" />
                  {work.media_count.videos}{' '}
                  {work.media_count.videos === 1 ? 'video' : 'videos'}
                </span>
              )}
              {work.media_count.images === 0 && work.media_count.videos === 0 && (
                <span className="text-[#80868b]/70">Sin archivos adjuntos</span>
              )}
            </div>
          </div>
        </div>

        {/* Estado y Botón de Acción */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/[0.06] shrink-0">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${status.pillClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
            <span>{status.label}</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#9aa0a6] flex items-center justify-center group-hover:bg-[#1a73e8] group-hover:border-[#4285F4] group-hover:text-white group-hover:shadow-[0_0_15px_rgba(26,115,232,0.5)] transition-[background-color,border-color,color,box-shadow] duration-300">
            <ArrowUpRight className="w-4 h-4 stroke-[2.2] transition-transform duration-300 group-hover:scale-115" />
          </div>
        </div>
      </article>
    </div>
  );
};

export const WorkTimelineItem = React.memo(WorkTimelineItemComponent, (prev, next) => {
  return (
    prev.onSelect === next.onSelect &&
    prev.priority === next.priority &&
    prev.isLast === next.isLast &&
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