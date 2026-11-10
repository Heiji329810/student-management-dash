import type {
  JournalThreadComment,
  JournalThreadCommentInput,
} from "./types.js";

export function validateJournalThreadComment(
  input: JournalThreadCommentInput,
  isReply: boolean,
): string | null {
  if (!input.body.trim()) {
    return isReply ? "Please write a reply." : "Please write a comment.";
  }
  if (input.body.trim().length > 500) {
    return "Comments must be 500 characters or fewer.";
  }
  if (!isReply) {
    if (!input.rating || input.rating < 1 || input.rating > 5) {
      return "Please select a rating from 1 to 5 stars.";
    }
  }
  return null;
}

export function journalLikeKey(
  clubId: string,
  activityId: string,
  userId: string,
): string {
  return `${clubId}:${activityId}:${userId}`;
}

export function formatLikeNames(likes: { userName: string }[]): string {
  const names = likes.map((like) => like.userName);
  if (names.length === 0) return "";
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

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatCommentTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function groupThreadComments(comments: JournalThreadComment[]) {
  const byParent = new Map<string | null, JournalThreadComment[]>();

  for (const comment of comments) {
    const key = comment.parentId;
    const group = byParent.get(key) ?? [];
    group.push(comment);
    byParent.set(key, group);
  }

  for (const [parentId, group] of byParent) {
    if (parentId === null) {
      group.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else {
      group.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
  }

  return byParent;
}

export function countTopLevelComments(
  comments: JournalThreadComment[],
): number {
  return comments.filter((comment) => comment.parentId === null).length;
}

export function collectCommentTreeIds(
  commentId: string,
  comments: JournalThreadComment[],
): Set<string> {
  const ids = new Set<string>([commentId]);
  const children = comments.filter((comment) => comment.parentId === commentId);
  for (const child of children) {
    collectCommentTreeIds(child.id, comments).forEach((id) => ids.add(id));
  }
  return ids;
}
