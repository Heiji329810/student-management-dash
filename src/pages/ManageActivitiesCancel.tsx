import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { getActiveActivities, getActivityReleaseOrder } from '@/lib/activities';
import { ActivityManageRow } from './manage-activities/ActivityManageRow';
import { ManageActivitiesClubGuard } from './manage-activities/useManagedClub';

export function ManageActivitiesCancel() {
  const { cancelActivity } = useApp();

  return (
    <ManageActivitiesClubGuard>
      {(club) => {
        const activeActivities = getActiveActivities(club.activities).sort(
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
                  <h2 className="text-3xl font-bold tracking-tight">Cancel Activity</h2>
                  <p className="text-muted-foreground mt-2">
                    {club.name} · Select an activity to cancel
                  </p>
                </div>

                {activeActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-border rounded-lg">
                    You don't have any activities to cancel.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeActivities.map((activity) => (
                      <ActivityManageRow
                        key={activity.id}
                        activity={activity}
                        onCancel={(reason) =>
                          cancelActivity(club.id, activity.id, { reason })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </ManageActivitiesClubGuard>
  );
}
