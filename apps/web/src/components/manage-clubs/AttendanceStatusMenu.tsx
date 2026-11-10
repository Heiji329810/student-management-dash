import { useEffect, useRef, useState } from 'react';
import { ATTENDANCE_OPTIONS } from '@/lib/attendance';
import type { AttendanceStatus } from '@/types';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceStatusMenuProps {
  value?: AttendanceStatus;
  onChange: (status: AttendanceStatus) => Promise<boolean>;
}

export function AttendanceStatusMenu({ value, onChange }: AttendanceStatusMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = value ? ATTENDANCE_OPTIONS.find((option) => option.status === value) : undefined;

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = async (status: AttendanceStatus) => {
    if (await onChange(status)) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex min-w-[148px] items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
          selected
            ? 'border-border bg-muted/60 text-foreground'
            : 'border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted/50'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full shrink-0',
              selected ? selected.dotClass : 'bg-muted-foreground/40'
            )}
          />
          <span className="truncate">{selected ? selected.label : 'Not set'}</span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-md border border-border bg-background shadow-lg"
        >
          {ATTENDANCE_OPTIONS.map(({ status, label, dotClass }) => (
            <button
              key={status}
              type="button"
              role="option"
              aria-selected={value === status}
              onClick={async () => await handleSelect(status)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-muted',
                value === status && 'bg-muted/70'
              )}
            >
              <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotClass)} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
