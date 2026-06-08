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
