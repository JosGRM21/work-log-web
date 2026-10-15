import React, { useEffect, useCallback } from 'react';
import type { MediaAssetDTO } from '../../../shared/types.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaList: MediaAssetDTO[];
  initialIndex?: number;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  onClose,
  mediaList,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const handleNext = useCallback(() => {
    if (mediaList.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % mediaList.length);
  }, [mediaList.length]);

  const handlePrev = useCallback(() => {
    if (mediaList.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  }, [mediaList.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || mediaList.length === 0) return null;

  const currentMedia = mediaList[currentIndex];

  return (
    <div
      className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-between p-4 backdrop-blur-md select-none animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      {/* Barra Superior */}
      <div
        className="w-full max-w-6xl flex items-center justify-between text-white/90 py-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs">
            {currentMedia.type === 'image' ? (
              <ImageIcon className="w-3.5 h-3.5 mr-1" />
            ) : (
              <VideoIcon className="w-3.5 h-3.5 mr-1" />
            )}
            {currentMedia.type === 'image' ? 'Imagen' : 'Video'}
          </Badge>
          <span className="text-xs text-white/70">
            {currentIndex + 1} de {mediaList.length}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 hover:text-white rounded-full"
          aria-label="Cerrar visor"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Contenedor Principal de Medios */}
      <div
        className="relative flex-1 w-full flex items-center justify-center p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {mediaList.length > 1 && (
          <Button
            variant="secondary"
            size="icon"
            onClick={handlePrev}
            className="absolute left-2 md:left-6 rounded-full bg-black/50 text-white hover:bg-black/80 hover:text-white border-white/10 backdrop-blur-xs h-11 w-11 z-10"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        )}

        <div className="max-w-5xl max-h-[82vh] flex items-center justify-center">
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt="Evidencia del trabajo"
              className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          ) : (
            <video
              src={currentMedia.url}
              controls
              autoPlay
              className="max-h-[82vh] max-w-full rounded-lg shadow-2xl bg-black"
            />
          )}
        </div>

        {mediaList.length > 1 && (
          <Button
            variant="secondary"
            size="icon"
            onClick={handleNext}
            className="absolute right-2 md:right-6 rounded-full bg-black/50 text-white hover:bg-black/80 hover:text-white border-white/10 backdrop-blur-xs h-11 w-11 z-10"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Miniaturas inferiores */}
      {mediaList.length > 1 && (
        <div
          className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {mediaList.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                idx === currentIndex
                  ? 'border-primary ring-2 ring-primary/40 opacity-100 scale-105'
                  : 'border-transparent opacity-50 hover:opacity-85'
              }`}
            >
              {item.type === 'image' ? (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-white text-[10px] font-bold">
                  <VideoIcon className="w-5 h-5 text-neutral-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
