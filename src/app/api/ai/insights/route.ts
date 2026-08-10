import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { visits, prescriptions, prescriptionItems, appointments, medicationReminders } from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateHealthInsights } from '@/lib/ai/agents/health-insights';
import { getHealthReportData } from '@/server/actions/reports.actions';
import { getHealthScore } from '@/server/actions/health-score.actions';
import { getActivePatient } from '@/server/actions/active-patient';

// POST /api/ai/insights
// No body needed — resolves patient from session
// Returns: { insights: string }

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Resolve the active patient
    const active = await getActivePatient();
    if (!active) {
      return NextResponse.json({ error: 'No patient profile found' }, { status: 404 });
    }

    // Gather health data
    const [reportData, healthScore] = await Promise.all([
      getHealthReportData(active.id).catch(() => null),
      getHealthScore(active.id).catch(() => null),
    ]);

    if (!reportData) {
      return NextResponse.json({ error: 'No health data available' }, { status: 404 });
    }

    // Collect active medicines from medication reminders
    const activeMeds = await db
      .select({ medicineName: medicationReminders.medicineName })
      .from(medicationReminders)
      .where(eq(medicationReminders.patientId, active.id))
      .limit(10);

    // Collect recent diagnoses from visits
    const recentDiagnoses = reportData.visits
      .map((v) => v.diagnosis)
      .filter((d): d is string => !!d)
      .slice(0, 5);

    // Get latest vitals
    const latestVisit = reportData.visits[0];

    const insights = await generateHealthInsights({
      patientName: active.name,
      patientAge: undefined, // Could resolve from patient record
      patientGender: undefined,
      totalVisits: reportData.visits.length,
      totalPrescriptions: reportData.prescriptions.length,
      appointmentStats: reportData.appointmentStats,
      recentDiagnoses,
      latestVitals: latestVisit ? {
        bp: latestVisit.vitalsBp ?? undefined,
        temp: latestVisit.vitalsTemp ?? undefined,
        weight: latestVisit.vitalsWeight ?? undefined,
      } : {},
      activeMedicines: activeMeds.map((m) => m.medicineName),
      healthScore: healthScore?.total ?? 0,
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('[AI insights] Error:', error);

    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service is not configured.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate insights.' },
      { status: 500 },
    );
  }
}
