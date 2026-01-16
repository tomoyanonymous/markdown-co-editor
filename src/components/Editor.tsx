import { useRef, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import type { Comment } from '../../types/shared';
import './Editor.css';

interface EditorProps {
  content: string;
  onSelectionChange: (range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null) => void;
  comments: Comment[];
}

function Editor({ content, onSelectionChange, comments }: EditorProps) {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;

    // Listen to selection changes
    editor.onDidChangeCursorSelection((e: any) => {
      const selection = e.selection;
      
      if (selection.isEmpty()) {
        onSelectionChange(null);
      } else {
        onSelectionChange({
          startLine: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLine: selection.endLineNumber,
          endColumn: selection.endColumn,
        });
      }
    });

    // Add decorations for comments
    updateDecorations(editor, comments);
  }

  useEffect(() => {
    if (editorRef.current) {
      updateDecorations(editorRef.current, comments);
    }
  }, [comments]);

  function updateDecorations(editor: any, comments: Comment[]) {
    const decorations = comments
      .filter(c => !c.resolved && !c.inReplyTo)
      .map(comment => ({
        range: {
          startLineNumber: comment.startLine,
          startColumn: comment.startColumn,
          endLineNumber: comment.endLine,
          endColumn: comment.endColumn,
        },
        options: {
          className: 'comment-highlight',
          hoverMessage: { value: `**${comment.author}**: ${comment.text}` },
          minimap: {
            color: '#ffa50080',
            position: 2,
          },
        },
      }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }

  return (
    <div className="editor-container">
      <MonacoEditor
        height="100%"
        language="markdown"
        theme="vs-light"
        value={content}
        options={{
          readOnly: true,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}

export default Editor;
