import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
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
import { Calendar, MapPin, Users, XCircle, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatActivityDate,
  getActivityEmoji,
  isActivityCancelled,
  isActivityPast,
} from '@/lib/activities';
import type { Activity, Club } from '@/types';

interface RegistrationEntry {
  activity: Activity;
  club: Club;
}

function getDaysUntil(dateString: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(dateString);
  eventDate.setHours(0, 0, 0, 0);
  const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: 'Past', urgent: false, past: true };
  if (diff === 0) return { label: 'Today', urgent: true, past: false };
  if (diff === 1) return { label: 'Tomorrow', urgent: true, past: false };
  if (diff <= 7) return { label: `In ${diff} days`, urgent: true, past: false };
  return { label: `In ${diff} days`, urgent: false, past: false };
}

function RegistrationCard({
  activity,
  club,
  index,
  onUnregister,
}: {
  activity: Activity;
  club: Club;
  index: number;
  onUnregister: () => void;
}) {
  const emoji = getActivityEmoji(activity.title);
  const timing = getDaysUntil(activity.date);
  const past = isActivityPast(activity);
  const cancelled = isActivityCancelled(activity);

  return (
    <div
      className="relative md:pl-12 pb-6 last:pb-0 animate-in fade-in slide-in-from-bottom-6 duration-500 fill-mode-both"
      style={{ animationDelay: `${150 + index * 100}ms` }}
    >
      <div
        className={cn(
          'absolute left-3 top-8 hidden md:flex h-3 w-3 rounded-full border-2 border-border bg-background transition-all duration-300',
          timing.urgent && !past && 'border-foreground scale-125',
          past && 'opacity-40'
        )}
      />

      <Card
        className={cn(
          'border-2 relative overflow-hidden group transition-all duration-300',
          'hover:border-primary/50 hover:shadow-xl hover:-translate-y-0.5',
          past && 'opacity-75',
          cancelled && 'opacity-60 border-dashed'
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-0 right-0 text-7xl opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-300 select-none pointer-events-none">
          {emoji}
        </div>

        <CardHeader className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                {emoji}
              </span>
              <div className="flex-1">
                <CardTitle className="text-xl">{activity.title}</CardTitle>
                <CardDescription className="mt-1">
                  {club.name} · {club.category}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {cancelled && <Badge variant="destructive">Cancelled</Badge>}
              <Badge
                variant="outline"
                className={cn(
                  'transition-colors duration-300',
                  timing.urgent && !past && !cancelled && 'border-foreground'
                )}
              >
                {cancelled ? 'Cancelled by organizer' : past ? 'Past' : timing.label}
              </Badge>
              <Badge variant="secondary">Registered</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 relative z-10">
          <p className="text-sm text-muted-foreground">{activity.description}</p>

          <div className="flex flex-wrap gap-3">
            {[
              { icon: Calendar, text: formatActivityDate(activity.date) },
              { icon: MapPin, text: activity.location },
              ...(activity.maxParticipants
                ? [{
                    icon: Users,
                    text: `${activity.registeredStudents.length} / ${activity.maxParticipants} participants`,
                  }]
                : activity.allStudentsOnCampus
                  ? [{
                      icon: Users,
                      text: `All students on campus · ${activity.registeredStudents.length} registered`,
                    }]
                  : []),
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 rounded-md border border-border bg-background/50 transition-colors duration-300 group-hover:border-foreground/30"
              >
                <Icon className="h-4 w-4" />
                {text}
              </div>
            ))}
          </div>

          {activity.maxParticipants && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-700 ease-out"
                style={{
                  width: `${(activity.registeredStudents.length / activity.maxParticipants) * 100}%`,
                }}
              />
            </div>
          )}

        {cancelled && activity.cancellationReason && (
          <div className="p-3 rounded-md border border-border bg-muted/50 text-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Cancellation reason</p>
            {activity.cancellationReason}
          </div>
        )}

          <div className="flex gap-2 pt-2">
            {!past && !cancelled && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <XCircle className="h-4 w-4" />
                    Unregister
                  </Button>
                </DialogTrigger>
                <DialogContent className="animate-in fade-in zoom-in-95 duration-200">
                  <DialogHeader>
                    <DialogTitle>Unregister from Activity</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to unregister from this activity?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{emoji}</span>
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{club.name}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm bg-muted/50 p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatActivityDate(activity.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {activity.location}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={onUnregister} className="flex-1">
                        Confirm Unregister
                      </Button>
                      <DialogClose asChild>
                        <Button variant="outline" className="flex-1">
                          Cancel
                        </Button>
                      </DialogClose>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button
              variant="ghost"
              asChild
              className="transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Link to={`/clubs/${club.id}`}>View Club</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Registrations() {
  const { clubs, currentUser, students, unregisterFromActivity } = useApp();

  if (!currentUser) {
    return null;
  }

  if (currentUser.role !== 'student') {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <h2 className="text-3xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">
          This page is only accessible to students.
        </p>
      </div>
    );
  }

  const student = students.find((s) => s.studentId === currentUser.studentId);

  const allRegistrations: RegistrationEntry[] = student
    ? clubs.flatMap((club) =>
        club.activities
          .filter((activity) => activity.registeredStudents.includes(student.id))
          .map((activity) => ({ activity, club }))
      )
    : [];

  const past = allRegistrations
    .filter(({ activity }) => isActivityPast(activity) || isActivityCancelled(activity))
    .sort((a, b) => new Date(b.activity.date).getTime() - new Date(a.activity.date).getTime());

  const upcoming = allRegistrations
    .filter(({ activity }) => !isActivityPast(activity) && !isActivityCancelled(activity))
    .sort((a, b) => new Date(a.activity.date).getTime() - new Date(b.activity.date).getTime());

  const registrations = [...upcoming, ...past];

  const handleUnregister = (activityId: string, clubId: string) => {
    unregisterFromActivity(activityId, clubId);
  };

  const renderSection = (
    title: string,
    items: RegistrationEntry[],
    emptyMessage: string,
    startIndex: number
  ) => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        {title}
        <Badge variant="secondary">{items.length}</Badge>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-[1.125rem] top-4 bottom-4 w-px bg-border hidden md:block" />
          {items.map(({ activity, club }, i) => (
            <RegistrationCard
              key={activity.id}
              activity={activity}
              club={club}
              index={startIndex + i}
              onUnregister={() => handleUnregister(activity.id, club.id)}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
        <h2 className="text-3xl font-bold tracking-tight">My Registrations</h2>
        <p className="text-muted-foreground mt-2">
          Upcoming events first, then past events
        </p>
      </div>

      {registrations.length === 0 ? (
        <Card className="border-2 animate-in fade-in zoom-in-95 duration-500">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-4">
              <Sparkles className="h-12 w-12 text-muted-foreground animate-pulse" />
              <span className="absolute -top-1 -right-1 text-2xl animate-bounce">⭐</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">No registrations yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              You haven't registered for any activities. Browse clubs to find events you'd like to join.
            </p>
            <Button asChild className="transition-transform hover:scale-105 active:scale-95">
              <Link to="/clubs">Browse Clubs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
            <Card className="border-2 relative overflow-hidden group hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Registrations
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">{registrations.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Activities signed up</p>
              </CardContent>
            </Card>
            <Card className="border-2 relative overflow-hidden group hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">{upcoming.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {upcoming[0]
                    ? `Next: ${upcoming[0].activity.title}`
                    : 'No upcoming events'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-10">
            {renderSection(
              'Upcoming Events',
              upcoming,
              'No upcoming registered events.',
              0
            )}
            {renderSection(
              'Past Events',
              past,
              'No past registered events.',
              upcoming.length
            )}
          </div>
        </>
      )}
    </div>
  );
}
