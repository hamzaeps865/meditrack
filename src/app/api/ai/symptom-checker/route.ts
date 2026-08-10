import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { symptomCheck, type ChatMessage } from '@/lib/ai/agents/symptom-checker';

// POST /api/ai/symptom-checker
// Body: { messages: ChatMessage[] }
// Returns: { response: string }

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { messages } = body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 },
      );
    }

    const response = await symptomCheck(messages, session.user.name);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('[AI symptom-checker] Error:', error);

    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service is not configured.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to get response. Please try again.' },
      { status: 500 },
    );
  }
}
