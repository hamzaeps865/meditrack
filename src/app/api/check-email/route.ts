import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/server/auth';

// GET /api/check-email?email=<email>
// Returns { exists: boolean }
// Accessible by: admin only

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ exists: false });
  }

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  return NextResponse.json({ exists: !!row });
}
