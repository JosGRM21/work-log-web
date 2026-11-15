import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { WorkItemDetail, MediaAssetDTO } from '@shared/types.js';
import { apiClient } from '@/api/client.js';
import { useAuth } from '@/features/auth/context/auth-context.js';
import { cn, calculateWorkDuration } from '@/lib/utils';
import { getCachedWorkDetail, setCachedWorkDetail } from '../hooks/use-works.js';
import { WorkDetailHeader } from '../components/work-detail-header.js';
import { WorkMediaGallery } from '../components/work-media-gallery.js';
import { WorkDossierPanel } from '../components/work-dossier-panel.js';
import {
  Dialog,
  DialogContent,
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import type { CarouselApi } from '@/components/ui/carousel';
import { Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react';

const MediaLightbox = React.lazy(() =>
  import('@/features/media/components/media-lightbox.js').then((m) => ({
    default: m.MediaLightbox,
  })),
);

interface WorkDetailModalProps {
  workId: string | null;
  refreshKey?: number;
  isOpen: boolean;
  isSubModalOpen?: boolean;
  onClose: () => void;
  onEdit: (work: WorkItemDetail) => void;
  onDelete: (workId: string) => void;
  onWorkUpdated: () => void;
}

export const WorkDetailModal: React.FC<WorkDetailModalProps> = ({
  workId,
  refreshKey = 0,
  isOpen,
  isSubModalOpen = false,
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
  const [failedThumbIds, setFailedThumbIds] = useState<Set<string>>(() => new Set());

  const markThumbFailed = useCallback((id: string) => {
    setFailedThumbIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!carouselApi) return;

    const handleSelect = () => {
      const snap = carouselApi.selectedScrollSnap();
      setSelectedMediaIndex((prev) => (prev !== snap ? snap : prev));
    };

    carouselApi.on('select', handleSelect);
    carouselApi.on('reInit', handleSelect);
    return () => {
      carouselApi.off('select', handleSelect);
      carouselApi.off('reInit', handleSelect);
    };
  }, [carouselApi]);

  const mediaLength = work?.media.length ?? 0;
  useEffect(() => {
    if (!carouselApi || mediaLength === 0) return;
    setSelectedMediaIndex((prev) => {
      const clamped = Math.min(prev, mediaLength - 1);
      if (carouselApi.selectedScrollSnap() !== clamped) {
        carouselApi.scrollTo(clamped, true);
      }
      return prev !== clamped ? clamped : prev;
    });
  }, [carouselApi, mediaLength]);

  const handleSelectMedia = useCallback(
    (idx: number) => {
      setSelectedMediaIndex(idx);
      carouselApi?.scrollTo(idx);
    },
    [carouselApi],
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const prevRefreshKeyRef = useRef(refreshKey);
  const prevOpenWorkIdRef = useRef<string | null>(null);

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
          cache: bypassCache ? 'no-store' : undefined,
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
      const refreshIncremented = refreshKey !== prevRefreshKeyRef.current;
      prevRefreshKeyRef.current = refreshKey;
      const isNewWorkOpening = prevOpenWorkIdRef.current !== workId;
      prevOpenWorkIdRef.current = workId;

      void loadWork(refreshKey > 0 || refreshIncremented);
      if (isNewWorkOpening) {
        setActiveTab('dossier');
      }
    } else {
      prevRefreshKeyRef.current = refreshKey;
      prevOpenWorkIdRef.current = null;
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

  const handleToggleUpload = useCallback(() => {
    setActiveTab((prev) => (prev === 'upload' ? 'dossier' : 'upload'));
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

  const duration = useMemo(
    () => (work ? calculateWorkDuration(work.start_date, work.end_date, true) : null),
    [work?.start_date, work?.end_date],
  );

  const renderFooter = (extraClassName: string) => (
    <footer
      className={cn(
        'px-4 sm:px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:py-3.5 border-t border-white/[0.08] bg-[#080c14]/95 backdrop-blur-md items-center justify-end gap-2 shrink-0 z-20',
        extraClassName,
      )}
    >
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {isAuthenticated && work && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(work)}
            className="flex-1 sm:flex-initial rounded-full border-white/10 hover:border-[#4285F4]/40 text-white hover:bg-white/5 text-xs font-medium px-4 h-10 sm:h-8"
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5 text-[#4285F4]" />
            Editar Ficha
          </Button>
        )}
        <Button
          variant="default"
          size="sm"
          onClick={onClose}
          className="flex-1 sm:flex-initial sm:min-w-[110px] font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full shadow-[0_0_15px_rgba(26,115,232,0.35)] transition-colors text-xs h-10 sm:h-8 px-5"
        >
          Cerrar Ficha
        </Button>
      </div>
    </footer>
  );

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open: boolean) => {
          if (!open && lightboxIndex === null && !mediaToDelete && !isSubModalOpen) {
            onClose();
          }
        }}
      >
        <DialogContent
          mobileFullscreen
          showCloseButton={false}
          className="sm:max-w-[95vw] xl:max-w-6xl w-full sm:h-[88dvh] sm:max-h-[880px] p-0 gap-0 overflow-hidden sm:rounded-[28px] sm:border sm:border-white/10 bg-[#080c14] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(26,115,232,0.12)] flex flex-col"
        >
          <div
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#669df6]/50 to-transparent z-30"
            aria-hidden="true"
          />

          {isLoading ? (
            <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6 animate-pulse">
              <div className="w-full lg:w-[58%] flex flex-col gap-3 sm:gap-4">
                <Skeleton className="w-full aspect-video lg:flex-1 rounded-[12px] bg-white/[0.04]" />
                <div className="flex gap-2.5 h-16 overflow-hidden">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton
                      key={i}
                      className="w-20 sm:w-24 md:w-28 shrink-0 aspect-video rounded-[6px] bg-white/[0.04]"
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
                className="mt-2 h-10 sm:h-9 rounded-full border-white/10 hover:border-white/20 text-white hover:bg-white/5 px-5"
              >
                Cerrar Ventana
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <WorkDetailHeader
                work={work}
                isAuthenticated={isAuthenticated}
                activeTab={activeTab}
                onToggleUpload={handleToggleUpload}
                onEdit={onEdit}
                onDelete={onDelete}
                onClose={onClose}
              />

              {/* Cuerpo Responsivo: Scroll único unificado en móvil; 2 columnas en desktop */}
              <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto overscroll-contain lg:overflow-hidden no-scrollbar">
                <WorkMediaGallery
                  mediaList={mediaList}
                  selectedMediaIndex={selectedMediaIndex}
                  imagesCount={imagesCount}
                  videosCount={videosCount}
                  isAuthenticated={isAuthenticated}
                  failedThumbIds={failedThumbIds}
                  onMarkThumbFailed={markThumbFailed}
                  onSelectMedia={handleSelectMedia}
                  onSetCarouselApi={setCarouselApi}
                  onOpenLightbox={setLightboxIndex}
                  onRequestDeleteMedia={setMediaToDelete}
                  onOpenUpload={() => setActiveTab('upload')}
                  className={
                    activeTab === 'upload' && isAuthenticated ? 'hidden lg:flex' : undefined
                  }
                />

                {/* COLUMNA DERECHA: Expediente Técnico & Carga de Medios */}
                <div className="w-full lg:w-[42%] xl:w-[40%] flex flex-col lg:h-full bg-[#080c14] min-h-0">
                  <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto no-scrollbar">
                    <WorkDossierPanel
                      work={work}
                      duration={duration}
                      imagesCount={imagesCount}
                      videosCount={videosCount}
                      isAuthenticated={isAuthenticated}
                      activeTab={activeTab}
                      copiedDesc={copiedDesc}
                      onCopyText={handleCopyText}
                      onEdit={onEdit}
                      onBackToDossier={() => setActiveTab('dossier')}
                      onUploadSuccess={() => {
                        void loadWork(true);
                        onWorkUpdated();
                        setActiveTab('dossier');
                      }}
                    />
                  </div>

                  {renderFooter('hidden lg:flex')}
                </div>
              </div>

              {renderFooter('flex lg:hidden')}
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
              className="h-10 sm:h-9 rounded-full border-white/10 text-white hover:bg-white/10"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => mediaToDelete && handleDeleteMediaConfirm(mediaToDelete)}
              disabled={isDeletingMedia}
              className="h-10 sm:h-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white shadow-lg"
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
