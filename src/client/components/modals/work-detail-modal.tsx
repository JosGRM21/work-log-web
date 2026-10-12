import React, { useState, useEffect, useCallback } from 'react';
import type { WorkItemDetail, WorkStatus, MediaAssetDTO } from '../../../shared/types.js';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../context/auth-context.js';

// Componentes shadcn/ui
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
    type CarouselApi,
} from '@/components/ui/carousel';

// Íconos Lucide
import {
    Clock,
    CheckCircle2,
    Play,
    Pencil,
    Trash2,
    UploadCloud,
    Loader2,
    AlertTriangle,
    FileText,
    Maximize2,
    Image as ImageIcon,
    Info,
} from 'lucide-react';

// Multimedia
import { MediaLightbox } from '../media/media-lightbox.js';
import { MediaUploader } from '../media/media-uploader.js';

interface WorkDetailModalProps {
    workId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (work: WorkItemDetail) => void;
    onDelete: (workId: string) => void;
    onWorkUpdated: () => void;
}

const STATUS_CONFIG: Record<
    WorkStatus,
    { label: string; className: string; dotColor: string }
> = {
    pending: {
        label: 'Por Realizar',
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15',
        dotColor: 'bg-amber-500',
    },
    in_progress: {
        label: 'En Curso',
        className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/15',
        dotColor: 'bg-blue-500',
    },
    completed: {
        label: 'Terminado',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15',
        dotColor: 'bg-emerald-500',
    },
};

