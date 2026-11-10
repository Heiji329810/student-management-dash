import type { Activity } from "./types.js";

/** Sort key for "most recently released" — prefers activity id, falls back to start date */
export function getActivityReleaseOrder(activity: Activity): number {
  const tsMatch = activity.id.match(/^a-(\d+)(?:-|$)/);
  if (tsMatch) return parseInt(tsMatch[1], 10);
  const numMatch = activity.id.match(/^a(\d+)$/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return new Date(activity.date).getTime();
}

export function isActivityCancelled(activity: Activity): boolean {
  return !!activity.cancelled;
}

export function getActiveActivities(activities: Activity[]): Activity[] {
  return activities.filter((a) => !a.cancelled);
}

export function getRecentActivities(
  activities: Activity[],
  limit = 2,
): Activity[] {
  return [...getActiveActivities(activities)]
    .sort((a, b) => getActivityReleaseOrder(b) - getActivityReleaseOrder(a))
    .slice(0, limit);
}

export function isActivityPast(activity: Activity): boolean {
  const now = new Date();

  if (activity.durationType === "long-term" && activity.endDate) {
    const end = new Date(activity.endDate);
    end.setHours(23, 59, 59, 999);
    return now > end;
  }

  const start = new Date(activity.date);
  if (activity.date.includes("T")) {
    return now > start;
  }

  start.setHours(23, 59, 59, 999);
  return now > start;
}

export function getPastActivities(activities: Activity[]): Activity[] {
  return getActiveActivities(activities)
    .filter((a) => isActivityPast(a))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getUpcomingActivities(activities: Activity[]): Activity[] {
  return getActiveActivities(activities)
    .filter((a) => !isActivityPast(a))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function splitActivitiesByTiming(activities: Activity[]) {
  const active = getActiveActivities(activities);
  const upcoming = active
    .filter((a) => !isActivityPast(a))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = active
    .filter((a) => isActivityPast(a))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { upcoming, past };
}

export function formatActivityDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const hasTime = dateString.includes("T");
  if (hasTime) {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatEndDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const activityEmojis: Record<string, string> = {
  Hackathon: "🚀",
  Workshop: "🛠️",
  Walk: "🚶",
  Competition: "🏆",
  Cleanup: "🧹",
  Ceremony: "🎓",
  "Open Day": "🔬",
};

export function getActivityEmoji(title: string): string {
  for (const [key, emoji] of Object.entries(activityEmojis)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "✨";
}
