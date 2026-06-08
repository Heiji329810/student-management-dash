import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ManageClubTabBar } from '@/components/manage-clubs/ManageClubTabBar';
import { AttendanceStatusMenu } from '@/components/manage-clubs/AttendanceStatusMenu';
import { ManageClubGuard } from '@/pages/manage-clubs/useManageClubGuard';
import {
  ATTENDANCE_OPTIONS,
  formatWeekRange,
  getWeekStart,
  shiftWeekStart,
} from '@/lib/attendance';
import type { AttendanceStatus } from '@/types';
import { ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react';

export function ManageClubCheckIn() {
  const { getClubMembers, getClubAttendanceForWeek, setClubMemberAttendance } = useApp();
  const [weekStart, setWeekStart] = useState(getWeekStart());

  return (
    <ManageClubGuard>
      {(club) => {
        const members = getClubMembers(club.id);
        const attendance = getClubAttendanceForWeek(club.id, weekStart);
        const isCurrentWeek = weekStart === getWeekStart();

        const handleStatus = (studentId: string, status: AttendanceStatus) => {
          setClubMemberAttendance(club.id, weekStart, studentId, status);
        };

        return (
          <div className="space-y-6 max-w-3xl mx-auto">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/manage">← Back to Manage Clubs and Activities</Link>
            </Button>

            <div>
              <h2 className="text-2xl font-bold tracking-tight">{club.name}</h2>
              <p className="text-muted-foreground mt-1">{club.category}</p>
            </div>

            <ManageClubTabBar />

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Weekly Class Check-in
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setWeekStart((w) => shiftWeekStart(w, -1))}
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm font-medium min-w-[180px] text-center">
                    {formatWeekRange(weekStart)}
                    {isCurrentWeek && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        This week
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setWeekStart((w) => shiftWeekStart(w, 1))}
                    aria-label="Next week"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
                {ATTENDANCE_OPTIONS.map(({ status, label, dotClass }) => (
                  <span key={status} className="inline-flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                    {label}
                  </span>
                ))}
              </div>

              {members.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground text-sm">
                    No members to check in. Students need to join the club first.
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {members.map((member) => {
                    const status = attendance[member.id];

                    return (
                      <div
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.studentId}</p>
                        </div>

                        <AttendanceStatusMenu
                          value={status}
                          onChange={(optionStatus) => handleStatus(member.id, optionStatus)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }}
    </ManageClubGuard>
  );
}
