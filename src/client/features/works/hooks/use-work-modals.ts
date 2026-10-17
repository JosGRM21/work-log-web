import { useState, useCallback } from 'react';
import type { WorkItemDetail } from '@shared/types.js';
import { worksApi } from '../api/works.api.js';
import { invalidateWorkDetailCache } from './use-works.js';
import { toast } from '@/components/ui/toast';

export interface UseWorkModalsProps {
  onWorkDeleted?: () => Promise<void> | void;
}

export function useWorkModals({ onWorkDeleted }: UseWorkModalsProps = {}) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [workToEdit, setWorkToEdit] = useState<WorkItemDetail | null>(null);
  const [workIdToDelete, setWorkIdToDelete] = useState<string | null>(null);
  const [isDeletingWork, setIsDeletingWork] = useState(false);

  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);

  const openCreate = useCallback(() => setIsCreateOpen(true), []);
  const closeCreate = useCallback(() => {
    setIsCreateOpen(false);
    setWorkToEdit(null);
  }, []);

  const selectWork = useCallback((id: string) => setSelectedWorkId(id), []);
  const closeDetail = useCallback(() => setSelectedWorkId(null), []);

  const editWork = useCallback((work: WorkItemDetail) => setWorkToEdit(work), []);

  const requestDelete = useCallback((workId: string) => setWorkIdToDelete(workId), []);
  const cancelDelete = useCallback(() => setWorkIdToDelete(null), []);

  const refreshDetail = useCallback(() => {
    setDetailRefreshKey((prev) => prev + 1);
  }, []);

  const confirmDeleteWork = useCallback(async () => {
    if (!workIdToDelete) return;
    setIsDeletingWork(true);
    try {
      await worksApi.delete(workIdToDelete);
      invalidateWorkDetailCache(workIdToDelete);
      setSelectedWorkId(null);
      setWorkIdToDelete(null);
      if (onWorkDeleted) {
        await onWorkDeleted();
      }
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
  }, [workIdToDelete, onWorkDeleted]);

  return {
    isLoginOpen,
    openLogin,
    closeLogin,
    isCreateOpen,
    openCreate,
    closeCreate,
    selectedWorkId,
    selectWork,
    closeDetail,
    workToEdit,
    editWork,
    workIdToDelete,
    requestDelete,
    cancelDelete,
    isDeletingWork,
    confirmDeleteWork,
    detailRefreshKey,
    refreshDetail,
  };
}
