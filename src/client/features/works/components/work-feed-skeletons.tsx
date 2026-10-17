import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ViewMode } from './feed-filters.js';

interface WorkFeedSkeletonsProps {
  viewMode: ViewMode;
  count?: number;
}

export const WorkFeedSkeletons: React.FC<WorkFeedSkeletonsProps> = ({
  viewMode,
  count = 9,
}) => {
  const slots = Array.from({ length: count }, (_, i) => i + 1);

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
        {slots.map((i) => (
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
    );
  }

  return (
    <div className="flex flex-col py-2 max-w-4xl mx-auto w-full gap-4">
      {slots.map((i) => (
        <div
          key={i}
          className="p-3.5 sm:p-4 rounded-[26px] border border-white/[0.08] bg-gradient-to-b from-[#0b1936]/35 via-[#070b14] to-[#04060b] flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 flex-1">
            <Skeleton className="w-24 h-18 sm:w-32 sm:h-20 rounded-[16px] bg-white/[0.04] shrink-0" />
            <div className="space-y-2.5 flex-1">
              <Skeleton className="h-3.5 w-32 rounded-full bg-white/[0.04]" />
              <Skeleton className="h-5 w-3/5 rounded-full bg-white/[0.07]" />
              <Skeleton className="h-3.5 w-24 rounded-full bg-white/[0.04]" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-full bg-white/[0.05] shrink-0" />
        </div>
      ))}
    </div>
  );
};
