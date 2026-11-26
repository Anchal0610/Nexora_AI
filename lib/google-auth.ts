import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { dbManager } from '@/lib/db';

export const OAUTH_STATE_COOKIE = 'nexora_oauth_state';
export const SESSION_COOKIE = 'nexora_auth_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AuthSessionPayload {
  email: string;
  name: string;
  picture?: string;
  exp: number;
}

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new Error('Server auth secret is not configured. Set GOOGLE_CLIENT_SECRET or AUTH_SECRET in .env.');
  }
  return secret;
}

export function getGoogleConfig(requestUrl?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  let redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!redirectUri && requestUrl) {
    const url = new URL(requestUrl);
    redirectUri = `${url.origin}`;
  }

  if (!clientId || !clientSecret || clientId === 'your_google_client_id_here') {
    throw new Error('Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.');
  }

  return {
    clientId,
    clientSecret,
    redirectUri: redirectUri || 'http://localhost:3000',
  };
}

export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function buildGoogleAuthUrl(state: string, requestUrl?: string): string {
  const { clientId, redirectUri } = getGoogleConfig(requestUrl);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForGoogleUser(code: string, requestUrl?: string): Promise<GoogleUserInfo> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig(requestUrl);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    const detail = tokenData.error_description || tokenData.error || 'Failed to exchange Google authorization code.';
    throw new Error(detail);
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const userInfo = await userRes.json();
  if (!userRes.ok || !userInfo.email) {
    throw new Error('Failed to fetch Google user profile.');
  }

  if (userInfo.email_verified === false) {
    throw new Error('Google account email is not verified.');
  }

  return {
    email: String(userInfo.email).trim().toLowerCase(),
    name: String(userInfo.name || userInfo.email.split('@')[0]).trim(),
    picture: typeof userInfo.picture === 'string' ? userInfo.picture : undefined,
  };
}

export function createSessionToken(user: { email: string; name: string; picture?: string }): string {
  const payload: AuthSessionPayload = {
    email: user.email,
    name: user.name,
    picture: user.picture,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token?: string | null): AuthSessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getAuthSecret())
      .update(encodedPayload)
      .digest('base64url');

    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthSessionPayload;
    if (!payload.email || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function attachSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function provisionGoogleUser(googleUser: GoogleUserInfo) {
  await dbManager.initDb();

  let user = await dbManager.getUser(googleUser.email);
  if (!user) {
    user = await dbManager.saveUser(
      googleUser.name || 'New User',
      googleUser.email,
      '',
      0.0
    );
  }

  const session = await dbManager.getPipelineSession(googleUser.email);

  return {
    user: {
      ...user,
      picture: googleUser.picture,
    },
    session,
  };
}
