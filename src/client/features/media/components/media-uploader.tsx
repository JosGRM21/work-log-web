import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/api/client.js';
import { Button } from '@/components/ui/button';
import {
  UploadCloud,
  AlertCircle,
  Loader2,
  X,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploaderProps {
  workId: string;
  currentImageCount: number;
  currentVideoCount: number;
  onUploadSuccess: () => void;
  onCancel?: () => void;
}

interface StagedFile {
  file: File;
  thumbBlob: Blob | null;
  previewUrl: string | null;
  id: string;
}

const MAX_RAW_IMAGE_SELECTION_BYTES = 25 * 1024 * 1024; // 25 MB en selección inicial de imágenes
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB procesado (RNF-STOR-01)
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150 MB (RNF-STOR-01)
const MAX_IMAGES_ALLOWED = 20; // RN-03
const MAX_VIDEOS_ALLOWED = 4; // RN-03

interface PresignResponse {
  directUpload: boolean;
  uploads?: Array<{
    key: string;
    uploadUrl: string;
    thumbKey?: string;
    thumbUploadUrl?: string;
    mimeType: string;
    mediaType: 'image' | 'video';
    sizeBytes: number;
    filename: string;
  }>;
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.toLowerCase().startsWith('image/')) {
    return file;
  }
  // No comprimir si ya es un WebP ligero (<= 300 KB)
  if (file.type === 'image/webp' && file.size <= 300 * 1024) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1920;
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.82,
    });

    if (blob && (blob.size < file.size || file.type !== 'image/webp')) {
      const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
      return new File([blob], newName, { type: 'image/webp' });
    }
  } catch {
    // Si la compresión falla, retornar el archivo original
  }

  return file;
}

async function compressVideoIfNeeded(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<File> {
  if (!file.type.toLowerCase().startsWith('video/')) {
    return file;
  }

  // Verificar disponibilidad de WebCodecs en el navegador
  if (!('VideoEncoder' in window)) {
    return file;
  }

  let originalCodec: string | null | undefined;

  try {
    const {
      Input,
      Output,
      Conversion,
      ALL_FORMATS,
      BlobSource,
      BufferTarget,
      Mp4OutputFormat,
      QUALITY_MEDIUM,
    } = await import('mediabunny');

    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS,
    });

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      return file;
    }

    const width = (await videoTrack.getDisplayWidth?.()) ?? videoTrack.displayWidth ?? 1280;
    const height = (await videoTrack.getDisplayHeight?.()) ?? videoTrack.displayHeight ?? 720;
    const codec = (await videoTrack.getCodec?.()) ?? videoTrack.codec;
    originalCodec = codec;

    const canDecodeSource = await videoTrack.canDecode?.();
    if (canDecodeSource === false && codec !== 'avc') {
      throw new Error(
        `El video "${file.name}" está en formato (${codec || 'no reconocido'}) que no puede ser decodificado por el hardware de este equipo. Por favor, sube un video en formato estándar H.264 o realiza la subida desde un equipo con aceleración por hardware.`,
      );
    }

    // Si el video ya es pequeño (<= 3 MB) Y ya está en H.264 (avc) con dimensiones <= 1280p, conservarlo
    const isAlreadyCompatibleH264 = codec === 'avc' && width <= 1280 && height <= 1280;
    if (file.size <= 3 * 1024 * 1024 && isAlreadyCompatibleH264) {
      return file;
    }

    // Redimensionar al lado mayor máximo 1280 (720p HD) asegurando dimensiones pares para H.264
    const maxDimension = 1280;
    let targetWidth = width;
    let targetHeight = height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        targetWidth = maxDimension;
        targetHeight = Math.round((height * maxDimension) / width);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((width * maxDimension) / height);
      }
    }

    targetWidth = Math.max(2, targetWidth - (targetWidth % 2));
    targetHeight = Math.max(2, targetHeight - (targetHeight % 2));

    const targetBuffer = new BufferTarget();
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: targetBuffer,
    });

    const conversion = await Conversion.init({
      input,
      output,
      video: {
        codec: 'avc', // Forzar siempre H.264 para compatibilidad universal en navegadores
        width: targetWidth,
        height: targetHeight,
        fit: 'contain',
        frameRate: 30,
        bitrate: QUALITY_MEDIUM,
        forceTranscode: true, // Evita que HEVC se copie directo sin recodificar
      },
      audio: {
        codec: 'aac',
        bitrate: 128_000,
      },
      showWarnings: false,
    });

    if (!conversion.isValid) {
      console.warn('Conversión no válida para este video:', conversion.discardedTracks);
      if (codec !== 'avc') {
        throw new Error(
          `No se pudo transcodificar el video "${file.name}" a H.264 universal: el códec de origen no es compatible con el hardware de este navegador.`,
        );
      }
      return file;
    }

    if (onProgress) {
      conversion.onProgress = (prog: number) => onProgress(Math.round(prog * 100));
    }

    await conversion.execute();

    const buffer = targetBuffer.buffer;
    if (buffer && buffer.byteLength > 0) {
      // Si el video original no era H.264 (ej. HEVC), usamos el transcodificado aunque pese similar
      // para garantizar que el video se vea y no solo se escuche el audio.
      if (codec !== 'avc' || buffer.byteLength < file.size) {
        const newName = file.name.replace(/\.[^.]+$/, '') + '.mp4';
        return new File([buffer], newName, { type: 'video/mp4' });
      }
    }
  } catch (err) {
    if (originalCodec !== 'avc' && err instanceof Error) {
      throw err;
    }
    console.warn('Compresión de video omitida por fallo o códec no soportado:', err);
  }

  return file;
}

