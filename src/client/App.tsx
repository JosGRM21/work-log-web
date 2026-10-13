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
import { toast } from '@/components/ui/toast';
import { Loader2, AlertCircle, FolderX, ChevronLeft, ChevronRight } from 'lucide-react';

export const App: React.FC = () => {
    const {
        works,
        total,
        limit,
        offset,
        setOffset,
        isLoading,
        error,
        statusFilter,
        setStatusFilter,
        order,
        setOrder,
        refetch,
    } = useWorks({ limit: 18 });

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
    const [detailRefreshKey, setDetailRefreshKey] = useState(0);
    const [workToEdit, setWorkToEdit] = useState<WorkItemDetail | null>(null);
    const [workIdToDelete, setWorkIdToDelete] = useState<string | null>(null);
    const [isDeletingWork, setIsDeletingWork] = useState(false);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.floor(offset / limit) + 1;

    const handleConfirmDeleteWork = async () => {
        if (!workIdToDelete) return;
        setIsDeletingWork(true);
        try {
            await apiClient.delete(`/works/${workIdToDelete}`);
            setSelectedWorkId(null);
            setWorkIdToDelete(null);
            await refetch();
            toast.add({
                title: 'Trabajo eliminado',
                description: 'El proyecto y sus archivos multimedia fueron eliminados.',
                type: 'success',
            });
        } catch (err) {
            toast.add({
                title: 'No se pudo eliminar el trabajo',
                description: (err as Error).message,
                type: 'error',
            });
        } finally {
            setIsDeletingWork(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col text-foreground antialiased selection:bg-primary/10 selection:text-primary">
            <Navbar
                onOpenLogin={() => setIsLoginOpen(true)}
                onOpenCreate={() => setIsCreateOpen(true)}
            />

            <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                        Catálogo de Trabajos Realizados
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        Historial ordenado cronológicamente de proyectos, respaldado con documentación
                        fotográfica y audiovisual.
                    </p>
                </div>

                <FeedFilters
                    currentStatus={statusFilter}
                    onStatusChange={setStatusFilter}
                    currentOrder={order}
                    onOrderToggle={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
                    totalResults={total}
                />

                {isLoading && (
                    <div className="py-28 flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm font-medium">Cargando catálogo cronológico...</span>
                    </div>
                )}

                {!isLoading && error && (
                    <Card className="p-6 bg-destructive/10 border-destructive/20 text-destructive text-center flex flex-col items-center gap-3 max-w-lg mx-auto">
                        <AlertCircle className="w-8 h-8" />
                        <p className="text-sm font-medium">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => void refetch()} className="text-xs">
                            Reintentar
                        </Button>
                    </Card>
                )}

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
                            <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                                Ver todos los trabajos
                            </Button>
                        )}
                    </Card>
                )}

                {!isLoading && !error && works.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {works.map((work) => (
                                <WorkCard
                                    key={work.id}
                                    work={work}
                                    onClick={() => setSelectedWorkId(work.id)}
                                />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
                                <span className="text-xs text-muted-foreground">
                                    Página <strong className="text-foreground">{currentPage}</strong> de{' '}
                                    <strong className="text-foreground">{totalPages}</strong> ({total} proyectos)
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={offset === 0}
                                        onClick={() => setOffset(Math.max(0, offset - limit))}
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={offset + limit >= total}
                                        onClick={() => setOffset(offset + limit)}
                                    >
                                        Siguiente
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            <footer className="border-t py-6 bg-card text-center text-xs text-muted-foreground mt-auto" />

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

            <WorkFormModal
                isOpen={isCreateOpen || !!workToEdit}
                onClose={() => {
                    setIsCreateOpen(false);
                    setWorkToEdit(null);
                }}
                onSuccess={() => {
                    void refetch();
                    if (selectedWorkId) {
                        setDetailRefreshKey((prev) => prev + 1);
                    }
                }}
                workToEdit={workToEdit}
            />

            <WorkDetailModal
                workId={selectedWorkId}
                refreshKey={detailRefreshKey}
                isOpen={!!selectedWorkId}
                onClose={() => setSelectedWorkId(null)}
                onEdit={(work) => {
                    setWorkToEdit(work);
                }}
                onDelete={(workId) => {
                    setWorkIdToDelete(workId);
                }}
                onWorkUpdated={() => void refetch()}
            />

            <ConfirmModal
                isOpen={!!workIdToDelete}
                onClose={() => setWorkIdToDelete(null)}
                onConfirm={handleConfirmDeleteWork}
                title="¿Eliminar este trabajo?"
                message="Esta acción es irreversible: se borrará el trabajo junto con todos sus archivos multimedia físicos en almacenamiento (RN-04)."
                confirmText="Eliminar Trabajo"
                isDestructive
                isLoading={isDeletingWork}
            />
        </div>
    );
};