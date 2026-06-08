import { Link } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarPlus, XCircle, ChevronRight, Pencil, BookOpen } from 'lucide-react';
import { getPastActivities, getUpcomingActivities } from '@/lib/activities';
import { ManageActivitiesClubGuard } from './manage-activities/useManagedClub';

export function ManageActivitiesClubOptions() {
  return (
    <ManageActivitiesClubGuard>
      {(club) => {
        const upcomingCount = getUpcomingActivities(club.activities).length;
        const pastCount = getPastActivities(club.activities).length;

        return (
          <div className="w-full pb-6">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/manage/activities">← Back to Manage Activities</Link>
            </Button>

            <div className="flex justify-center w-full pt-6">
              <div className="w-full max-w-xl space-y-6 text-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{club.name}</h2>
                  <p className="text-muted-foreground mt-2">
                    Choose what you would like to do with this club's activities
                  </p>
                </div>

                <div className="flex flex-col gap-3 text-left">
                  <Link to={`/manage-activities/${club.id}/add`} className="block group">
                    <Card className="border-2 gap-3 py-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                      <CardHeader className="px-5 gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <CalendarPlus className="h-6 w-6" />
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                        <CardTitle className="text-lg group-hover:underline underline-offset-2">
                          Add Activity
                        </CardTitle>
                        <CardDescription>Create a new event for this club</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link to={`/manage-activities/${club.id}/edit`} className="block group">
                    <Card className="border-2 gap-3 py-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                      <CardHeader className="px-5 gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <Pencil className="h-6 w-6" />
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                        <CardTitle className="text-lg group-hover:underline underline-offset-2">
                          Change Activity Information
                        </CardTitle>
                        <CardDescription>
                          {upcomingCount > 0
                            ? `Edit details for ${upcomingCount} upcoming ${upcomingCount === 1 ? 'activity' : 'activities'}`
                            : 'No upcoming activities to edit'}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link to={`/manage-activities/${club.id}/journal`} className="block group">
                    <Card className="border-2 gap-3 py-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                      <CardHeader className="px-5 gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <BookOpen className="h-6 w-6" />
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                        <CardTitle className="text-lg group-hover:underline underline-offset-2">
                          Journal My Activities
                        </CardTitle>
                        <CardDescription>
                          {pastCount > 0
                            ? `Write journals for ${pastCount} past ${pastCount === 1 ? 'event' : 'events'}`
                            : 'Available after events end'}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link to={`/manage-activities/${club.id}/cancel`} className="block group">
                    <Card className="border-2 gap-3 py-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                      <CardHeader className="px-5 gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <XCircle className="h-6 w-6" />
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                        <CardTitle className="text-lg group-hover:underline underline-offset-2">
                          Cancel Activity
                        </CardTitle>
                        <CardDescription>
                          {upcomingCount > 0
                            ? `Cancel ${upcomingCount} upcoming ${upcomingCount === 1 ? 'activity' : 'activities'}`
                            : 'No upcoming activities to cancel'}
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
