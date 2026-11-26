import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Email login is disabled. Please sign in with Google.' },
    { status: 410 }
  );
}
