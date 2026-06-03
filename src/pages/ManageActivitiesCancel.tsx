import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { getActivityReleaseOrder } from '@/lib/activities';
import { ActivityManageRow } from './manage-activities/ActivityManageRow';
import { ManageActivitiesClubGuard } from './manage-activities/useManagedClub';

export function ManageActivitiesCancel() {
  const { cancelActivity } = useApp();

  return (
    <ManageActivitiesClubGuard>
      {(club) => {
        const allActivities = [...club.activities].sort(
          (a, b) => getActivityReleaseOrder(b) - getActivityReleaseOrder(a)
        );
        const activeActivities = allActivities.filter((a) => !a.cancelled);
        const cancelledActivities = allActivities.filter((a) => a.cancelled);

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
                    {club.name} · All activities you have created
                  </p>
                </div>

            {allActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center border border-border rounded-lg">
                You haven't created any activities for this club yet.
              </p>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Active Activities ({activeActivities.length})
                  </h3>
                  {activeActivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active activities to cancel.</p>
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

                {cancelledActivities.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-muted-foreground">
                      Cancelled Activities ({cancelledActivities.length})
                    </h3>
                    <div className="space-y-3">
                      {cancelledActivities.map((activity) => (
                        <ActivityManageRow
                          key={activity.id}
                          activity={activity}
                          onCancel={() => false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
              </div>
            </div>
          </div>
        );
      }}
    </ManageActivitiesClubGuard>
  );
}
