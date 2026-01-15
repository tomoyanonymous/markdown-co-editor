import { Request, Response, NextFunction } from 'express';

export interface CloudflareAccessUser {
  email: string;
  name?: string;
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: CloudflareAccessUser;
    }
  }
}

/**
 * Middleware to authenticate requests using Cloudflare Access headers
 * When behind Cloudflare Access, user info is passed via CF-Access headers
 */
export function cloudflareAccessAuth(req: Request, res: Response, next: NextFunction) {
  // In development mode, allow bypass if CF_ACCESS_ENABLED is not set
  if (process.env.NODE_ENV !== 'production' && process.env.CF_ACCESS_ENABLED !== 'true') {
    // Use demo user in development
    req.user = {
      email: process.env.DEV_USER_EMAIL || 'dev@example.com',
      name: process.env.DEV_USER_NAME || 'Development User',
      id: 'dev-user-id',
    };
    return next();
  }

  // Extract Cloudflare Access headers
  const cfAccessAuthEmail = req.headers['cf-access-authenticated-user-email'] as string;
  const cfAccessJWT = req.headers['cf-access-jwt-assertion'] as string;
  const cfAccessUserName = req.headers['cf-access-authenticated-user-name'] as string;

  if (!cfAccessAuthEmail || !cfAccessJWT) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Cloudflare Access authentication required' 
    });
  }

  // In production with Cloudflare Access, validate the JWT
  // The JWT validation should be done against Cloudflare's public keys
  // For now, we trust the headers if they exist (Cloudflare Access validates them)
  // TODO: Implement proper JWT validation using jsonwebtoken and Cloudflare's public keys
  // Example: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
  
  // Extract user info from headers
  req.user = {
    email: cfAccessAuthEmail,
    name: cfAccessUserName || cfAccessAuthEmail.split('@')[0], // Use CF name header or email prefix
    id: cfAccessAuthEmail, // Use email as unique ID
  };

  next();
}

/**
 * Optional middleware for specific endpoint authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required' 
    });
  }
  next();
}