async function extractVideoPosterBlob(file: File): Promise<Blob | null> {
  const targetWidth = 480;
  const targetHeight = 270;

  // 1. Intento principal: Decodificación directa por hardware/WebCodecs con mediabunny CanvasSink
  try {
    const { Input, ALL_FORMATS, BlobSource, CanvasSink } = await import('mediabunny');
    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS,
    });

    try {
      const videoTrack = await input.getPrimaryVideoTrack();
      if (videoTrack && (await videoTrack.canDecode())) {
        const duration = await input.computeDuration();
        const seekTime = duration > 2 ? 1.0 : Math.max(0.1, duration / 3);

        const sink = new CanvasSink(videoTrack, {
          width: targetWidth,
          height: targetHeight,
          fit: 'cover',
        });

        const wrapped = await sink.getCanvas(seekTime);
        if (wrapped?.canvas) {
          const srcCanvas = wrapped.canvas;
          if ('convertToBlob' in srcCanvas) {
            const blob = await (srcCanvas as OffscreenCanvas).convertToBlob({
              type: 'image/webp',
              quality: 0.82,
            });
            if (blob && blob.size > 0) return blob;
          } else if ('toBlob' in srcCanvas) {
            const blob = await new Promise<Blob | null>((res) =>
              (srcCanvas as HTMLCanvasElement).toBlob(res, 'image/webp', 0.82),
            );
            if (blob && blob.size > 0) return blob;
          }
        }
      }
    } finally {
      try {
        input.dispose();
      } catch {
        // Ignorar
      }
    }
  } catch (err) {
    console.warn('Fallback a HTMLVideoElement para extraer miniatura:', err);
  }

  // 2. Fallback: HTMLVideoElement con preload="auto" y espera de frame decodificado
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    let resolved = false;

    // Ocultar en DOM para forzar a Safari/Chrome a activar el pipeline de renderizado de video
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    document.body.appendChild(video);

    const cleanup = () => {
      try {
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        // Ignorar errores de limpieza
      }
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (result: Blob | null) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(safetyTimeout);
      cleanup();
      resolve(result);
    };

    const safetyTimeout = setTimeout(() => {
      finish(null);
    }, 8000);

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    const captureFrame = () => {
      try {
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        if (!vWidth || !vHeight) {
          return finish(null);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return finish(null);
        }

        const scale = Math.max(targetWidth / vWidth, targetHeight / vHeight);
        const scaledWidth = vWidth * scale;
        const scaledHeight = vHeight * scale;
        const offsetX = (targetWidth - scaledWidth) / 2;
        const offsetY = (targetHeight - scaledHeight) / 2;

        ctx.drawImage(video, offsetX, offsetY, scaledWidth, scaledHeight);
        canvas.toBlob(
          (blob) => {
            finish(blob);
          },
          'image/webp',
          0.82,
        );
      } catch {
        finish(null);
      }
    };

    video.onloadeddata = () => {
      let seekTime = 0.5;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        seekTime = video.duration > 2 ? 1.0 : Math.min(0.5, video.duration / 3);
      }
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      if ('requestVideoFrameCallback' in video) {
        (video as unknown as { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(() => {
          captureFrame();
        });
      } else {
        // Dar un pequeño margen de renderizado para que el frame esté en GPU
        requestAnimationFrame(() => {
          setTimeout(captureFrame, 60);
        });
      }
    };

    video.onerror = () => {
      finish(null);
    };

    video.src = objectUrl;
    try {
      video.load();
    } catch {
      finish(null);
    }
  });
}

