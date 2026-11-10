import type { ActivityJournalInput } from "./types.js";

export const MAX_JOURNAL_WORDS = 1000;
export const MAX_JOURNAL_PHOTOS = 8;

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function validateActivityJournal(
  input: ActivityJournalInput,
  registeredStudentCount = 1,
): string | null {
  if (!input.activityName.trim()) return "Please enter the activity name.";
  if (!input.reflection.trim())
    return "Please write about what was done and your experience.";
  if (countWords(input.reflection) > MAX_JOURNAL_WORDS) {
    return `Reflection must be no more than ${MAX_JOURNAL_WORDS} words.`;
  }
  if (registeredStudentCount > 0 && input.participantIds.length === 0) {
    return "Please select at least one member who participated.";
  }
  if (input.socialMediaLink?.trim()) {
    try {
      new URL(input.socialMediaLink.trim());
    } catch {
      return "Please enter a valid social media link URL.";
    }
  }
  if (input.photos.length > MAX_JOURNAL_PHOTOS) {
    return `You can upload up to ${MAX_JOURNAL_PHOTOS} photos.`;
  }
  return null;
}

export function journalKey(clubId: string, activityId: string): string {
  return `${clubId}:${activityId}`;
}
