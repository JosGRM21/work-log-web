import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface WorkDateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  optional?: boolean;
  icon?: React.ReactNode;
  hint?: string;
  invalid?: boolean;
  quickAction?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Campo de fecha estandarizado para tema oscuro con acción contextual en el encabezado.
 */
export const WorkDateField: React.FC<WorkDateFieldProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  optional = false,
  icon,
  hint,
  invalid = false,
  quickAction,
}) => {
  const showClear = optional && value.length > 0;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2 min-h-[20px]">
        <Label htmlFor={id} className="text-xs font-medium text-[#c4c7c5] flex items-center gap-1.5">
          {icon}
          <span className="truncate">
            {label}
            {required && <span className="text-[#669df6] ml-0.5">*</span>}
          </span>
        </Label>

        {quickAction ? (
          <button
            type="button"
            onClick={quickAction.onClick}
            className="text-[11px] font-medium text-[#8ab4f8] hover:text-white px-2 py-0.5 rounded-full bg-[#1a73e8]/15 hover:bg-[#1a73e8]/30 border border-[#4285F4]/30 transition-colors cursor-pointer shrink-0"
          >
            {quickAction.label}
          </button>
        ) : showClear ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`Limpiar ${label.toLowerCase()}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9aa0a6] hover:text-white px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        ) : optional ? (
          <span className="text-[10px] font-medium text-[#80868b] uppercase tracking-wider shrink-0">
            Opcional
          </span>
        ) : null}
      </div>

      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full min-w-0 h-11 sm:h-10 rounded-xl bg-[#070b13]/90 border-white/[0.1] text-white text-sm [color-scheme:dark] transition-colors focus-visible:border-[#4285F4]/60 focus-visible:ring-2 focus-visible:ring-[#4285F4]/25',
          invalid &&
            'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/30',
        )}
      />

      {hint && <span className="text-[11px] text-[#80868b] leading-snug">{hint}</span>}
    </div>
  );
};
