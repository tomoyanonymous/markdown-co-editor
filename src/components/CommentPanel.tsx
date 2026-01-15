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
  onAddComment: (text: string) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
}

function CommentPanel({
  comments,
  selectedRange,
  currentUser,
  displayName,
  onAddComment,
  onResolveComment,
  onDeleteComment,
}: CommentPanelProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    
    onAddComment(newCommentText);
    setNewCommentText('');
  };

  const displayedComments = showResolved 
    ? comments 
    : comments.filter(c => !c.resolved);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRange = (comment: Comment) => {
    if (comment.startLine === comment.endLine) {
      return `Line ${comment.startLine}`;
    }
    return `Lines ${comment.startLine}-${comment.endLine}`;
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
          displayedComments.map((comment) => (
            <div 
              key={comment.id} 
              className={`comment-item ${comment.resolved ? 'resolved' : ''}`}
            >
              <div className="comment-header">
                <div className="comment-author-info">
                  <strong className="comment-author">{comment.author}</strong>
                  {comment.authorEmail && (
                    <span className="comment-author-email">({comment.authorEmail})</span>
                  )}
                </div>
                <span className="comment-range">{formatRange(comment)}</span>
              </div>
              <p className="comment-text">{comment.text}</p>
              {comment.resolved && comment.resolvedBy && (
                <p className="resolved-info">
                  ✓ Resolved by {comment.resolvedBy}
                  {comment.resolvedAt && ` on ${formatDate(comment.resolvedAt)}`}
                </p>
              )}
              <div className="comment-footer">
                <span className="comment-date">{formatDate(comment.timestamp)}</span>
                <div className="comment-actions">
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
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CommentPanel;
