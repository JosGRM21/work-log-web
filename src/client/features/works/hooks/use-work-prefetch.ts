import { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkItemDetail } from '@shared/types.js';
import { apiClient } from '@/api/client.js';
import { getCachedWorkDetail, setCachedWorkDetail } from './use-works.js';

/**
 * Gestiona el estado de error de miniatura y el prefetch diferido al hacer hover
 * sobre una tarjeta de obra, evitando peticiones repetidas y fugas de timers.
 */
export function useWorkPrefetch(
  workId: string,
  thumbnailUrl?: string | null,
  mediaUrl?: string | null,
) {
  const [thumbError, setThumbError] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setThumbError(false);
  }, [thumbnailUrl, mediaUrl]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (getCachedWorkDetail(workId)) return;
    hoverTimerRef.current = window.setTimeout(async () => {
      try {
        const data = await apiClient.get<WorkItemDetail>(`/works/${workId}`);
        setCachedWorkDetail(workId, data);
      } catch {
        // Silently ignore prefetch failures
      }
    }, 150);
  }, [workId]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleThumbError = useCallback(() => {
    setThumbError(true);
  }, []);

  return {
    thumbError,
    handleThumbError,
    handleMouseEnter,
    handleMouseLeave,
  };
}
