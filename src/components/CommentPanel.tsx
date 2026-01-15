import { useState } from 'react';
import type { Comment } from '../../types/shared';
import './CommentPanel.css';

interface CommentPanelProps {
  comments: Comment[];
  selectedRange: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null;
  onAddComment: (text: string, author: string) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
}

function CommentPanel({
  comments,
  selectedRange,
  onAddComment,
  onResolveComment,
  onDeleteComment,
}: CommentPanelProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [author, setAuthor] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !author.trim()) return;
    
    onAddComment(newCommentText, author);
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

      {selectedRange && (
        <div className="comment-form">
          <h3>Add Comment</h3>
          <p className="selected-range">
            Selected: Line {selectedRange.startLine}
            {selectedRange.startLine !== selectedRange.endLine && 
              ` - ${selectedRange.endLine}`}
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Your name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="author-input"
            />
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
                <strong className="comment-author">{comment.author}</strong>
                <span className="comment-range">{formatRange(comment)}</span>
              </div>
              <p className="comment-text">{comment.text}</p>
              <div className="comment-footer">
                <span className="comment-date">{formatDate(comment.timestamp)}</span>
                <div className="comment-actions">
                  {!comment.resolved && (
                    <button
                      onClick={() => onResolveComment(comment.id)}
                      className="resolve-button"
                    >
                      Resolve
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
