import React from 'react';
import type { MediaAssetDTO } from '../../../shared/types.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Video as VideoIcon, Trash2, Play } from 'lucide-react';

interface MediaGalleryProps {
    media: MediaAssetDTO[];
    isAdmin: boolean;
    onOpenLightbox: (index: number) => void;
    onDeleteMedia: (id: string) => void;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
    media,
    isAdmin,
    onOpenLightbox,
    onDeleteMedia,
}) => {
    if (media.length === 0) {
        return (
            <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed border-border text-muted-foreground flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                    <ImageIcon className="w-6 h-6 opacity-60" />
                </div>
                <p className="text-sm font-semibold text-foreground">Sin evidencias multimedia</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {isAdmin ? 'Utiliza el botón superior para subir fotos y videos del trabajo.' : 'No se han adjuntado fotos o videos aún.'}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {media.map((item, index) => (
                <div
                    key={item.id}
                    className="relative group aspect-square rounded-xl overflow-hidden bg-muted/60 border border-border/80 cursor-pointer shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                    onClick={() => onOpenLightbox(index)}
                >
                    {item.type === 'image' ? (
                        <img
                            src={item.url}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full relative flex items-center justify-center bg-black/90">
                            <video src={item.url} className="w-full h-full object-cover opacity-80" preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-background/90 text-foreground flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
                                    <Play className="w-5 h-5 ml-0.5 fill-current text-primary" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Badge de tipo */}
                    <div className="absolute bottom-2 left-2 z-10">
                        <Badge variant="outline" className="bg-black/60 text-white border-white/10 backdrop-blur-md text-[11px] font-medium px-2 py-0.5 gap-1">
                            {item.type === 'image' ? (
                                <>
                                    <ImageIcon className="w-3 h-3" />
                                    <span>Foto</span>
                                </>
                            ) : (
                                <>
                                    <VideoIcon className="w-3 h-3" />
                                    <span>Video</span>
                                </>
                            )}
                        </Badge>
                    </div>

                    {/* Botón de Eliminación (Solo Admin) */}
                    {isAdmin && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteMedia(item.id);
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 shadow-sm transition-opacity rounded-lg h-7 w-7"
                            title="Eliminar este archivo"
                            aria-label="Eliminar archivo"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            ))}
        </div>
    );
};