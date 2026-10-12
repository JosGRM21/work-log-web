import React, { useState, useRef } from 'react';
import { apiClient } from '../../api/client.js';
import { Button } from '@/components/ui/button';
import { UploadCloud, File, AlertCircle, Loader2 } from 'lucide-react';

interface MediaUploaderProps {
    workId: string;
    currentImageCount: number;
    currentVideoCount: number;
    onUploadSuccess: () => void;
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
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFiles = (files: File[]): boolean => {
        let newImages = 0;
        let newVideos = 0;

        for (const file of files) {
            const type = file.type.toLowerCase();
            const isImg = type.startsWith('image/');
            const isVid = type.startsWith('video/');

            if (!isImg && !isVid) {
                setErrorMessage(`"${file.name}" no es un archivo permitido. Solo se aceptan imágenes y videos.`);
                return false;
            }

            if (isImg) {
                if (file.size > MAX_IMAGE_BYTES) {
                    setErrorMessage(`"${file.name}" supera el límite de 10 MB para imágenes (RNF-STOR-01).`);
                    return false;
                }
                newImages++;
            } else if (isVid) {
                if (file.size > MAX_VIDEO_BYTES) {
                    setErrorMessage(`"${file.name}" supera el límite de 150 MB para videos (RNF-STOR-01).`);
                    return false;
                }
                newVideos++;
            }
        }

        if (currentImageCount + newImages > MAX_IMAGES_ALLOWED) {
            setErrorMessage(
                `Se excedería el límite de ${MAX_IMAGES_ALLOWED} fotos por trabajo (RN-03). Actuales: ${currentImageCount}.`,
            );
            return false;
        }

        if (currentVideoCount + newVideos > MAX_VIDEOS_ALLOWED) {
            setErrorMessage(
                `Se excedería el límite de ${MAX_VIDEOS_ALLOWED} videos por trabajo (RN-03). Actuales: ${currentVideoCount}.`,
            );
            return false;
        }

        return true;
    };

    const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setErrorMessage(null);
        if (validateFiles(files)) {
            setSelectedFiles(files);
        } else {
            setSelectedFiles([]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            setErrorMessage(null);
            if (validateFiles(files)) {
                setSelectedFiles(files);
            } else {
                setSelectedFiles([]);
            }
        }
    };

    const handleUploadSubmit = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);
        setErrorMessage(null);

        const formData = new FormData();
        selectedFiles.forEach((file) => {
            formData.append('files', file);
        });

        try {
            await apiClient.upload(`/works/${workId}/media`, formData);
            setSelectedFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            onUploadSuccess();
        } catch (err) {
            setErrorMessage((err as Error).message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 p-4 bg-muted/40 rounded-xl border border-dashed border-border">
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-6 rounded-lg transition-all text-center cursor-pointer border ${
                    isDragOver
                        ? 'bg-primary/5 border-primary shadow-xs'
                        : 'border-transparent hover:bg-muted/80'
                }`}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-foreground">
                    Arrastra fotos o videos aquí, o haz clic para seleccionarlos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
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

            {selectedFiles.length > 0 && (
                <div className="flex flex-col gap-2 pt-2">
                    <span className="text-xs font-semibold text-foreground">
                        {selectedFiles.length} {selectedFiles.length === 1 ? 'archivo listo' : 'archivos listos'} para subir:
                    </span>
                    <ul className="text-xs text-muted-foreground max-h-32 overflow-y-auto space-y-1.5 pr-1">
                        {selectedFiles.map((f, i) => (
                            <li key={i} className="flex justify-between items-center bg-card px-3 py-1.5 rounded-lg border border-border shadow-2xs">
                                <span className="truncate max-w-[280px] flex items-center gap-1.5 text-foreground">
                                    <File className="w-3.5 h-3.5 text-muted-foreground" />
                                    {f.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    {(f.size / (1024 * 1024)).toFixed(2)} MB
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="flex justify-end gap-2 mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSelectedFiles([]);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            disabled={isUploading}
                        >
                            Descartar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleUploadSubmit}
                            disabled={isUploading}
                        >
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Comenzar Subida
                        </Button>
                    </div>
                </div>
            )}

            {errorMessage && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}
        </div>
    );
};