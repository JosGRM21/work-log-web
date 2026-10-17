import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { WorkItemDetail, MediaAssetDTO } from '../../../shared/types.js';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../context/auth-context.js';
import { cn, formatWorkDate } from '@/lib/utils';
import { getCachedWorkDetail, setCachedWorkDetail } from '../../hooks/use-works.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Clock,
  Play,
  Pencil,
  Trash2,
  UploadCloud,
  Loader2,
  AlertTriangle,
  FileText,
  Maximize2,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Calendar,
  Copy,
  Check,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { STATUS_CONFIG } from '../../constants/status.js';

const MediaLightbox = React.lazy(() =>
  import('../media/media-lightbox.js').then((m) => ({ default: m.MediaLightbox })),
);
const MediaUploader = React.lazy(() =>
  import('../media/media-uploader.js').then((m) => ({ default: m.MediaUploader })),
);

interface WorkDetailModalProps {
  workId: string | null;
  refreshKey?: number;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (work: WorkItemDetail) => void;
  onDelete: (workId: string) => void;
  onWorkUpdated: () => void;
}

function calculateDuration(startStr: string | null, endStr: string | null): string | null {
  if (!startStr) return null;
  try {
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 día' : `${diffDays} días`;
  } catch {
    return null;
  }
}

