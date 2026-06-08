import type { Club } from '@/types';
import { getActiveActivities } from '@/lib/activities';

export function getClubMemberCount(club: Club): number {
  return club.members.length;
}

export function getClubMemberStudents(
  club: Club,
  students: { id: string; name: string; email: string; studentId: string }[]
) {
  return club.members
    .map((memberId) => students.find((student) => student.id === memberId))
    .filter((student): student is NonNullable<typeof student> => !!student)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getClubEventCount(club: Club): number {
  return getActiveActivities(club.activities).length;
}

export function isStudentClubMember(club: Club, studentDbId: string): boolean {
  return club.members.includes(studentDbId);
}
