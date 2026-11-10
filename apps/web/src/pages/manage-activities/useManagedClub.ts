import { useParams } from 'react-router-dom';
import { useApp } from '@/context/useApp';
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
