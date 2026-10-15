import React, { useState, useMemo } from 'react';
import { useWorks } from './hooks/use-works.js';
import { apiClient } from './api/client.js';
import type { WorkItemDetail } from '../shared/types.js';
import { Navbar } from './components/layout/navbar.js';
import { HeroSection } from './components/feed/hero-section.js';
import { FeedFilters, type ViewMode } from './components/feed/feed-filters.js';
import { WorkCard } from './components/feed/work-card.js';
import { WorkTimelineItem } from './components/feed/work-timeline-item.js';
import { WorkDetailModal } from './components/modals/work-detail-modal.js';
import { WorkFormModal } from './components/modals/work-form-modal.js';
import { ConfirmModal } from './components/modals/confirm-modal.js';
import { LoginModal } from './components/modals/login-modal.js';
import { Footer } from './components/layout/footer.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { AlertCircle, FolderX, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [workToEdit, setWorkToEdit] = useState<WorkItemDetail | null>(null);
  const [workIdToDelete, setWorkIdToDelete] = useState<string | null>(null);
  const [isDeletingWork, setIsDeletingWork] = useState(false);

  // Filtrado local por término de búsqueda
  const displayWorks = useMemo(() => {
    if (!searchTerm.trim()) return works;
    const query = searchTerm.toLowerCase().trim();
    return works.filter((w) => w.title.toLowerCase().includes(query));
  }, [works, searchTerm]);

  // Métricas para los KPIs del Hero
  const metrics = useMemo(() => {
    const completed = works.filter((w) => w.status === 'completed').length;
    const inProgress = works.filter((w) => w.status === 'in_progress').length;
    const pending = works.filter((w) => w.status === 'pending').length;
    const totalMedia = works.reduce(
      (acc, w) => acc + (w.media_count?.images || 0) + (w.media_count?.videos || 0),
      0,
    );
    return {
      total: total || works.length,
      completed,
      inProgress,
      pending,
      totalMedia,
    };
  }, [works, total]);

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
        description: 'El proyecto y sus archivos multimedia fueron purgados físicamente.',
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
    <div className="min-h-screen bg-background flex flex-col text-foreground antialiased selection:bg-amber-500/20 selection:text-amber-400">
      {/* Barra de Navegación */}
      <Navbar onOpenLogin={() => setIsLoginOpen(true)} onOpenCreate={() => setIsCreateOpen(true)} />

      {/* Contenido Principal */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col gap-8">
        {/* Hero Section con Identidad MIBITURVEN & KPIs */}
        <HeroSection
          totalWorks={metrics.total}
          completedCount={metrics.completed}
          inProgressCount={metrics.inProgress}
          totalMediaCount={metrics.totalMedia}
        />

        {/* Barra de Filtros, Búsqueda y Modos de Vista */}
        <FeedFilters
          currentStatus={statusFilter}
          onStatusChange={setStatusFilter}
          currentOrder={order}
          onOrderToggle={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
          totalResults={displayWorks.length}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          counts={{
            all: metrics.total,
            completed: metrics.completed,
            in_progress: metrics.inProgress,
            pending: metrics.pending,
          }}
        />

        {/* Estado de Carga (Skeletons Modernos) */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-2xl border border-border/80 p-4 bg-card/60"
              >
                <Skeleton className="w-full aspect-video rounded-xl bg-muted/70" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-1/3 bg-muted/60" />
                  <Skeleton className="h-5 w-4/5 bg-muted/70" />
                </div>
                <div className="pt-4 border-t border-border/60 flex justify-between">
                  <Skeleton className="h-4 w-20 bg-muted/50" />
                  <Skeleton className="h-4 w-16 bg-muted/50" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estado de Error */}
        {!isLoading && error && (
          <Card className="p-8 bg-destructive/10 border-destructive/20 text-destructive text-center flex flex-col items-center gap-3 max-w-lg mx-auto rounded-2xl">
            <AlertCircle className="w-10 h-10" />
            <h3 className="text-base font-bold">Error de Conexión</h3>
            <p className="text-sm font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="mt-2 text-xs border-destructive/30 hover:bg-destructive hover:text-white"
            >
              Reintentar Carga
            </Button>
          </Card>
        )}

        {/* Estado Vacío por Búsqueda */}
        {!isLoading && !error && displayWorks.length === 0 && searchTerm.trim() !== '' && (
          <Card className="py-16 px-6 text-center border-dashed border-border/80 bg-card/50 flex flex-col items-center justify-center max-w-md mx-auto my-6 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <SearchX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              No se encontraron coincidencias
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              No existen obras registradas que coincidan con &quot;{searchTerm}&quot;.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="rounded-xl"
            >
              Limpiar Búsqueda
            </Button>
          </Card>
        )}

        {/* Estado Vacío General */}
        {!isLoading && !error && displayWorks.length === 0 && searchTerm.trim() === '' && (
          <Card className="py-16 px-6 text-center border-dashed border-border/80 bg-card/50 flex flex-col items-center justify-center max-w-md mx-auto my-6 rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <FolderX className="w-7 h-7 text-amber-500/80" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              No hay trabajos disponibles
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              {statusFilter !== 'all'
                ? 'No se encontraron registros en el estado seleccionado actualmente.'
                : 'Aún no se han registrado obras técnicas en la bitácora de MIBITURVEN S.A.'}
            </p>
            {statusFilter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              >
                Ver todos los proyectos
              </Button>
            )}
          </Card>
        )}

        {/* Lista / Grid de Trabajos */}
        {!isLoading && !error && displayWorks.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayWorks.map((work) => (
                  <WorkCard key={work.id} work={work} onClick={() => setSelectedWorkId(work.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col py-2 max-w-4xl mx-auto w-full">
                {displayWorks.map((work, index) => (
                  <WorkTimelineItem
                    key={work.id}
                    work={work}
                    onClick={() => setSelectedWorkId(work.id)}
                    isLast={index === displayWorks.length - 1}
                  />
                ))}
              </div>
            )}

            {/* Paginación (Activa cuando no hay búsqueda local filtrando) */}
            {!searchTerm && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/80 pt-6 mt-4">
                <span className="text-xs text-muted-foreground">
                  Página <strong className="text-foreground">{currentPage}</strong> de{' '}
                  <strong className="text-foreground">{totalPages}</strong> ({total} obras
                  documentadas)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    className="h-9 rounded-xl border-border/80"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + limit >= total}
                    onClick={() => setOffset(offset + limit)}
                    className="h-9 rounded-xl border-border/80"
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

      {/* Pie de Página Institucional */}
      <Footer />

      {/* Modales del Sistema */}
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
        title="¿Eliminar este trabajo de MIBITURVEN?"
        message="Esta acción es irreversible: se eliminará el registro de la bitácora junto con todos sus archivos multimedia físicos en almacenamiento (RN-04)."
        confirmText="Eliminar Trabajo"
        isDestructive
        isLoading={isDeletingWork}
      />
    </div>
  );
};
