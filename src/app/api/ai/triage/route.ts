import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { suggestTriage } from '@/lib/ai/agents/triage-assistant';

// POST /api/ai/triage
// Body: { chiefComplaint, vitalsBp?, vitalsTemp?, vitalsPulse?, vitalsWeight?, patientAge?, patientGender?, patientAllergies? }
// Returns: { suggestion: string }

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !['nurse', 'admin', 'doctor'].includes(session.user.role)) {
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

    const suggestion = await suggestTriage(body);

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('[AI triage] Error:', error);

    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service is not configured.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate triage suggestion.' },
      { status: 500 },
    );
  }
}
