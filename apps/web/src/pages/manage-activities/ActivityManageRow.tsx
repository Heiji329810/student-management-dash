import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { formatActivityDate, getActivityEmoji } from '@/lib/activities';
import type { Activity } from '@/types';

export function ActivityManageRow({
  activity,
  onCancel,
}: {
  activity: Activity;
  onCancel: (reason: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const participantCount = activity.registeredStudents.length;

  const handleCancel = async () => {
    setError('');
    if (!reason.trim()) {
      setError('Please write a message for registered participants.');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Your message must be at least 10 characters.');
      return;
    }
    const success = await onCancel(reason.trim());
    if (success) {
      setOpen(false);
      setReason('');
    } else {
      setError('Failed to cancel activity. Please try again.');
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            <span className="text-2xl">{getActivityEmoji(activity.title)}</span>
            <div>
              <CardTitle className="text-lg">{activity.title}</CardTitle>
              <CardDescription className="mt-1">{activity.description}</CardDescription>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
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
                  You are about to cancel "{activity.title}" for this club.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-destructive font-medium">
                  Please note that once cancellation is confirmed, the information for this event
                  cannot be recovered.
                </p>
                <p className="text-sm text-muted-foreground">
                  {participantCount > 0
                    ? `Your message below will be sent to ${participantCount} registered ${
                        participantCount === 1 ? 'participant' : 'participants'
                      }.`
                    : 'No students have registered for this event yet, so no message will be sent.'}
                </p>
                <div className="space-y-2">
                  <label htmlFor={`reason-${activity.id}`} className="text-sm font-medium">
                    Message to Registered Participants
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
                  <Button onClick={handleCancel} variant="destructive" className="flex-1">
                    Send Message & Confirm Cancellation
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
      </CardContent>
    </Card>
  );
}
