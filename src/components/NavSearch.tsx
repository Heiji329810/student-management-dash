import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  filterNavDestinations,
  getNavDestinations,
  groupNavDestinations,
  type NavDestination,
} from '@/lib/navigation';

export function NavSearch() {
  const { currentUser, clubs } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const destinations = useMemo(() => {
    if (!currentUser) return [];
    return getNavDestinations(currentUser, clubs);
  }, [currentUser, clubs]);

  const filtered = useMemo(
    () => filterNavDestinations(destinations, query),
    [destinations, query]
  );

  const grouped = useMemo(() => groupNavDestinations(filtered), [filtered]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSelect = (destination: NavDestination) => {
    setOpen(false);
    navigate(destination.href);
  };

  if (!currentUser) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setQuery('');
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label="Search pages">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden" showCloseButton>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Find a page or destination and go there directly.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 border-b border-border">
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search pages, clubs, activities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search destinations"
          />
        </div>

        <div className="max-h-[min(24rem,50vh)] overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              No matching destinations found.
            </p>
          ) : (
            grouped.map(({ group, items }) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={cn(
                          'w-full rounded-md px-4 py-3 text-left transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        )}
                      >
                        <span className="block text-sm font-medium">{item.label}</span>
                        {item.description && (
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
