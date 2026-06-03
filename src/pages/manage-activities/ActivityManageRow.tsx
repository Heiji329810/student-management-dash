import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar, MapPin, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatActivityDate, getActivityEmoji, isActivityCancelled } from '@/lib/activities';
import type { Activity } from '@/types';

export function ActivityManageRow({
  activity,
  onCancel,
}: {
  activity: Activity;
  onCancel: (reason: string) => boolean;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const cancelled = isActivityCancelled(activity);

  const handleCancel = () => {
    setError('');
    if (!reason.trim()) {
      setError('Please provide a specific reason for cancellation.');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Cancellation reason must be at least 10 characters.');
      return;
    }
    const success = onCancel(reason.trim());
    if (!success) {
      setError('Failed to cancel activity. Please try again.');
    }
  };

  return (
    <Card className={cn('border-2', cancelled && 'opacity-70')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            <span className="text-2xl">{getActivityEmoji(activity.title)}</span>
            <div>
              <CardTitle className="text-lg">{activity.title}</CardTitle>
              <CardDescription className="mt-1">{activity.description}</CardDescription>
            </div>
          </div>
          {cancelled ? (
            <Badge variant="outline">Cancelled</Badge>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 shrink-0">
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Activity</DialogTitle>
                  <DialogDescription>
                    Please provide a specific reason for cancelling "{activity.title}".
                    Registered students will no longer see this as an active event.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor={`reason-${activity.id}`} className="text-sm font-medium">
                      Cancellation Reason
                    </label>
                    <textarea
                      id={`reason-${activity.id}`}
                      placeholder="Explain why this activity is being cancelled..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                      className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-y"
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCancel} className="flex-1">
                      Confirm Cancellation
                    </Button>
                    <DialogClose asChild>
                      <Button variant="outline" className="flex-1">
                        Keep Activity
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {formatActivityDate(activity.date)}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {activity.location}
        </div>
        {cancelled && activity.cancellationReason && (
          <div className="mt-3 p-3 rounded-md border border-border bg-muted/50 text-foreground">
            <p className="text-xs font-medium text-muted-foreground mb-1">Cancellation reason</p>
            <p className="text-sm">{activity.cancellationReason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