export const WorkDetailModal: React.FC<WorkDetailModalProps> = ({
  workId,
  refreshKey = 0,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onWorkUpdated,
}) => {
  const { isAuthenticated } = useAuth();
  const [work, setWork] = useState<WorkItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeTab, setActiveTab] = useState<string>('dossier');
  const [copiedDesc, setCopiedDesc] = useState(false);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);

  useEffect(() => {
    if (!carouselApi) return;

    const handleSelect = () => {
      const snap = carouselApi.selectedScrollSnap();
      setSelectedMediaIndex((prev) => (prev !== snap ? snap : prev));
    };

    carouselApi.on('select', handleSelect);
    return () => {
      carouselApi.off('select', handleSelect);
    };
  }, [carouselApi]);

  const handleSelectMedia = useCallback(
    (idx: number) => {
      setSelectedMediaIndex(idx);
      carouselApi?.scrollTo(idx);
    },
    [carouselApi],
  );

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

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const loadWork = useCallback(
    async (bypassCache = false) => {
      if (!workId) return;

      const cached = getCachedWorkDetail(workId);
      if (cached && !bypassCache) {
        setWork(cached);
        setSelectedMediaIndex((prev) =>
          cached.media.length > 0 ? Math.min(prev, cached.media.length - 1) : 0,
        );
        setIsLoading(false);
        setError(null);
        return;
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<WorkItemDetail>(`/works/${workId}`, {
          signal: abortController.signal,
        });
        setCachedWorkDetail(workId, data);
        setWork(data);
        setSelectedMediaIndex((prev) =>
          data.media.length > 0 ? Math.min(prev, data.media.length - 1) : 0,
        );
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }
        setError((err as Error).message);
      } finally {
        if (abortControllerRef.current === abortController) {
          setIsLoading(false);
        }
      }
    },
    [workId],
  );

  useEffect(() => {
    if (isOpen && workId) {
      void loadWork(refreshKey > 0);
      setActiveTab('dossier');
    } else {
      abortControllerRef.current?.abort();
      setWork(null);
      setSelectedMediaIndex(0);
      setLightboxIndex(null);
    }
  }, [isOpen, workId, refreshKey, loadWork]);

  const handleDeleteMediaConfirm = async (mediaId: string) => {
    setIsDeletingMedia(true);
    try {
      await apiClient.delete(`/media/${mediaId}`);
      await loadWork(true);
      onWorkUpdated();
      setMediaToDelete(null);
      toast.add({
        title: 'Archivo eliminado',
        description: 'El recurso multimedia fue purgado correctamente.',
        type: 'success',
      });
    } catch (err) {
      toast.add({
        title: 'Error al eliminar archivo',
        description: (err as Error).message,
        type: 'error',
      });
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handleCopyText = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
    toast.add({
      title: 'Copiado al portapapeles',
      description: 'Descripción copiada.',
      type: 'info',
    });
  }, []);

  const mediaList: MediaAssetDTO[] = work?.media || [];

  const { imagesCount, videosCount } = useMemo(() => {
    let images = 0;
    let videos = 0;
    for (const m of mediaList) {
      if (m.type === 'image') images++;
      else if (m.type === 'video') videos++;
    }
    return { imagesCount: images, videosCount: videos };
  }, [mediaList]);

  const _statusInfo = work
    ? STATUS_CONFIG[work.status] || STATUS_CONFIG.pending
    : STATUS_CONFIG.pending;
  const activeMedia = mediaList[selectedMediaIndex] || null;
  const duration = useMemo(
    () => (work ? calculateDuration(work.start_date, work.end_date) : null),
    [work?.start_date, work?.end_date],
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[96vw] xl:max-w-6xl w-full h-[92dvh] lg:h-[86vh] max-h-[880px] p-0 gap-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#080c14] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(26,115,232,0.12)] flex flex-col"
        >
          <div
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#669df6]/50 to-transparent z-30"
            aria-hidden="true"
          />

          {isLoading ? (
            <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden p-6 gap-6 animate-pulse">
              <div className="w-full lg:w-[58%] flex flex-col gap-4">
                <Skeleton className="w-full aspect-video lg:flex-1 rounded-2xl bg-white/[0.04]" />
                <div className="flex gap-2.5 h-16 overflow-hidden">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton
                      key={i}
                      className="w-20 sm:w-24 md:w-28 shrink-0 aspect-video rounded-xl bg-white/[0.04]"
                    />
                  ))}
                </div>
              </div>
              <div className="w-full lg:w-[42%] flex flex-col gap-4 pt-2">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-28 rounded-full bg-white/[0.05]" />
                  <Skeleton className="h-6 w-24 rounded-full bg-white/[0.05]" />
                </div>
                <Skeleton className="h-8 w-3/4 rounded-lg bg-white/[0.05]" />
                <Skeleton className="h-28 w-full rounded-2xl bg-white/[0.04]" />
                <Skeleton className="h-36 w-full rounded-2xl bg-white/[0.04]" />
                <div className="mt-auto flex justify-end">
                  <Skeleton className="h-10 w-28 rounded-full bg-white/[0.05]" />
                </div>
              </div>
            </div>
          ) : error || !work ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-heading font-medium text-white">
                  No fue posible cargar el trabajo
                </DialogTitle>
                <DialogDescription className="text-sm text-[#9aa0a6] max-w-sm">
                  {error ||
                    'El identificador solicitado no existe o hubo un problema al obtener los datos.'}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="mt-2 rounded-full border-white/10 hover:border-white/20 text-white hover:bg-white/5 px-5"
              >
                Cerrar Ventana
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {/* Barra Superior Unificada con Título */}
              <header className="px-5 sm:px-6 py-3 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0 bg-[#080c14]/95 backdrop-blur-md z-20">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <DialogHeader className="p-0 m-0 text-left min-w-0 flex-1">
                    <DialogTitle className="text-base sm:text-lg font-medium tracking-tight text-white leading-snug font-heading truncate">
                      {work.title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Expediente técnico de la obra {work.title}.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[#9aa0a6] hidden md:inline-flex items-center gap-1.5 pl-1 border-l border-white/[0.08]">
                      <Calendar className="w-3.5 h-3.5 text-[#4285F4]" />
                      {formatWorkDate(work.reference_date)}
                    </span>
                  </div>
                </div>

                {/* Acciones de la Barra Superior */}
                <div className="flex items-center gap-2 shrink-0">
                  {isAuthenticated && (
                    <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-full border border-white/[0.08]">
                      <Button
                        variant={activeTab === 'upload' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() =>
                          setActiveTab((prev) => (prev === 'upload' ? 'dossier' : 'upload'))
                        }
                        className={cn(
                          'h-7 px-3 text-xs font-medium rounded-full gap-1.5 transition-colors',
                          activeTab === 'upload'
                            ? 'bg-[#1a73e8] text-white hover:bg-[#1557b0]'
                            : 'text-[#9aa0a6] hover:text-white hover:bg-white/10',
                        )}
                        title="Subir fotos o videos"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {activeTab === 'upload' ? 'Cerrar Subida' : 'Subir Medios'}
                        </span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(work)}
                        className="h-7 px-3 text-xs font-medium rounded-full gap-1.5 text-[#9aa0a6] hover:text-white hover:bg-white/10 transition-colors"
                        title="Editar información del trabajo"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(work.id)}
                        className="h-7 w-7 text-[#9aa0a6] hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                        title="Eliminar este trabajo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/10 transition-colors ml-1"
                    title="Cerrar modal (Esc)"
                  >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Cerrar</span>
                  </Button>
                </div>
              </header>

              {/* Cuerpo del Modal: 2 Columnas Responsivas */}
              <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden no-scrollbar">
                {/* COLUMNA IZQUIERDA: Visor Multimedia Principal & Filmstrip */}
                <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col shrink-0 lg:shrink lg:h-full bg-gradient-to-b from-[#060a14] via-[#04060c] to-[#020306] border-b lg:border-b-0 lg:border-r border-white/[0.08] p-4 sm:p-5 gap-3.5 min-h-0">
                  <div
                    className={cn(
                      'relative rounded-2xl overflow-hidden group shadow-2xl flex flex-col',
                      mediaList.length > 0
                        ? 'border border-white/[0.08] bg-black/95 aspect-video sm:h-72 lg:h-auto lg:flex-1 lg:min-h-[320px]'
                        : 'border border-white/[0.14] bg-[#0c1322]/60 h-48 sm:h-60 lg:h-auto lg:flex-1 lg:min-h-[280px]',
                    )}
                  >
                    {mediaList.length > 0 ? (
                      <Carousel
                        setApi={setCarouselApi}
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
                                    onClick={() => setLightboxIndex(idx)}
                                  />
                                ) : (
                                  <div
                                    className="relative w-full h-full max-h-[500px] flex items-center justify-center cursor-pointer group/video"
                                    onClick={() => setLightboxIndex(idx)}
                                  >
                                    {idx === selectedMediaIndex ? (
                                      <video
                                        src={item.url}
                                        className="w-full h-full object-contain"
                                        preload="metadata"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-black/60" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors">
                                      <div className="w-14 h-14 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shadow-[0_0_25px_rgba(26,115,232,0.6)] transition-transform group-hover/video:scale-110">
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
                            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-none">
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

                            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                              {isAuthenticated && (
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8 rounded-full bg-black/70 hover:bg-destructive text-white backdrop-blur-md border border-white/10 shadow-lg"
                                  title="Eliminar este archivo de evidencia"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMediaToDelete(activeMedia.id);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-black/70 hover:bg-[#1a73e8] text-white backdrop-blur-md border border-white/10 shadow-lg transition-colors"
                                title="Ver a pantalla completa"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxIndex(selectedMediaIndex);
                                }}
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            {mediaList.length > 1 && (
                              <>
                                <CarouselPrevious className="left-3 h-9 w-9 rounded-full bg-black/65 hover:bg-[#1a73e8] text-white border border-white/15 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-10" />
                                <CarouselNext className="right-3 h-9 w-9 rounded-full bg-black/65 hover:bg-[#1a73e8] text-white border border-white/15 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-10" />
                              </>
                            )}
                          </>
                        )}
                      </Carousel>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm m-auto">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#8ab4f8] mb-3 shadow-[0_0_20px_rgba(26,115,232,0.1)]">
                          <Layers className="w-7 h-7 stroke-[1.5]" />
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
                            onClick={() => setActiveTab('upload')}
                            className="mt-4 rounded-full border-[#1a73e8]/40 hover:bg-[#1a73e8]/10 text-[#8ab4f8] text-xs font-medium gap-1.5"
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
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#9aa0a6] flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3 text-[#4285F4]" />
                        Evidencias Registradas ({mediaList.length})
                      </span>
                      {mediaList.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#9aa0a6] tabular-nums">
                            {imagesCount} fotos • {videosCount} videos
                          </span>
                          {mediaList.length > 3 && (
                            <div className="flex items-center gap-1">
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
                        className="relative flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth"
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
                              onClick={() => handleSelectMedia(index)}
                              className={cn(
                                'relative w-20 sm:w-24 md:w-28 shrink-0 aspect-video rounded-sm overflow-hidden border-2 transition-[transform,opacity,border-color] duration-200 focus:outline-none bg-black/60 group/thumb',
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
                                  {item.thumbnail_url && (
                                    <img
                                      src={item.thumbnail_url}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                      className="absolute inset-0 w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300 opacity-80"
                                    />
                                  )}
                                  <div className="w-6 h-6 rounded-sm bg-[#1a73e8] text-white flex items-center justify-center shadow-md relative z-10">
                                    <Play className="w-3 h-3 fill-current ml-0.5" />
                                  </div>
                                  <span className="absolute bottom-1 right-1 text-[8px] font-bold text-cyan-300 bg-black/80 px-1 rounded-none z-10">
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
                            onClick={() => setActiveTab('upload')}
                            className="w-20 sm:w-24 md:w-28 shrink-0 aspect-video rounded-sm border border-dashed border-white/20 hover:border-[#4285F4]/60 bg-white/[0.02] hover:bg-[#1a73e8]/10 flex flex-col items-center justify-center gap-1 text-[#9aa0a6] hover:text-[#8ab4f8] transition-colors group/add"
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
                            className="aspect-video rounded-sm border border-dashed border-white/20 bg-[#0c1322]/50 flex items-center justify-center text-white/25 hover:border-white/30 transition-colors"
                          >
                            <ImageIcon className="w-5 h-5 stroke-[1.2]" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNA DERECHA: Expediente Técnico & Carga de Medios */}
                <div className="w-full lg:w-[42%] xl:w-[40%] flex flex-col flex-1 lg:h-full bg-[#080c14] min-h-0">
                  <div className="flex-1 px-5 py-4 min-h-0 overflow-y-auto no-scrollbar">
                    {activeTab === 'upload' && isAuthenticated ? (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                          <span className="text-xs font-semibold text-white flex items-center gap-2">
                            <UploadCloud className="w-4 h-4 text-[#4285F4]" />
                            Subida de Evidencias Técnicas
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('dossier')}
                            className="h-6 text-[11px] text-[#9aa0a6] hover:text-white rounded-full"
                          >
                            Volver al Expediente
                          </Button>
                        </div>
                        <React.Suspense
                          fallback={
                            <div className="py-12 flex items-center justify-center text-xs text-[#9aa0a6] gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" />
                              Cargando gestor de archivos...
                            </div>
                          }
                        >
                          <MediaUploader
                            workId={work.id}
                            currentImageCount={imagesCount}
                            currentVideoCount={videosCount}
                            onUploadSuccess={() => {
                              void loadWork(true);
                              onWorkUpdated();
                              setActiveTab('dossier');
                            }}
                            onCancel={() => setActiveTab('dossier')}
                          />
                        </React.Suspense>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-3.5 sm:p-4 space-y-3 shadow-md">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold tracking-wider text-[#8ab4f8] uppercase flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#4285F4]" />
                              Cronograma y Plazos del Servicio
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 flex flex-col justify-between gap-1">
                              <span className="text-[11px] text-[#9aa0a6]">Fecha de Inicio</span>
                              <span className="text-sm font-semibold text-white tracking-tight">
                                {work.start_date ? formatWorkDate(work.start_date) : 'No definida'}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 flex flex-col justify-between gap-1">
                              <span className="text-[11px] text-[#9aa0a6]">
                                Fecha de Finalización
                              </span>
                              <span className="text-sm font-semibold text-[#81c995] tracking-tight">
                                {work.end_date ? formatWorkDate(work.end_date) : 'En progreso'}
                              </span>
                            </div>

                            {duration && (
                              <div className="p-2.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 flex flex-col justify-between gap-1">
                                <span className="text-[11px] text-[#9aa0a6]">
                                  Duración del Trabajo
                                </span>
                                <span className="text-sm font-semibold text-white tracking-tight">
                                  {duration}
                                </span>
                              </div>
                            )}

                            <div className="p-2.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 flex flex-col justify-between gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-[#9aa0a6]">
                                  Fecha de Próximo Mantenimiento
                                </span>
                                {isAuthenticated && (
                                  <button
                                    type="button"
                                    onClick={() => onEdit(work)}
                                    className="p-0.5 rounded text-[#9aa0a6] hover:text-[#8ab4f8] transition-colors"
                                    title="Editar fecha de mantenimiento"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <span
                                className={cn(
                                  'text-sm font-semibold tracking-tight',
                                  work.next_maintenance_date
                                    ? 'text-[#fdd663]'
                                    : 'text-neutral-400 font-normal italic',
                                )}
                              >
                                {work.next_maintenance_date
                                  ? formatWorkDate(work.next_maintenance_date)
                                  : 'No programada'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-3.5 sm:p-4 space-y-3 shadow-md">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold tracking-wider text-[#8ab4f8] uppercase flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#4285F4]" />
                              Descripción
                            </span>
                            {work.description && (
                              <button
                                type="button"
                                onClick={() => handleCopyText(work.description!)}
                                className="text-[11px] text-[#9aa0a6] hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] transition-colors"
                                title="Copiar descripción"
                              >
                                {copiedDesc ? (
                                  <>
                                    <Check className="w-3 h-3 text-[#81c995]" /> Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-[#4285F4]" /> Copiar texto
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {work.description ? (
                            <div className="p-3 sm:p-3.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 text-xs sm:text-sm text-neutral-200 whitespace-pre-line leading-relaxed font-sans shadow-inner">
                              {work.description}
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-lg border border-dashed border-white/[0.06] bg-[#070b13]/60 text-xs text-[#9aa0a6] italic text-center">
                              Sin descripción complementaria registrada en este expediente.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pie de Ficha Fijo */}
                  <footer className="p-3.5 sm:p-4 px-5 border-t border-white/[0.08] bg-[#080c14]/95 backdrop-blur-md flex items-center justify-end gap-2 shrink-0 z-20">
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {isAuthenticated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(work)}
                          className="rounded-full border-white/10 hover:border-[#4285F4]/40 text-white hover:bg-white/5 text-xs font-medium px-4 h-8"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5 text-[#4285F4]" />
                          Editar Ficha
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onClose}
                        className="w-full sm:w-auto min-w-[110px] font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full shadow-[0_0_15px_rgba(26,115,232,0.35)] transition-colors text-xs h-8 px-5"
                      >
                        Cerrar Ficha
                      </Button>
                    </div>
                  </footer>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Visor de Pantalla Completa (Lightbox) montado solo bajo demanda */}
      {work && lightboxIndex !== null && (
        <React.Suspense fallback={null}>
          <MediaLightbox
            isOpen={true}
            onClose={() => setLightboxIndex(null)}
            mediaList={work.media}
            initialIndex={lightboxIndex}
          />
        </React.Suspense>
      )}

      {/* Modal de Confirmación para Eliminar Evidencia Multimedia */}
      <AlertDialog
        open={!!mediaToDelete}
        onOpenChange={(open: boolean) => !open && setMediaToDelete(null)}
      >
        <AlertDialogContent className="rounded-[24px] border-white/10 bg-[#080c14] text-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> ¿Eliminar archivo multimedia?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#9aa0a6] text-xs sm:text-sm">
              Esta acción es irreversible: se purgará de forma permanente tanto del registro como
              del almacenamiento físico en el servidor (RN-04).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingMedia}
              className="rounded-full border-white/10 text-white hover:bg-white/10"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => mediaToDelete && handleDeleteMediaConfirm(mediaToDelete)}
              disabled={isDeletingMedia}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white shadow-lg"
            >
              {isDeletingMedia ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar permanentemente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
