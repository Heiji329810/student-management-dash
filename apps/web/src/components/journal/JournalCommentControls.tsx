import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApp } from '@/context/useApp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommentReportMenu } from '@/components/CommentReportMenu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { JournalThreadComment } from '@/types';

export function JournalCommentControls({comment}: {comment: JournalThreadComment}) {
  const {currentUser, clubs, clubCommentReports, reportJournalThreadComment, setJournalCommentPublished, setJournalCommentPinned, deleteJournalCommentText} = useApp();
  const {hash} = useLocation();
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (decodeURIComponent(window.location.hash) === `#comment-${comment.id}`) document.getElementById(`comment-${comment.id}`)?.scrollIntoView({block:'center'});
  }, [comment.id, hash]);
  if (!currentUser) return null;
  const club = clubs.find(c => c.id === comment.clubId && c.activities.some(a=>a.id === comment.activityId));
  const moderator = !!club && (currentUser.role === 'founder' || club.founderId === currentUser.id);
  const reports = clubCommentReports.filter(r => r.source === 'journal' && r.commentId === comment.id);
  const run = async (action:()=>Promise<boolean>, message:string) => {
    if (busy) return;
    setBusy(true);setError('');setStatus('');
    try {if (await action()) {setStatus(message);setDeleteOpen(false);setReportOpen(false);} else setError('Unable to moderate this comment. Please reload and try again.');}
    catch {setError('Unable to moderate this comment. Please reload and try again.');}
    finally {setBusy(false);}
  };
  return <div className="space-y-2">
    {status && <p role="status" className="text-xs text-muted-foreground">{status}</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <div className="flex flex-wrap items-center justify-end gap-2">
      {comment.commentPinned && <Badge variant="outline">Pinned</Badge>}
      {moderator && comment.commentUnpublished && <Badge variant="secondary">Unpublished · visible to moderators only</Badge>}
      {moderator && reports.some(r=>r.status === 'pending') && <Badge variant="outline" role="status">Reported</Badge>}
      {moderator && !comment.commentDeleted && !!comment.body.trim() && <>
        <Button size="sm" variant="outline" disabled={busy} onClick={()=>void run(()=>setJournalCommentPublished(comment.id, !!comment.commentUnpublished), comment.commentUnpublished ? 'Comment republished.' : 'Comment unpublished. Rating scores remain unchanged.')}>{comment.commentUnpublished ? 'Republish comment' : 'Unpublish comment'}</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={()=>void run(()=>setJournalCommentPinned(comment.id, !comment.commentPinned),comment.commentPinned ? 'Comment unpinned.' : 'Comment pinned.')}>{comment.commentPinned ? 'Unpin comment' : 'Pin comment'}</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={()=>{setError('');setDeleteOpen(true);}}>Delete comment</Button>
      </>}
      {currentUser.role === 'student' && comment.userId !== currentUser.id && !comment.commentDeleted && !comment.commentUnpublished && !!comment.body.trim() && <CommentReportMenu reported={reports.some(r=>r.reporterUserId===currentUser.id)} onReport={()=>{setReason('');setError('');setReportOpen(true);}} />}
    </div>
    <Dialog open={reportOpen} onOpenChange={open=>{if(!busy)setReportOpen(open);}}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form className="space-y-4" onSubmit={event=>{event.preventDefault();if(reason.trim())void run(()=>reportJournalThreadComment(comment.id,{reason:reason.trim()}),'Report submitted for moderator review. The comment and rating scores remain unchanged.');}}>
          <DialogHeader><DialogTitle>Report inappropriate comment?</DialogTitle><DialogDescription>A club leader or teacher will review your report. Reporting does not hide or delete the comment or change rating scores.</DialogDescription></DialogHeader>
          <p><span>Comment author</span>: {comment.userName}</p>
          <blockquote className="max-h-48 overflow-auto whitespace-pre-wrap break-words">{comment.body}</blockquote>
          <label className="block space-y-2"><span>Reason for reporting</span><textarea required maxLength={500} rows={4} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} className="w-full rounded-md border bg-background p-2" /></label>
          <p className="text-xs text-muted-foreground">Maximum 500 characters.</p>
          {error && <p role="alert">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>setReportOpen(false)}>Cancel</Button><Button type="submit" disabled={busy || !reason.trim()}>{busy ? 'Submitting report...' : 'Submit report'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={deleteOpen} onOpenChange={open=>{if(!busy)setDeleteOpen(open);}}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Delete this comment?</DialogTitle><DialogDescription>This cannot be undone. Rating scores and replies will remain.</DialogDescription></DialogHeader>
        <p><span>Comment author</span>: {comment.userName}</p>
        <blockquote className="max-h-48 overflow-auto whitespace-pre-wrap break-words">{comment.body}</blockquote>
        {error && <p role="alert">{error}</p>}
        <DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setDeleteOpen(false)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={()=>void run(()=>deleteJournalCommentText(comment.id),'Comment deleted.')}>{busy ? 'Deleting...' : 'Delete comment'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
