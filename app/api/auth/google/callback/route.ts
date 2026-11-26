import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  attachSessionCookie,
  createSessionToken,
  exchangeCodeForGoogleUser,
  OAUTH_STATE_COOKIE,
  provisionGoogleUser,
} from '@/lib/google-auth';

async function handleGoogleCallback(code: string | null, state: string | null, requestUrl: string) {
  if (!code) {
    throw new Error('Missing Google authorization code.');
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  if (expectedState && state !== expectedState) {
    throw new Error('Invalid OAuth state. Please try signing in with Google again.');
  }

  const googleUser = await exchangeCodeForGoogleUser(code, requestUrl);
  const { user, session } = await provisionGoogleUser(googleUser);
  const token = createSessionToken({
    email: user.email,
    name: user.name,
    picture: googleUser.picture,
  });

  return { user, session, token };
}

export async function POST(request: Request) {
  try {
    const { code, state } = await request.json();
    const { user, session, token } = await handleGoogleCallback(code || null, state || null, request.url);

    const response = NextResponse.json({
      success: true,
      user,
      session,
    });
    attachSessionCookie(response, token);
    response.cookies.set(OAUTH_STATE_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('Google OAuth callback POST failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (oauthError) {
    const url = new URL('/', request.url);
    url.searchParams.set('auth_error', oauthError === 'access_denied' ? 'Google sign-in was cancelled.' : oauthError);
    return NextResponse.redirect(url);
  }

  try {
    const { token } = await handleGoogleCallback(code, state, request.url);
    const response = NextResponse.redirect(new URL('/', request.url));
    attachSessionCookie(response, token);
    response.cookies.set(OAUTH_STATE_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('Google OAuth callback GET failed:', err);
    const url = new URL('/', request.url);
    url.searchParams.set('auth_error', (err as Error).message);
    return NextResponse.redirect(url);
  }
}
