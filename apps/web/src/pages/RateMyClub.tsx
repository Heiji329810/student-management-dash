import { CommentReportMenu } from '@/components/CommentReportMenu';
import { CommentReviewQueue } from '@/components/CommentReviewQueue';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AlertCircle, BadgeCheck, CheckCircle2, ClipboardCheck, Flag, MessageSquare, Star, Trophy } from 'lucide-react';
import { useApp } from '@/context/useApp';
import { StarRating } from '@/components/journal/StarRating';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CLUB_RATING_DIMENSIONS,
  compareClubComments,
  MIN_PRESENT_SESSIONS_TO_RATE,
  calculateClubRatingScore,
  countPresentSessions,
  emptyClubRatingInput,
  validateClubRatingInput,
} from '@/lib/clubRatings';
import type { ClubCommentReport } from '@student-dash/shared/types';
import type { Club, ClubRatingInput, ClubRatingRecord } from '@/types';
import { cn } from '@/lib/utils';

interface RankedClub {
  club: Club;
  average: number | null;
  ratingCount: number;
}


function CommunityRatings({ ratings, reports, currentUserId, onDeleteComment, onReport, onDismiss, onPublish, onPin }: {
  onPublish?: (rating: ClubRatingRecord, published: boolean) => Promise<boolean>;
  onPin?: (rating: ClubRatingRecord, pinned: boolean) => Promise<boolean>;
  reports: ClubCommentReport[];
  currentUserId: string;
  onReport?: (rating: ClubRatingRecord, reason: string) => Promise<boolean>;
  onDismiss?: (reportId: string) => Promise<boolean>;
  ratings: ClubRatingRecord[];
  onDeleteComment?: (rating: ClubRatingRecord) => Promise<boolean>;
}) {
  const [target, setTarget] = useState<ClubRatingRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [reportTarget, setReportTarget] = useState<ClubRatingRecord | null>(null);
  const [reason, setReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [moderationStatus, setModerationStatus] = useState('');
  const moderate = async (action: (() => Promise<boolean>) | undefined, message: string) => {
    if (!action || moderating) return;
    setModerating(true); setReviewError(''); setModerationStatus('');
    try {
      if (await action()) setModerationStatus(message);
      else setReviewError('Unable to moderate this comment. Please reload and try again.');
    } catch { setReviewError('Unable to moderate this comment. Please reload and try again.'); }
    finally { setModerating(false); }
  };
  if (ratings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No community ratings yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Be the first eligible member to rate this club.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {moderationStatus && <p role="status" className="text-sm text-muted-foreground">{moderationStatus}</p>}
      {reportSent && <p role="status" className="text-sm text-muted-foreground">Report submitted for moderator review. The comment and rating scores remain unchanged.</p>}
      {dismissed && <p role="status" className="text-sm text-muted-foreground">Report dismissed.</p>}
      {reviewError && <p role="alert" className="text-sm text-destructive">{reviewError}</p>}
      {onDismiss && reports.some(r => r.status === 'pending') && (
        <section aria-label="Reported comments" className="space-y-3 rounded-lg border p-4">
          <h4 className="font-semibold">Reported comments</h4>
          {reports.filter(r => r.status === 'pending').map(report => {
            const current = ratings.find(r => r.id === report.ratingId);
            return <div key={report.id} className="space-y-2 rounded-md border p-3 text-sm">
              <p><span>Comment author</span>: <span>{report.authorName}</span></p>
              <blockquote className="whitespace-pre-wrap break-words">{report.commentSnapshot}</blockquote>
              <p><span>Reported by</span>: <span>{report.reporterName}</span></p>
              <p className="whitespace-pre-wrap break-words"><span>Reason for reporting</span>: <span>{report.reason}</span></p>
              <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p>
              {current?.comment !== report.commentSnapshot && <p className="text-muted-foreground">This comment has changed since it was reported. Review the current comment before deleting.</p>}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={!!dismissing} onClick={async () => {
                  setDismissing(report.id); setReviewError(''); setDismissed(false);
                  try {
                    if (await onDismiss(report.id)) setDismissed(true);
                    else setReviewError('Unable to dismiss this report. Please reload and try again.');
                  } catch { setReviewError('Unable to dismiss this report. Please reload and try again.'); }
                  finally { setDismissing(null); }
                }}>{dismissing === report.id ? 'Dismissing...' : 'Dismiss report'}</Button>
                {current?.comment.trim() && onPublish && <Button variant="outline" size="sm" disabled={moderating} onClick={() => void moderate(
                  () => onPublish(current, !!current.commentUnpublished), current.commentUnpublished ? 'Comment republished.' : 'Comment unpublished. Rating scores remain unchanged.'
                )}>{current.commentUnpublished ? 'Republish comment' : 'Unpublish comment'}</Button>}
                {current?.comment.trim() && onDeleteComment && <Button variant="outline" size="sm" onClick={() => {
                  setTarget(current); setDeleteError(''); setDeleted(false);
                }}>Delete comment</Button>}
              </div>
            </div>;
          })}
        </section>
      )}
      <Dialog open={!!reportTarget} onOpenChange={open => { if (!open && !reporting) setReportTarget(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <form onSubmit={async event => {
            event.preventDefault();
            if (!reportTarget || !onReport || reporting || !reason.trim()) return;
            setReporting(true); setReportError('');
            try {
              if (await onReport(reportTarget, reason.trim())) { setReportTarget(null); setReportSent(true); }
              else setReportError('Unable to report this comment. It may have changed or already been reported. Please reload and try again.');
            } catch { setReportError('Unable to report this comment. It may have changed or already been reported. Please reload and try again.'); }
            finally { setReporting(false); }
          }} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Report inappropriate comment?</DialogTitle>
              <DialogDescription>A club leader or teacher will review your report. Reporting does not hide or delete the comment or change rating scores.</DialogDescription>
            </DialogHeader>
            <p className="text-sm"><span>Comment author</span>: <span>{reportTarget?.userName || 'Student'}</span></p>
            <blockquote className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border p-3 text-sm">{reportTarget?.comment}</blockquote>
            <div className="space-y-2">
              <label htmlFor="comment-report-reason" className="text-sm font-medium">Reason for reporting</label>
              <textarea id="comment-report-reason" aria-describedby="comment-report-limit" required maxLength={500} rows={4} value={reason} disabled={reporting}
                onChange={event => setReason(event.target.value)}
                placeholder="Explain why this comment is inappropriate..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
              <p id="comment-report-limit" className="text-xs text-muted-foreground">Maximum 500 characters.</p>
            </div>
            {reportError && <p role="alert" className="text-sm text-destructive">{reportError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={reporting} onClick={() => setReportTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={reporting || !reason.trim()}>{reporting ? 'Submitting report...' : 'Submit report'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {deleted && <p role="status" className="text-sm text-muted-foreground">Comment deleted.</p>}
      <Dialog open={!!target} onOpenChange={(open) => { if (!open && !deleting) setTarget(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete this comment?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The student's rating scores will remain.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm"><span>Comment author</span>: <span>{target?.userName || 'Student'}</span></p>
          <p className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border p-3 text-sm">{target?.comment}</p>
          {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={async () => {
              if (!target || !onDeleteComment || deleting) return;
              setDeleting(true);
              setDeleteError('');
              try {
                if (await onDeleteComment(target)) {
                  setTarget(null);
                  setDeleted(true);
                } else {
                  setDeleteError('Unable to delete this comment. Please try again.');
                }
              } finally {
                setDeleting(false);
              }
            }}>{deleting ? 'Deleting...' : 'Delete comment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {ratings
        .slice()
        .sort(compareClubComments)
        .map((rating) => {
          const score = calculateClubRatingScore(rating);
          return (
          <div key={rating.id} id={`comment-${rating.id}`} data-rating-id={rating.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{rating.userName || 'Student'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(rating.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StarRating value={score} readonly size="sm" />
                <span className="text-sm font-semibold">{score.toFixed(1)}</span>
              </div>
            </div>
            {rating.comment?.trim() && (
              <div>
              {rating.commentUnpublished && <Badge variant="secondary">Unpublished · visible to moderators only</Badge>}
              {rating.commentPinned && <Badge variant="outline">Pinned</Badge>}
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {rating.comment}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              {onDeleteComment && reports.some(r => r.ratingId === rating.id && r.status === 'pending') && (
                <Badge variant="outline" role="status" className="gap-1 border-amber-600 text-amber-700 dark:text-amber-400">
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" /><span>Reported</span>
                </Badge>
              )}
              {onPublish && <Button variant="outline" size="sm" disabled={moderating} onClick={() => void moderate(
                () => onPublish(rating, !!rating.commentUnpublished), rating.commentUnpublished ? 'Comment republished.' : 'Comment unpublished. Rating scores remain unchanged.'
              )}>{rating.commentUnpublished ? 'Republish comment' : 'Unpublish comment'}</Button>}
              {onPin && <Button variant="outline" size="sm" disabled={moderating} onClick={() => void moderate(
                () => onPin(rating, !rating.commentPinned), rating.commentPinned ? 'Comment unpinned.' : 'Comment pinned.'
              )}>{rating.commentPinned ? 'Unpin comment' : 'Pin comment'}</Button>}
              {onDeleteComment && (
                <Button variant="outline" size="sm" onClick={() => {
                  setTarget(rating);
                  setDeleteError('');
                  setDeleted(false);
                }}>Delete comment</Button>
              )}
              {onReport && rating.userId !== currentUserId && !rating.commentUnpublished && <CommentReportMenu
                reported={reports.some(r => r.reporterUserId === currentUserId && r.ratingId === rating.id && r.ratingUpdatedAt === rating.updatedAt)}
                onReport={() => { setReportTarget(rating); setReason(''); setReportError(''); setReportSent(false); }} />}
              </div>
              </div>
            )}
          </div>
          );
        })}
    </div>
  );
}

function ClubRatingForm({
  presentCount,
  initialInput,
  onSave,
}: {
  club: Club;
  presentCount: number;
  initialInput: ClubRatingInput;
  onSave: (input: ClubRatingInput) => Promise<boolean>;
}) {
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);



  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const validationError = validateClubRatingInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (await onSave({ ...input, comment: input.comment.trim() })) {
      setSaved(true);
    } else {
      setError('Unable to save your rating. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Your rating</h3>
        <Badge variant="secondary" className="gap-1">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {presentCount} classes present
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CLUB_RATING_DIMENSIONS.map((dimension) => (
          <div key={dimension.key} className="space-y-2 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">{dimension.label}</p>
              <p className="text-xs text-muted-foreground">{dimension.description}</p>
            </div>
            <StarRating
              value={input.dimensions[dimension.key]}
              onChange={(value) => {
                setInput((previous) => ({
                  ...previous,
                  dimensions: { ...previous.dimensions, [dimension.key]: value },
                }));
                setSaved(false);
              }}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-semibold">Overall Rating</p>
        <StarRating
          value={input.overall}
          onChange={(value) => {
            setInput((previous) => ({ ...previous, overall: value }));
            setSaved(false);
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="club-rating-comment" className="text-sm font-medium">
          Comment <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="club-rating-comment"
          value={input.comment}
          maxLength={500}
          rows={4}
          onChange={(event) => {
            setInput((previous) => ({ ...previous, comment: event.target.value }));
            setSaved(false);
          }}
          placeholder="Share your experience with other students..."
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-right text-xs text-muted-foreground">{input.comment.length}/500</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Your rating has been saved. Community ratings are now shown below.
        </p>
      )}

      <Button type="submit">{initialInput.overall ? 'Update Rating' : 'Submit Rating'}</Button>
    </form>
  );
}

export function RateMyClub() {
  const {
    clubs,
    students,
    clubAttendance,
    clubRatings,
    currentUser,
    getClubRating,
    saveClubRating,
    deleteClubRatingComment,
    setClubCommentPublished,
    setClubCommentPinned,
    clubCommentReports,
    reportClubRatingComment,
    dismissClubCommentReport,
  } = useApp();
  const {hash} = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClubId = searchParams.get('club');
  const setSelectedClubId = (club: string) => setSearchParams({club});
  useEffect(() => {
    if (window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({block:'center'});
  }, [selectedClubId, clubRatings, hash]);

  const rankedClubs = useMemo<RankedClub[]>(() => {
    return clubs
      .map((club) => {
        const ratings = clubRatings.filter((rating) => rating.clubId === club.id);
        return {
          club,
          ratingCount: ratings.length,
          average:
            ratings.length > 0
              ? ratings.reduce(
                  (total, rating) => total + calculateClubRatingScore(rating),
                  0
                ) / ratings.length
              : null,
        };
      })
      .sort((a, b) => {
        if (a.average === null && b.average === null) return a.club.name.localeCompare(b.club.name);
        if (a.average === null) return 1;
        if (b.average === null) return -1;
        return b.average - a.average || b.ratingCount - a.ratingCount;
      });
  }, [clubs, clubRatings]);



  if (!currentUser) return null;
  if (currentUser.role !== 'student' && currentUser.role !== 'founder') {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">This page is only accessible to students and teachers.</p>
      </div>
    );
  }

  const selected = rankedClubs.find((entry) => entry.club.id === selectedClubId) ?? rankedClubs[0];
  if (!selected) return <p className="p-8 text-center text-muted-foreground">No clubs are available yet.</p>;
  const student = students.find((item) => item.studentId === currentUser.studentId);
  const isMember = !!student && selected.club.members.includes(student.id);
  const presentCount = student
    ? countPresentSessions(clubAttendance, selected.club.id, student.id)
    : 0;
  const isTeacher = currentUser.role === 'founder';
  const canModerate = isTeacher || selected.club.founderId === currentUser.id;
  const isEligible = currentUser.role === 'student' && isMember && presentCount >= MIN_PRESENT_SESSIONS_TO_RATE;
  const ownRating = getClubRating(selected.club.id);
  const communityRatings = clubRatings.filter(
    (rating) => rating.clubId === selected.club.id && (canModerate || rating.userId !== currentUser.id)
  );
  const showCommunityRatings = canModerate || !isEligible || !!ownRating;

  const reason = !isMember
    ? 'You must become a member of this club before you can rate it.'
    : `You have attended ${presentCount} of the ${MIN_PRESENT_SESSIONS_TO_RATE} required classes. You need ${MIN_PRESENT_SESSIONS_TO_RATE - presentCount} more present check-in${MIN_PRESENT_SESSIONS_TO_RATE - presentCount === 1 ? '' : 's'}.`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Star className="h-8 w-8" />
          Rate My Club
        </h2>
        <p className="mt-2 text-muted-foreground">
          Explore club rankings, view student comments, and rate clubs you actively attend.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="border-2 lg:sticky lg:top-28">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5" />
              Club Ranking
            </CardTitle>
            <CardDescription>Ranked by students’ overall scores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rankedClubs.map((entry, index) => (
              <button
                key={entry.club.id}
                type="button"
                onClick={() => setSelectedClubId(entry.club.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                  selected.club.id === entry.club.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{entry.club.name}</span>
                    {entry.club.isSchoolOfficial && (
                      <Badge
                        variant="secondary"
                        className="h-5 shrink-0 gap-1 px-1.5 text-[9px]"
                        title="Certified School Official Club"
                      >
                        <BadgeCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        Official
                      </Badge>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {entry.ratingCount} rating{entry.ratingCount === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold">
                  {entry.average === null ? '—' : entry.average.toFixed(1)}
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {isTeacher && (
            <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Teachers can view club rankings and moderate student comments. Only student members with at least three present check-ins can submit ratings.
            </p>
          )}
          <CommentReviewQueue />
          {!isTeacher && !isEligible && (
            <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold">You cannot rate this club yet</p>
                <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
              </div>
            </div>
          )}

          <Card className="border-2">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{selected.club.name}</CardTitle>
                    {selected.club.isSchoolOfficial && (
                      <Badge
                        variant="secondary"
                        className="gap-1"
                        title="Certified School Official Club"
                      >
                        <BadgeCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        School Official Club
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">{selected.club.category}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {selected.average === null ? '—' : selected.average.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.ratingCount} rating{selected.ratingCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {isEligible && (
                <ClubRatingForm
                  key={selected.club.id}
                  club={selected.club}
                  presentCount={presentCount}
                  initialInput={ownRating ?? emptyClubRatingInput()}
                  onSave={async (input) => await saveClubRating(selected.club.id, input)}
                />
              )}

              {showCommunityRatings ? (
                <section className="space-y-4 border-t pt-6">
                  <div>
                    <h3 className="text-lg font-semibold">Student ratings and comments</h3>
                    <p className="text-sm text-muted-foreground">
                      Feedback submitted by club members
                    </p>
                  </div>
                  <CommunityRatings
                    key={selected.club.id}
                    ratings={communityRatings}
                    currentUserId={currentUser.id}
                    reports={clubCommentReports.filter(r => r.source !== "journal" && r.clubId === selected.club.id && (canModerate || r.reporterUserId === currentUser.id))}
                    onReport={!isTeacher ? async (rating, reason) => reportClubRatingComment(rating.clubId, rating.id, {reason, ratingUpdatedAt: rating.updatedAt}) : undefined}
                    onDismiss={canModerate ? dismissClubCommentReport : undefined}
                    onPublish={canModerate ? (rating, published) => setClubCommentPublished(rating.clubId, rating.id, published) : undefined}
                    onPin={canModerate ? (rating, pinned) => setClubCommentPinned(rating.clubId, rating.id, pinned) : undefined}
                    onDeleteComment={canModerate ? async (rating) =>
                      deleteClubRatingComment(rating.clubId, rating.id) : undefined}
                  />
                </section>
              ) : (
                <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  Submit your rating to view other students’ ratings and comments.
                </div>
              )}

              <Button variant="ghost" asChild>
                <Link to={`/clubs/${selected.club.id}`}>View Club</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
