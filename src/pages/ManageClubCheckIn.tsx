import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, UserCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ManageClubTabBar } from '@/components/manage-clubs/ManageClubTabBar';
import { AttendanceStatusMenu } from '@/components/manage-clubs/AttendanceStatusMenu';
import { ManageClubGuard } from '@/pages/manage-clubs/useManageClubGuard';
import {
  ATTENDANCE_OPTIONS,
  countStudentPresentSessions,
  formatWeekRange,
  getCalendarMonthDays,
  getWeekStart,
  shiftMonth,
} from '@/lib/attendance';
import type { AttendanceStatus } from '@/types';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ManageClubCheckIn() {
  const {
    clubAttendance,
    getClubMembers,
    getClubAttendanceForWeek,
    setClubMemberAttendance,
  } = useApp();
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());

  return (
    <ManageClubGuard>
      {(club) => {
        const members = getClubMembers(club.id);
        const attendance = getClubAttendanceForWeek(club.id, weekStart);
        const calendarDays = getCalendarMonthDays(visibleMonth);
        const clubEntries = clubAttendance.filter((entry) => entry.clubId === club.id);

        const selectDay = (day: Date) => {
          setWeekStart(getWeekStart(day));
        };

        const handleStatus = (studentId: string, status: AttendanceStatus) => {
          setClubMemberAttendance(club.id, weekStart, studentId, status);
        };

        return (
          <div className="mx-auto max-w-5xl space-y-6">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/manage">← Back to Manage Clubs and Activities</Link>
            </Button>

            <div>
              <h2 className="text-2xl font-bold tracking-tight">{club.name}</h2>
              <p className="mt-1 text-muted-foreground">{club.category}</p>
            </div>

            <ManageClubTabBar />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Card className="border-2">
                <CardContent className="p-5">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <CalendarDays className="h-5 w-5" />
                      Class Calendar
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <p className="min-w-[140px] text-center text-sm font-semibold">
                        {visibleMonth.toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 border-l border-t">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="border-b border-r bg-muted/50 px-1 py-2 text-center text-xs font-semibold text-muted-foreground"
                      >
                        {day}
                      </div>
                    ))}
                    {calendarDays.map((day) => {
                      const dayWeek = getWeekStart(day);
                      const isSelectedWeek = dayWeek === weekStart;
                      const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                      const isToday = day.toDateString() === new Date().toDateString();
                      const weeklyEntries = clubEntries.filter(
                        (entry) => entry.weekStart === dayWeek
                      );
                      const presentCount = weeklyEntries.filter(
                        (entry) => entry.status === 'present'
                      ).length;
                      const isMonday = day.getDay() === 1;

                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => selectDay(day)}
                          className={cn(
                            'relative min-h-20 border-b border-r p-2 text-left transition-colors hover:bg-muted/60',
                            !isCurrentMonth && 'text-muted-foreground/40',
                            isSelectedWeek && 'bg-primary/10 hover:bg-primary/15'
                          )}
                          aria-label={`Select week of ${dayWeek}`}
                        >
                          <span
                            className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                              isToday && 'bg-primary font-semibold text-primary-foreground'
                            )}
                          >
                            {day.getDate()}
                          </span>
                          {isMonday && weeklyEntries.length > 0 && (
                            <span className="mt-2 flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                              <UserCheck className="h-3 w-3" />
                              {presentCount} present
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Select any date to check in members for that Monday–Sunday class week.
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-4 lg:sticky lg:top-28">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <ClipboardCheck className="h-5 w-5" />
                    Weekly Check-in
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatWeekRange(weekStart)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 px-1 text-xs text-muted-foreground">
                  {ATTENDANCE_OPTIONS.map(({ status, label, dotClass }) => (
                    <span key={status} className="inline-flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                      {label}
                    </span>
                  ))}
                </div>

                {members.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No members to check in. Students need to join the club first.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {members.map((member) => {
                      const totalPresent = countStudentPresentSessions(
                        clubAttendance,
                        club.id,
                        member.id
                      );

                      return (
                        <div key={member.id} className="space-y-3 px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.studentId}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 gap-1">
                              <UserCheck className="h-3.5 w-3.5" />
                              {totalPresent} joined
                            </Badge>
                          </div>
                          <AttendanceStatusMenu
                            value={attendance[member.id]}
                            onChange={(status) => handleStatus(member.id, status)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </ManageClubGuard>
  );
}
