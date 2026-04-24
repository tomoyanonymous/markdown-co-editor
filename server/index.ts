import express from 'express';
import cors from 'cors';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import type { Comment, CommentDatabase, RenderRequest, RenderResponse, UserInfo } from '../types/shared.js';
import { cloudflareAccessAuth, requireAuth, initializeCloudflareAuth } from './auth.js';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate and set git pull interval (default 5 minutes, min 30 seconds, max 24 hours)
const rawInterval = parseInt(process.env.GIT_PULL_INTERVAL || '300000', 10);
const GIT_PULL_INTERVAL = Math.max(30000, Math.min(86400000, rawInterval)); // Clamp between 30s and 24h

// Middleware
app.use(cors());
app.use(express.json());

// Apply Cloudflare Access authentication to all routes
app.use(cloudflareAccessAuth);

// Serve static files in production
if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist/client');
  app.use(express.static(distPath));
}

// Paths
const FALLBACK_DATA_DIR = path.join(process.cwd(), 'data');
const CONTENT_SUBMODULE_DIR = path.join(process.cwd(), 'content');
const GIT_REPO_URL = process.env.GIT_REPO_URL;
const CONTENT_DIR = GIT_REPO_URL ? CONTENT_SUBMODULE_DIR : FALLBACK_DATA_DIR;
const COMMENTS_FILE = path.join(CONTENT_DIR, 'comments.json');
const DEFAULT_FALLBACK_FILE = 'sample.md';

// Git sync lock to prevent concurrent sync operations
let isSyncInProgress = false;

// Store interval ID for cleanup
let gitPullIntervalId: NodeJS.Timeout | null = null;

function normalizeRelativePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function resolveContentPath(relativePath: string): string {
  const sanitizedPath = relativePath.replace(/^[/\\]+/, '');
  const resolvedPath = path.resolve(CONTENT_DIR, sanitizedPath);
  const relativeToContent = path.relative(CONTENT_DIR, resolvedPath);

  if (relativeToContent.startsWith('..') || path.isAbsolute(relativeToContent)) {
    throw new Error('Invalid content path');
  }

  return resolvedPath;
}

