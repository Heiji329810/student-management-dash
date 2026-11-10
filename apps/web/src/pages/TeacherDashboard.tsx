import { useMemo, useState } from 'react';
import {
  ClipboardList,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { useApp } from '@/context/useApp';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClubApplication } from '@/types';

const STATUS_LABELS: Record<ClubApplication['status'], string> = {
  pending: 'Pending review',
  rejected: 'Rejected',
  approved_ordinary: 'Approved and established',
  approved_official_candidate: 'Approved as official',
  established_official: 'Established as official',
  established_ordinary: 'Established as ordinary',
};

export function TeacherDashboard() {
  const {
    clubApplications,
    studentCouncilTerms,
    students,
    reviewClubApplication,
  } = useApp();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeTerm = studentCouncilTerms.find((term) => term.status === 'active');
  const applications = useMemo(
    () =>
      [...clubApplications].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }),
    [clubApplications]
  );
  const decide = async (application: ClubApplication, decision: 'approve' | 'reject') => {
    setError('');
    setMessage('');
    const teacherComment = comments[application.id] ?? '';
    if (decision === 'reject' && !teacherComment.trim()) {
      setError('Please add a teacher comment before rejecting an application.');
      return;
    }
    if (await reviewClubApplication(application.id, decision, teacherComment)) {
      setComments((previous) => ({ ...previous, [application.id]: '' }));
      setMessage(
        decision === 'approve'
          ? `${application.name} was approved.`
          : `${application.name} was rejected.`
      );
    } else {
      setError('The application could not be updated.');
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Teacher Management Board</h2>
        <p className="mt-2 text-muted-foreground">
          Review club applications and keep annual Student Council records.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`rounded-md border p-3 text-sm ${
            error
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-2xl font-bold">
              <ClipboardList className="h-6 w-6" />
              Club Applications
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Review the complete information submitted by student founders.
            </p>
          </div>
          <Badge variant="secondary">
            {clubApplications.filter((application) => application.status === 'pending').length}{' '}
            pending
          </Badge>
        </div>

        {applications.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No club applications have been submitted.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card key={application.id} className="border-2">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{application.name}</CardTitle>
                      <CardDescription className="mt-1">
                        Submitted by {application.applicantName} ({application.applicantEmail}) on{' '}
                        {new Date(application.submittedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{STATUS_LABELS[application.status]}</Badge>
                      <Badge variant={application.wantsSchoolOfficial ? 'default' : 'secondary'}>
                        {application.wantsSchoolOfficial
                          ? 'Wants School Official status'
                          : 'Ordinary club'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Founders
                      </p>
                      <p className="mt-1">{application.founderNames.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Category
                      </p>
                      <p className="mt-1">{application.category}</p>
                    </div>
                    {application.managingTeacherName && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Teacher in charge of managing the club
                        </p>
                        <p className="mt-1">{application.managingTeacherName}</p>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Introduction
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {application.description}
                      </p>
                    </div>
                  </div>

                  {application.status === 'pending' ? (
                    <div className="space-y-3 border-t pt-4">
                      <label
                        htmlFor={`teacher-comment-${application.id}`}
                        className="text-sm font-medium"
                      >
                        Teacher comment
                      </label>
                      <textarea
                        id={`teacher-comment-${application.id}`}
                        rows={3}
                        value={comments[application.id] ?? ''}
                        onChange={(event) =>
                          setComments((previous) => ({
                            ...previous,
                            [application.id]: event.target.value,
                          }))
                        }
                        placeholder="Add a comment for the founder. A comment is required when rejecting."
                        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="gap-2"
                          onClick={async () => await decide(application, 'approve')}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Agree to establish
                        </Button>
                        <Button
                          variant="destructive"
                          className="gap-2"
                          onClick={async () => await decide(application, 'reject')}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Disagree
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md bg-muted/50 p-4 text-sm">
                      <p className="font-medium">Teacher decision comment</p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {application.teacherComment || 'No comment was added.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6" />
            Student Council Crews
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The current Student Council crew.
          </p>
        </div>
        {!activeTerm ? (
          <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            No annual Student Council has been configured yet.
          </p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{activeTerm.schoolYear}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeTerm.departments.map((department) => (
                <div key={department.id}>
                  <p className="text-sm font-semibold">{department.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {department.memberStudentIds.length === 0
                      ? 'No selected members'
                      : department.memberStudentIds
                          .map(
                            (studentId) =>
                              students.find((student) => student.id === studentId)?.name ??
                              studentId
                          )
                          .join(', ')}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
