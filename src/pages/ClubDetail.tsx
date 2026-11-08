import { Link, useParams } from 'react-router-dom';
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
import { Calendar, MapPin, Users, CheckCircle2, XCircle, Sparkles, BookOpen, ArrowRight, UserCheck } from 'lucide-react';
import {
  formatActivityDate,
  formatEndDate,
  getActivityEmoji,
  isActivityPast,
  splitActivitiesByTiming,
} from '@/lib/activities';
import { getClubMemberCount } from '@/lib/clubs';
import { countStudentPresentSessions } from '@/lib/attendance';
import { ClubJoinButton } from '@/components/ClubJoinButton';
import type { Activity, Club } from '@/types';

interface ActivityCardProps {
  activity: Activity;
  club: Club;
  isRegistered: boolean;
  isFull: boolean;
  canRegister: boolean;
  onRegister: () => void;
  onUnregister: () => void;
  hasJournal?: boolean;
}

function ActivityCard({
  activity,
  club,
  isRegistered,
  isFull,
  canRegister,
  onRegister,
  onUnregister,
  hasJournal,
}: ActivityCardProps) {
  const activityEmoji = getActivityEmoji(activity.title);
  const past = isActivityPast(activity);

  const cardBody = (
    <Card
      className={`border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg relative overflow-hidden group/activity h-full ${
        past ? 'cursor-pointer' : ''
      }`}
    >
      <div className="absolute top-0 right-0 text-6xl opacity-5 group-hover/activity:opacity-10 transition-opacity">
        {activityEmoji}
      </div>

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <span className="text-2xl">{activityEmoji}</span>
            <div className="flex-1">
              <CardTitle className="text-lg leading-tight">{activity.title}</CardTitle>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {past && <Badge variant="outline">Past</Badge>}
            {past && hasJournal && (
              <Badge variant="secondary" className="gap-1">
                <BookOpen className="h-3 w-3" />
                Journal
              </Badge>
            )}
            {isRegistered && (
              <Badge className="bg-green-500/90 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Registered
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="mt-2 text-sm">{activity.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 relative z-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span>
            {formatActivityDate(activity.date)}
            {activity.durationType === 'long-term' && activity.endDate && (
              <> — {formatEndDate(activity.endDate)}</>
            )}
            {activity.durationType === 'long-term' && (
              <Badge variant="outline" className="ml-2 text-xs">
                Long-term
              </Badge>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span>{activity.location}</span>
        </div>
        {(activity.allStudentsOnCampus || activity.maxParticipants) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            <span>
              {activity.allStudentsOnCampus
                ? `All students on campus · ${activity.registeredStudents.length} registered`
                : `${activity.registeredStudents.length} / ${activity.maxParticipants} participants`}
            </span>
          </div>
        )}
        {canRegister && !past && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant={isRegistered ? 'outline' : 'default'}
                className="w-full mt-2"
                disabled={isFull && !isRegistered}
              >
                {isRegistered ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Unregister
                  </>
                ) : isFull ? (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Full
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Register
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isRegistered ? 'Unregister from Activity' : 'Register for Activity'}
                </DialogTitle>
                <DialogDescription>
                  {isRegistered
                    ? 'Are you sure you want to unregister from this activity?'
                    : `Confirm your registration for ${activity.title}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activityEmoji}</span>
                  <div>
                    <p className="font-medium text-lg">{activity.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{club.name}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm bg-muted/50 p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {formatActivityDate(activity.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {activity.location}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={isRegistered ? onUnregister : onRegister} className="flex-1">
                    {isRegistered ? 'Unregister' : 'Confirm Registration'}
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
        {past && (
          <div className="flex items-center gap-2 text-sm font-medium text-primary mt-2 group-hover/activity:underline">
            <BookOpen className="h-4 w-4" />
            View Activity Journal
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (past) {
    return (
      <Link to={`/clubs/${club.id}/activities/${activity.id}/journal`} className="block h-full">
        {cardBody}
      </Link>
    );
  }

  return cardBody;
}

export function ClubDetail() {
  const { clubId } = useParams<{ clubId: string }>();
  const {
    clubs,
    currentUser,
    students,
    clubAttendance,
    registerForActivity,
    unregisterFromActivity,
    getActivityJournal,
  } = useApp();

  if (!currentUser) return null;

  const club = clubs.find((c) => c.id === clubId);

  if (!club) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Club Not Found</h2>
        <p className="text-muted-foreground">This club doesn't exist.</p>
        <Button asChild variant="outline">
          <Link to="/clubs">Back to Clubs</Link>
        </Button>
      </div>
    );
  }

  const { upcoming, past } = splitActivitiesByTiming(club.activities);
  const currentStudent =
    currentUser.role === 'student'
      ? students.find((student) => student.studentId === currentUser.studentId)
      : undefined;
  const isMember = !!currentStudent && club.members.includes(currentStudent.id);
  const joinedCount = currentStudent
    ? countStudentPresentSessions(clubAttendance, club.id, currentStudent.id)
    : 0;

  const checkRegistered = (activity: Activity) => {
    if (currentUser.role !== 'student' || !currentUser.studentId) return false;
    const student = students.find((s) => s.studentId === currentUser.studentId);
    return student ? activity.registeredStudents.includes(student.id) : false;
  };

  const checkFull = (activity: Activity) => {
    if (activity.allStudentsOnCampus) return false;
    return activity.maxParticipants
      ? activity.registeredStudents.length >= activity.maxParticipants
      : false;
  };

  const canRegister = currentUser.role === 'student';

  const renderSection = (title: string, activities: Activity[], emptyMessage: string, isPastSection = false) => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        <Sparkles className="h-5 w-5" />
        {title}
        <Badge variant="secondary" className="ml-1">
          {activities.length}
        </Badge>
      </h3>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              club={club}
              isRegistered={checkRegistered(activity)}
              isFull={checkFull(activity)}
              canRegister={canRegister}
              onRegister={() => registerForActivity(activity.id, club.id)}
              onUnregister={() => unregisterFromActivity(activity.id, club.id)}
              hasJournal={isPastSection ? !!getActivityJournal(club.id, activity.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/clubs">← Back to Clubs</Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{club.name}</h2>
              {club.isSchoolOfficial && <Badge>School Official</Badge>}
            </div>
            <p className="text-muted-foreground mt-2">
              Founded by {club.founderName} · {club.category}
            </p>
            <p className="text-muted-foreground mt-3 max-w-2xl">{club.description}</p>
          </div>
          <div className="flex flex-col gap-3 items-stretch sm:items-end shrink-0 w-full sm:w-auto">
            <Badge variant="outline" className="text-sm w-fit self-start sm:self-end">
              <Users className="h-3 w-3 mr-1" />
              {getClubMemberCount(club)} members
            </Badge>
            {currentUser.role === 'founder' && (
              <>
                <Button asChild variant="outline" className="w-full sm:min-w-[13rem]">
                  <Link to={`/clubs/${club.id}/members`}>
                    <Users className="h-4 w-4" />
                    Show members
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:min-w-[13rem]">
                  <Link to={`/clubs/${club.id}/participation`}>
                    View Participation Overview
                  </Link>
                </Button>
              </>
            )}
            {isMember && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span>
                  You have joined <strong>{joinedCount}</strong>{' '}
                  {joinedCount === 1 ? 'class' : 'classes'}
                </span>
              </div>
            )}
            <ClubJoinButton clubId={club.id} className="w-full sm:min-w-[13rem]" />
          </div>
        </div>
      </div>

      {renderSection('Upcoming Events', upcoming, 'No upcoming events for this club.')}
      {renderSection('Past Events', past, 'No past events for this club.', true)}
    </div>
  );
}
