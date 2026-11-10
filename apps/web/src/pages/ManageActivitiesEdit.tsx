import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivityForm } from '@/components/manage-activities/ActivityForm';
import { ActivityDetailsSummary } from '@/components/manage-activities/ActivityDetailsSummary';
import { ChevronRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  activityToFormValues,
  emptyActivityFormValues,
  toCreateActivityInput,
  validateActivityForm,
  type ActivityFormValues,
} from '@/lib/activityForm';
import {
  getActivityEmoji,
  getActivityReleaseOrder,
  getUpcomingActivities,
  isActivityPast,
} from '@/lib/activities';
import { ManageActivitiesClubGuard } from './manage-activities/ManageActivitiesClubGuard';
import type { Club } from '@/types';

function ManageActivitiesEditList({ club }: { club: Club }) {
  const location = useLocation();
  const [savedActivityId] = useState(
    () => (location.state as { updatedActivityId?: string } | null)?.updatedActivityId ?? null
  );

  const upcomingActivities = getUpcomingActivities(club.activities).sort(
    (a, b) => getActivityReleaseOrder(b) - getActivityReleaseOrder(a)
  );

  return (
    <div className="w-full min-h-[60vh]">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={`/manage-activities/${club.id}`}>← Back to options</Link>
      </Button>

      <div className="flex justify-center w-full pt-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Change Activity Information</h2>
            <p className="text-muted-foreground mt-2">
              {club.name} · Select an upcoming activity to edit
            </p>
          </div>

          {savedActivityId && (
            <div className="p-3 rounded-md border border-border bg-muted/50 text-sm text-center animate-in fade-in slide-in-from-top-2 duration-300">
              Activity updated successfully. Your changes are shown below.
            </div>
          )}

          {upcomingActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center border border-border rounded-lg">
              No upcoming activities to edit. Once an event ends, use Journal My Activities
              instead.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingActivities.map((item) => {
                const isUpdated = savedActivityId === item.id;

                return (
                  <Link
                    key={item.id}
                    to={`/manage-activities/${club.id}/edit/${item.id}`}
                    className="block group"
                  >
                    <Card
                      className={cn(
                        'border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5',
                        isUpdated && 'border-primary/60 ring-2 ring-primary/20'
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-2xl">{getActivityEmoji(item.title)}</span>
                            <div>
                              <CardTitle className="text-lg group-hover:underline underline-offset-2">
                                {item.title}
                              </CardTitle>
                              <CardDescription className="mt-1">{item.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                            {isUpdated && (
                              <span className="text-xs font-medium text-foreground">Updated</span>
                            )}
                            <Pencil className="h-4 w-4" />
                            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ActivityDetailsSummary activity={item} />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ManageActivitiesEditForm({ club, activityId }: { club: Club; activityId: string }) {
  const { updateActivity } = useApp();
  const navigate = useNavigate();
  const activity = club.activities.find((a) => a.id === activityId && !a.cancelled);
  const [values, setValues] = useState<ActivityFormValues>(() => activity ? activityToFormValues(activity) : emptyActivityFormValues());
  const [error, setError] = useState('');



  if (!activity) {
    return (
      <div className="w-full min-h-[60vh] space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/manage-activities/${club.id}/edit`}>← Back to activity list</Link>
        </Button>
        <div className="text-center pt-8 space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">Activity Not Found</h2>
          <p className="text-muted-foreground">This activity doesn't exist.</p>
          <Button asChild variant="outline">
            <Link to={`/manage-activities/${club.id}/edit`}>Choose another activity</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isActivityPast(activity)) {
    return (
      <div className="w-full min-h-[60vh] space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/manage-activities/${club.id}/edit`}>← Back to activity list</Link>
        </Button>
        <div className="text-center pt-8 space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">Activity Has Ended</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Past events can no longer be edited. Use Journal My Activities to record photos
            and reflections instead.
          </p>
          <Button asChild>
            <Link to={`/manage-activities/${club.id}/journal/${activity.id}`}>
              Go to Journal My Activities
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateActivityForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    const ok = await updateActivity(club.id, activity.id, toCreateActivityInput(values));

    if (ok) {
      navigate(`/manage-activities/${club.id}/edit`, {
        state: { updatedActivityId: activity.id },
      });
    } else {
      setError('Failed to update activity. Please check your inputs and try again.');
    }
  };

  return (
    <div className="w-full min-h-[60vh]">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={`/manage-activities/${club.id}/edit`}>← Back to activity list</Link>
      </Button>

      <div className="flex justify-center w-full pt-8">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Change Activity Information</h2>
            <p className="text-muted-foreground mt-2">{club.name}</p>
          </div>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Edit Activity</CardTitle>
              <CardDescription>Update the details for "{activity.title}".</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityForm
                values={values}
                onChange={setValues}
                onSubmit={handleSubmit}
                submitLabel="Save Changes"
                error={error}
                formId="edit-activity-form"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ManageActivitiesEdit() {
  const { activityId } = useParams<{ activityId?: string }>();

  return (
    <ManageActivitiesClubGuard>
      {(club) =>
        activityId ? (
          <ManageActivitiesEditForm key={`${club.id}:${activityId}`} club={club} activityId={activityId} />
        ) : (
          <ManageActivitiesEditList club={club} />
        )
      }
    </ManageActivitiesClubGuard>
  );
}
