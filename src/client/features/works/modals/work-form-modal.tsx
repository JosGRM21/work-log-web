import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { WorkItemDetail, WorkStatus } from '@shared/types.js';
import { worksApi } from '../api/works.api.js';
import { cn, getTodayLocalIso, calculateWorkDuration } from '@/lib/utils';
import { WorkStatusSelector } from '../components/work-status-selector.js';
import { WorkDateField } from '../components/work-date-field.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  Loader2,
  Briefcase,
  PencilLine,
  Calendar,
  FileText,
  AlertTriangle,
  Wrench,
  MapPin,
  X,
  Check,
  Clock,
} from 'lucide-react';

interface WorkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workToEdit?: WorkItemDetail | null;
  availableAreas?: string[];
}

const MAX_TITLE_LENGTH = 150;
const DATE_COHERENCE_ERROR =
  'Inconsistencia temporal (RN-02): la fecha final no puede ser anterior a la de inicio.';

export const WorkFormModal: React.FC<WorkFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  workToEdit,
  availableAreas = [],
}) => {
  const isEditing = !!workToEdit;
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkStatus>('pending');
  const [referenceDate, setReferenceDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [refDateError, setRefDateError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayIso = getTodayLocalIso();

  useEffect(() => {
    if (workToEdit) {
      setTitle(workToEdit.title);
      setArea(workToEdit.area || '');
      setDescription(workToEdit.description || '');
      setStatus(workToEdit.status);
      setReferenceDate(workToEdit.reference_date);
      setStartDate(workToEdit.start_date || '');
      setEndDate(workToEdit.end_date || '');
      setNextMaintenanceDate(workToEdit.next_maintenance_date || '');
    } else {
      const today = getTodayLocalIso();
      setTitle('');
      setArea('');
      setDescription('');
      setStatus('pending');
      setReferenceDate(today);
      setStartDate('');
      setEndDate('');
      setNextMaintenanceDate('');
    }
    setTitleError(null);
    setRefDateError(null);
    setDateError(null);
    setApiError(null);
  }, [workToEdit, isOpen]);

  // Validación de consistencia temporal (RN-02)
  const validateDates = (newStart: string, newEnd: string): boolean => {
    if (newStart && newEnd && newEnd < newStart) {
      setDateError(DATE_COHERENCE_ERROR);
      return false;
    }
    setDateError(null);
    return true;
  };

  const executionDuration = useMemo(
    () => calculateWorkDuration(startDate, endDate, false),
    [startDate, endDate],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setTitleError('Ingrese un título o denominación para la obra.');
      titleInputRef.current?.focus();
      return;
    }

    if (!referenceDate) {
      setRefDateError('La fecha de registro es obligatoria.');
      document.getElementById('work-ref-date')?.focus();
      return;
    }

    if (!validateDates(startDate, endDate)) {
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    const payload = {
      title: cleanTitle,
      area: area.trim() ? area.trim() : null,
      description: description.trim() ? description.trim() : null,
      status,
      reference_date: referenceDate,
      start_date: startDate || null,
      end_date: endDate || null,
      next_maintenance_date: nextMaintenanceDate || null,
    };

    try {
      if (isEditing) {
        await worksApi.update(workToEdit.id, payload);
        toast.add({
          title: 'Ficha actualizada',
          description: 'Los cambios de la obra fueron guardados correctamente.',
          type: 'success',
        });
      } else {
        await worksApi.create(payload);
        toast.add({
          title: 'Trabajo registrado',
          description: 'La nueva obra fue incorporada a la bitácora.',
          type: 'success',
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleCount = title.length;
  const isTitleNearLimit = titleCount >= 130;
  const isTitleAtLimit = titleCount >= MAX_TITLE_LENGTH;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        mobileFullscreen
        showCloseButton={false}
        className="sm:max-w-2xl sm:max-h-[90dvh] flex flex-col gap-0 overflow-hidden sm:rounded-[28px] sm:border sm:border-white/10 bg-[#080c14] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(26,115,232,0.12)] p-0"
      >
        {/* Destello superior sutil consistente con WorkDetailModal */}
        <div
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#669df6]/50 to-transparent z-30"
          aria-hidden="true"
        />

        <DialogHeader className="px-4 sm:px-6 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 sm:py-4 border-b border-white/[0.08] shrink-0 bg-[#080c14]/95 backdrop-blur-md z-20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#1a73e8]/15 text-[#669df6] border border-[#1a73e8]/30 shrink-0 shadow-xs">
                {isEditing ? (
                  <PencilLine className="w-5 h-5 stroke-[2.1]" />
                ) : (
                  <Briefcase className="w-5 h-5 stroke-[2.1]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#669df6]">
                    MIBITURVEN S.A.
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#9aa0a6]">
                    {isEditing ? 'Edición' : 'Nuevo registro'}
                  </span>
                </div>
                <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight text-white font-heading truncate">
                  {isEditing ? 'Editar Ficha Técnica' : 'Registrar Nuevo Trabajo'}
                </DialogTitle>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Cerrar formulario"
              title="Cerrar (Esc)"
              className="h-9 w-9 sm:h-8 sm:w-8 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/10 shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <DialogDescription className="text-xs text-[#9aa0a6] leading-relaxed pt-1">
            {isEditing
              ? 'Actualice los datos técnicos, cronograma o estado operativo de este proyecto.'
              : 'Complete la ficha técnica para registrar un nuevo proyecto u obra en la bitácora.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5 space-y-4 no-scrollbar">
            {/* Sección 1: Identificación y Área */}
            <section className="rounded-2xl border border-white/[0.08] bg-[#0c121e]/80 p-3.5 sm:p-4 space-y-4 shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8ab4f8] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#4285F4]" />
                  Identificación y Ubicación
                </span>
              </div>

              {/* Título */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="work-title" className="text-xs font-medium text-[#c4c7c5]">
                    Título o Denominación de la Obra
                    <span className="text-[#669df6]">*</span>
                  </Label>
                  <span
                    className={cn(
                      'text-[11px] tabular-nums font-medium transition-colors',
                      isTitleAtLimit
                        ? 'text-red-400'
                        : isTitleNearLimit
                          ? 'text-[#fdd663]'
                          : 'text-[#80868b]',
                    )}
                  >
                    {titleCount}/{MAX_TITLE_LENGTH}
                  </span>
                </div>

                <div className="relative flex items-center">
                  <Input
                    ref={titleInputRef}
                    id="work-title"
                    placeholder="Ej. Mantenimiento General de Planta de Beneficio"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (titleError && e.target.value.trim()) {
                        setTitleError(null);
                      }
                    }}
                    required
                    maxLength={MAX_TITLE_LENGTH}
                    aria-invalid={!!titleError || undefined}
                    className={cn(
                      'h-11 sm:h-10 rounded-xl bg-[#070b13]/90 border-white/[0.1] text-white placeholder:text-[#6e7681] focus-visible:border-[#4285F4]/60 focus-visible:ring-2 focus-visible:ring-[#4285F4]/25',
                      title.length > 0 && 'pr-10',
                      titleError &&
                        'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/30',
                    )}
                  />
                  {title.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTitle('')}
                      aria-label="Limpiar título"
                      className="absolute right-2.5 p-1.5 rounded-full text-[#80868b] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {titleError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{titleError}</span>
                  </p>
                )}
              </div>

              {/* Área de realización */}
              <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="work-area" className="text-xs font-medium text-[#c4c7c5]">
                    Área de Realización
                  </Label>
                  {area.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setArea('')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9aa0a6] hover:text-white px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Limpiar</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-medium text-[#80868b] uppercase tracking-wider">
                      Opcional
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <MapPin className="pointer-events-none absolute left-3 w-4 h-4 text-[#669df6]" />
                  <Input
                    id="work-area"
                    placeholder="Ej. Planta de Beneficio, Taller Mecánico, Almacén..."
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    maxLength={100}
                    className={cn(
                      'h-11 sm:h-10 pl-9 rounded-xl bg-[#070b13]/90 border-white/[0.1] text-white placeholder:text-[#6e7681] focus-visible:border-[#4285F4]/60 focus-visible:ring-2 focus-visible:ring-[#4285F4]/25',
                      area.length > 0 && 'pr-10',
                    )}
                  />
                  {area.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setArea('')}
                      aria-label="Limpiar área"
                      className="absolute right-2.5 p-1.5 rounded-full text-[#80868b] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {availableAreas.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <span className="block text-[11px] text-[#80868b]">
                      Áreas registradas (toque para seleccionar):
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                      {availableAreas.map((item) => {
                        const isSelected = area.trim().toLowerCase() === item.toLowerCase();
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setArea(isSelected ? '' : item)}
                            aria-pressed={isSelected}
                            className={cn(
                              'inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none touch-manipulation',
                              isSelected
                                ? 'bg-[#1a73e8]/25 border-[#4285F4]/60 text-white'
                                : 'bg-[#070b13]/80 border-white/[0.08] text-[#9aa0a6] hover:text-white hover:border-white/25 hover:bg-white/[0.05]',
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-[#8ab4f8] shrink-0" />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Sección 2: Estado Operativo */}
            <section className="rounded-2xl border border-white/[0.08] bg-[#0c121e]/80 p-3.5 sm:p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span
                  id="work-status-label"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#8ab4f8] flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-[#4285F4]" />
                  Estado Operativo <span className="text-[#669df6]">*</span>
                </span>
              </div>
              <WorkStatusSelector
                value={status}
                onChange={setStatus}
                labelledBy="work-status-label"
              />
            </section>

            {/* Sección 3: Cronograma y Mantenimiento */}
            <section className="rounded-2xl border border-white/[0.08] bg-[#0c121e]/80 p-3.5 sm:p-4 space-y-4 shadow-md">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8ab4f8] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#4285F4]" />
                  Cronograma y Fechas Operativas
                </span>

                {executionDuration && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1a73e8]/15 border border-[#4285F4]/30 text-[11px] font-medium text-[#8ab4f8] tabular-nums">
                    <Clock className="w-3 h-3" />
                    Duración: {executionDuration}
                  </span>
                )}
              </div>

              <WorkDateField
                id="work-ref-date"
                label="Fecha de Registro"
                value={referenceDate}
                onChange={(val) => {
                  setReferenceDate(val);
                  if (refDateError && val) {
                    setRefDateError(null);
                  }
                }}
                required
                invalid={!!refDateError}
                quickAction={
                  referenceDate !== todayIso
                    ? {
                        label: 'Usar hoy',
                        onClick: () => {
                          setReferenceDate(todayIso);
                          setRefDateError(null);
                        },
                      }
                    : undefined
                }
              />

              {refDateError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5 font-medium -mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{refDateError}</span>
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-white/[0.06]">
                <WorkDateField
                  id="work-start-date"
                  label="Fecha de Inicio"
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val);
                    validateDates(val, endDate);
                  }}
                  optional
                />

                <WorkDateField
                  id="work-end-date"
                  label="Fecha de Finalización"
                  value={endDate}
                  onChange={(val) => {
                    setEndDate(val);
                    validateDates(startDate, val);
                  }}
                  optional
                  invalid={!!dateError}
                />
              </div>

              {dateError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-destructive/12 border border-destructive/30 text-red-300 text-xs font-medium flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{dateError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-white/[0.06]">
                <WorkDateField
                  id="work-next-maintenance"
                  label="Próximo Mantenimiento"
                  value={nextMaintenanceDate}
                  onChange={setNextMaintenanceDate}
                  optional
                  icon={<Wrench className="w-3.5 h-3.5 text-[#fdd663] shrink-0" />}
                  hint="Programación sugerida para revisión técnica o servicio preventivo."
                />
              </div>
            </section>

            {/* Sección 4: Descripción Técnica */}
            <section className="rounded-2xl border border-white/[0.08] bg-[#0c121e]/80 p-3.5 sm:p-4 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="work-description"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#8ab4f8] flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#4285F4]" />
                  Descripción Técnica y Alcance
                </Label>
                {description.length > 0 ? (
                  <span className="text-[11px] text-[#80868b] tabular-nums">
                    {description.length} caracteres
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-[#80868b] uppercase tracking-wider">
                    Opcional
                  </span>
                )}
              </div>
              <Textarea
                id="work-description"
                placeholder="Detalles sobre materiales, equipos mineros, personal asignado o especificaciones técnicas..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[112px] sm:min-h-[124px] rounded-xl bg-[#070b13]/90 border-white/[0.1] text-white placeholder:text-[#6e7681] p-3 leading-relaxed focus-visible:border-[#4285F4]/60 focus-visible:ring-2 focus-visible:ring-[#4285F4]/25"
              />
            </section>

            {apiError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-red-300 text-xs font-medium flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="px-4 sm:px-6 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:py-4 border-t border-white/[0.08] bg-[#080c14]/95 backdrop-blur-md shrink-0 z-20">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 sm:h-9 px-5 rounded-full border-white/10 text-[#9aa0a6] hover:text-white hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !!dateError}
              className="w-full sm:w-auto h-11 sm:h-9 px-6 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium rounded-full shadow-[0_0_15px_rgba(26,115,232,0.35)] transition-all"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Registrar Trabajo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
