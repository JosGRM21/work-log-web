import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkFeedSkeletonsProps {
  count?: number;
}

export const WorkFeedSkeletons: React.FC<WorkFeedSkeletonsProps> = ({ count = 9 }) => {
  const slots = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 py-2">
      {slots.map((i) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-[24px] sm:rounded-[28px] border border-white/[0.08] p-2 sm:p-2.5 bg-gradient-to-b from-[#0b1936]/35 via-[#070b14] to-[#04060b]"
        >
          <Skeleton className="w-full aspect-video rounded-[18px] sm:rounded-[20px] bg-white/[0.04]" />
          <div className="px-2.5 sm:px-3.5 pt-3 sm:pt-4 pb-2.5 sm:pb-3 space-y-2.5 sm:space-y-3">
            <Skeleton className="h-3.5 w-2/5 rounded-full bg-white/[0.04]" />
            <Skeleton className="h-5 w-4/5 rounded-full bg-white/[0.07]" />
            <div className="pt-2.5 sm:pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <Skeleton className="h-3.5 w-28 rounded-full bg-white/[0.04]" />
              <Skeleton className="h-8 w-8 rounded-full bg-white/[0.05]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
