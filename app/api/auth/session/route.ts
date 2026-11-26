import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbManager } from '@/lib/db';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/google-auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const payload = verifySessionToken(token);

    if (!payload) {
      return NextResponse.json({ authenticated: false });
    }

    await dbManager.initDb();
    let user = await dbManager.getUser(payload.email);
    if (!user) {
      user = await dbManager.saveUser(payload.name || 'New User', payload.email, '', 0.0);
    }
    const session = await dbManager.getPipelineSession(payload.email);

    return NextResponse.json({
      authenticated: true,
      user: {
        ...user,
        picture: payload.picture,
      },
      session,
    });
  } catch (err) {
    console.error('Auth session check failed:', err);
    return NextResponse.json({ authenticated: false, error: (err as Error).message }, { status: 500 });
  }
}
