import { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import CommentPanel from './components/CommentPanel';
import type { Comment } from '../types/shared';
import './App.css';

function App() {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentFile, setCurrentFile] = useState<string>('sample.md');
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<{
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null>(null);

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

  const handleAddComment = async (text: string, author: string) => {
    if (!selectedRange) return;

    const newComment = {
      markdownFile: currentFile,
      ...selectedRange,
      text,
      author,
      resolved: false,
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

      await fetch(`/api/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...comment, resolved: true }),
      });

      setComments(comments.map(c => 
        c.id === id ? { ...c, resolved: true } : c
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
          <Preview html={htmlContent} />
        </div>
        
        <div className="comment-pane">
          <CommentPanel
            comments={comments}
            selectedRange={selectedRange}
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
