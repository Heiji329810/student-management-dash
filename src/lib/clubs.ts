import type { Club } from '@/types';
import { getActiveActivities } from '@/lib/activities';

export function getClubMemberCount(club: Club): number {
  return club.members.length;
}

export function getClubEventCount(club: Club): number {
  return getActiveActivities(club.activities).length;
}

export function isStudentClubMember(club: Club, studentDbId: string): boolean {
  return club.members.includes(studentDbId);
}
