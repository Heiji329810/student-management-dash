import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CommentReportMenu({ reported, onReport }: { reported: boolean; onReport: () => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const item = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) item.current?.focus(); }, [open]);
  return <div className="relative" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); setOpen(true); item.current?.focus();
    }
  }}>
    <Button ref={trigger} variant="ghost" size="icon" aria-label="Comment actions"
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => setOpen(value => !value)}><MoreHorizontal className="h-5 w-5" aria-hidden="true" /></Button>
    {open && <div id={menuId} role="menu" aria-label="Comment actions"
      className="absolute bottom-full right-0 z-10 mb-1 w-64 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
      <button ref={item} role="menuitem" aria-disabled={reported}
        className="w-full rounded-sm px-3 py-2 text-left text-sm focus:bg-accent focus:outline-none aria-disabled:opacity-50"
        onClick={() => { if (!reported) { setOpen(false); onReport(); } }}>
        {reported ? 'Comment reported' : 'Report inappropriate comment'}
      </button>
    </div>}
  </div>;
}
