import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarRating } from '@/components/journal/StarRating';
import { formatLikeNames, validateJournalComment } from '@/lib/journalComments';
import { Heart, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalCommentsSectionProps {
  clubId: string;
  activityId: string;
}

export function JournalCommentsSection({ clubId, activityId }: JournalCommentsSectionProps) {
  const {
    currentUser,
    getJournalComments,
    postJournalComment,
    getJournalLikes,
    toggleJournalLike,
  } = useApp();

  const comments = getJournalComments(clubId, activityId);
  const likes = getJournalLikes(clubId, activityId);
  const hasLiked = currentUser ? likes.some((like) => like.userId === currentUser.id) : false;
  const myComment = currentUser
    ? comments.find((entry) => entry.userId === currentUser.id)
    : undefined;

  const [commentOpen, setCommentOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (commentOpen && myComment) {
      setRating(myComment.rating);
      setComment(myComment.comment);
    }
  }, [commentOpen, myComment?.id, myComment?.rating, myComment?.comment]);

  const requireAuth = (action: () => void) => {
    if (!currentUser) {
      setLoginPromptOpen(true);
      return;
    }
    action();
  };

  const handleLike = () => {
    requireAuth(() => {
      toggleJournalLike(clubId, activityId);
    });
  };

  const handleOpenComment = () => {
    requireAuth(() => {
      setError('');
      if (myComment) {
        setRating(myComment.rating);
        setComment(myComment.comment);
      } else {
        setRating(0);
        setComment('');
      }
      setCommentOpen(true);
    });
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateJournalComment({ rating, comment });
    if (validationError) {
      setError(validationError);
      return;
    }

    const ok = postJournalComment(clubId, activityId, { rating, comment: comment.trim() });
    if (ok) {
      setCommentOpen(false);
    } else {
      setError('Failed to post your comment. Please try again.');
    }
  };

  const hasInteractions = likes.length > 0 || comments.length > 0;

  return (
    <section className="pt-6 mt-12 border-t border-border">
      <div className="flex justify-end mb-3">
        <div className="inline-flex items-stretch rounded-md border border-border bg-muted/40 text-sm overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={handleLike}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 transition-colors hover:bg-muted',
              hasLiked && 'text-red-500'
            )}
          >
            <Heart className={cn('h-4 w-4', hasLiked && 'fill-current')} />
            Like
          </button>
          <span className="w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            onClick={handleOpenComment}
            className="flex items-center gap-1.5 px-4 py-2 transition-colors hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" />
            Comment
          </button>
        </div>
      </div>

      {hasInteractions && (
        <div className="rounded-md bg-muted/40 px-3 py-2.5 text-sm space-y-2">
          {likes.length > 0 && (
            <div className="flex items-start gap-2 text-foreground/90">
              <Heart className="h-4 w-4 mt-0.5 shrink-0 fill-red-500 text-red-500" />
              <p>{formatLikeNames(likes)}</p>
            </div>
          )}

          {likes.length > 0 && comments.length > 0 && (
            <div className="border-t border-border/60" />
          )}

          {comments.length > 0 && (
            <div className="space-y-1.5">
              {comments.map((entry) => (
                <div key={entry.id} className="leading-relaxed space-y-1">
                  <p>
                    <span className="font-medium text-primary">{entry.userName}</span>
                    <span className="text-muted-foreground">: </span>
                    <span className="text-foreground/90">{entry.comment}</span>
                  </p>
                  {entry.rating > 0 && (
                    <div className="pl-0.5">
                      <StarRating value={entry.rating} readonly size="sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{myComment ? 'Edit Comment' : 'Write a Comment'}</DialogTitle>
            <DialogDescription>Rate this event and share your thoughts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className="space-y-2">
              <label htmlFor="journal-comment-input" className="text-sm font-medium">
                Comment
              </label>
              <textarea
                id="journal-comment-input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your comment..."
                rows={3}
                maxLength={500}
                autoFocus
                className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-y"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              {myComment ? 'Update' : 'Post'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log in required</DialogTitle>
            <DialogDescription>
              Please log in to like or comment on this event.
            </DialogDescription>
          </DialogHeader>
          <Button asChild className="w-full">
            <Link to="/login">Go to Login</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
