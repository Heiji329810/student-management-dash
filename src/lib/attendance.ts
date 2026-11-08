import type { AttendanceStatus } from '@/types';

export const ATTENDANCE_OPTIONS: {
  status: AttendanceStatus;
  label: string;
  dotClass: string;
}[] = [
  { status: 'present', label: 'Present', dotClass: 'bg-green-500' },
  { status: 'absent', label: 'Absent', dotClass: 'bg-orange-500' },
  { status: 'leave', label: 'Leave Requested', dotClass: 'bg-blue-500' },
];

export function getAttendanceOption(status: AttendanceStatus) {
  return ATTENDANCE_OPTIONS.find((option) => option.status === status);
}

export function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function shiftWeekStart(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00`);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmt = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const endYear =
    end.getFullYear() !== start.getFullYear() ? `, ${end.getFullYear()}` : '';

  return `${fmt(start)} – ${fmt(end)}${endYear}, ${start.getFullYear()}`;
}

export function attendanceKey(clubId: string, weekStart: string, studentId: string): string {
  return `${clubId}:${weekStart}:${studentId}`;
}

export function countStudentPresentSessions(
  entries: { clubId: string; studentId: string; status: AttendanceStatus }[],
  clubId: string,
  studentId: string
): number {
  return entries.filter(
    (entry) =>
      entry.clubId === clubId &&
      entry.studentId === studentId &&
      entry.status === 'present'
  ).length;
}

export function getCalendarMonthDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = new Date(first);
  const mondayOffset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  start.setDate(first.getDate() - mondayOffset);

  const end = new Date(last);
  const sundayOffset = last.getDay() === 0 ? 0 : 7 - last.getDay();
  end.setDate(last.getDate() + sundayOffset);

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function shiftMonth(month: Date, amount: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + amount, 1);
}
