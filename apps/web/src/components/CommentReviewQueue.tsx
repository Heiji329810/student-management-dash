import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Button } from '@/components/ui/button';

export function CommentReviewQueue({ clubId }: {clubId?: string}) {
  const {currentUser, clubs, activityJournals, clubCommentReports, dismissClubCommentReport} = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!currentUser) return null;
  const managed = clubs.filter(c => currentUser.role === 'founder' || c.founderId === currentUser.id);
  if (!managed.length) return null;
  const reports = clubCommentReports.filter(r => r.status === 'pending' && managed.some(c => c.id === r.clubId) && (!clubId || r.clubId === clubId));
  return <section aria-label="Report review queue" className="space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">Report review queue</h3>
    {error && <p role="alert">{error}</p>}
    {!reports.length && <p className="text-sm text-muted-foreground">No reports awaiting review.</p>}
    {reports.map(report => {
      const club = managed.find(c => c.id === report.clubId)!;
      const activity = club.activities.find(a => a.id === report.activityId);
      const journal = activityJournals.find(j => j.clubId === club.id && j.activityId === report.activityId);
      const href = report.source === 'journal'
        ? `/clubs/${encodeURIComponent(club.id)}/activities/${encodeURIComponent(report.activityId ?? '')}/journal#comment-${report.commentId}`
        : `/rate-my-club?club=${encodeURIComponent(club.id)}#comment-${report.ratingId}`;
      return <article key={report.id} className="space-y-2 rounded-md border p-3 text-sm">
        <p className="font-medium"><span>{report.source === 'journal' ? 'Journal comment / reply' : 'Rate My Club'}</span> · {club.name}</p>
        {report.source === 'journal' && <p><span>Activity</span>: {activity?.title} · <span>Activity Journal</span>: {journal?.activityName ?? activity?.title}</p>}
        <p><span>Comment author</span>: {report.authorName}</p>
        <blockquote className="whitespace-pre-wrap break-words">{report.commentSnapshot}</blockquote>
        <p><span>Reported by</span>: {report.reporterName}</p>
        <p className="whitespace-pre-wrap break-words"><span>Reason for reporting</span>: <span>{report.reason}</span></p>
        <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link to={href}><span>Review reports</span></Link></Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={async()=>{
            setBusy(true);setError('');
            try {if (!await dismissClubCommentReport(report.id)) setError('Unable to dismiss this report. Please reload and try again.');}
            catch {setError('Unable to dismiss this report. Please reload and try again.');}
            finally {setBusy(false);}
          }}>Dismiss report</Button>
        </div>
      </article>;
    })}
  </section>;
}
