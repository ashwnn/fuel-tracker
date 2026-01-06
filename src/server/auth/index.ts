import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: number;
  email: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  apiKeyId?: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: { id: number; email: string }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Generate a new API key
 * Returns both the raw key (to show to user once) and the hash (to store)
 */
export function generateApiKey(): { key: string; hash: string } {
  const key = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, hash };
}

/**
 * Verify an API key
 */
export async function verifyApiKey(key: string): Promise<AuthenticatedUser | null> {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash: hash,
      isActive: true,
      revokedAt: null,
    },
    include: {
      user: true,
    },
  });

  if (!apiKey) {
    return null;
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: apiKey.user.id,
    email: apiKey.user.email,
    apiKeyId: apiKey.id,
  };
}

/**
 * Extract and verify authentication from request headers
 * Supports both JWT (Authorization: Bearer <token>) and API Key (x-api-key: <key>)
 */
export async function authenticate(headers: Headers): Promise<AuthenticatedUser | null> {
  // Try JWT first
  const authHeader = headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (user) {
        return {
          id: user.id,
          email: user.email,
        };
      }
    }
  }

  // Try API Key
  const apiKeyHeader = headers.get('x-api-key') || headers.get('authorization')?.replace('ApiKey ', '');
  if (apiKeyHeader) {
    return verifyApiKey(apiKeyHeader);
  }

  return null;
}

/**
 * Get user from cookie-based session (for Next.js server components)
 */
export async function getSessionUser(cookieHeader: string | null): Promise<AuthenticatedUser | null> {
  if (!cookieHeader) return null;

  // Extract token from cookies
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const authCookie = cookies.find(c => c.startsWith('auth-token='));
  if (!authCookie) return null;

  const token = authCookie.split('=')[1];
  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
  };
}
