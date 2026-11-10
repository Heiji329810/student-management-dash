import { Link, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useApp } from '@/context/useApp';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ClubMembers() {
  const { clubId } = useParams<{ clubId: string }>();
  const { currentUser, clubs, getClubMembers } = useApp();

  if (!currentUser) return null;

  const club = clubs.find((item) => item.id === clubId);
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

  const members = getClubMembers(club.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={`/clubs/${club.id}`}>← Back to {club.name}</Link>
      </Button>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">{club.name}</h2>
        <p className="mt-1 text-muted-foreground">{club.category}</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Club Members
          </h3>
          <Badge variant="secondary">{members.length} joined</Badge>
        </div>

        {members.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No students have joined this club yet.
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {members.map((member, index) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-sm text-muted-foreground">
                    {index + 1}.
                  </span>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.studentId}</p>
                  </div>
                </div>
                <Badge variant="outline">Member</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
