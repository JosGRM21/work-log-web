import React, { useEffect, useCallback, useState, useRef } from 'react';
import type { MediaAssetDTO } from '@shared/types.js';
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
import { cn } from '@/lib/utils';

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
  const [failedThumbIds, setFailedThumbIds] = useState<Set<string>>(() => new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const dockButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const markThumbFailed = useCallback((id: string) => {
    setFailedThumbIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || mediaList.length === 0) return;
    const clampedIndex = Math.min(currentIndex, mediaList.length - 1);
    const activeBtn = dockButtonRefs.current[clampedIndex];
    const dock = dockRef.current;
    if (activeBtn && dock) {
      const targetScroll = activeBtn.offsetLeft - dock.clientWidth / 2 + activeBtn.clientWidth / 2;
      dock.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [currentIndex, isOpen, mediaList.length]);

  const handleNext = useCallback(() => {
    if (mediaList.length === 0) return;
    setCurrentIndex((prev) => (Math.min(prev, mediaList.length - 1) + 1) % mediaList.length);
  }, [mediaList.length]);

  const handlePrev = useCallback(() => {
    if (mediaList.length === 0) return;
    setCurrentIndex(
      (prev) => (Math.min(prev, mediaList.length - 1) - 1 + mediaList.length) % mediaList.length,
    );
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
    if (!isOpen) return;
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handlePrev();
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        void toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose, handleNext, handlePrev, toggleFullscreen]);

  if (!isOpen || mediaList.length === 0) return null;

  const safeIndex = Math.min(currentIndex, mediaList.length - 1);
  const currentMedia = mediaList[safeIndex];

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (mediaList.length > 1 && Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) handleNext();
      else handlePrev();
    } else if (dy >= 90 && Math.abs(dy) > Math.abs(dx) * 1.5 && currentMedia.type === 'image') {
      onClose();
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const urlWithoutQuery = currentMedia.url.split(/[?#]/)[0] || '';
    const extMatch = /\.([a-z0-9]{2,5})$/i.exec(urlWithoutQuery);
    const ext = extMatch ? extMatch[1].toLowerCase() : currentMedia.type === 'video' ? 'mp4' : 'jpg';
    const filename = `evidencia-${safeIndex + 1}.${ext}`;

    try {
      const response = await fetch(currentMedia.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.open(currentMedia.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 h-[100dvh] z-60 bg-black/95 backdrop-blur-2xl flex flex-col justify-between px-3 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] overscroll-contain select-none animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      {/* Barra de Control Superior */}
      <header
        className="w-full max-w-6xl mx-auto flex items-center justify-between text-white py-1.5 sm:py-2 z-20 shrink-0 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className="bg-white/10 text-white border-white/20 text-xs px-2.5 py-0.5 rounded-full font-medium backdrop-blur-md shrink-0"
          >
            {currentMedia.type === 'image' ? (
              <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-[#8ab4f8]" />
            ) : (
              <VideoIcon className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            )}
            <span className="hidden xs:inline sm:inline">
              {currentMedia.type === 'image' ? 'Fotografía' : 'Video Técnico'}
            </span>
            <span className="xs:hidden sm:hidden">
              {currentMedia.type === 'image' ? 'Foto' : 'Video'}
            </span>
          </Badge>
          <span className="text-xs text-[#9aa0a6] font-medium tabular-nums px-2 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
            {safeIndex + 1} / {mediaList.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-10 w-10 sm:h-8 sm:w-8 text-[#9aa0a6] hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Abrir o descargar archivo original"
            aria-label="Descargar archivo original"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8 text-[#9aa0a6] hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:flex"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (F)'}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 sm:h-8 sm:w-8 text-[#9aa0a6] hover:text-white hover:bg-white/10 rounded-full transition-colors ml-0.5 sm:ml-1"
            title="Cerrar visor (Esc)"
            aria-label="Cerrar visor"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Escenario Principal Multimedia (soporta swipe táctil) */}
      <div
        className="relative flex-1 w-full flex items-center justify-center min-h-0 py-2 sm:py-4 touch-pan-y"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {mediaList.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="hidden sm:flex absolute left-6 rounded-full bg-black/60 hover:bg-[#1a73e8] text-white border border-white/15 backdrop-blur-md h-11 w-11 z-20 items-center justify-center transition-[transform,background-color] duration-200 hover:scale-110 shadow-xl"
            aria-label="Evidencia anterior"
          >
            <ChevronLeft className="w-6 h-6 -ml-0.5" />
          </button>
        )}

        <div className="max-w-5xl w-full h-full flex items-center justify-center p-0.5 sm:p-2">
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt="Evidencia técnica del trabajo"
              decoding="async"
              className="max-h-[72dvh] sm:max-h-[78dvh] max-w-full object-contain rounded-[8px] sm:rounded-[10px] shadow-2xl ring-1 ring-white/10"
            />
          ) : (
            <video
              src={currentMedia.url}
              poster={
                currentMedia.thumbnail_url && !failedThumbIds.has(currentMedia.id)
                  ? currentMedia.thumbnail_url
                  : undefined
              }
              controls
              autoPlay
              playsInline
              className="max-h-[72dvh] sm:max-h-[78dvh] max-w-full rounded-[8px] sm:rounded-[10px] shadow-2xl bg-black ring-1 ring-white/10"
            />
          )}
        </div>

        {mediaList.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="hidden sm:flex absolute right-6 rounded-full bg-black/60 hover:bg-[#1a73e8] text-white border border-white/15 backdrop-blur-md h-11 w-11 z-20 items-center justify-center transition-[transform,background-color] duration-200 hover:scale-110 shadow-xl"
            aria-label="Evidencia siguiente"
          >
            <ChevronRight className="w-6 h-6 -mr-0.5" />
          </button>
        )}
      </div>

      {/* Dock Inferior de Miniaturas + Controles Móviles */}
      {mediaList.length > 1 && (
        <div
          className="w-full flex items-center justify-center gap-2 pb-1 sm:pb-2 z-20 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handlePrev}
            className="sm:hidden h-10 w-10 shrink-0 rounded-full bg-black/75 border border-white/15 text-white flex items-center justify-center active:bg-[#1a73e8] transition-colors"
            aria-label="Evidencia anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div
            ref={dockRef}
            className="flex items-center gap-2 overflow-x-auto py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-[12px] bg-black/65 backdrop-blur-xl border border-white/10 max-w-3xl scrollbar-none shadow-2xl snap-x"
          >
            {mediaList.map((item, idx) => {
              const isSelected = idx === safeIndex;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    dockButtonRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    'relative w-14 h-10 sm:w-16 sm:h-12 rounded-[6px] overflow-hidden shrink-0 border-2 transition-[transform,opacity,border-color] duration-200 bg-black/60 snap-center',
                    isSelected
                      ? 'border-[#4285F4] ring-2 ring-[#4285F4]/40 scale-105 shadow-[0_0_12px_rgba(66,133,244,0.4)]'
                      : 'border-transparent opacity-50 hover:opacity-90 hover:border-white/20',
                  )}
                >
                  {item.type === 'image' ? (
                    <img
                      src={
                        item.thumbnail_url && !failedThumbIds.has(item.id)
                          ? item.thumbnail_url
                          : item.url
                      }
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={() => {
                        if (item.thumbnail_url && !failedThumbIds.has(item.id)) {
                          markThumbFailed(item.id);
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0c1424] to-[#04060c] flex items-center justify-center relative overflow-hidden">
                      {item.thumbnail_url && !failedThumbIds.has(item.id) && (
                        <img
                          src={item.thumbnail_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={() => markThumbFailed(item.id)}
                          className="absolute inset-0 w-full h-full object-cover opacity-80"
                        />
                      )}
                      <div className="w-5 h-5 rounded-full bg-[#1a73e8]/80 flex items-center justify-center relative z-10 shadow-md">
                        <Play className="w-2.5 h-2.5 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="sm:hidden h-10 w-10 shrink-0 rounded-full bg-black/75 border border-white/15 text-white flex items-center justify-center active:bg-[#1a73e8] transition-colors"
            aria-label="Evidencia siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
