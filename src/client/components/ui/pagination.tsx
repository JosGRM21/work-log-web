import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from 'cn';
import { Button, buttonVariants } from '@/components/ui/button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="Paginación"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1.5', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'button'>;

function PaginationLink({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps) {
  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        'cursor-pointer select-none rounded-full transition-all duration-200 h-8 w-8 text-xs',
        isActive
          ? 'bg-white/[0.12] text-white border-white/20 shadow-xs font-semibold'
          : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.06]',
        props.disabled && 'pointer-events-none opacity-30 cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Ir a página anterior"
      size="default"
      className={cn(
        'w-auto gap-1 px-3 h-8 rounded-full border border-white/10 text-xs font-medium text-white hover:border-[#4285F4]/40 hover:bg-white/[0.06]',
        className,
      )}
      {...props}
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Anterior</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Ir a página siguiente"
      size="default"
      className={cn(
        'w-auto gap-1 px-3 h-8 rounded-full border border-white/10 text-xs font-medium text-white hover:border-[#4285F4]/40 hover:bg-white/[0.06]',
        className,
      )}
      {...props}
    >
      <span className="hidden sm:inline">Siguiente</span>
      <ChevronRight className="h-3.5 w-3.5" />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex h-8 w-8 items-center justify-center text-[#9aa0a6]', className)}
      {...props}
    >
      <MoreHorizontal className="h-3.5 w-3.5" />
      <span className="sr-only">Más páginas</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
