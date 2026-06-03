import { Link } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarPlus, XCircle, ChevronRight } from 'lucide-react';
import { getActiveActivities } from '@/lib/activities';
import { ManageActivitiesClubGuard } from './manage-activities/useManagedClub';

export function ManageActivitiesClubOptions() {
  return (
    <ManageActivitiesClubGuard>
      {(club) => {
        const activeCount = getActiveActivities(club.activities).length;

        return (
          <div className="w-full min-h-[60vh]">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/manage-activities">← Back to Manage Activities</Link>
            </Button>

            <div className="flex justify-center w-full pt-8">
              <div className="w-full max-w-2xl space-y-8 text-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">{club.name}</h2>
                  <p className="text-muted-foreground mt-2">
                    Choose what you would like to do with this club's activities
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  <Link to={`/manage-activities/${club.id}/add`} className="block group">
                    <Card className="border-2 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <CalendarPlus className="h-8 w-8" />
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                        <CardTitle className="text-xl group-hover:underline underline-offset-2">
                          Add Activity
                        </CardTitle>
                        <CardDescription>Create a new event for this club</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link to={`/manage-activities/${club.id}/cancel`} className="block group">
                    <Card className="border-2 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <XCircle className="h-8 w-8" />
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                        <CardTitle className="text-xl group-hover:underline underline-offset-2">
                          Cancel Activity
                        </CardTitle>
                        <CardDescription>
                          {activeCount > 0
                            ? `Manage ${activeCount} active ${activeCount === 1 ? 'activity' : 'activities'}`
                            : 'View activities you have created'}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </ManageActivitiesClubGuard>
  );
}
