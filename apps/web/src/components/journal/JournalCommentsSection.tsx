import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CommentThreadItem } from '@/components/journal/CommentThreadItem';
import { StarRating } from '@/components/journal/StarRating';
import {
  averageRating,
  countTopLevelComments,
  formatLikeNames,
  getInitials,
  groupThreadComments,
  validateJournalThreadComment,
} from '@/lib/journalComments';
import { Heart, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalCommentsSectionProps {
  clubId: string;
  activityId: string;
}

export function JournalCommentsSection({ clubId, activityId }: JournalCommentsSectionProps) {
  const {
    currentUser,
    isAuthenticated,
    getJournalThreadComments,
    postJournalThreadComment,
    deleteJournalThreadComment,
    getJournalLikes,
    toggleJournalLike,
  } = useApp();

  const allComments = getJournalThreadComments(clubId, activityId);
  const likes = getJournalLikes(clubId, activityId);
  const hasLiked = currentUser ? likes.some((like) => like.userId === currentUser.id) : false;

  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState('');

  const grouped = useMemo(() => groupThreadComments(allComments), [allComments]);
  const topLevelComments = grouped.get(null) ?? [];
  const topLevelCount = countTopLevelComments(allComments);
  const avgRating = averageRating(
    allComments.filter((comment) => comment.parentId === null && comment.rating).map((c) => c.rating!)
  );

  const getChildren = (parentId: string) => grouped.get(parentId) ?? [];

  const requireAuth = () => setLoginPromptOpen(true);

  const handleLike = async () => {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    await toggleJournalLike(clubId, activityId);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    setCommentError('');
    const validationError = validateJournalThreadComment(
      { body: commentBody, rating },
      false
    );
    if (validationError) {
      setCommentError(validationError);
      return;
    }

    const ok = await postJournalThreadComment(clubId, activityId, {
      body: commentBody.trim(),
      rating,
    });

    if (ok) {
      setCommentBody('');
      setRating(0);
    } else {
      setCommentError('Failed to post your comment. Please try again.');
    }
  };

  const handleReply = async (parentId: string, body: string): Promise<string | null> => {
    const validationError = validateJournalThreadComment({ body, parentId }, true);
    if (validationError) return validationError;

    const ok = await postJournalThreadComment(clubId, activityId, {
      body: body.trim(),
      parentId,
    });

    return ok ? null : 'Failed to post your reply. Please try again.';
  };

  const handleDelete = async (commentId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      requireAuth();
      return false;
    }
    return await deleteJournalThreadComment(commentId);
  };

  return (
    <div className="pt-6 mt-12 border-t border-border space-y-8">
      {/* Likes section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            <h3 className="text-lg font-semibold">
              Likes
              {likes.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({likes.length})
                </span>
              )}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleLike}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-muted',
              hasLiked && 'text-red-500 border-red-500/30 bg-red-500/5'
            )}
          >
            <Heart className={cn('h-4 w-4', hasLiked && 'fill-current')} />
            {hasLiked ? 'Liked' : 'Like'}
          </button>
        </div>

        {likes.length > 0 ? (
          <div className="rounded-md bg-muted/40 px-4 py-3 text-sm text-foreground/90 flex items-start gap-2">
            <Heart className="h-4 w-4 mt-0.5 shrink-0 fill-red-500 text-red-500" />
            <p>{formatLikeNames(likes)}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No likes yet. Be the first to like this event!</p>
        )}
      </section>

      {/* Comments section */}
      <section className="space-y-6 pt-6 border-t border-border">
        <div className="flex flex-wrap items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            Comments
            {topLevelCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({topLevelCount})
              </span>
            )}
          </h3>
          {avgRating !== null && (
            <span className="text-sm text-muted-foreground">· {avgRating} avg rating</span>
          )}
        </div>

        {isAuthenticated ? (
        <form onSubmit={handlePostComment} className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(currentUser!.name)}
          </div>
          <div className="flex-1 space-y-3">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              maxLength={500}
              className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-y"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Rate this event</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            {commentError && <p className="text-sm text-destructive">{commentError}</p>}
            <Button type="submit" size="sm">
              Comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>{' '}
          to add a comment.
        </div>
      )}

      {topLevelComments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No comments yet. Start the conversation!
        </p>
      ) : (
        <div className="space-y-6">
          {topLevelComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-border/70 bg-background/50 px-4 py-3"
            >
              <CommentThreadItem
                comment={comment}
                allComments={allComments}
                getChildren={getChildren}
                depth={0}
                currentUserId={currentUser?.id}
                onReply={handleReply}
                onDelete={handleDelete}
                onRequireAuth={requireAuth}
                isAuthenticated={isAuthenticated}
              />
            </div>
          ))}
        </div>
      )}

      </section>

      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log in required</DialogTitle>
            <DialogDescription>
              Please log in to like, comment, or reply on this event.
            </DialogDescription>
          </DialogHeader>
          <Button asChild className="w-full">
            <Link to="/login">Go to Login</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
