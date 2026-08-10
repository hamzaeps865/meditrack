import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { checkDrugInteractions } from '@/lib/ai/agents/drug-interactions';

// POST /api/ai/drug-check
// Body: { medicines: string[] }
// Returns: { hasInteractions, explanation }

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { medicines } = body;

    if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 medicines are required to check interactions' },
        { status: 400 },
      );
    }

    const result = await checkDrugInteractions({ medicines });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AI drug-check] Error:', error);

    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service is not configured.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to check interactions.' },
      { status: 500 },
    );
  }
}
