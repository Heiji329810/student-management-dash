import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatNotificationTime } from '@/lib/notifications';
import type { NotificationRecord } from '@/types';
import { Bell, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 5;

function getNotificationPanelStyle(trigger: HTMLElement | null): CSSProperties {
  if (!trigger) return {};

  const rect = trigger.getBoundingClientRect();
  const gutter = 8;
  const panelWidth = Math.min(384, window.innerWidth - gutter * 2);
  const preferredLeft = rect.right - panelWidth;
  const left = Math.min(
    Math.max(gutter, preferredLeft),
    window.innerWidth - panelWidth - gutter
  );

  return {
    position: 'fixed',
    top: rect.bottom + gutter,
    left,
    width: panelWidth,
  };
}

export function NotificationBell() {
  const navigate = useNavigate();
  const {
    getMyNotifications,
    getUnreadNotificationCount,
    isNotificationRead,
    markNotificationRead,
    isAuthenticated,
    currentUser,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [cancelNotice, setCancelNotice] = useState<NotificationRecord | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const notifications = getMyNotifications();
  const unreadCount = getUnreadNotificationCount();
  const visibleNotifications = notifications.slice(0, visibleCount);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      setPanelStyle(getNotificationPanelStyle(triggerRef.current));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  if (!isAuthenticated) return null;

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      setVisibleCount((count) => Math.min(count + PAGE_SIZE, notifications.length));
    }
  };

  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (!currentUser?.readOnly && !isNotificationRead(notification.id) && !await markNotificationRead(notification.id)) return;

    if (notification.type === 'activity_cancelled') {
      setCancelNotice(notification);
      setOpen(false);
      return;
    }

    if (notification.href) {
      navigate(notification.href);
      setOpen(false);
    }
  };

  return (
    <>
      <div ref={panelRef} className="relative">
        <div ref={triggerRef} className="inline-flex">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative"
            aria-label="Notifications"
            onClick={() =>
              setOpen((prev) => {
                const next = !prev;
                setVisibleCount(PAGE_SIZE);
                if (next) {
                  setPanelStyle(getNotificationPanelStyle(triggerRef.current));
                }
                return next;
              })
            }
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </div>

        {open && (
          <div
            style={panelStyle}
            className="z-50 overflow-hidden rounded-lg border border-border bg-background shadow-xl"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div
                ref={listRef}
                onScroll={handleScroll}
                className="max-h-80 overflow-y-auto divide-y divide-border"
              >
                {visibleNotifications.map((notification) => {
                  const isUnread = !isNotificationRead(notification.id);
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={async () => await handleNotificationClick(notification)}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors hover:bg-muted/60',
                        isUnread && 'bg-primary/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{notification.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    </button>
                  );
                })}
                {visibleCount < notifications.length && (
                  <p className="px-4 py-2 text-center text-xs text-muted-foreground">
                    Scroll for more...
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!cancelNotice} onOpenChange={(isOpen) => !isOpen && setCancelNotice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activity Cancelled</DialogTitle>
          </DialogHeader>
          {cancelNotice && (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold">{cancelNotice.activityTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">{cancelNotice.clubName}</p>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4" />
                  Message from organizer
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {cancelNotice.cancellationMessage}
                </p>
              </div>
              {cancelNotice.href && (
                <Button
                  className="w-full"
                  onClick={() => {
                    navigate(cancelNotice.href!);
                    setCancelNotice(null);
                  }}
                >
                  View Club
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
