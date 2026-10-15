import React, { useEffect, useCallback, useState, useRef } from 'react';
import type { MediaAssetDTO } from '../../../shared/types.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  Video as VideoIcon,
  Maximize2,
  Minimize2,
  Download,
  Play,
} from 'lucide-react';
import { cn } from 'cn';

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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch {
      // Navegadores que restrinjan fullscreen
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'f' || e.key === 'F') void toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, toggleFullscreen]);

  if (!isOpen || mediaList.length === 0) return null;

  const currentMedia = mediaList[currentIndex];

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = currentMedia.url;
    link.download = `evidencia-${currentIndex + 1}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-60 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-3 sm:p-5 select-none animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      {/* Barra de Control Superior */}
      <header
        className="w-full max-w-6xl mx-auto flex items-center justify-between text-white py-2 z-20 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-white/10 text-white border-white/20 text-xs px-2.5 py-0.5 rounded-full font-medium backdrop-blur-md"
          >
            {currentMedia.type === 'image' ? (
              <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-[#8ab4f8]" />
            ) : (
              <VideoIcon className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            )}
            {currentMedia.type === 'image' ? 'Fotografía' : 'Video Técnico'}
          </Badge>

          <span className="text-xs text-[#9aa0a6] font-medium tabular-nums px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            {currentIndex + 1} de {mediaList.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-8 w-8 text-[#9aa0a6] hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Abrir o descargar archivo original"
          >
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8 text-[#9aa0a6] hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:flex"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-[#9aa0a6] hover:text-white hover:bg-white/10 rounded-full transition-colors ml-1"
            title="Cerrar visor (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Escenario Principal Multimedia */}
      <div
        className="relative flex-1 w-full flex items-center justify-center min-h-0 py-2 sm:py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {mediaList.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-6 rounded-full bg-black/60 hover:bg-[#1a73e8] text-white border border-white/15 backdrop-blur-md h-11 w-11 z-20 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-xl"
            aria-label="Evidencia anterior"
          >
            <ChevronLeft className="w-6 h-6 -ml-0.5" />
          </button>
        )}

        <div className="max-w-5xl w-full h-full flex items-center justify-center p-1 sm:p-2">
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt="Evidencia técnica del trabajo"
              className="max-h-[78vh] max-w-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
            />
          ) : (
            <video
              src={currentMedia.url}
              controls
              autoPlay
              className="max-h-[78vh] max-w-full rounded-2xl shadow-2xl bg-black ring-1 ring-white/10"
            />
          )}
        </div>

        {mediaList.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-6 rounded-full bg-black/60 hover:bg-[#1a73e8] text-white border border-white/15 backdrop-blur-md h-11 w-11 z-20 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-xl"
            aria-label="Evidencia siguiente"
          >
            <ChevronRight className="w-6 h-6 -mr-0.5" />
          </button>
        )}
      </div>

      {/* Dock Inferior de Miniaturas (Estilo Glassmorphism Dock) */}
      {mediaList.length > 1 && (
        <div
          className="w-full flex items-center justify-center pb-2 z-20 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 overflow-x-auto py-2 px-3 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 max-w-3xl scrollbar-none shadow-2xl">
            {mediaList.map((item, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    'relative w-14 h-10 sm:w-16 sm:h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 bg-black/60',
                    isSelected
                      ? 'border-[#4285F4] ring-2 ring-[#4285F4]/40 scale-105 shadow-[0_0_12px_rgba(66,133,244,0.4)]'
                      : 'border-transparent opacity-50 hover:opacity-90 hover:border-white/20',
                  )}
                >
                  {item.type === 'image' ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center relative">
                      <video src={item.url} className="w-full h-full object-cover opacity-60" preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-3 h-3 text-white fill-current" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
