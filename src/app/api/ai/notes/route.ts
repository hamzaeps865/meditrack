import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { generateClinicalNotes } from '@/lib/ai/agents/notes-assistant';

// POST /api/ai/notes
// Body: { chiefComplaint, vitalsBp?, vitalsTemp?, vitalsWeight?, diagnosis?, medicines? }
// Returns: { notes: string }

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !['doctor', 'admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.chiefComplaint) {
      return NextResponse.json(
        { error: 'Chief complaint is required' },
        { status: 400 },
      );
    }

    const notes = await generateClinicalNotes(body);

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('[AI notes] Error:', error);

    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service is not configured.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate notes.' },
      { status: 500 },
    );
  }
}