async function listMarkdownFiles(rootDir: string, relativeDir = ''): Promise<string[]> {
  const entries = await fs.readdir(path.join(rootDir, relativeDir), { withFileTypes: true });
  const markdownFiles: string[] = [];

  for (const entry of entries) {
    if (entry.name === '.git') {
      continue;
    }

    const nextRelativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      markdownFiles.push(...await listMarkdownFiles(rootDir, nextRelativePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      markdownFiles.push(normalizeRelativePath(nextRelativePath));
    }
  }

  return markdownFiles;
}

function sortMarkdownFiles(files: string[]): string[] {
  return [...files].sort((left, right) => {
    if (!GIT_REPO_URL) {
      if (left === DEFAULT_FALLBACK_FILE) {
        return -1;
      }

      if (right === DEFAULT_FALLBACK_FILE) {
        return 1;
      }
    }

    return left.localeCompare(right);
  });
}

// Initialize data directory and comments file
async function initializeDataFiles() {
  try {
    await fs.mkdir(CONTENT_DIR, { recursive: true });
    
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

// Get current user info
app.get('/api/user', requireAuth, (req, res) => {
  const userInfo: UserInfo = {
    email: req.user!.email,
    name: req.user!.name,
    id: req.user!.id,
  };
  res.json(userInfo);
});

// Get all comments
app.get('/api/comments', async (_req, res) => {
  try {
    const db = await readComments();
    const markdownFile = typeof _req.query.markdownFile === 'string'
      ? _req.query.markdownFile
      : undefined;

    if (markdownFile) {
      res.json(db.comments.filter(comment => comment.markdownFile === markdownFile));
      return;
    }

    res.json(db.comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read comments' });
  }
});

// Add a new comment
app.post('/api/comments', requireAuth, async (req, res) => {
  try {
    const comment: Comment = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      ...req.body,
      author: req.body.author || req.user!.name || req.user!.email,
      authorEmail: req.user!.email,
      authorId: req.user!.id,
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

// Update a comment (e.g., resolve/unresolve, edit text)
app.put('/api/comments/:id', requireAuth, async (req, res) => {
  try {
    const db = await readComments();
    const index = db.comments.findIndex(c => c.id === req.params.id);
    
    if (index === -1) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    
    const updatedComment = { ...db.comments[index], ...req.body };
    
    // If resolving, add resolver info
    if (req.body.resolved === true && !db.comments[index].resolved) {
      updatedComment.resolvedBy = req.user!.email;
      updatedComment.resolvedAt = Date.now();
    } else if (req.body.resolved === false) {
      // If unresolving, clear resolver info
      delete updatedComment.resolvedBy;
      delete updatedComment.resolvedAt;
    }
    
    // If editing text, add edit info
    if (req.body.text !== undefined && req.body.text !== db.comments[index].text) {
      updatedComment.editedBy = req.user!.email;
      updatedComment.editedAt = Date.now();
    }
    
    db.comments[index] = updatedComment;
    await writeComments(db);
    
    res.json(db.comments[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment
app.delete('/api/comments/:id', requireAuth, async (req, res) => {
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
    
    const mdPath = resolveContentPath(markdownFile);
    
    // Check if file exists
    try {
      await fs.access(mdPath);
    } catch {
      res.status(404).json({ error: 'Markdown file not found' });
      return;
    }
    
    // Build pandoc command arguments
    const pandocArgs = [mdPath, '-f', 'markdown', '-t', 'html'];
    
    if (bibFile) {
      const bibPath = resolveContentPath(bibFile);
      try {
        await fs.access(bibPath);
        pandocArgs.push('--citeproc', '--bibliography=' + bibPath);
      } catch {
        console.warn('Bibliography file not found, rendering without citations');
      }
    }
    
    const { stdout, stderr } = await execFileAsync('pandoc', pandocArgs);
    
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
app.get('/api/markdown', async (req, res) => {
  try {
    const filename = typeof req.query.filename === 'string' ? req.query.filename : '';

    if (!filename) {
      res.status(400).json({ error: 'filename is required' });
      return;
    }

    const mdPath = resolveContentPath(filename);
    const content = await fs.readFile(mdPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(404).json({ error: 'Markdown file not found' });
  }
});

// List available markdown files
app.get('/api/files', async (_req, res) => {
  try {
    const mdFiles = await listMarkdownFiles(CONTENT_DIR);
    res.json(sortMarkdownFiles(mdFiles));
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Git sync endpoint
app.post('/api/sync', requireAuth, async (req, res) => {
  // Check git configuration before acquiring lock
  const gitUsername = process.env.GIT_USERNAME;
  const gitAccessToken = process.env.GIT_ACCESS_TOKEN;
  
  if (!GIT_REPO_URL || !gitUsername || !gitAccessToken) {
    res.status(400).json({ 
      error: 'Git sync not configured. Please set GIT_REPO_URL, GIT_USERNAME, and GIT_ACCESS_TOKEN environment variables.' 
    });
    return;
  }
  
  // Check if a sync is already in progress
  if (isSyncInProgress) {
    res.status(409).json({ 
      error: 'A sync operation is already in progress. Please wait for it to complete.' 
    });
    return;
  }
  
  // Set the lock
  isSyncInProgress = true;
  
  try {
    
    // Configure git user if not already configured
    try {
      await execAsync('git config user.email', { cwd: CONTENT_DIR });
    } catch {
      await execAsync('git config user.email "markdown-co-editor@automated"', { cwd: CONTENT_DIR });
      await execAsync('git config user.name "Markdown Co-Editor"', { cwd: CONTENT_DIR });
    }
    
    // Check if git repo is initialized
    let needsRemote = false;
    try {
      await execAsync('git rev-parse --git-dir', { cwd: CONTENT_DIR });
      // Check if remote exists
      try {
        await execAsync('git remote get-url origin', { cwd: CONTENT_DIR });
      } catch {
        needsRemote = true;
      }
    } catch {
      // Initialize git repo if not exists
      await execAsync('git init', { cwd: CONTENT_DIR });
      needsRemote = true;
    }
    
    // Add remote if needed (without credentials in URL)
    if (needsRemote) {
      await execAsync(`git remote add origin ${GIT_REPO_URL}`, { cwd: CONTENT_DIR });
    }
    
    // Stage changes
    await execAsync('git add comments.json', { cwd: CONTENT_DIR });
    
    // Check if there are changes to commit
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: CONTENT_DIR });
    
    if (!statusOutput.trim()) {
      res.json({ 
        success: true, 
        message: 'No changes to sync',
        synced: false
      });
      return;
    }
    
    // Create a safe commit message (escape special characters)
    const userEmail = req.user!.email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[^0-9T:-]/g, '_');
    const commitMessage = `Update comments by ${userEmail} at ${timestamp}`;
    
    // Commit changes with properly escaped message
    await execAsync('git commit -m ' + JSON.stringify(commitMessage), { cwd: CONTENT_DIR });
    
    // Detect the current branch name
    const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: CONTENT_DIR });
    const currentBranch = branchOutput.trim() || 'main';
    
    // Use environment variables for git credentials (more secure than files)
    // Git will use these when GIT_ASKPASS is set to echo
    const gitEnv = {
      ...process.env,
      GIT_USERNAME: gitUsername,
      GIT_PASSWORD: gitAccessToken,
      GIT_ASKPASS: 'echo',
    };
    
    // Construct authenticated URL for push
    const urlParts = GIT_REPO_URL.replace('https://', '').split('/');
    const authenticatedUrl = `https://${gitUsername}:${gitAccessToken}@${urlParts.join('/')}`;
    
    // Push changes using the authenticated URL directly in command
    // Note: This is still visible in process list, but is necessary for non-interactive push
    await execAsync(`git push ${authenticatedUrl} HEAD:${currentBranch}`, { 
      cwd: CONTENT_DIR,
      env: gitEnv 
    });
    
    res.json({ 
      success: true, 
      message: 'Changes synced successfully',
      synced: true
    });
  } catch (error) {
    console.error('Git sync error:', error);
    res.status(500).json({ 
      error: 'Failed to sync with git repository',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Always release the lock when done
    isSyncInProgress = false;
  }
});

// Periodic git pull function
async function performGitPull(): Promise<void> {
  const gitUsername = process.env.GIT_USERNAME;
  const gitAccessToken = process.env.GIT_ACCESS_TOKEN;
  
  // Skip if git is not configured
  if (!GIT_REPO_URL || !gitUsername || !gitAccessToken) {
    return;
  }
  
  // Skip if sync is in progress
  if (isSyncInProgress) {
    console.log('Skipping git pull: sync operation in progress');
    return;
  }
  
  try {
    // Check if git repo is initialized
    try {
      await execAsync('git rev-parse --git-dir', { cwd: CONTENT_DIR });
    } catch {
      // Git repo not initialized, skip pull
      return;
    }
    
    console.log('Performing automatic git pull...');
    
    // Construct authenticated URL for pull
    const urlParts = GIT_REPO_URL.replace('https://', '').split('/');
    const authenticatedUrl = `https://${gitUsername}:${gitAccessToken}@${urlParts.join('/')}`;
    
    // Detect the current branch name
    const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: CONTENT_DIR });
    const currentBranch = branchOutput.trim() || 'main';
    
    // Pull changes from remote
    const { stdout, stderr } = await execAsync(`git pull ${authenticatedUrl} ${currentBranch}`, { cwd: CONTENT_DIR });
    
    if (stdout.includes('Already up to date') || stdout.includes('Already up-to-date')) {
      console.log('Git pull: Already up to date');
    } else {
      console.log('Git pull completed:', stdout.trim());
      
      // Note: Comments are automatically reloaded from file on next API request
      // No need to reload into memory here as the application reads from file each time
    }
    
    if (stderr && !stderr.includes('From https://')) {
      console.warn('Git pull stderr:', stderr);
    }
  } catch (error) {
    console.error('Git pull error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Start server
async function startServer() {
  // Initialize Cloudflare Access JWT verification
  try {
    initializeCloudflareAuth();
  } catch (error) {
    console.error('Failed to initialize Cloudflare Access authentication:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
  
  await initializeDataFiles();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Content directory: ${CONTENT_DIR}`);
    
    // Log git pull interval if configured
    if (GIT_REPO_URL && process.env.GIT_USERNAME && process.env.GIT_ACCESS_TOKEN) {
      console.log(`Git auto-pull enabled: every ${GIT_PULL_INTERVAL / 1000} seconds`);
    } else {
      console.log(`Fallback sample content enabled from ${FALLBACK_DATA_DIR}`);
    }
  });
  
  // Watch for file changes
  const watcher = chokidar.watch(CONTENT_DIR, {
    persistent: true,
    ignoreInitial: true,
  });
  
  watcher.on('change', (path) => {
    console.log(`File changed: ${path}`);
  });
  
  // Start periodic git pull if configured
  if (GIT_REPO_URL && process.env.GIT_USERNAME && process.env.GIT_ACCESS_TOKEN) {
    // Initial pull on startup (await to prevent race condition with interval)
    await performGitPull().catch(err => console.error('Initial git pull failed:', err));
    
    // Set up periodic pull and store interval ID for cleanup
    gitPullIntervalId = setInterval(() => {
      performGitPull().catch(err => console.error('Periodic git pull failed:', err));
    }, GIT_PULL_INTERVAL);
  }
}

// Serve index.html for all non-API routes in production (SPA fallback)
if (NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
  });
}

startServer();

// Cleanup function for graceful shutdown
function cleanup() {
  console.log('Cleaning up resources...');
  if (gitPullIntervalId) {
    clearInterval(gitPullIntervalId);
    console.log('Stopped git pull interval');
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  cleanup();
  process.exit(0);
});
