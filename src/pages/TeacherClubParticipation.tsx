import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Star, Trash2, UserCheck, UserPlus, UserX } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatWeekRange, getWeekStart } from '@/lib/attendance';
import { calculateClubRatingScore } from '@/lib/clubRatings';

export function TeacherClubParticipation() {
  const { clubId } = useParams<{ clubId: string }>();
  const {
    currentUser,
    clubs,
    students,
    clubAttendance,
    clubRatings,
    getClubMembers,
    teacherAddOfficialClubMember,
    teacherRemoveOfficialClubMember,
  } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [memberFeedback, setMemberFeedback] = useState('');

  if (!currentUser) return null;
  if (currentUser.role !== 'founder') {
    return (
      <div className="space-y-3">
        <h2 className="text-3xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">This summary is only available to teachers.</p>
      </div>
    );
  }

  const club = clubs.find((item) => item.id === clubId);
  if (!club) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">Club Not Found</h2>
        <Button asChild variant="outline">
          <Link to="/clubs">Back to Clubs & Organizations</Link>
        </Button>
      </div>
    );
  }

  const members = getClubMembers(club.id);
  const clubEntries = clubAttendance.filter((entry) => entry.clubId === club.id);
  const weekStarts = Array.from(
    new Set([getWeekStart(), ...clubEntries.map((entry) => entry.weekStart)])
  ).sort((a, b) => b.localeCompare(a));
  const ratings = clubRatings.filter((rating) => rating.clubId === club.id);
  const availableStudents = students.filter(
    (student) => !club.members.includes(student.id)
  );
  const ratingAverage =
    ratings.length > 0
      ? ratings.reduce(
          (total, rating) => total + calculateClubRatingScore(rating),
          0
        ) / ratings.length
      : null;

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to={`/clubs/${club.id}`}>← Back to {club.name}</Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">{club.name} Summary</h2>
        <p className="mt-2 text-muted-foreground">
          A simple view of attendance and student ratings.
        </p>
      </div>

      {club.category === 'School Official Events' && (
        <section className="space-y-4">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <UserPlus className="h-5 w-5" />
              Teacher-managed membership
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Students cannot join this organization themselves.
            </p>
          </div>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select a student</option>
                  {availableStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
                </select>
                <Button
                  disabled={!selectedStudentId}
                  onClick={() => {
                    if (
                      teacherAddOfficialClubMember(club.id, selectedStudentId)
                    ) {
                      setSelectedStudentId('');
                      setMemberFeedback('Student added.');
                    }
                  }}
                >
                  Add member
                </Button>
              </div>
              <div className="divide-y rounded-md border">
                {members.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No members.</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.studentId}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${member.name}`}
                        onClick={() => {
                          if (
                            teacherRemoveOfficialClubMember(club.id, member.id)
                          ) {
                            setMemberFeedback('Student removed.');
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              {memberFeedback && (
                <p className="text-sm text-muted-foreground">{memberFeedback}</p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <CalendarCheck className="h-5 w-5" />
          Weekly club attendance
        </h3>
        <div className="space-y-3">
          {weekStarts.map((weekStart) => {
            const entries = clubEntries.filter((entry) => entry.weekStart === weekStart);
            const presentIds = new Set(
              entries
                .filter((entry) => entry.status === 'present')
                .map((entry) => entry.studentId)
            );
            const nonParticipants = members.filter((member) => !presentIds.has(member.id));
            return (
              <Card key={weekStart}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{formatWeekRange(weekStart)}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-[180px_1fr]">
                  <div className="rounded-md bg-green-500/10 p-4">
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserCheck className="h-4 w-4" />
                      People present
                    </p>
                    <p className="mt-2 text-3xl font-bold">{presentIds.size}</p>
                  </div>
                  <div className="rounded-md bg-red-500/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <UserX className="h-4 w-4" />
                      Did not participate
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {nonParticipants.length === 0
                        ? 'Everyone participated.'
                        : nonParticipants.map((member) => member.name).join(', ')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            <Star className="h-5 w-5" />
            Club ratings
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on the average of all five rating sections.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Average rating</p>
                <p className="mt-1 text-3xl font-bold">
                  {ratingAverage === null ? 'No ratings' : ratingAverage.toFixed(1)}
                </p>
              </div>
              <Badge variant="secondary">{ratings.length} ratings</Badge>
            </div>
            {ratings.length > 0 && (
              <div className="mt-5 space-y-3 border-t pt-4">
                {ratings.map((rating) => (
                  <div key={rating.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{rating.userName}</p>
                      <Badge variant="outline">
                        {calculateClubRatingScore(rating).toFixed(1)}
                      </Badge>
                    </div>
                    {rating.comment && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {rating.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
