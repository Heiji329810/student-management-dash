import { Link } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCog, ChevronRight, Users } from 'lucide-react';
import { getActiveActivities } from '@/lib/activities';
import { getClubMemberCount } from '@/lib/clubs';

export function ManageActivities() {
  const { currentUser, getMyClubs } = useApp();

  if (!currentUser) {
    return null;
  }

  if (currentUser.role !== 'student') {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">
          This page is only accessible to students.
        </p>
      </div>
    );
  }

  const myClubs = getMyClubs();

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to="/manage">← Back to Manage Clubs and Activities</Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Manage Activities</h2>
        <p className="text-muted-foreground mt-2">
          Select a club, then choose to add, edit, or cancel activities
        </p>
      </div>

      {myClubs.length === 0 ? (
        <Card className="border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarCog className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clubs yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              You haven't created any clubs. Create a club first, then you can manage its activities.
            </p>
            <Button asChild>
              <Link to="/create-club">Create a Club</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {myClubs.map((club) => {
            const activeCount = getActiveActivities(club.activities).length;

            return (
              <Link key={club.id} to={`/manage-activities/${club.id}`} className="block group">
                <Card className="border-2 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-xl group-hover:underline underline-offset-2">
                          {club.name}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {club.description}
                        </CardDescription>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{club.category}</Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {getClubMemberCount(club)} members
                      </Badge>
                      <Badge variant="secondary">
                        {activeCount} active {activeCount === 1 ? 'activity' : 'activities'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
