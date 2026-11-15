import React, { useEffect, useRef, useCallback } from 'react';
import type { MediaAssetDTO } from '@shared/types.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Play,
  Trash2,
  UploadCloud,
  Maximize2,
  Image as ImageIcon,
  Video as VideoIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface WorkMediaGalleryProps {
  mediaList: MediaAssetDTO[];
  selectedMediaIndex: number;
  imagesCount: number;
  videosCount: number;
  isAuthenticated: boolean;
  failedThumbIds: Set<string>;
  onMarkThumbFailed: (id: string) => void;
  onSelectMedia: (index: number) => void;
  onSetCarouselApi: (api: CarouselApi) => void;
  onOpenLightbox: (index: number) => void;
  onRequestDeleteMedia: (mediaId: string) => void;
  onOpenUpload: () => void;
  className?: string;
}

export const WorkMediaGallery: React.FC<WorkMediaGalleryProps> = ({
  mediaList,
  selectedMediaIndex,
  imagesCount,
  videosCount,
  isAuthenticated,
  failedThumbIds,
  onMarkThumbFailed,
  onSelectMedia,
  onSetCarouselApi,
  onOpenLightbox,
  onRequestDeleteMedia,
  onOpenUpload,
  className,
}) => {
  const activeMedia = mediaList[selectedMediaIndex] || null;
  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const container = thumbnailsContainerRef.current;
    const selectedThumb = thumbnailRefs.current[selectedMediaIndex];
    if (container && selectedThumb) {
      const targetScroll =
        selectedThumb.offsetLeft - container.clientWidth / 2 + selectedThumb.clientWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [selectedMediaIndex]);

  const handleScrollThumbnails = useCallback((direction: 'left' | 'right') => {
    if (!thumbnailsContainerRef.current) return;
    const scrollAmount = 240;
    thumbnailsContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  const handleThumbnailsWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (thumbnailsContainerRef.current && e.deltaY !== 0) {
      thumbnailsContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  return (
    <div
      className={cn(
        'w-full lg:w-[58%] xl:w-[60%] flex flex-col shrink-0 lg:shrink lg:h-full bg-gradient-to-b from-[#060a14] via-[#04060c] to-[#020306] border-b lg:border-b-0 lg:border-r border-white/[0.08] p-3.5 sm:p-5 gap-3 sm:gap-3.5 min-h-0',
        className,
      )}
    >
      <div
        className={cn(
          'relative rounded-[12px] overflow-hidden group shadow-2xl flex flex-col',
          mediaList.length > 0
            ? 'border border-white/[0.08] bg-black/95 aspect-video sm:h-72 lg:h-auto lg:flex-1 lg:min-h-[320px]'
            : 'border border-white/[0.14] bg-[#0c1322]/60 h-44 sm:h-60 lg:h-auto lg:flex-1 lg:min-h-[280px]',
        )}
      >
        {mediaList.length > 0 ? (
          <Carousel
            setApi={onSetCarouselApi}
            opts={{
              loop: mediaList.length > 1,
              align: 'start',
            }}
            className="w-full h-full flex flex-col justify-center relative select-none"
          >
            <CarouselContent className="h-full ml-0">
              {mediaList.map((item, idx) => {
                const isNearActive =
                  Math.abs(idx - selectedMediaIndex) <= 1 ||
                  (selectedMediaIndex === 0 && idx === mediaList.length - 1) ||
                  (selectedMediaIndex === mediaList.length - 1 && idx === 0);

                return (
                  <CarouselItem
                    key={item.id}
                    className="pl-0 h-full flex items-center justify-center relative"
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={`Evidencia ${idx + 1}`}
                        loading={isNearActive ? 'eager' : 'lazy'}
                        decoding="async"
                        className="w-full h-full max-h-[500px] object-contain cursor-pointer transition-transform duration-300"
                        onClick={() => onOpenLightbox(idx)}
                      />
                    ) : (
                      <div
                        className="relative w-full h-full max-h-[500px] flex items-center justify-center cursor-pointer group/video"
                        onClick={() => onOpenLightbox(idx)}
                      >
                        {idx === selectedMediaIndex ||
                        !item.thumbnail_url ||
                        failedThumbIds.has(item.id) ? (
                          <video
                            src={item.url}
                            poster={
                              item.thumbnail_url && !failedThumbIds.has(item.id)
                                ? item.thumbnail_url
                                : undefined
                            }
                            className="w-full h-full object-contain"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={item.thumbnail_url}
                            alt={`Vista previa ${idx + 1}`}
                            onError={() => onMarkThumbFailed(item.id)}
                            className="w-full h-full object-contain bg-black/60"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors">
                          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shadow-[0_0_25px_rgba(26,115,232,0.6)] transition-transform [@media(hover:hover)]:group-hover/video:scale-110">
                            <Play className="w-6 h-6 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            {activeMedia && (
              <>
                <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 flex items-center gap-1.5 pointer-events-none">
                  <Badge className="bg-black/75 backdrop-blur-md text-white border border-white/15 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-lg">
                    {selectedMediaIndex + 1} / {mediaList.length}
                  </Badge>
                  <Badge className="bg-black/75 backdrop-blur-md text-[#8ab4f8] border border-white/15 text-[11px] font-medium capitalize rounded-full">
                    {activeMedia.type === 'image' ? (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Foto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <VideoIcon className="w-3 h-3 text-cyan-400" /> Video
                      </span>
                    )}
                  </Badge>
                </div>

                <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 flex items-center gap-1.5 opacity-95 transition-opacity">
                  {isAuthenticated && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-9 w-9 sm:h-8 sm:w-8 rounded-full bg-black/75 hover:bg-destructive text-white backdrop-blur-md border border-white/15 shadow-lg"
                      title="Eliminar este archivo de evidencia"
                      aria-label="Eliminar archivo de evidencia"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDeleteMedia(activeMedia.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-full bg-black/75 hover:bg-[#1a73e8] text-white backdrop-blur-md border border-white/15 shadow-lg transition-colors"
                    title="Ver a pantalla completa"
                    aria-label="Ver a pantalla completa"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(selectedMediaIndex);
                    }}
                  >
                    <Maximize2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </Button>
                </div>

                {mediaList.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2.5 sm:left-3 h-9 w-9 rounded-full bg-black/65 hover:bg-[#1a73e8] text-white border border-white/15 backdrop-blur-md opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-10" />
                    <CarouselNext className="right-2.5 sm:right-3 h-9 w-9 rounded-full bg-black/65 hover:bg-[#1a73e8] text-white border border-white/15 backdrop-blur-md opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-10" />
                  </>
                )}
              </>
            )}
          </Carousel>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-5 sm:p-6 max-w-sm m-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#8ab4f8] mb-3 shadow-[0_0_20px_rgba(26,115,232,0.1)]">
              <Layers className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-white">
              Sin evidencias multimedia registradas
            </p>
            <p className="text-xs text-[#9aa0a6] mt-1.5 leading-relaxed">
              {isAuthenticated
                ? 'Sube fotografías o videos para enriquecer el expediente técnico de esta obra.'
                : 'No se han adjuntado registros audiovisuales para este trabajo.'}
            </p>
            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenUpload}
                className="mt-4 h-9 sm:h-8 rounded-full border-[#1a73e8]/40 hover:bg-[#1a73e8]/10 text-[#8ab4f8] text-xs font-medium gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Subir Primeros Archivos
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tira de Miniaturas (Filmstrip Horizontal) */}
      <div
        className={cn(
          'shrink-0 flex-col gap-2',
          mediaList.length === 0 ? 'hidden lg:flex' : 'flex',
        )}
      >
        <div className="flex items-center justify-between px-0.5 sm:px-1 gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9aa0a6] flex items-center gap-1.5 truncate">
            <ImageIcon className="w-3 h-3 text-[#4285F4] shrink-0" />
            <span className="truncate">Evidencias ({mediaList.length})</span>
          </span>
          {mediaList.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-[#9aa0a6] tabular-nums">
                {imagesCount} fotos • {videosCount} videos
              </span>
              {mediaList.length > 3 && (
                <div className="hidden sm:flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => handleScrollThumbnails('left')}
                    className="h-6 w-6 rounded-full bg-white/[0.04] hover:bg-white/10 text-[#9aa0a6] hover:text-white transition-colors"
                    title="Desplazar miniaturas hacia la izquierda"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => handleScrollThumbnails('right')}
                    className="h-6 w-6 rounded-full bg-white/[0.04] hover:bg-white/10 text-[#9aa0a6] hover:text-white transition-colors"
                    title="Desplazar miniaturas hacia la derecha"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {mediaList.length > 0 ? (
          <div
            ref={thumbnailsContainerRef}
            onWheel={handleThumbnailsWheel}
            className="relative flex items-center gap-2 sm:gap-2.5 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth snap-x"
          >
            {mediaList.map((item, index) => {
              const isSelected = index === selectedMediaIndex;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    thumbnailRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => onSelectMedia(index)}
                  className={cn(
                    'relative w-20 sm:w-24 md:w-28 shrink-0 aspect-video rounded-[6px] overflow-hidden border-2 transition-[transform,opacity,border-color] duration-200 focus:outline-none bg-black/60 group/thumb snap-start',
                    isSelected
                      ? 'border-[#4285F4] ring-2 ring-[#4285F4]/60 scale-[1.03] shadow-[0_0_14px_rgba(66,133,244,0.55)] opacity-100 z-10'
                      : 'border-white/[0.12] hover:border-white/30 opacity-60 hover:opacity-100',
                  )}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.thumbnail_url || item.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        if (item.thumbnail_url && e.currentTarget.src !== item.url) {
                          e.currentTarget.src = item.url;
                        }
                      }}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-[#0c1424] to-[#04060c] overflow-hidden">
                      {item.thumbnail_url && !failedThumbIds.has(item.id) && (
                        <img
                          src={item.thumbnail_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={() => onMarkThumbFailed(item.id)}
                          className="absolute inset-0 w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300 opacity-80"
                        />
                      )}
                      <div className="w-6 h-6 rounded-md bg-[#1a73e8] text-white flex items-center justify-center shadow-md relative z-10">
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                      <span className="absolute bottom-1 right-1 text-[8px] font-bold text-cyan-300 bg-black/80 px-1 rounded z-10">
                        VIDEO
                      </span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[#1a73e8]/15 pointer-events-none" />
                  )}
                </button>
              );
            })}

            {isAuthenticated && mediaList.length < 24 && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="w-20 sm:w-24 md:w-28 shrink-0 aspect-video rounded-[6px] border border-dashed border-white/20 hover:border-[#4285F4]/60 bg-white/[0.02] hover:bg-[#1a73e8]/10 flex flex-col items-center justify-center gap-1 text-[#9aa0a6] hover:text-[#8ab4f8] transition-colors group/add snap-start"
                title="Añadir más fotos o videos"
              >
                <UploadCloud className="w-4 h-4 transition-transform group-hover/add:scale-110" />
                <span className="text-[10px] font-medium">+ Añadir</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2.5">
            {[1, 2, 3, 4].map((slot) => (
              <div
                key={slot}
                className="aspect-video rounded-[6px] border border-dashed border-white/20 bg-[#0c1322]/50 flex items-center justify-center text-white/25 hover:border-white/30 transition-colors"
              >
                <ImageIcon className="w-5 h-5 stroke-[1.2]" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
