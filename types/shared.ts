export interface Comment {
  id: string;
  markdownFile: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
  author: string;
  authorEmail?: string; // Email of the authenticated user
  authorId?: string;    // User ID from authentication
  timestamp: number;
  resolved: boolean;
  resolvedBy?: string;  // Email of user who resolved the comment
  resolvedAt?: number;  // Timestamp when resolved
  inReplyTo?: string;   // ID of parent comment for threading
  editedAt?: number;    // Timestamp when last edited
  editedBy?: string;    // Email of user who last edited
}

export interface CommentDatabase {
  comments: Comment[];
}

export interface RenderRequest {
  markdownFile: string;
  bibFile?: string;
}

export interface RenderResponse {
  html: string;
  error?: string;
}

export interface UserInfo {
  email: string;
  name?: string;
  id: string;
}
