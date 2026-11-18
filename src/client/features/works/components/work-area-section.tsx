import React from 'react';
import type { WorkItemSummary } from '@shared/types.js';
import { MapPin, Layers } from 'lucide-react';
import { WorkCard } from './work-card.js';

interface WorkAreaSectionProps {
  areaKey: string;
  areaLabel: string;
  isUnassigned: boolean;
  works: WorkItemSummary[];
  priorityOffset: number;
  onSelectWork: (id: string) => void;
}

const WorkAreaSectionComponent: React.FC<WorkAreaSectionProps> = ({
  areaKey,
  areaLabel,
  isUnassigned,
  works,
  priorityOffset,
  onSelectWork,
}) => {
  const headingId = `area-group-${areaKey.replace(/[^a-z0-9_-]/gi, '-')}`;
  const countLabel = works.length === 1 ? '1 trabajo' : `${works.length} trabajos`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3.5 sm:gap-5">
      <div className="flex items-center gap-3">
        <div
          className={
            isUnassigned
              ? 'w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#9aa0a6] flex items-center justify-center shrink-0'
              : 'w-8 h-8 rounded-xl bg-[#1a73e8]/15 border border-[#4285F4]/30 text-[#669df6] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(26,115,232,0.12)]'
          }
        >
          {isUnassigned ? (
            <Layers className="w-4 h-4" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
        </div>

        <div className="flex items-center gap-2.5 min-w-0">
          <h2
            id={headingId}
            className="text-base sm:text-xl font-semibold tracking-tight text-white font-heading truncate"
            title={areaLabel}
          >
            {areaLabel}
          </h2>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-medium text-[#9aa0a6] tabular-nums shrink-0">
            {countLabel}
          </span>
        </div>

        <div
          className="hidden sm:block h-px flex-1 bg-gradient-to-r from-white/[0.12] via-white/[0.05] to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {works.map((work, index) => (
          <WorkCard
            key={work.id}
            work={work}
            onSelect={onSelectWork}
            priority={priorityOffset + index < 3}
          />
        ))}
      </div>
    </section>
  );
};

export const WorkAreaSection = React.memo(WorkAreaSectionComponent);
