import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import type { Club } from '@/types';

export function useManagedClub(): {
  club: Club | undefined;
  clubId: string | undefined;
  currentUser: ReturnType<typeof useApp>['currentUser'];
  isStudent: boolean;
  isOwner: boolean;
} {
  const { clubId } = useParams<{ clubId: string }>();
  const { currentUser, clubs } = useApp();
  const club = clubs.find((c) => c.id === clubId);
  const isStudent = currentUser?.role === 'student';
  const isOwner = !!club && !!currentUser && club.founderId === currentUser.id;

  return { club, clubId, currentUser, isStudent, isOwner };
}

export function ManageActivitiesClubGuard({
  children,
}: {
  children: (club: Club) => ReactNode;
}) {
  const { club, currentUser, isStudent, isOwner } = useManagedClub();

  if (!currentUser) return null;

  if (!isStudent) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">This page is only accessible to students.</p>
      </div>
    );
  }

  if (!club || !isOwner) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Club Not Found</h2>
        <p className="text-muted-foreground">
          This club doesn't exist or you don't have permission to manage its activities.
        </p>
        <Button asChild variant="outline">
          <Link to="/manage-activities">Back to Manage Activities</Link>
        </Button>
      </div>
    );
  }

  return <>{children(club)}</>;
}
