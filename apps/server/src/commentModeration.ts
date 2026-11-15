import type { AppState } from '@student-dash/shared/state';
import type { JournalThreadComment, User } from '@student-dash/shared/types';

// Resolve from the stored activity, never from a caller-supplied club/journal ID.
export function journalCommentClub(state: AppState, comment: JournalThreadComment) {
  const club = state.clubs.find(c => c.activities.some(a => a.id === comment.activityId));
  return club?.id === comment.clubId ? club : undefined;
}
export function canModerateJournalComment(state: AppState, user: User, comment: JournalThreadComment) {
  const club = journalCommentClub(state, comment);
  return !!club && (user.role === 'founder' || club.founderId === user.id);
}