async function generateThumbnailBlob(file: File): Promise<Blob | null> {
  const type = file.type.toLowerCase();
  if (type.startsWith('video/')) {
    return extractVideoPosterBlob(file);
  }
  if (!type.startsWith('image/')) {
    return null;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const targetWidth = 480;
    const targetHeight = 270;

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      bitmap.close();
      return null;
    }

    // Center-crop proporcional (fit: 'cover') para fotos verticales u horizontales
    const scale = Math.max(targetWidth / bitmap.width, targetHeight / bitmap.height);
    const sw = targetWidth / scale;
    const sh = targetHeight / scale;
    const sx = (bitmap.width - sw) / 2;
    const sy = (bitmap.height - sh) / 2;
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    return await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.8,
    });
  } catch {
    return null;
  }
  return null;
}

function uploadToPresignedUrl(
  uploadUrl: string,
  file: File | Blob,
  mimeType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', mimeType);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Error al subir archivo a S3/R2 (código ${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Fallo de red durante la subida directa a storage.'));
    xhr.send(file);
  });
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  workId,
  currentImageCount,
  currentVideoCount,
  onUploadSuccess,
  onCancel: _onCancel,
}) => {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stagedFilesRef = useRef(stagedFiles);
  stagedFilesRef.current = stagedFiles;

  // Limpiar object URLs generadas únicamente al desmontar el componente
  useEffect(() => {
    return () => {
      stagedFilesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const availableImages = Math.max(0, MAX_IMAGES_ALLOWED - currentImageCount);
  const availableVideos = Math.max(0, MAX_VIDEOS_ALLOWED - currentVideoCount);

  const processAndStageFiles = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setErrorMessage(null);

    const existingFiles = stagedFilesRef.current.map((s) => s.file);
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
        return;
      }

      if (isImg) {
        if (file.size > MAX_RAW_IMAGE_SELECTION_BYTES) {
          setErrorMessage(
            `"${file.name}" supera el límite inicial de 25 MB para selección de imágenes.`,
          );
          return;
        }
        totalImages++;
      } else if (isVid) {
        if (file.size > MAX_VIDEO_BYTES) {
          setErrorMessage(
            `"${file.name}" supera el límite máximo de 150 MB para videos (RNF-STOR-01).`,
          );
          return;
        }
        totalVideos++;
      }
    }

    if (currentImageCount + totalImages > MAX_IMAGES_ALLOWED) {
      setErrorMessage(
        `Excedería el límite de ${MAX_IMAGES_ALLOWED} fotos por trabajo (RN-03). Disponibles: ${availableImages}.`,
      );
      return;
    }

    if (currentVideoCount + totalVideos > MAX_VIDEOS_ALLOWED) {
      setErrorMessage(
        `Excedería el límite de ${MAX_VIDEOS_ALLOWED} videos por trabajo (RN-03). Disponibles: ${availableVideos}.`,
      );
      return;
    }

    setIsProcessingFiles(true);
    setProcessingStatus('Preparando archivos...');
    try {
      const processed: StagedFile[] = [];
      for (const file of newFiles) {
        const isImg = file.type.toLowerCase().startsWith('image/');
        const isVid = file.type.toLowerCase().startsWith('video/');

        if (isImg) {
          setProcessingStatus(`Optimizando imagen "${file.name}"...`);
          const compressed = await compressImageIfNeeded(file);
          if (compressed.size > MAX_IMAGE_BYTES) {
            setErrorMessage(
              `"${compressed.name}" supera el límite máximo de 10 MB para imágenes (RNF-STOR-01).`,
            );
            setIsProcessingFiles(false);
            setProcessingStatus(null);
            return;
          }
          const thumbBlob = await generateThumbnailBlob(compressed);
          const previewUrl = URL.createObjectURL(compressed);
          processed.push({
            file: compressed,
            thumbBlob,
            previewUrl,
            id: `${compressed.name}-${compressed.size}-${Date.now()}-${Math.random()}`,
          });
        } else if (isVid) {
          setProcessingStatus(`Comprimiendo video "${file.name}" con WebCodecs...`);
          const compressed = await compressVideoIfNeeded(file, (pct) => {
            setProcessingStatus(`Comprimiendo video "${file.name}" (${pct}%)...`);
          });
          setProcessingStatus(`Extrayendo miniatura de "${file.name}"...`);
          const posterBlob = await extractVideoPosterBlob(compressed);
          const previewUrl = posterBlob ? URL.createObjectURL(posterBlob) : null;
          processed.push({
            file: compressed,
            thumbBlob: posterBlob,
            previewUrl,
            id: `${compressed.name}-${compressed.size}-${Date.now()}-${Math.random()}`,
          });
        }
      }

      setStagedFiles((prev) => [...prev, ...processed]);
    } catch (err) {
      setErrorMessage('Error al procesar los archivos seleccionados: ' + (err as Error).message);
    } finally {
      setIsProcessingFiles(false);
      setProcessingStatus(null);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    void processAndStageFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isProcessingFiles || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      void processAndStageFiles(files);
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
    if (stagedFiles.length === 0 || isUploading || isProcessingFiles) return;
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      // 1. Intentar subida directa vía Presigned URLs (S3/Cloudflare R2)
      let directUploadDone = false;
      try {
        const presignRes = await apiClient.post<PresignResponse>(`/works/${workId}/media/presign`, {
          files: stagedFiles.map((s) => ({
            filename: s.file.name,
            mimeType: s.file.type,
            sizeBytes: s.file.size,
            thumbSizeBytes: s.thumbBlob ? s.thumbBlob.size : undefined,
          })),
        });

        if (
          presignRes?.directUpload &&
          Array.isArray(presignRes.uploads) &&
          presignRes.uploads.length === stagedFiles.length
        ) {
          const totalFiles = stagedFiles.length;
          const progressMap = new Array<number>(totalFiles).fill(0);

          await Promise.all(
            stagedFiles.map(async (staged, idx) => {
              const uploadInfo = presignRes.uploads![idx];
              const uploads: Promise<void>[] = [
                uploadToPresignedUrl(
                  uploadInfo.uploadUrl,
                  staged.file,
                  uploadInfo.mimeType,
                  (percent) => {
                    progressMap[idx] = percent;
                    const totalPercent = Math.round(
                      progressMap.reduce((a, b) => a + b, 0) / totalFiles,
                    );
                    setUploadProgress(totalPercent);
                  },
                ),
              ];

              if (uploadInfo.thumbUploadUrl) {
                uploads.push(
                  (async () => {
                    const thumbBlob =
                      staged.thumbBlob || (await generateThumbnailBlob(staged.file));
                    if (thumbBlob) {
                      await uploadToPresignedUrl(
                        uploadInfo.thumbUploadUrl!,
                        thumbBlob,
                        'image/webp',
                      );
                    }
                  })(),
                );
              }

              await Promise.all(uploads);
            }),
          );

          // Confirmar registros en Prisma
          await apiClient.post(`/works/${workId}/media/confirm`, {
            files: presignRes.uploads.map((u) => ({
              key: u.key,
              mimeType: u.mimeType,
              mediaType: u.mediaType,
              sizeBytes: u.sizeBytes,
            })),
          });

          directUploadDone = true;
        }
      } catch {
        // Fallback al endpoint multipart si el storage driver es local o falla el presign
        directUploadDone = false;
      }

      // 2. Fallback a subida multipart tradicional (Local storage)
      if (!directUploadDone) {
        const formData = new FormData();
        stagedFiles.forEach((s) => {
          formData.append('files', s.file);
        });
        const uploadRes = await apiClient.upload<{
          uploaded: Array<{
            id: string;
            work_id: string;
            url: string;
            thumbnail_url: string;
            type: string;
            size_bytes: number;
            sort_order: number;
          }>;
        }>(`/works/${workId}/media`, formData);

        // Subir miniaturas físicas (posters) para videos u otros medios que tengan thumbBlob local
        if (uploadRes?.uploaded && Array.isArray(uploadRes.uploaded)) {
          await Promise.allSettled(
            uploadRes.uploaded.map(async (asset, idx) => {
              const staged = stagedFiles[idx];
              if (staged?.thumbBlob) {
                try {
                  await apiClient.put(`/media/${asset.id}/thumbnail`, staged.thumbBlob, {
                    headers: { 'Content-Type': 'image/webp' },
                  });
                } catch (thumbErr) {
                  console.warn(`No se pudo subir miniatura para ${asset.id}:`, thumbErr);
                }
              }
            }),
          );
        }
      }

      handleClearAll();
      onUploadSuccess();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
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
            <span className="text-[10px] text-[#9aa0a6] ml-1">({availableImages} disp.)</span>
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <span className="text-[#9aa0a6] flex items-center gap-1.5 font-medium">
            <VideoIcon className="w-3.5 h-3.5 text-cyan-400" />
            Videos
          </span>
          <span className="font-semibold text-white">
            {currentVideoCount} / {MAX_VIDEOS_ALLOWED}
            <span className="text-[10px] text-[#9aa0a6] ml-1">({availableVideos} disp.)</span>
          </span>
        </div>
      </div>

      {/* Zona Drag & Drop estilo Google Cloud / Workspace */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isProcessingFiles && !isUploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!isProcessingFiles && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          'relative flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer text-center transition-all duration-200 border-2 border-dashed group select-none',
          isProcessingFiles || isUploading ? 'opacity-60 pointer-events-none' : '',
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
          Arrastra fotos o videos aquí, o{' '}
          <span className="text-[#4285F4] underline underline-offset-2">selecciónalos</span>
        </p>

        <p className="text-[11px] text-[#9aa0a6] mt-1 max-w-xs leading-normal">
          JPG, PNG, WebP (hasta 25 MB en selección, máx 10 MB optimizado) · MP4, WebM (hasta 150 MB)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          disabled={isProcessingFiles || isUploading}
          onChange={handleFileSelection}
        />
      </div>

      {/* Indicador de Procesamiento y Compresión en Cliente */}
      {isProcessingFiles && (
        <div className="p-3 rounded-xl bg-[#1a73e8]/10 border border-[#1a73e8]/30 text-[#8ab4f8] text-xs font-medium flex items-center gap-2 animate-in fade-in-0">
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#4285F4]" />
          <span>{processingStatus || 'Optimizando imágenes y extrayendo miniaturas de video...'}</span>
        </div>
      )}

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
              {stagedFiles.length} {stagedFiles.length === 1 ? 'archivo listo' : 'archivos listos'}{' '}
              ({totalMB} MB)
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
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center relative">
                      {item.previewUrl ? (
                        <>
                          <img
                            src={item.previewUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {!isImg && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <VideoIcon className="w-3.5 h-3.5 text-cyan-400" />
                            </div>
                          )}
                        </>
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
                    disabled={isUploading || isProcessingFiles}
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
              disabled={isUploading || isProcessingFiles}
              className="h-8 text-xs font-medium rounded-full border-white/10 text-[#9aa0a6] hover:text-white hover:bg-white/10"
            >
              Descartar Todo
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleUploadSubmit}
              disabled={isUploading || isProcessingFiles}
              className="h-8 text-xs font-medium rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-[0_0_15px_rgba(26,115,232,0.35)] gap-1.5 px-4"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {uploadProgress !== null && uploadProgress > 0
                    ? `Subiendo ${uploadProgress}%...`
                    : 'Subiendo...'}
                </>
              ) : isProcessingFiles ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Optimizando...
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
