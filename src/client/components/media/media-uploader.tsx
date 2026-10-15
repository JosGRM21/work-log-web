import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '../../api/client.js';
import { Button } from '@/components/ui/button';
import {
  UploadCloud,
  File,
  AlertCircle,
  Loader2,
  X,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
} from 'lucide-react';
import { cn } from 'cn';

interface MediaUploaderProps {
  workId: string;
  currentImageCount: number;
  currentVideoCount: number;
  onUploadSuccess: () => void;
  onCancel?: () => void;
}

interface StagedFile {
  file: File;
  previewUrl: string | null;
  id: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB (RNF-STOR-01)
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150 MB (RNF-STOR-01)
const MAX_IMAGES_ALLOWED = 20; // RN-03
const MAX_VIDEOS_ALLOWED = 4; // RN-03

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  workId,
  currentImageCount,
  currentVideoCount,
  onUploadSuccess,
  onCancel: _onCancel,
}) => {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar object URLs generadas para evitar fugas de memoria
  useEffect(() => {
    return () => {
      stagedFiles.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [stagedFiles]);

  const availableImages = Math.max(0, MAX_IMAGES_ALLOWED - currentImageCount);
  const availableVideos = Math.max(0, MAX_VIDEOS_ALLOWED - currentVideoCount);

  const validateFiles = (newFiles: File[], existingStaged: StagedFile[]): StagedFile[] | null => {
    const existingFiles = existingStaged.map((s) => s.file);
    const combinedFiles = [...existingFiles, ...newFiles];

    let totalImages = 0;
    let totalVideos = 0;

    for (const file of combinedFiles) {
      const type = file.type.toLowerCase();
      const isImg = type.startsWith('image/');
      const isVid = type.startsWith('video/');

      if (!isImg && !isVid) {
        setErrorMessage(
          `"${file.name}" no es un archivo permitido. Solo se admiten imágenes (JPG, PNG, WebP) y videos (MP4, WebM).`,
        );
        return null;
      }

      if (isImg) {
        if (file.size > MAX_IMAGE_BYTES) {
          setErrorMessage(
            `"${file.name}" supera el límite máximo de 10 MB para imágenes (RNF-STOR-01).`,
          );
          return null;
        }
        totalImages++;
      } else if (isVid) {
        if (file.size > MAX_VIDEO_BYTES) {
          setErrorMessage(
            `"${file.name}" supera el límite máximo de 150 MB para videos (RNF-STOR-01).`,
          );
          return null;
        }
        totalVideos++;
      }
    }

    if (currentImageCount + totalImages > MAX_IMAGES_ALLOWED) {
      setErrorMessage(
        `Excedería el límite de ${MAX_IMAGES_ALLOWED} fotos por trabajo (RN-03). Disponibles: ${availableImages}.`,
      );
      return null;
    }

    if (currentVideoCount + totalVideos > MAX_VIDEOS_ALLOWED) {
      setErrorMessage(
        `Excedería el límite de ${MAX_VIDEOS_ALLOWED} videos por trabajo (RN-03). Disponibles: ${availableVideos}.`,
      );
      return null;
    }

    // Convertir nuevos archivos a StagedFile con previews
    const newStaged: StagedFile[] = newFiles.map((file) => {
      const isImg = file.type.toLowerCase().startsWith('image/');
      return {
        file,
        previewUrl: isImg ? URL.createObjectURL(file) : null,
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      };
    });

    return [...existingStaged, ...newStaged];
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setErrorMessage(null);
    const updated = validateFiles(files, stagedFiles);
    if (updated) {
      setStagedFiles(updated);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setErrorMessage(null);
      const updated = validateFiles(files, stagedFiles);
      if (updated) {
        setStagedFiles(updated);
      }
    }
  };

  const handleRemoveStagedFile = (idToRemove: string) => {
    setStagedFiles((prev) => {
      const item = prev.find((s) => s.id === idToRemove);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((s) => s.id !== idToRemove);
    });
    setErrorMessage(null);
  };

  const handleClearAll = () => {
    stagedFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setStagedFiles([]);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async () => {
    if (stagedFiles.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    stagedFiles.forEach((staged) => {
      formData.append('files', staged.file);
    });

    try {
      await apiClient.upload(`/works/${workId}/media`, formData);
      handleClearAll();
      onUploadSuccess();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const totalBytes = stagedFiles.reduce((acc, curr) => acc + curr.file.size, 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const stagedImagesCount = stagedFiles.filter((s) =>
    s.file.type.toLowerCase().startsWith('image/'),
  ).length;
  const stagedVideosCount = stagedFiles.filter((s) =>
    s.file.type.toLowerCase().startsWith('video/'),
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Indicadores de Cuotas y Límites Reglamentarios */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <span className="text-[#9aa0a6] flex items-center gap-1.5 font-medium">
            <ImageIcon className="w-3.5 h-3.5 text-[#4285F4]" />
            Fotos
          </span>
          <span className="font-semibold text-white">
            {currentImageCount} / {MAX_IMAGES_ALLOWED}
            <span className="text-[10px] text-[#9aa0a6] ml-1">
              ({availableImages} disp.)
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <span className="text-[#9aa0a6] flex items-center gap-1.5 font-medium">
            <VideoIcon className="w-3.5 h-3.5 text-cyan-400" />
            Videos
          </span>
          <span className="font-semibold text-white">
            {currentVideoCount} / {MAX_VIDEOS_ALLOWED}
            <span className="text-[10px] text-[#9aa0a6] ml-1">
              ({availableVideos} disp.)
            </span>
          </span>
        </div>
      </div>

      {/* Zona Drag & Drop estilo Google Cloud / Workspace */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer text-center transition-all duration-200 border-2 border-dashed group select-none',
          isDragOver
            ? 'border-[#4285F4] bg-[#1a73e8]/10 shadow-[0_0_25px_rgba(66,133,244,0.2)]'
            : 'border-white/15 bg-white/[0.02] hover:border-[#4285F4]/50 hover:bg-white/[0.04]',
        )}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110',
            isDragOver
              ? 'bg-[#1a73e8] text-white shadow-lg'
              : 'bg-[#1a73e8]/15 border border-[#1a73e8]/30 text-[#8ab4f8]',
          )}
        >
          <UploadCloud className="w-6 h-6 stroke-[1.8]" />
        </div>

        <p className="text-xs sm:text-sm font-medium text-white group-hover:text-[#8ab4f8] transition-colors">
          Arrastra fotos o videos aquí, o <span className="text-[#4285F4] underline underline-offset-2">selecciónalos</span>
        </p>

        <p className="text-[11px] text-[#9aa0a6] mt-1 max-w-xs leading-normal">
          JPG, PNG, WebP (hasta 10 MB) · MP4, WebM (hasta 150 MB)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={handleFileSelection}
        />
      </div>

      {/* Mensaje de Error */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-medium flex items-start gap-2 animate-in fade-in-0">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span className="text-red-200 leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Cola de Archivos Listos para Subir */}
      {stagedFiles.length > 0 && (
        <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/[0.08]">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#81c995]" />
              {stagedFiles.length} {stagedFiles.length === 1 ? 'archivo listo' : 'archivos listos'} ({totalMB} MB)
            </span>
            <span className="text-[11px] text-[#9aa0a6]">
              {stagedImagesCount > 0 && `${stagedImagesCount} fotos `}
              {stagedVideosCount > 0 && `${stagedVideosCount} videos`}
            </span>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {stagedFiles.map((item) => {
              const isImg = item.file.type.toLowerCase().startsWith('image/');
              const sizeMB = (item.file.size / (1024 * 1024)).toFixed(2);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-white/[0.06] hover:border-white/20 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : isImg ? (
                        <ImageIcon className="w-4 h-4 text-[#8ab4f8]" />
                      ) : (
                        <VideoIcon className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-white truncate max-w-[190px] sm:max-w-[260px]">
                        {item.file.name}
                      </span>
                      <span className="text-[10px] text-[#9aa0a6] tabular-nums">
                        {sizeMB} MB · {isImg ? 'Imagen' : 'Video'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveStagedFile(item.id)}
                    className="p-1 rounded-lg text-[#9aa0a6] hover:text-destructive hover:bg-white/10 transition-colors"
                    title="Remover archivo de la cola"
                    disabled={isUploading}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={isUploading}
              className="h-8 text-xs font-medium rounded-full border-white/10 text-[#9aa0a6] hover:text-white hover:bg-white/10"
            >
              Descartar Todo
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleUploadSubmit}
              disabled={isUploading}
              className="h-8 text-xs font-medium rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-[0_0_15px_rgba(26,115,232,0.35)] gap-1.5 px-4"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  Comenzar Subida
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
