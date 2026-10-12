import React from 'react';
import type { WorkItemSummary, WorkStatus } from '../../../shared/types.js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Video as VideoIcon, ArrowRight, Play } from 'lucide-react';

interface WorkCardProps {
    work: WorkItemSummary;
    onClick: () => void;
}

const STATUS_BADGE_MAP: Record<
    WorkStatus,
    { label: string; className: string }
> = {
    pending: {
        label: 'Por Realizar',
        className: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 shadow-sm',
    },
    in_progress: {
        label: 'En Curso',
        className: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800 shadow-sm',
    },
    completed: {
        label: 'Terminado',
        className: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800 shadow-sm',
    },
};

export const WorkCard: React.FC<WorkCardProps> = ({ work, onClick }) => {
    const formatDate = (dateStr: string) => {
        try {
            const [year, month, day] = dateStr.split('-');
            const date = new Date(Number(year), Number(month) - 1, Number(day));
            return new Intl.DateTimeFormat('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    const hasMedia = !!work.media_preview;
    const isVideo = work.media_preview?.type === 'video';
    const statusInfo = STATUS_BADGE_MAP[work.status] || STATUS_BADGE_MAP.pending;

    return (
        <Card
            onClick={onClick}
            className="group cursor-pointer overflow-hidden border border-border/70 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between py-0 gap-0"
        >
            {/* Contenedor Visual de Miniatura */}
            <div className="relative aspect-video w-full bg-muted/50 overflow-hidden flex items-center justify-center border-b border-border/50">
                {hasMedia ? (
                    isVideo ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-black/90">
                            <video
                                src={work.media_preview!.url}
                                className="w-full h-full object-cover opacity-80"
                                preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                <div className="w-11 h-11 rounded-full bg-background/90 text-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Play className="w-5 h-5 ml-0.5 fill-current text-primary" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <img
                            src={work.media_preview!.url}
                            alt={work.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-4 text-center">
                        <ImageIcon className="w-9 h-9 opacity-35" />
                        <span className="text-xs font-medium">Sin archivo multimedia</span>
                    </div>
                )}

                {/* Badge de Estado flotante */}
                <div className="absolute top-2.5 left-2.5 z-10">
                    <Badge variant="outline" className={`shadow-xs ${statusInfo.className}`}>
                        {statusInfo.label}
                    </Badge>
                </div>
            </div>

            {/* Contenido textual */}
            <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-card">
                <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">
                        {formatDate(work.reference_date)}
                    </span>
                    <h3 className="text-base font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {work.title}
                    </h3>
                </div>

                {/* Conteo de medios adjuntos */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            {work.media_count.images} {work.media_count.images === 1 ? 'foto' : 'fotos'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                            <VideoIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            {work.media_count.videos} {work.media_count.videos === 1 ? 'video' : 'videos'}
                        </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
            </div>
        </Card>
    );
};