export const WorkDetailModal: React.FC<WorkDetailModalProps> = ({
    workId,
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

    // Selección de imagen activa (visor principal)
    const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();

    useEffect(() => {
        if (!carouselApi) return;
        carouselApi.on('select', () => {
            setSelectedMediaIndex(carouselApi.selectedScrollSnap());
        });
    }, [carouselApi]);

    useEffect(() => {
        if (!carouselApi) return;
        if (carouselApi.selectedScrollSnap() !== selectedMediaIndex) {
            carouselApi.scrollTo(selectedMediaIndex);
        }
    }, [selectedMediaIndex, carouselApi]);

    // Estados multimedia
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [showUploader, setShowUploader] = useState(false);
    const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
    const [isDeletingMedia, setIsDeletingMedia] = useState(false);

    const loadWork = useCallback(async () => {
        if (!workId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiClient.get<WorkItemDetail>(`/works/${workId}`);
            setWork(data);
            setSelectedMediaIndex(0);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [workId]);

    useEffect(() => {
        if (isOpen && workId) {
            loadWork();
            setShowUploader(false);
        } else {
            setWork(null);
            setSelectedMediaIndex(0);
        }
    }, [isOpen, workId, loadWork]);

    const handleDeleteMediaConfirm = async (mediaId: string) => {
        setIsDeletingMedia(true);
        try {
            await apiClient.delete(`/media/${mediaId}`);
            await loadWork();
            onWorkUpdated();
            setMediaToDelete(null);
        } catch (err) {
            alert(`Error al eliminar archivo: ${(err as Error).message}`);
        } finally {
            setIsDeletingMedia(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'No definida';
        try {
            const [year, month, day] = dateStr.split('-');
            return new Intl.DateTimeFormat('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            }).format(new Date(Number(year), Number(month) - 1, Number(day)));
        } catch {
            return dateStr;
        }
    };

    const mediaList: MediaAssetDTO[] = work?.media || [];
    const imagesCount = mediaList.filter((m) => m.type === 'image').length;
    const videosCount = mediaList.filter((m) => m.type === 'video').length;
    const statusInfo = work ? STATUS_CONFIG[work.status] || STATUS_CONFIG.pending : STATUS_CONFIG.pending;
    const activeMedia = mediaList[selectedMediaIndex] || null;



    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
                <DialogContent
                    showCloseButton={true}
                    className="max-w-[95vw] lg:max-w-6xl w-full h-[75vh] max-h-[820px] p-0 gap-0 overflow-hidden rounded-2xl border-border bg-background shadow-2xl flex flex-col"
                >
                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                            <Loader2 className="h-9 w-9 animate-spin text-primary" />
                            <span className="text-sm font-medium">Cargando detalles del trabajo...</span>
                        </div>
                    ) : error || !work ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                No fue posible cargar el trabajo
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground max-w-sm">
                                {error || 'El identificador solicitado no existe o hubo un problema al obtener los datos.'}
                            </DialogDescription>
                            <Button variant="outline" size="sm" onClick={onClose} className="mt-2">
                                Cerrar
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                            {/* ============================================================== */}
                            {/* COLUMNA IZQUIERDA: VISOR PRINCIPAL + MINIATURAS INFERIORES     */}
                            {/* ============================================================== */}
                            <div className="lg:w-[60%] xl:w-[63%] flex flex-col h-full bg-muted/10 border-b lg:border-b-0 lg:border-r border-border p-4 sm:p-5 gap-3.5 min-h-0">
                                {/* PANTALLA PRINCIPAL / VISOR (CARRUSEL) */}
                                <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] rounded-xl overflow-hidden group border border-border/80 bg-black/95 shadow-inner flex flex-col">
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
                                                {mediaList.map((item, idx) => (
                                                    <CarouselItem key={item.id} className="pl-0 h-full flex items-center justify-center relative">
                                                        {item.type === 'image' ? (
                                                            <img
                                                                src={item.url}
                                                                alt={`Evidencia ${idx + 1}`}
                                                                className="w-full h-full max-h-[460px] object-contain cursor-pointer transition-transform duration-300"
                                                                onClick={() => setLightboxIndex(idx)}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="relative w-full h-full max-h-[460px] flex items-center justify-center cursor-pointer"
                                                                onClick={() => setLightboxIndex(idx)}
                                                            >
                                                                <video
                                                                    src={item.url}
                                                                    className="w-full h-full object-contain"
                                                                    preload="metadata"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors">
                                                                    <div className="w-14 h-14 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                                                                        <Play className="w-6 h-6 fill-current ml-0.5" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </CarouselItem>
                                                ))}
                                            </CarouselContent>

                                            {/* Controles sobre el carrusel */}
                                            {activeMedia && (
                                                <>
                                                    {/* Contador y Badge de Tipo */}
                                                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
                                                        <Badge className="bg-black/70 backdrop-blur-md text-white border-0 text-[11px] font-normal px-2.5 py-0.5">
                                                            {selectedMediaIndex + 1} / {mediaList.length}
                                                        </Badge>
                                                        <Badge className="bg-black/70 backdrop-blur-md text-white border-0 text-[11px] font-normal capitalize">
                                                            {activeMedia.type === 'image' ? 'Foto' : 'Video'}
                                                        </Badge>
                                                    </div>

                                                    {/* Botones de acción en la esquina superior derecha */}
                                                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                                        {isAuthenticated && (
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg bg-black/60 hover:bg-destructive text-white backdrop-blur-md border-0"
                                                                title="Eliminar este archivo"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setMediaToDelete(activeMedia.id);
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border-0"
                                                            title="Ver a pantalla completa"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLightboxIndex(selectedMediaIndex);
                                                            }}
                                                        >
                                                            <Maximize2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    {/* Flechas de navegación del Carrusel */}
                                                    {mediaList.length > 1 && (
                                                        <>
                                                            <CarouselPrevious className="left-3 h-9 w-9 bg-black/50 hover:bg-black/80 text-white border-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10" />
                                                            <CarouselNext className="right-3 h-9 w-9 bg-black/50 hover:bg-black/80 text-white border-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10" />
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </Carousel>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm m-auto">
                                            <div className="w-14 h-14 rounded-2xl bg-background border border-border/70 shadow-xs flex items-center justify-center text-muted-foreground mb-3">
                                                <ImageIcon className="w-7 h-7 stroke-[1.5]" />
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">
                                                Sin evidencias multimedia
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                {isAuthenticated
                                                    ? 'Puedes utilizar el botón "Subir Medios" para adjuntar imágenes y videos.'
                                                    : 'No se han adjuntado imágenes o videos para este trabajo.'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* CUADROS DE MINIATURAS INFERIORES */}
                                <div className="shrink-0 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Galería ({mediaList.length})
                                        </span>
                                        {mediaList.length > 0 && (
                                            <span className="text-[11px] text-muted-foreground">
                                                {imagesCount} fotos • {videosCount} videos
                                            </span>
                                        )}
                                    </div>

                                    {mediaList.length > 0 ? (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 gap-2.5 overflow-x-auto p-0.5">
                                            {mediaList.map((item, index) => {
                                                const isSelected = index === selectedMediaIndex;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => setSelectedMediaIndex(index)}
                                                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-150 focus:outline-none bg-muted/60 ${isSelected
                                                            ? 'border-primary ring-2 ring-primary/20 scale-[1.02] shadow-sm'
                                                            : 'border-border/70 hover:border-border opacity-70 hover:opacity-100'
                                                            }`}
                                                    >
                                                        {item.type === 'image' ? (
                                                            <img
                                                                src={item.url}
                                                                alt=""
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full relative flex items-center justify-center bg-gray-900">
                                                                <video
                                                                    src={item.url}
                                                                    className="w-full h-full object-cover opacity-75"
                                                                    preload="metadata"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center">
                                                                        <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Cuadros vacíos con fondo gris e ícono de imagen en el centro */
                                        <div className="grid grid-cols-4 gap-2.5">
                                            {[1, 2, 3, 4].map((slot) => (
                                                <div
                                                    key={slot}
                                                    className="aspect-video rounded-lg border border-border/80 bg-muted/50 dark:bg-muted/30 flex items-center justify-center text-muted-foreground/60 transition-colors"
                                                >
                                                    <ImageIcon className="w-5 h-5 stroke-[1.5]" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ============================================================== */}
                            {/* COLUMNA DERECHA: INFORMACIÓN DETALLADA + ACCIONES + BOTÓN      */}
                            {/* ============================================================== */}
                            <div className="lg:w-[40%] xl:w-[37%] flex flex-col h-full bg-background min-h-0">
                                {/* Cabecera de la columna de detalles */}
                                <DialogHeader className="p-5 pb-3 border-b border-border space-y-2.5 text-left pr-10">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className={`gap-1.5 px-2.5 py-0.5 text-xs rounded-full font-medium ${statusInfo.className}`}
                                        >
                                            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotColor}`} />
                                            {statusInfo.label}
                                        </Badge>
                                    </div>

                                    <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug line-clamp-2">
                                        {work.title}
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Detalles técnicos, especificaciones y cronograma del trabajo.
                                    </DialogDescription>
                                </DialogHeader>

                                {/* Contenido scrollable de información */}
                                <ScrollArea className="flex-1 px-5 py-4 min-h-0">
                                    <div className="flex flex-col gap-4">
                                        {/* Barra de Acciones de Administración (si está autenticado) */}
                                        {isAuthenticated && (
                                            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/40 rounded-xl border border-border">
                                                <Button
                                                    variant={showUploader ? 'secondary' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setShowUploader((prev) => !prev)}
                                                    className="h-8 text-xs font-medium gap-1.5 flex-1"
                                                >
                                                    <UploadCloud className="h-3.5 w-3.5" />
                                                    {showUploader ? 'Cerrar Subida' : 'Subir Medios'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onEdit(work)}
                                                    className="h-8 text-xs font-medium gap-1.5 flex-1"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onDelete(work.id)}
                                                    className="h-8 text-xs font-medium gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20"
                                                    title="Eliminar trabajo"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* Uploader Desplegable */}
                                        {isAuthenticated && showUploader && (
                                            <div className="p-3.5 bg-muted/40 rounded-xl border border-border">
                                                <div className="mb-2.5 pb-1.5 border-b border-border flex items-center justify-between">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                                        <UploadCloud className="w-3.5 h-3.5 text-muted-foreground" />
                                                        Carga de Archivos
                                                    </span>
                                                </div>
                                                <MediaUploader
                                                    workId={work.id}
                                                    currentImageCount={imagesCount}
                                                    currentVideoCount={videosCount}
                                                    onUploadSuccess={() => {
                                                        loadWork();
                                                        onWorkUpdated();
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Cronograma / Fechas del Trabajo */}
                                        <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5">
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                                                <Info className="w-3.5 h-3.5" />
                                                Cronograma del Trabajo
                                            </span>

                                            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-xs">
                                                <span className="text-muted-foreground flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" /> Fecha de Inicio
                                                </span>
                                                <span className="font-medium text-foreground">
                                                    {work.start_date ? formatDate(work.start_date) : 'No definida'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between py-1.5 text-xs">
                                                <span className="text-muted-foreground flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Fecha de Finalización
                                                </span>
                                                <span className="font-medium text-foreground">
                                                    {work.end_date ? formatDate(work.end_date) : 'En progreso'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Descripción y Especificaciones */}
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>Descripción y Detalles</span>
                                            </div>
                                            {work.description ? (
                                                <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border">
                                                    {work.description}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic bg-muted/10 p-3.5 rounded-xl border border-dashed border-border text-center">
                                                    Sin descripción adicional para este trabajo.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </ScrollArea>

                                {/* Footer con botón Aceptar */}
                                <div className="p-4 px-5 border-t border-border bg-muted/10 flex justify-end shrink-0">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={onClose}
                                        className="min-w-[100px] font-medium"
                                    >
                                        Aceptar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Visor Lightbox a pantalla completa al hacer clic en zoom */}
            {work && (
                <MediaLightbox
                    isOpen={lightboxIndex !== null}
                    onClose={() => setLightboxIndex(null)}
                    mediaList={work.media}
                    initialIndex={lightboxIndex ?? 0}
                />
            )}

            {/* Confirmación de Borrado de Multimedia */}
            <AlertDialog open={!!mediaToDelete} onOpenChange={(open: boolean) => !open && setMediaToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            ¿Eliminar archivo multimedia?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción es irreversible: se purgará de forma permanente tanto del registro como del almacenamiento físico en disco (RN-04).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingMedia}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => mediaToDelete && handleDeleteMediaConfirm(mediaToDelete)}
                            disabled={isDeletingMedia}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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