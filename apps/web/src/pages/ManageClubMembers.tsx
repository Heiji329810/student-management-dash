import { Link } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ManageClubTabBar } from '@/components/manage-clubs/ManageClubTabBar';
import { ManageClubGuard } from '@/pages/manage-clubs/ManageClubGuard';
import { Users } from 'lucide-react';

export function ManageClubMembers() {
  const { getClubMembers } = useApp();

  return (
    <ManageClubGuard>
      {(club) => {
        const members = getClubMembers(club.id);

        return (
          <div className="space-y-6 max-w-3xl mx-auto">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/manage">← Back to Manage Clubs and Activities</Link>
            </Button>

            <div>
              <h2 className="text-2xl font-bold tracking-tight">{club.name}</h2>
              <p className="text-muted-foreground mt-1">{club.category}</p>
            </div>

            <ManageClubTabBar />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Club Members
                </h3>
                <Badge variant="secondary">{members.length} joined</Badge>
              </div>

              {members.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground text-sm">
                    No students have joined this club yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {members.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-6 text-right">
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
      }}
    </ManageClubGuard>
  );
}
