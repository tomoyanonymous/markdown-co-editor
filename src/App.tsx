import { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import CommentPanel from './components/CommentPanel';
import type { Comment, UserInfo } from '../types/shared';
import './App.css';

function App() {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentFile, setCurrentFile] = useState<string>('sample.md');
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<{
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null>(null);

  // Load current user info
  useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(user => {
        setCurrentUser(user);
        setDisplayName(user.name || user.email);
      })
      .catch(err => console.error('Failed to load user info:', err));
  }, []);

  // Load available files
  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(files => {
        setAvailableFiles(files);
        if (files.length > 0 && !currentFile) {
          setCurrentFile(files[0]);
        }
      })
      .catch(err => console.error('Failed to load files:', err));
  }, []);

  // Load markdown content
  useEffect(() => {
    if (!currentFile) return;

    fetch(`/api/markdown/${currentFile}`)
      .then(res => res.json())
      .then(data => setMarkdownContent(data.content))
      .catch(err => console.error('Failed to load markdown:', err));
  }, [currentFile]);

  // Render markdown to HTML
  useEffect(() => {
    if (!currentFile) return;

    setIsRendering(true);
    fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        markdownFile: currentFile,
        bibFile: 'references.bib' 
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setHtmlContent(`<p style="color: red;">Error: ${data.error}</p>`);
        } else {
          setHtmlContent(data.html);
        }
      })
      .catch(err => {
        console.error('Failed to render markdown:', err);
        setHtmlContent('<p style="color: red;">Failed to render markdown</p>');
      })
      .finally(() => {
        setIsRendering(false);
      });
  }, [currentFile, markdownContent]);

  // Load comments
  useEffect(() => {
    if (!currentFile) return;

    fetch(`/api/comments/${currentFile}`)
      .then(res => res.json())
      .then(data => setComments(data))
      .catch(err => console.error('Failed to load comments:', err));
  }, [currentFile]);

  const handleAddComment = async (text: string) => {
    if (!selectedRange) return;

    // Validate and sanitize display name
    const authorName = displayName.trim() || currentUser?.name || currentUser?.email || 'Anonymous';

    const newComment = {
      markdownFile: currentFile,
      ...selectedRange,
      text,
      resolved: false,
      author: authorName,
    };

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment),
      });
      
      const savedComment = await res.json();
      setComments([...comments, savedComment]);
      setSelectedRange(null);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleResolveComment = async (id: string) => {
    try {
      const comment = comments.find(c => c.id === id);
      if (!comment) return;

      const response = await fetch(`/api/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...comment, resolved: !comment.resolved }),
      });

      const updatedComment = await response.json();
      setComments(comments.map(c => 
        c.id === id ? updatedComment : c
      ));
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
      });

      setComments(comments.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Markdown Co-Editor</h1>
        <div className="header-right">
          {currentUser && (
            <div className="user-info">
              <span className="user-icon">👤</span>
              <input
                type="text"
                className="user-name-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
              />
            </div>
          )}
          <div className="file-selector">
            <label htmlFor="file-select">File: </label>
            <select 
              id="file-select"
              value={currentFile} 
              onChange={(e) => setCurrentFile(e.target.value)}
            >
              {availableFiles.map(file => (
                <option key={file} value={file}>{file}</option>
              ))}
            </select>
          </div>
        </div>
      </header>
      
      <div className="app-content">
        <div className="editor-pane">
          <Editor
            content={markdownContent}
            onSelectionChange={setSelectedRange}
            comments={comments}
          />
        </div>
        
        <div className="preview-pane">
          <Preview html={htmlContent} isRendering={isRendering} />
        </div>
        
        <div className="comment-pane">
          <CommentPanel
            comments={comments}
            selectedRange={selectedRange}
            currentUser={currentUser}
            displayName={displayName}
            onAddComment={handleAddComment}
            onResolveComment={handleResolveComment}
            onDeleteComment={handleDeleteComment}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
