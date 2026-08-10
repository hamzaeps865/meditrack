import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { explainLabResult } from '@/lib/ai/agents/lab-explainer';

// POST /api/ai/lab-explain
// Body: { testName, result, referenceRange?, patientName? }
// Returns: { explanation: string }
// Requires: authenticated user

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { testName, result, referenceRange, patientName } = body;

    if (!testName || !result) {
      return NextResponse.json(
        { error: 'testName and result are required' },
        { status: 400 }
      );
    }

    const explanation = await explainLabResult({
      testName,
      result,
      referenceRange: referenceRange || null,
      patientName: patientName || session.user.name,
    });

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('[AI lab-explain] Error:', error);

    // Check if it's a missing API key error
    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        {
          error:
            'AI service is not configured. Please add GROQ_API_KEY to the environment.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate explanation. Please try again.' },
      { status: 500 }
    );
  }
}
