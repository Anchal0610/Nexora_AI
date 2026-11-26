import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbManager } from '@/lib/db';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/google-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    console.log(`Checking career session data for: ${email}`);
    const sessionData = await dbManager.getPipelineSession(email.trim());

    if (sessionData) {
      return NextResponse.json({ exists: true, session: sessionData });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (err) {
    console.error('Session retrieval failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const payload = verifySessionToken(token);

    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get('email')?.trim().toLowerCase();
    const targetEmail = payload?.email || queryEmail;

    if (!targetEmail) {
      return NextResponse.json({ error: 'Authenticated email is required' }, { status: 400 });
    }

    await dbManager.deletePipelineSession(targetEmail);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Session reset failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
