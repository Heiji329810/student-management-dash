import type { JournalCommentInput } from '@/types';

export function validateJournalComment(input: JournalCommentInput): string | null {
  if (!input.rating || input.rating < 1 || input.rating > 5) {
    return 'Please select a rating from 1 to 5 stars.';
  }
  if (!input.comment.trim()) {
    return 'Please write a comment about this event.';
  }
  if (input.comment.trim().length > 500) {
    return 'Comments must be 500 characters or fewer.';
  }
  return null;
}

export function journalCommentKey(clubId: string, activityId: string, userId: string): string {
  return `${clubId}:${activityId}:${userId}`;
}

export function journalLikeKey(clubId: string, activityId: string, userId: string): string {
  return `${clubId}:${activityId}:${userId}`;
}

export function formatLikeNames(likes: { userName: string }[]): string {
  const names = likes.map((like) => like.userName);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} others`;
}

export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}
