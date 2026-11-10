import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight, BookOpen, MapPin } from 'lucide-react';
import { formatActivityDate, getActivityEmoji, getPastActivities } from '@/lib/activities';
import { ManageActivitiesClubGuard } from './manage-activities/ManageActivitiesClubGuard';
import { useApp } from '@/context/useApp';

export function ManageActivitiesJournal() {
  const { getActivityJournal } = useApp();

  return (
    <ManageActivitiesClubGuard>
      {(club) => {
        const pastActivities = getPastActivities(club.activities);

        return (
          <div className="w-full min-h-[60vh]">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to={`/manage-activities/${club.id}`}>← Back to options</Link>
            </Button>

            <div className="flex justify-center w-full pt-8">
              <div className="w-full max-w-2xl space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold tracking-tight">Journal My Activities</h2>
                  <p className="text-muted-foreground mt-2">
                    {club.name} · Record memories from past events
                  </p>
                </div>

                {pastActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-border rounded-lg">
                    No past events yet. Journals become available after an event ends.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pastActivities.map((activity) => {
                      const journal = getActivityJournal(club.id, activity.id);

                      return (
                        <Link
                          key={activity.id}
                          to={`/manage-activities/${club.id}/journal/${activity.id}`}
                          className="block group"
                        >
                          <Card className="border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1">
                                  <span className="text-2xl">{getActivityEmoji(activity.title)}</span>
                                  <div>
                                    <CardTitle className="text-lg group-hover:underline underline-offset-2">
                                      {activity.title}
                                    </CardTitle>
                                    <CardDescription className="mt-1 line-clamp-2">
                                      {activity.description}
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  {journal ? (
                                    <Badge variant="secondary">Journal saved</Badge>
                                  ) : (
                                    <Badge variant="outline">No journal yet</Badge>
                                  )}
                                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                </div>
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
                              <div className="flex items-center gap-2 pt-1 text-foreground">
                                <BookOpen className="h-4 w-4" />
                                {journal ? 'Edit journal entry' : 'Create journal entry'}
                              </div>
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
      }}
    </ManageActivitiesClubGuard>
  );
}
