import { NextResponse } from 'next/server';
import {
  buildGoogleAuthUrl,
  generateOAuthState,
  OAUTH_STATE_COOKIE,
} from '@/lib/google-auth';

export async function GET(request: Request) {
  try {
    const state = generateOAuthState();
    const authUrl = buildGoogleAuthUrl(state, request.url);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (err) {
    console.error('Google OAuth initiation failed:', err);
    const url = new URL('/', request.url);
    url.searchParams.set('auth_error', (err as Error).message);
    return NextResponse.redirect(url);
  }
}
