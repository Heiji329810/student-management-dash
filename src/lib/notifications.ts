import type { ActivityRemovalNotice, NotificationRecord, Student, User } from '@/types';

export function userIdFromStudentId(
  studentId: string,
  students: Student[],
  users: User[]
): string | undefined {
  const student = students.find((s) => s.id === studentId);
  if (!student) return undefined;
  return users.find((u) => u.studentId === student.studentId)?.id;
}

export function loadReadNotificationIds(): Record<string, string[]> {
  const saved = localStorage.getItem('readNotificationIds');
  return saved ? JSON.parse(saved) : {};
}

export function notificationsFromRemovalNotices(
  notices: ActivityRemovalNotice[],
  students: Student[],
  users: User[]
): NotificationRecord[] {
  return notices.flatMap((notice) => {
    const recipientUserId = userIdFromStudentId(notice.studentId, students, users);
    if (!recipientUserId) return [];

    return [
      {
        id: `cancel-${notice.id}`,
        recipientUserId,
        type: 'activity_cancelled' as const,
        title: 'Activity cancelled',
        message: `"${notice.activityTitle}" at ${notice.clubName} was cancelled.`,
        createdAt: notice.removedAt,
        activityTitle: notice.activityTitle,
        clubName: notice.clubName,
        cancellationMessage: notice.message,
        href: `/clubs/${notice.clubId}`,
      },
    ];
  });
}

export function mergeNotifications(
  existing: NotificationRecord[],
  incoming: NotificationRecord[]
): NotificationRecord[] {
  const map = new Map(existing.map((n) => [n.id, n]));
  for (const notification of incoming) {
    if (!map.has(notification.id)) {
      map.set(notification.id, notification);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
