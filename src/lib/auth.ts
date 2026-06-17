import { type NextRequest } from 'next/server';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  agentStaffId: string;
  name: string;
  storeName: string;
}

export interface SessionData {
  token: string;
  user: UserProfile;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COOKIE_NAME = process.env.COOKIE_NAME || 'anteraja_session';

// ─── Token encryption (simple Base64 for dev; swap for AES in prod) ─────────

/**
 * Encrypts a token string using Base64 encoding.
 * In production, replace this with proper AES-256-GCM encryption
 * using the COOKIE_SECRET as the key.
 */
export function encryptToken(token: string): string {
  return Buffer.from(token, 'utf-8').toString('base64');
}

/**
 * Decrypts a Base64-encoded token string.
 * Must be the inverse of encryptToken.
 */
export function decryptToken(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

// ─── Session cookie helpers ─────────────────────────────────────────────────

/**
 * Serialises token + user profile into an encrypted cookie value.
 */
export function setSessionCookie(
  token: string,
  userProfile: UserProfile,
): string {
  const payload: SessionData = { token, user: userProfile };
  const json = JSON.stringify(payload);
  return encryptToken(json);
}

/**
 * Reads the session cookie from an incoming request and returns the
 * decrypted SessionData, or null when the cookie is missing / invalid.
 */
export function getSessionFromCookie(
  request: NextRequest,
): SessionData | null {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const json = decryptToken(cookie.value);
    const data: SessionData = JSON.parse(json);

    // Minimal shape validation
    if (!data.token || !data.user?.agentStaffId) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Builds a Set-Cookie header string with secure defaults.
 *
 * @param name    – cookie name
 * @param value   – cookie value (already encrypted)
 * @param maxAge  – lifetime in seconds (default: 8 hours)
 */
export function createSessionCookie(
  name: string,
  value: string,
  maxAge: number = 8 * 60 * 60,
): string {
  const isProduction = process.env.NODE_ENV === 'production';

  const parts = [
    `${name}=${value}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=${maxAge}`,
  ];

  if (isProduction) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * Builds a Set-Cookie header string that immediately expires the cookie,
 * effectively clearing it from the browser.
 */
export function clearSessionCookie(name: string): string {
  return [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
  ].join('; ');
}

/**
 * Returns the cookie name used for the session.
 * Useful when other modules need to reference it without
 * duplicating the env-var lookup.
 */
export function getCookieName(): string {
  return COOKIE_NAME;
}
