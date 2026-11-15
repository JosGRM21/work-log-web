import React from 'react';
import type { WorkItemDetail } from '@shared/types.js';
import { cn, formatWorkDate } from '@/lib/utils';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, FileText, Pencil, Copy, Check, UploadCloud, Loader2, MapPin } from 'lucide-react';

const MediaUploader = React.lazy(() =>
  import('@/features/media/components/media-uploader.js').then((m) => ({
    default: m.MediaUploader,
  })),
);

interface WorkDossierPanelProps {
  work: WorkItemDetail;
  duration: string | null;
  imagesCount: number;
  videosCount: number;
  isAuthenticated: boolean;
  activeTab: string;
  copiedDesc: boolean;
  onCopyText: (text: string) => void;
  onEdit: (work: WorkItemDetail) => void;
  onBackToDossier: () => void;
  onUploadSuccess: () => void;
}

export const WorkDossierPanel: React.FC<WorkDossierPanelProps> = ({
  work,
  duration,
  imagesCount,
  videosCount,
  isAuthenticated,
  activeTab,
  copiedDesc,
  onCopyText,
  onEdit,
  onBackToDossier,
  onUploadSuccess,
}) => {
  return (
    <div className="px-4 sm:px-5 py-4 space-y-4">
      {activeTab === 'upload' && isAuthenticated ? (
        <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
            <span className="text-xs font-semibold text-white flex items-center gap-2 min-w-0">
              <UploadCloud className="w-4 h-4 text-[#4285F4] shrink-0" />
              <span className="truncate">Subida de Evidencias</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToDossier}
              className="h-8 sm:h-7 px-3 text-[11px] text-[#9aa0a6] hover:text-white rounded-full shrink-0"
            >
              Volver al Expediente
            </Button>
          </div>
          <React.Suspense
            fallback={
              <div className="py-12 flex items-center justify-center text-xs text-[#9aa0a6] gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" />
                Cargando gestor de archivos...
              </div>
            }
          >
            <MediaUploader
              workId={work.id}
              currentImageCount={imagesCount}
              currentVideoCount={videosCount}
              onUploadSuccess={onUploadSuccess}
              onCancel={onBackToDossier}
            />
          </React.Suspense>
        </div>
      ) : (
        <>
          <DialogHeader className="p-0 m-0 pb-1 text-left">
            <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight text-white leading-snug font-heading">
              {work.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Expediente técnico de la obra {work.title}.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 sm:mt-6 space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-3.5 sm:p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-[#8ab4f8] uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#4285F4]" />
                  Datos y Cronograma
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div className="col-span-2 p-2.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 flex flex-col justify-between gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-[#9aa0a6] flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-[#669df6] shrink-0" />
                      Área de Ejecución
                    </span>
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => onEdit(work)}
                        className="p-1 -m-1 rounded text-[#9aa0a6] hover:text-[#8ab4f8] transition-colors shrink-0"
                        title="Editar área de ejecución"
                        aria-label="Editar área de ejecución"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs sm:text-sm font-semibold tracking-tight',
                      work.area ? 'text-white' : 'text-neutral-400 font-normal italic',
                    )}
                  >
                    {work.area || 'No especificada'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 flex flex-col justify-between gap-1">
                  <span className="text-[11px] text-[#9aa0a6]">Fecha de Inicio</span>
                  <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                    {work.start_date ? formatWorkDate(work.start_date) : 'No definida'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 flex flex-col justify-between gap-1">
                  <span className="text-[11px] text-[#9aa0a6]">Fecha de Finalización</span>
                  <span className="text-xs sm:text-sm font-semibold text-[#81c995] tracking-tight">
                    {work.end_date ? formatWorkDate(work.end_date) : 'En progreso'}
                  </span>
                </div>

                {duration && (
                  <div className="p-2.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 flex flex-col justify-between gap-1">
                    <span className="text-[11px] text-[#9aa0a6]">Duración</span>
                    <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                      {duration}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    'p-2.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 flex flex-col justify-between gap-1',
                    !duration && 'col-span-2',
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-[#9aa0a6] truncate">
                      Próximo Mantenimiento
                    </span>
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => onEdit(work)}
                        className="p-1 -m-1 rounded text-[#9aa0a6] hover:text-[#8ab4f8] transition-colors shrink-0"
                        title="Editar fecha de mantenimiento"
                        aria-label="Editar fecha de mantenimiento"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs sm:text-sm font-semibold tracking-tight',
                      work.next_maintenance_date
                        ? 'text-[#fdd663]'
                        : 'text-neutral-400 font-normal italic',
                    )}
                  >
                    {work.next_maintenance_date
                      ? formatWorkDate(work.next_maintenance_date)
                      : 'No programada'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-3.5 sm:p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wider text-[#8ab4f8] uppercase flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#4285F4]" />
                  Descripción
                </span>
                {work.description && (
                  <button
                    type="button"
                    onClick={() => onCopyText(work.description!)}
                    className="text-[11px] text-[#9aa0a6] hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] transition-colors"
                    title="Copiar descripción"
                  >
                    {copiedDesc ? (
                      <>
                        <Check className="w-3 h-3 text-[#81c995]" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#4285F4]" /> Copiar texto
                      </>
                    )}
                  </button>
                )}
              </div>

              {work.description ? (
                <div className="p-3 sm:p-3.5 rounded-lg border border-white/[0.06] bg-[#070b13]/90 text-[13px] sm:text-sm text-neutral-200 whitespace-pre-line leading-relaxed font-sans shadow-inner">
                  {work.description}
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-dashed border-white/[0.06] bg-[#070b13]/60 text-xs text-[#9aa0a6] italic text-center">
                  Sin descripción complementaria registrada en este expediente.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
