import { UserPlus, UserMinus } from 'lucide-react';
import { useApp } from '@/context/useApp';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isStudentClubMember } from '@/lib/clubs';

export function ClubJoinButton({
  clubId,
  className,
}: {
  clubId: string;
  className?: string;
}) {
  const { currentUser, clubs, students, joinClub, leaveClub } = useApp();

  if (!currentUser || currentUser.role !== 'student' || !currentUser.studentId) {
    return null;
  }

  const student = students.find((s) => s.studentId === currentUser.studentId);
  const club = clubs.find((c) => c.id === clubId);
  if (!student || !club) return null;
  if (club.category === 'School Official Events') return null;

  const joined = isStudentClubMember(club, student.id);

  return (
    <Button
      size="lg"
      variant={joined ? 'outline' : 'default'}
      className={cn(
        'h-12 min-w-[11rem] px-6 text-base font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]',
        joined
          ? 'border-2'
          : 'border-blue-900 bg-blue-900 text-white hover:bg-blue-950 hover:border-blue-950 dark:border-blue-700 dark:bg-blue-800 dark:hover:bg-blue-900 dark:hover:border-blue-900',
        className
      )}
      onClick={async () => (joined ? await leaveClub(clubId) : await joinClub(clubId))}
    >
      {joined ? (
        <>
          <UserMinus className="h-5 w-5" />
          Leave Club
        </>
      ) : (
        <>
          <UserPlus className="h-5 w-5" />
          Join this club
        </>
      )}
    </Button>
  );
}
