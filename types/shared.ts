export interface Comment {
  id: string;
  markdownFile: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
  author: string;
  timestamp: number;
  resolved: boolean;
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
