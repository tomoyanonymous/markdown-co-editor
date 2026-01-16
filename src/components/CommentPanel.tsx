import { useState } from 'react';
import type { Comment, UserInfo } from '../../types/shared';
import './CommentPanel.css';

interface CommentPanelProps {
  comments: Comment[];
  selectedRange: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null;
  currentUser: UserInfo | null;
  displayName: string;
  onAddComment: (text: string, inReplyTo?: string) => void;
  onEditComment: (id: string, text: string) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
}

function CommentPanel({
  comments,
  selectedRange,
  currentUser,
  displayName,
  onAddComment,
  onEditComment,
  onResolveComment,
  onDeleteComment,
}: CommentPanelProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    
    onAddComment(newCommentText);
    setNewCommentText('');
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) return;
    onEditComment(id, editingText);
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleReply = (commentId: string) => {
    setReplyingToId(commentId);
    setReplyText('');
  };

  const handleSubmitReply = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    
    onAddComment(replyText, parentId);
    setReplyingToId(null);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyText('');
  };

  // Get root comments (comments that are not replies to other comments)
  const getRootComments = (comments: Comment[]): Comment[] => {
    return comments.filter(c => !c.inReplyTo);
  };

  const getRepliesToComment = (commentId: string): Comment[] => {
    return comments.filter(c => c.inReplyTo === commentId);
  };

  const displayedComments = showResolved 
    ? getRootComments(comments)
    : getRootComments(comments.filter(c => !c.resolved));

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRange = (comment: Comment) => {
    if (comment.startLine === comment.endLine) {
      return `Line ${comment.startLine}`;
    }
    return `Lines ${comment.startLine}-${comment.endLine}`;
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const replies = getRepliesToComment(comment.id);
    
    return (
      <div key={comment.id} className={`comment-thread ${isReply ? 'comment-reply' : ''}`}>
        <div 
          className={`comment-item ${comment.resolved ? 'resolved' : ''}`}
        >
          <div className="comment-header">
            <div className="comment-author-info">
              <strong className="comment-author">{comment.author}</strong>
              {comment.authorEmail && (
                <span className="comment-author-email">({comment.authorEmail})</span>
              )}
            </div>
            {!isReply && <span className="comment-range">{formatRange(comment)}</span>}
          </div>
          
          {editingCommentId === comment.id ? (
            <div className="comment-edit-form">
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                rows={4}
                className="comment-textarea"
              />
              <div className="edit-actions">
                <button onClick={() => handleSaveEdit(comment.id)} className="save-button">
                  Save
                </button>
                <button onClick={handleCancelEdit} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="comment-text">{comment.text}</p>
              {comment.editedAt && comment.editedBy && (
                <p className="edited-info">
                  Edited by {comment.editedBy} on {formatDate(comment.editedAt)}
                </p>
              )}
            </>
          )}
          
          {comment.resolved && comment.resolvedBy && (
            <p className="resolved-info">
              ✓ Resolved by {comment.resolvedBy}
              {comment.resolvedAt && ` on ${formatDate(comment.resolvedAt)}`}
            </p>
          )}
          
          <div className="comment-footer">
            <span className="comment-date">{formatDate(comment.timestamp)}</span>
            <div className="comment-actions">
              {editingCommentId !== comment.id && (
                <>
                  <button
                    onClick={() => handleEdit(comment)}
                    className="edit-button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleReply(comment.id)}
                    className="reply-button"
                  >
                    Reply
                  </button>
                  {!comment.resolved ? (
                    <button
                      onClick={() => onResolveComment(comment.id)}
                      className="resolve-button"
                    >
                      Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => onResolveComment(comment.id)}
                      className="unresolve-button"
                    >
                      Unresolve
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {replyingToId === comment.id && (
          <div className="reply-form">
            <form onSubmit={(e) => handleSubmitReply(e, comment.id)}>
              <textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="comment-textarea"
                autoFocus
              />
              <div className="reply-actions">
                <button type="submit" className="submit-button">
                  Reply
                </button>
                <button type="button" onClick={handleCancelReply} className="cancel-button">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {replies.length > 0 && (
          <div className="comment-replies">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="comment-panel">
      <div className="comment-panel-header">
        <h2>Comments</h2>
        <label className="show-resolved-toggle">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </div>

      {selectedRange && currentUser && (
        <div className="comment-form">
          <h3>Add Comment</h3>
          <p className="selected-range">
            Selected: Line {selectedRange.startLine}
            {selectedRange.startLine !== selectedRange.endLine && 
              ` - ${selectedRange.endLine}`}
          </p>
          <p className="comment-as">
            Commenting as: <strong>{displayName}</strong>
          </p>
          <form onSubmit={handleSubmit}>
            <textarea
              placeholder="Add your comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              rows={4}
              className="comment-textarea"
            />
            <button type="submit" className="submit-button">
              Add Comment
            </button>
          </form>
        </div>
      )}

      <div className="comment-list">
        {displayedComments.length === 0 ? (
          <p className="no-comments">
            {showResolved 
              ? 'No comments yet. Select text in the editor to add a comment.'
              : 'No unresolved comments. Check "Show resolved" to see all comments.'}
          </p>
        ) : (
          displayedComments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
}

export default CommentPanel;
