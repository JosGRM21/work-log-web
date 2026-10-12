import React, { useState } from 'react';
import { useWorks } from './hooks/use-works.js';
import { apiClient } from './api/client.js';
import type { WorkItemDetail } from '../shared/types.js';

import { Navbar } from './components/layout/navbar.js';
import { FeedFilters } from './components/feed/feed-filters.js';
import { WorkCard } from './components/feed/work-card.js';
import { WorkDetailModal } from './components/modals/work-detail-modal.js';
import { WorkFormModal } from './components/modals/work-form-modal.js';
import { ConfirmModal } from './components/modals/confirm-modal.js';
import { LoginModal } from './components/modals/login-modal.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, FolderX } from 'lucide-react';

export const App: React.FC = () => {
    const {
        works,
        total,
        isLoading,
        error,
        statusFilter,
        setStatusFilter,
        order,
        setOrder,
        refetch,
    } = useWorks({ limit: 50 });

    // Control de Modales
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
    const [workToEdit, setWorkToEdit] = useState<WorkItemDetail | null>(null);
    const [workIdToDelete, setWorkIdToDelete] = useState<string | null>(null);
    const [isDeletingWork, setIsDeletingWork] = useState(false);

    // Manejo de eliminación total de un trabajo
    const handleConfirmDeleteWork = async () => {
        if (!workIdToDelete) return;
        setIsDeletingWork(true);
        try {
            await apiClient.delete(`/works/${workIdToDelete}`);
            setSelectedWorkId(null);
            setWorkIdToDelete(null);
            refetch();
        } catch (err) {
            alert(`No se pudo eliminar el trabajo: ${(err as Error).message}`);
        } finally {
            setIsDeletingWork(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col text-foreground antialiased selection:bg-primary/10 selection:text-primary">
            {/* Barra de Navegación */}
            <Navbar
                onOpenLogin={() => setIsLoginOpen(true)}
                onOpenCreate={() => setIsCreateOpen(true)}
            />

            {/* Contenedor Principal */}
            <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col gap-6">
                {/* Hero / Header descriptivo sutil */}
                <div className="flex flex-col gap-1.5">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                        Catálogo de Trabajos Realizados
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        Bitácora ordenada cronológicamente de proyectos, respaldada con documentación fotográfica y audiovisual en alta resolución.
                    </p>
                </div>

                {/* Barra de Filtros y Ordenación */}
                <FeedFilters
                    currentStatus={statusFilter}
                    onStatusChange={setStatusFilter}
                    currentOrder={order}
                    onOrderToggle={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
                    totalResults={total}
                />

                {/* Estado de Carga */}
                {isLoading && (
                    <div className="py-28 flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm font-medium">Cargando catálogo cronológico...</span>
                    </div>
                )}

                {/* Estado de Error */}
                {!isLoading && error && (
                    <Card className="p-6 bg-destructive/10 border-destructive/20 text-destructive text-center flex flex-col items-center gap-3 max-w-lg mx-auto">
                        <AlertCircle className="w-8 h-8" />
                        <p className="text-sm font-medium">{error}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="text-xs"
                        >
                            Reintentar
                        </Button>
                    </Card>
                )}

                {/* Estado Vacío */}
                {!isLoading && !error && works.length === 0 && (
                    <Card className="py-16 px-6 text-center border-dashed border-border bg-card/60 flex flex-col items-center justify-center max-w-md mx-auto my-6">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                            <FolderX className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-1">
                            No se encontraron proyectos
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-xs mb-4">
                            {statusFilter !== 'all'
                                ? 'No hay registros en el estado seleccionado actualmente.'
                                : 'Aún no se han registrado proyectos en la bitácora.'}
                        </p>
                        {statusFilter !== 'all' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStatusFilter('all')}
                            >
                                Ver todos los trabajos
                            </Button>
                        )}
                    </Card>
                )}

                {/* Cuadrícula Adaptativa del Feed */}
                {!isLoading && !error && works.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {works.map((work) => (
                            <WorkCard
                                key={work.id}
                                work={work}
                                onClick={() => setSelectedWorkId(work.id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Pie de Página */}
            <footer className="border-t py-6 bg-card text-center text-xs text-muted-foreground mt-auto" />

            {/* Modales del Sistema */}
            <LoginModal
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
            />

            <WorkFormModal
                isOpen={isCreateOpen || !!workToEdit}
                onClose={() => {
                    setIsCreateOpen(false);
                    setWorkToEdit(null);
                }}
                onSuccess={() => {
                    refetch();
                    if (selectedWorkId) {
                        setSelectedWorkId(selectedWorkId);
                    }
                }}
                workToEdit={workToEdit}
            />

            <WorkDetailModal
                workId={selectedWorkId}
                isOpen={!!selectedWorkId}
                onClose={() => setSelectedWorkId(null)}
                onEdit={(work) => {
                    setWorkToEdit(work);
                }}
                onDelete={(workId) => {
                    setWorkIdToDelete(workId);
                }}
                onWorkUpdated={refetch}
            />

            <ConfirmModal
                isOpen={!!workIdToDelete}
                onClose={() => setWorkIdToDelete(null)}
                onConfirm={handleConfirmDeleteWork}
                title="¿Eliminar este trabajo?"
                message="Esta acción es irreversible: se borrará el trabajo junto con todos sus archivos multimedia físicos en disco (RN-04)."
                confirmText="Eliminar Trabajo"
                isDestructive
                isLoading={isDeletingWork}
            />
        </div>
    );
};