import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Club } from '@/types';
import { useManageClub } from './useManageClub';

export function ManageClubGuard({ children }: { children: (club: Club) => ReactNode }) {
  const { club, currentUser, isOwner } = useManageClub();

  if (!currentUser) return null;

  if (currentUser.role === 'founder') {
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
    return <Navigate to={`/clubs/${club.id}/members`} replace />;
  }

  if (currentUser.role !== 'student') {
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
          This club doesn't exist or you don't have permission to manage it.
        </p>
        <Button asChild variant="outline">
          <Link to="/manage/clubs">Back to Manage Clubs</Link>
        </Button>
      </div>
    );
  }

  return <>{children(club)}</>;
}
