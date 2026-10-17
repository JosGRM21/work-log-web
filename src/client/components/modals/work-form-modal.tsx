import React, { useState, useEffect } from 'react';
import type { WorkItemDetail, WorkStatus } from '../../../shared/types.js';
import { apiClient } from '../../api/client.js';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, Calendar, FileText, AlertTriangle, Wrench } from 'lucide-react';

interface WorkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workToEdit?: WorkItemDetail | null;
}

export const WorkFormModal: React.FC<WorkFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  workToEdit,
}) => {
  const isEditing = !!workToEdit;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkStatus>('pending');
  const [referenceDate, setReferenceDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (workToEdit) {
      setTitle(workToEdit.title);
      setDescription(workToEdit.description || '');
      setStatus(workToEdit.status);
      setReferenceDate(workToEdit.reference_date);
      setStartDate(workToEdit.start_date || '');
      setEndDate(workToEdit.end_date || '');
      setNextMaintenanceDate(workToEdit.next_maintenance_date || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setTitle('');
      setDescription('');
      setStatus('pending');
      setReferenceDate(today);
      setStartDate('');
      setEndDate('');
      setNextMaintenanceDate('');
    }
    setDateError(null);
    setApiError(null);
  }, [workToEdit, isOpen]);

  // Validación de consistencia temporal (RN-02)
  const handleDateCoherence = (newStart: string, newEnd: string) => {
    if (newStart && newEnd && newEnd < newStart) {
      setDateError(
        'Inconsistencia temporal (RN-02): la fecha final no puede ser anterior a la de inicio.',
      );
    } else {
      setDateError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate && endDate < startDate) {
      setDateError(
        'Inconsistencia temporal (RN-02): la fecha final no puede ser anterior a la de inicio.',
      );
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    const payload = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      status,
      reference_date: referenceDate,
      start_date: startDate ? startDate : null,
      end_date: endDate ? endDate : null,
      next_maintenance_date: nextMaintenanceDate ? nextMaintenanceDate : null,
    };

    try {
      if (isEditing) {
        await apiClient.patch(`/works/${workToEdit.id}`, payload);
      } else {
        await apiClient.post('/works', payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-[24px] border-white/10 bg-[#080c14] shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2.5 rounded-xl bg-[#1a73e8]/15 text-[#4285F4] border border-[#1a73e8]/30">
              <Briefcase className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4285F4]">
                MIBITURVEN S.A.
              </span>
              <DialogTitle className="text-xl font-medium tracking-tight text-white font-heading">
                {isEditing ? 'Editar Ficha Técnica de Trabajo' : 'Registrar Nuevo Trabajo Técnico'}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-[#9aa0a6]">
            {isEditing
              ? 'Actualice los datos técnicos, cronograma o estado operativo de este proyecto.'
              : 'Complete la ficha técnica para registrar un nuevo proyecto u obra en la bitácora institucional.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
          {/* Sección 1: Identificación */}
          <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <Label
              htmlFor="work-title"
              className="text-xs font-semibold uppercase tracking-wider text-white"
            >
              Título o Denominación de la Obra *
            </Label>
            <Input
              id="work-title"
              placeholder="Ej. Mantenimiento General de Planta de Beneficio"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={150}
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-[#9aa0a6] rounded-xl focus-visible:ring-2 focus-visible:ring-[#4285F4]/40"
            />
            <span className="text-[11px] text-[#9aa0a6]">
              Máximo 150 caracteres (campo obligatorio)
            </span>
          </div>

          {/* Sección 2: Estado y Cronograma */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#4285F4]" />
              Estado y Fechas Operativas
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="grid gap-1.5">
                <Label htmlFor="work-status" className="text-xs font-medium text-muted-foreground">
                  Estado Operativo *
                </Label>
                <Select value={status} onValueChange={(val) => setStatus(val as WorkStatus)}>
                  <SelectTrigger id="work-status" className="w-full bg-card/70 border-border/80">
                    <SelectValue placeholder="Seleccione un estado">
                      {status === 'pending'
                        ? 'Por Realizar'
                        : status === 'in_progress'
                          ? 'En Curso'
                          : status === 'completed'
                            ? 'Terminado'
                            : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Por Realizar</SelectItem>
                    <SelectItem value="in_progress">En Curso</SelectItem>
                    <SelectItem value="completed">Terminado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label
                  htmlFor="work-ref-date"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Fecha de Registro *
                </Label>
                <Input
                  id="work-ref-date"
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  required
                  className="bg-card/70 border-border/80"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="grid gap-1.5">
                <Label
                  htmlFor="work-start-date"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Fecha de Inicio (Opcional)
                </Label>
                <Input
                  id="work-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    handleDateCoherence(e.target.value, endDate);
                  }}
                  className="bg-card/70 border-border/80"
                />
              </div>

              <div className="grid gap-1.5">
                <Label
                  htmlFor="work-end-date"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Fecha de Finalización (Opcional)
                </Label>
                <Input
                  id="work-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    handleDateCoherence(startDate, e.target.value);
                  }}
                  className="bg-card/70 border-border/80"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 pt-2 border-t border-white/[0.06]">
              <div className="grid gap-1.5">
                <Label
                  htmlFor="work-next-maintenance"
                  className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#fdd663]" />
                  Fecha de Próximo Mantenimiento (Opcional)
                </Label>
                <Input
                  id="work-next-maintenance"
                  type="date"
                  value={nextMaintenanceDate}
                  onChange={(e) => setNextMaintenanceDate(e.target.value)}
                  className="bg-card/70 border-border/80"
                />
                <span className="text-[11px] text-[#9aa0a6]">
                  Programación sugerida para revisión técnica o servicio preventivo.
                </span>
              </div>
            </div>

            {dateError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{dateError}</span>
              </div>
            )}
          </div>

          {/* Sección 3: Descripción Técnica */}
          <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <Label
              htmlFor="work-description"
              className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#4285F4]" />
              Descripción Técnica y Alcance (Opcional)
            </Label>
            <Textarea
              id="work-description"
              placeholder="Detalles sobre materiales, equipos mineros, personal asignado o especificaciones técnicas..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-[#9aa0a6] rounded-xl focus-visible:ring-2 focus-visible:ring-[#4285F4]/40"
            />
          </div>

          {apiError && (
            <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-red-400 text-xs font-medium">
              {apiError}
            </div>
          )}

          <DialogFooter className="mt-1 pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-full border-white/10 text-[#9aa0a6] hover:text-white hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium rounded-full shadow-[0_0_15px_rgba(26,115,232,0.35)] transition-all"
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
