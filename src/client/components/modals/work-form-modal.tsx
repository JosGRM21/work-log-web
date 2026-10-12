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
import { Loader2, Briefcase } from 'lucide-react';

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
        } else {
            const today = new Date().toISOString().split('T')[0];
            setTitle('');
            setDescription('');
            setStatus('pending');
            setReferenceDate(today);
            setStartDate('');
            setEndDate('');
        }
        setDateError(null);
        setApiError(null);
    }, [workToEdit, isOpen]);

    // Validación de consistencia temporal (RN-02)
    const handleDateCoherence = (newStart: string, newEnd: string) => {
        if (newStart && newEnd && newEnd < newStart) {
            setDateError('Inconsistencia temporal (RN-02): la fecha final no puede ser anterior a la de inicio.');
        } else {
            setDateError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (startDate && endDate && endDate < startDate) {
            setDateError('Inconsistencia temporal (RN-02): la fecha final no puede ser anterior a la de inicio.');
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
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-xl">
                            {isEditing ? 'Editar Trabajo' : 'Registrar Nuevo Trabajo'}
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        {isEditing
                            ? 'Modifique los datos técnicos, fechas o estado de este proyecto.'
                            : 'Complete la ficha técnica para registrar un nuevo proyecto en la bitácora.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="work-title">Título del Trabajo *</Label>
                        <Input
                            id="work-title"
                            placeholder="Ej. Fabricación de Portón Estructural"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            maxLength={150}
                        />
                        <span className="text-[12px] text-muted-foreground">
                            Máximo 150 caracteres (obligatorio)
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="work-status">Estado del Proyecto *</Label>
                            <Select
                                value={status}
                                onValueChange={(val) => setStatus(val as WorkStatus)}
                            >
                                <SelectTrigger id="work-status" className="w-full">
                                    <SelectValue placeholder="Seleccione un estado">
                                        {status === 'pending' ? 'Por Realizar' : status === 'in_progress' ? 'En Curso' : status === 'completed' ? 'Terminado' : undefined}
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
                            <Label htmlFor="work-ref-date">Fecha de Referencia *</Label>
                            <Input
                                id="work-ref-date"
                                type="date"
                                value={referenceDate}
                                onChange={(e) => setReferenceDate(e.target.value)}
                                required
                            />
                            <span className="text-[12px] text-muted-foreground">
                                Define el orden en la bitácora
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="work-start-date">Fecha de Inicio (Opcional)</Label>
                            <Input
                                id="work-start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    handleDateCoherence(e.target.value, endDate);
                                }}
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="work-end-date">Fecha de Finalización (Opcional)</Label>
                            <Input
                                id="work-end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    handleDateCoherence(startDate, e.target.value);
                                }}
                            />
                        </div>
                    </div>

                    {dateError && (
                        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                            {dateError}
                        </div>
                    )}

                    <div className="grid gap-1.5">
                        <Label htmlFor="work-description">Descripción y Especificaciones</Label>
                        <Textarea
                            id="work-description"
                            placeholder="Materiales empleados, detalles de dimensiones, notas técnicas..."
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {apiError && (
                        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                            {apiError}
                        </div>
                    )}

                    <DialogFooter className="mt-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? 'Guardar Cambios' : 'Crear Trabajo'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
