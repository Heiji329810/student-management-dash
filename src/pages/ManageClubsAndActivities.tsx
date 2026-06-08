import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, CalendarCog, ChevronRight, Users } from 'lucide-react';
import { getClubMemberCount } from '@/lib/clubs';
import { getActiveActivities } from '@/lib/activities';
import { cn } from '@/lib/utils';

export function ManageClubsAndActivities() {
  const { currentUser, getMyClubs } = useApp();
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  if (!currentUser) return null;

  if (currentUser.role !== 'student') {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">This page is only accessible to students.</p>
      </div>
    );
  }

  const myClubs = getMyClubs();
  const selectedClub = myClubs.find((club) => club.id === selectedClubId);

  return (
    <div className="w-full min-h-[60vh] flex justify-center pt-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Manage Clubs and Activities</h2>
          <p className="text-muted-foreground mt-2">
            {selectedClub
              ? `Choose how to manage ${selectedClub.name}`
              : 'Select a club to get started'}
          </p>
        </div>

        {myClubs.length === 0 ? (
          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clubs yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Create a club first, then you can manage members, check-in, and activities.
              </p>
              <Button asChild>
                <Link to="/create-club">Create a Club</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                1. Select a club
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {myClubs.map((club) => {
                  const isSelected = club.id === selectedClubId;
                  const activeCount = getActiveActivities(club.activities).length;

                  return (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => setSelectedClubId(club.id)}
                      className={cn(
                        'text-left rounded-lg border-2 p-4 transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/40 hover:bg-muted/30'
                      )}
                    >
                      <p className="font-semibold">{club.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {club.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          {club.category}
                        </Badge>
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Users className="h-3 w-3" />
                          {getClubMemberCount(club)} members
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {activeCount} activities
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedClub && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    2. Choose what to manage
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedClubId(null)}
                  >
                    Change club
                  </Button>
                </div>

                <div className="flex flex-col gap-4">
                  <Link to={`/manage/clubs/${selectedClub.id}/members`} className="block group">
                    <Card className="border-2 gap-3 py-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                      <CardHeader className="px-5 gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <Building2 className="h-6 w-6" />
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                        <CardTitle className="text-lg group-hover:underline underline-offset-2">
                          Manage Clubs
                        </CardTitle>
                        <CardDescription>
                          View members and take weekly class check-in
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link to={`/manage-activities/${selectedClub.id}`} className="block group">
                    <Card className="border-2 gap-3 py-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5">
                      <CardHeader className="px-5 gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <CalendarCog className="h-6 w-6" />
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                        <CardTitle className="text-lg group-hover:underline underline-offset-2">
                          Manage Activities
                        </CardTitle>
                        <CardDescription>
                          Add, edit, cancel activities and write journals
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
