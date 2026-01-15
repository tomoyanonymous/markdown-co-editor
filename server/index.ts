import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import type { Comment, CommentDatabase, RenderRequest, RenderResponse } from '../types/shared.js';

const execAsync = promisify(exec);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Paths
const DATA_DIR = path.join(process.cwd(), 'data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

// Initialize data directory and comments file
async function initializeDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    try {
      await fs.access(COMMENTS_FILE);
    } catch {
      const initialData: CommentDatabase = { comments: [] };
      await fs.writeFile(COMMENTS_FILE, JSON.stringify(initialData, null, 2));
      console.log('Created comments.json');
    }
  } catch (error) {
    console.error('Error initializing data files:', error);
  }
}

// Read comments from JSON file
async function readComments(): Promise<CommentDatabase> {
  try {
    const data = await fs.readFile(COMMENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading comments:', error);
    return { comments: [] };
  }
}

// Write comments to JSON file
async function writeComments(db: CommentDatabase): Promise<void> {
  try {
    await fs.writeFile(COMMENTS_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error writing comments:', error);
    throw error;
  }
}

// API Routes

// Get all comments
app.get('/api/comments', async (_req, res) => {
  try {
    const db = await readComments();
    res.json(db.comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read comments' });
  }
});

// Get comments for a specific file
app.get('/api/comments/:filename', async (req, res) => {
  try {
    const db = await readComments();
    const comments = db.comments.filter(
      c => c.markdownFile === req.params.filename
    );
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read comments' });
  }
});

// Add a new comment
app.post('/api/comments', async (req, res) => {
  try {
    const comment: Comment = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...req.body,
      timestamp: Date.now(),
    };
    
    const db = await readComments();
    db.comments.push(comment);
    await writeComments(db);
    
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Update a comment
app.put('/api/comments/:id', async (req, res) => {
  try {
    const db = await readComments();
    const index = db.comments.findIndex(c => c.id === req.params.id);
    
    if (index === -1) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    
    db.comments[index] = { ...db.comments[index], ...req.body };
    await writeComments(db);
    
    res.json(db.comments[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const db = await readComments();
    const filtered = db.comments.filter(c => c.id !== req.params.id);
    
    if (filtered.length === db.comments.length) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    
    db.comments = filtered;
    await writeComments(db);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Render markdown with pandoc
app.post('/api/render', async (req, res) => {
  try {
    const { markdownFile, bibFile }: RenderRequest = req.body;
    
    if (!markdownFile) {
      res.status(400).json({ error: 'markdownFile is required' });
      return;
    }
    
    const mdPath = path.join(DATA_DIR, markdownFile);
    
    // Check if file exists
    try {
      await fs.access(mdPath);
    } catch {
      res.status(404).json({ error: 'Markdown file not found' });
      return;
    }
    
    // Build pandoc command
    let pandocCmd = `pandoc "${mdPath}" -f markdown -t html`;
    
    if (bibFile) {
      const bibPath = path.join(DATA_DIR, bibFile);
      try {
        await fs.access(bibPath);
        pandocCmd += ` --citeproc --bibliography="${bibPath}"`;
      } catch {
        console.warn('Bibliography file not found, rendering without citations');
      }
    }
    
    const { stdout, stderr } = await execAsync(pandocCmd);
    
    if (stderr) {
      console.warn('Pandoc stderr:', stderr);
    }
    
    const response: RenderResponse = { html: stdout };
    res.json(response);
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).json({ 
      html: '',
      error: error instanceof Error ? error.message : 'Failed to render markdown'
    });
  }
});

// Get markdown file content
app.get('/api/markdown/:filename', async (req, res) => {
  try {
    const mdPath = path.join(DATA_DIR, req.params.filename);
    const content = await fs.readFile(mdPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(404).json({ error: 'Markdown file not found' });
  }
});

// List available markdown files
app.get('/api/files', async (_req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    res.json(mdFiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Start server
async function startServer() {
  await initializeDataFiles();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
  });
  
  // Watch for file changes
  const watcher = chokidar.watch(DATA_DIR, {
    persistent: true,
    ignoreInitial: true,
  });
  
  watcher.on('change', (path) => {
    console.log(`File changed: ${path}`);
  });
}

startServer();
