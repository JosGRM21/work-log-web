import React, { useRef } from 'react';
import { VALID_WORK_STATUSES, type WorkStatus } from '@shared/types.js';
import { STATUS_CONFIG } from '@/constants/status.js';
import { cn } from '@/lib/utils';
import { Check, CircleDashed, Clock, CheckCircle2 } from 'lucide-react';

interface WorkStatusSelectorProps {
  value: WorkStatus;
  onChange: (status: WorkStatus) => void;
  labelledBy?: string;
}

const STATUS_OPTION_STYLES: Record<
  WorkStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    activeCard: string;
    activeIcon: string;
  }
> = {
  pending: {
    icon: CircleDashed,
    activeCard:
      'border-white/30 bg-white/[0.08] text-white shadow-[0_0_20px_rgba(255,255,255,0.06)]',
    activeIcon: 'text-[#e8eaed]',
  },
  in_progress: {
    icon: Clock,
    activeCard:
      'border-[#4285F4]/60 bg-[#1a73e8]/18 text-white shadow-[0_0_20px_rgba(26,115,232,0.22)]',
    activeIcon: 'text-[#8ab4f8]',
  },
  completed: {
    icon: CheckCircle2,
    activeCard:
      'border-[#34a853]/55 bg-[#062014]/90 text-white shadow-[0_0_20px_rgba(52,168,83,0.18)]',
    activeIcon: 'text-[#81c995]',
  },
};

/**
 * Selector táctil de estado operativo con soporte completo de teclado (ARIA radiogroup).
 */
export const WorkStatusSelector: React.FC<WorkStatusSelectorProps> = ({
  value,
  onChange,
  labelledBy,
}) => {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const isNext = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const isPrev = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!isNext && !isPrev) return;

    e.preventDefault();
    const total = VALID_WORK_STATUSES.length;
    const nextIndex = isNext ? (currentIndex + 1) % total : (currentIndex - 1 + total) % total;
    const nextStatus = VALID_WORK_STATUSES[nextIndex];
    onChange(nextStatus);
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2"
    >
      {VALID_WORK_STATUSES.map((statusKey, index) => {
        const config = STATUS_CONFIG[statusKey];
        const styles = STATUS_OPTION_STYLES[statusKey];
        const Icon = styles.icon;
        const isSelected = value === statusKey;

        return (
          <button
            key={statusKey}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(statusKey)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'group relative flex items-center justify-between min-[360px]:justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/50',
              isSelected
                ? styles.activeCard
                : 'border-white/[0.08] bg-[#070b13]/80 text-[#9aa0a6] hover:text-white hover:border-white/20 hover:bg-white/[0.04]',
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                {isSelected && config.ping && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4285F4] opacity-75" />
                )}
                <span
                  className={cn(
                    'relative inline-flex rounded-full h-2 w-2 transition-opacity',
                    config.dotClass,
                    !isSelected && 'opacity-70 group-hover:opacity-100',
                  )}
                />
              </span>
              <Icon
                className={cn(
                  'w-3.5 h-3.5 shrink-0 hidden sm:inline-block transition-colors',
                  isSelected ? styles.activeIcon : 'text-[#80868b] group-hover:text-[#c4c7c5]',
                )}
              />
              <span className="truncate">{config.label}</span>
            </span>

            {isSelected && (
              <Check className="w-3.5 h-3.5 shrink-0 min-[360px]:hidden text-current opacity-85" />
            )}
          </button>
        );
      })}
    </div>
  );
};
