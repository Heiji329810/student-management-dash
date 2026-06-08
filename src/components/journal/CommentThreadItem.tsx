import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarRating } from '@/components/journal/StarRating';
import { formatCommentTime, getInitials } from '@/lib/journalComments';
import type { JournalThreadComment } from '@/types';

interface CommentThreadItemProps {
  comment: JournalThreadComment;
  allComments: JournalThreadComment[];
  getChildren: (parentId: string) => JournalThreadComment[];
  depth: number;
  currentUserId?: string;
  onReply: (parentId: string, body: string) => string | null;
  onDelete: (commentId: string) => boolean;
  onRequireAuth: () => void;
  isAuthenticated: boolean;
}

export function CommentThreadItem({
  comment,
  allComments,
  getChildren,
  depth,
  currentUserId,
  onReply,
  onDelete,
  onRequireAuth,
  isAuthenticated,
}: CommentThreadItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyError, setReplyError] = useState('');
  const replies = getChildren(comment.id);

  const parentComment = comment.parentId
    ? allComments.find((entry) => entry.id === comment.parentId)
    : undefined;

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReplyError('');
    const error = onReply(comment.id, replyBody);
    if (error) {
      setReplyError(error);
      return;
    }
    setReplyBody('');
    setReplyOpen(false);
  };

  const openReply = () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setReplyError('');
    setReplyOpen((open) => !open);
  };

  const handleDeleteClick = () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    onDelete(comment.id);
    setDeleteOpen(false);
  };

  const isOwner = currentUserId === comment.userId;

  return (
    <div className={depth > 0 ? 'mt-3' : undefined}>
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {getInitials(comment.userName)}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold">{comment.userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatCommentTime(comment.createdAt)}
            </span>
            {currentUserId === comment.userId && (
              <span className="text-xs text-muted-foreground">(You)</span>
            )}
          </div>

          {parentComment && depth > 0 && (
            <p className="text-xs text-muted-foreground">
              Replying to <span className="font-medium text-primary">@{parentComment.userName}</span>
            </p>
          )}

          <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
            {comment.body}
          </p>

          {comment.rating && comment.rating > 0 && (
            <StarRating value={comment.rating} readonly size="sm" />
          )}

          <div className="flex items-center gap-3 pt-0.5">
            <button
              type="button"
              onClick={openReply}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Reply
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
              >
                Delete
              </button>
            )}
          </div>

          {replyOpen && (
            <form onSubmit={handleReplySubmit} className="mt-2 space-y-2">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={`Reply to ${comment.userName}...`}
                rows={2}
                maxLength={500}
                autoFocus
                className="border-border w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-y"
              />
              {replyError && <p className="text-xs text-destructive">{replyError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Reply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyBody('');
                    setReplyError('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {replies.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-border/60 pl-4">
              {replies.map((reply) => (
                <CommentThreadItem
                  key={reply.id}
                  comment={reply}
                  allComments={allComments}
                  getChildren={getChildren}
                  depth={depth + 1}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onDelete={onDelete}
                  onRequireAuth={onRequireAuth}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>
              This will permanently remove your comment. Any replies under it will be removed too.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
