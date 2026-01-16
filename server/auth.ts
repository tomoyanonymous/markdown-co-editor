import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

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

// Singleton JWKS client instance for JWT verification
let jwksClientInstance: jwksClient.JwksClient | null = null;
let cloudflareConfig: { teamDomain: string; aud: string; certsUrl: string; issuerUrl: string } | null = null;

/**
 * Initialize Cloudflare Access JWT verification
 * Should be called once at application startup
 */
export function initializeCloudflareAuth(): void {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;
  
  // Only initialize if CF_ACCESS_ENABLED is true and we're in production
  if (process.env.CF_ACCESS_ENABLED !== 'true' || process.env.NODE_ENV !== 'production') {
    return;
  }
  
  if (!teamDomain || !aud) {
    throw new Error('CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD must be set when CF_ACCESS_ENABLED is true');
  }
  
  // Cloudflare Access uses JWKS (JSON Web Key Set) for token verification
  // The JWKS endpoint is at https://<team-domain>/cdn-cgi/access/certs
  const certsUrl = `https://${teamDomain}/cdn-cgi/access/certs`;
  
  // The issuer URL format for Cloudflare Access
  const issuerUrl = `https://${teamDomain}`;
  
  jwksClientInstance = jwksClient({
    jwksUri: certsUrl,
    cache: true,
    cacheMaxAge: 86400000, // 24 hours
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });
  
  cloudflareConfig = { teamDomain, aud, certsUrl, issuerUrl };
  
  console.log('Cloudflare Access JWT verification initialized');
}

/**
 * Verify Cloudflare Access JWT token
 * @param token - The JWT token from CF-Access-JWT-Assertion header
 */
async function verifyCloudflareAccessJWT(token: string): Promise<boolean> {
  if (!jwksClientInstance || !cloudflareConfig) {
    console.error('Cloudflare Access JWT verification not initialized');
    return false;
  }
  
  try {
    // Decode the token to get the kid (key id)
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      console.error('Invalid JWT token structure');
      return false;
    }
    
    // Get the signing key
    const key = await jwksClientInstance.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();
    
    // Verify the token
    const verified = jwt.verify(token, signingKey, {
      audience: cloudflareConfig.aud,
      issuer: cloudflareConfig.issuerUrl,
    });
    
    return !!verified;
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Middleware to authenticate requests using Cloudflare Access headers
 * When behind Cloudflare Access, user info is passed via CF-Access headers
 */
export async function cloudflareAccessAuth(req: Request, res: Response, next: NextFunction) {
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
  // Verify the JWT token using Cloudflare's public keys
  const isValid = await verifyCloudflareAccessJWT(cfAccessJWT);
  
  if (!isValid) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid Cloudflare Access JWT token' 
    });
  }
  
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
