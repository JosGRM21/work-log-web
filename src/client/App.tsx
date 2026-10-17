import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useWorks, invalidateWorkDetailCache } from './hooks/use-works.js';
import { apiClient } from './api/client.js';
import type { WorkItemDetail, WorkStatus } from '../shared/types.js';
import { Navbar } from './components/layout/navbar.js';
import { HeroSection } from './components/feed/hero-section.js';
import { FeedFilters, type ViewMode } from './components/feed/feed-filters.js';
import { WorkCard } from './components/feed/work-card.js';
import { WorkTimelineItem } from './components/feed/work-timeline-item.js';
// Modales cargados dinámicamente mediante code-splitting
const WorkDetailModal = React.lazy(() =>
  import('./components/modals/work-detail-modal.js').then((m) => ({ default: m.WorkDetailModal })),
);
const WorkFormModal = React.lazy(() =>
  import('./components/modals/work-form-modal.js').then((m) => ({ default: m.WorkFormModal })),
);
const ConfirmModal = React.lazy(() =>
  import('./components/modals/confirm-modal.js').then((m) => ({ default: m.ConfirmModal })),
);
const LoginModal = React.lazy(() =>
  import('./components/modals/login-modal.js').then((m) => ({ default: m.LoginModal })),
);
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { AlertCircle, FolderX } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 9;

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
  } = useWorks({ limit: ITEMS_PER_PAGE });

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [workToEdit, setWorkToEdit] = useState<WorkItemDetail | null>(null);
  const [workIdToDelete, setWorkIdToDelete] = useState<string | null>(null);
  const [isDeletingWork, setIsDeletingWork] = useState(false);

  // Callbacks de navegación y modales estabilizados
  const handleOpenLogin = useCallback(() => setIsLoginOpen(true), []);
  const handleCloseLogin = useCallback(() => setIsLoginOpen(false), []);
  const handleOpenCreate = useCallback(() => setIsCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => {
    setIsCreateOpen(false);
    setWorkToEdit(null);
  }, []);
  const handleSelectWork = useCallback((id: string) => setSelectedWorkId(id), []);
  const handleCloseDetail = useCallback(() => setSelectedWorkId(null), []);
  const handleEditWork = useCallback((work: WorkItemDetail) => setWorkToEdit(work), []);
  const handleRequestDelete = useCallback((workId: string) => setWorkIdToDelete(workId), []);
  const handleCancelDelete = useCallback(() => setWorkIdToDelete(null), []);
  const handleOrderToggle = useCallback(
    () => setOrder(order === 'desc' ? 'asc' : 'desc'),
    [order, setOrder],
  );

  const handleStatusChange = useCallback(
    (status: WorkStatus | 'all') => setStatusFilter(status),
    [setStatusFilter],
  );
  const handleViewModeChange = useCallback((mode: ViewMode) => setViewMode(mode), []);

  // Métricas estabilizadas para los KPIs del Hero (no mutan bruscamente al paginar)
  const [metrics, setMetrics] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    totalMedia: 0,
  });

  useEffect(() => {
    if (works.length > 0 && statusFilter === 'all' && offset === 0) {
      const completed = works.filter((w) => w.status === 'completed').length;
      const inProgress = works.filter((w) => w.status === 'in_progress').length;
      const pending = works.filter((w) => w.status === 'pending').length;
      const totalMedia = works.reduce(
        (acc, w) => acc + (w.media_count?.images || 0) + (w.media_count?.videos || 0),
        0,
      );
      setMetrics({
        total: total || works.length,
        completed,
        inProgress,
        pending,
        totalMedia,
      });
    } else if (total > 0) {
      setMetrics((prev) => (prev.total !== total ? { ...prev, total } : prev));
    }
  }, [works, total, statusFilter, offset]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  const fromRecord = offset + 1;
  const toRecord = Math.min(offset + works.length, total);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages || page === currentPage) return;
      setOffset((page - 1) * limit);
      const catalogElement = document.getElementById('catalogo-obras');
      if (catalogElement) {
        catalogElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [totalPages, currentPage, limit, setOffset],
  );

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  const handleConfirmDeleteWork = async () => {
    if (!workIdToDelete) return;
    setIsDeletingWork(true);
    try {
      await apiClient.delete(`/works/${workIdToDelete}`);
      invalidateWorkDetailCache(workIdToDelete);
      setSelectedWorkId(null);
      setWorkIdToDelete(null);
      await refetch(true);
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
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden flex flex-col antialiased selection:bg-[#1a73e8]/30 selection:text-blue-100">
      {/* Barra de Navegación */}
      <Navbar onOpenLogin={handleOpenLogin} onOpenCreate={handleOpenCreate} />


      {/* Sección inicial (Hero) */}
      <section className="google-one-hero w-full pt-20 sm:pt-28 pb-10 sm:pb-14 px-4 sm:px-6 flex flex-col items-center">
        <div className="max-w-7xl w-full mx-auto relative z-10">
          <HeroSection
            totalWorks={metrics.total}
            completedCount={metrics.completed}
            inProgressCount={metrics.inProgress}
            totalMediaCount={metrics.totalMedia}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Contenido Principal (Resto de la página en negro puro #000000 continuo) */}
      <main
        id="catalogo-obras"
        className="bg-black max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col gap-8 relative z-10"
      >
        {/* Barra de Filtros, Ordenamiento y Modos de Vista */}
        <FeedFilters
          currentStatus={statusFilter}
          onStatusChange={handleStatusChange}
          currentOrder={order}
          onOrderToggle={handleOrderToggle}
          totalResults={works.length}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          counts={{
            all: metrics.total,
            completed: metrics.completed,
            in_progress: metrics.inProgress,
            pending: metrics.pending,
          }}
        />

        {/* Estado de Carga (Skeletons alineados al nuevo diseño de tarjetas) */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-[28px] border border-white/[0.08] p-2.5 bg-gradient-to-b from-[#0b1936]/35 via-[#070b14] to-[#04060b]"
              >
                <Skeleton className="w-full aspect-video rounded-[20px] bg-white/[0.04]" />
                <div className="px-3.5 pt-4 pb-3 space-y-3">
                  <Skeleton className="h-3.5 w-2/5 rounded-full bg-white/[0.04]" />
                  <Skeleton className="h-5 w-4/5 rounded-full bg-white/[0.07]" />
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <Skeleton className="h-3.5 w-28 rounded-full bg-white/[0.04]" />
                    <Skeleton className="h-8 w-8 rounded-full bg-white/[0.05]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estado de Error */}
        {!isLoading && error && (
          <Card className="p-8 bg-destructive/10 border-destructive/20 text-destructive text-center flex flex-col items-center gap-3 max-w-lg mx-auto rounded-[28px]">
            <AlertCircle className="w-10 h-10" />
            <h3 className="text-base font-bold">Error de Conexión</h3>
            <p className="text-sm font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="mt-2 text-xs border-destructive/30 hover:bg-destructive hover:text-white rounded-full"
            >
              Reintentar Carga
            </Button>
          </Card>
        )}

        {/* Estado Vacío General */}
        {!isLoading && !error && works.length === 0 && (
          <div className="py-16 px-6 text-center border border-white/[0.08] bg-gradient-to-b from-[#0b1936]/30 via-[#070b14] to-[#04060b] flex flex-col items-center justify-center max-w-md mx-auto my-6 rounded-[28px]">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
              <FolderX className="w-6 h-6 text-[#669df6]" />
            </div>
            <h3 className="text-base font-medium text-white mb-1">
              No hay trabajos disponibles
            </h3>
            <p className="text-xs text-[#9aa0a6] max-w-xs mb-5 leading-relaxed">
              {statusFilter !== 'all'
                ? 'No se encontraron registros en el estado seleccionado actualmente.'
                : 'Aún no se han registrado obras técnicas en la bitácora de MIBITURVEN S.A.'}
            </p>
            {statusFilter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('all')}
                className="rounded-full border-white/15 text-[#8ab4f8] hover:bg-[#1a73e8]/15"
              >
                Ver todos los proyectos
              </Button>
            )}
          </div>
        )}

        {/* Lista / Grid de Trabajos */}
        {!isLoading && !error && works.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {works.map((work) => (
                  <WorkCard key={work.id} work={work} onClick={() => handleSelectWork(work.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col py-2 max-w-4xl mx-auto w-full">
                {works.map((work, index) => (
                  <WorkTimelineItem
                    key={work.id}
                    work={work}
                    onClick={() => handleSelectWork(work.id)}
                    isLast={index === works.length - 1}
                  />
                ))}
              </div>
            )}

            {/* Pie de catálogo: Contador de registros reubicado y Paginación shadcn/ui */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.08] pt-6 mt-4">
              {/* Nueva ubicación limpia del texto 'Mostrando N registros' */}
              <div className="flex items-center gap-2 text-xs text-[#9aa0a6] select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
                <span>
                  Mostrando{' '}
                  <strong className="text-white font-medium tabular-nums">
                    {total === 0 ? 0 : `${fromRecord}–${toRecord}`}
                  </strong>{' '}
                  de <strong className="text-white font-medium tabular-nums">{total}</strong>{' '}
                  {total === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              {/* Paginación con componentes shadcn/ui */}
              {totalPages > 1 && (
                <Pagination className="mx-0 w-auto justify-center sm:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                      />
                    </PaginationItem>

                    {pageNumbers.map((page, index) => {
                      if (page === 'ellipsis') {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </>
        )}

      </main>

      {/* Modales del Sistema diferidos mediante code-splitting */}
      <React.Suspense fallback={null}>
        {isLoginOpen && <LoginModal isOpen={isLoginOpen} onClose={handleCloseLogin} />}

        {(isCreateOpen || !!workToEdit) && (
          <WorkFormModal
            isOpen={isCreateOpen || !!workToEdit}
            onClose={handleCloseCreate}
            onSuccess={() => {
              invalidateWorkDetailCache(selectedWorkId || undefined);
              void refetch(true);
              if (selectedWorkId) {
                setDetailRefreshKey((prev) => prev + 1);
              }
            }}
            workToEdit={workToEdit}
          />
        )}

        {!!selectedWorkId && (
          <WorkDetailModal
            workId={selectedWorkId}
            refreshKey={detailRefreshKey}
            isOpen={!!selectedWorkId}
            onClose={handleCloseDetail}
            onEdit={handleEditWork}
            onDelete={handleRequestDelete}
            onWorkUpdated={() => {
              invalidateWorkDetailCache(selectedWorkId || undefined);
              void refetch(true);
            }}
          />
        )}

        {!!workIdToDelete && (
          <ConfirmModal
            isOpen={!!workIdToDelete}
            onClose={handleCancelDelete}
            onConfirm={handleConfirmDeleteWork}
            title="¿Eliminar este trabajo de MIBITURVEN?"
            message="Esta acción es irreversible: se eliminará el registro de la bitácora junto con todos sus archivos multimedia físicos en almacenamiento (RN-04)."
            confirmText="Eliminar Trabajo"
            isDestructive
            isLoading={isDeletingWork}
          />
        )}
      </React.Suspense>

    </div>
  );
};