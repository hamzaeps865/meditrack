import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getLLM } from '../models';

// ─── AI Health Insights ───────────────────────────────────────────────────────
// Takes a patient's health data (visits, vitals, prescriptions, lab results)
// and generates a natural-language summary with trends + recommendations.

export interface HealthInsightsInput {
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  totalVisits: number;
  totalPrescriptions: number;
  appointmentStats: { total: number; completed: number; cancelled: number };
  recentDiagnoses: string[];
  latestVitals: {
    bp?: string;
    temp?: string;
    weight?: string;
  };
  activeMedicines: string[];
  healthScore: number;
}

const insightsPrompt = ChatPromptTemplate.fromTemplate(`
You are a personal health AI assistant. Analyze the following patient's health data and write a personalized health insights summary.

PATIENT: {patientName} ({patientAge} years, {patientGender})

HEALTH OVERVIEW:
- Total clinic visits: {totalVisits}
- Total prescriptions: {totalPrescriptions}
- Appointments: {apptTotal} total ({apptCompleted} completed, {apptCancelled} cancelled)
- Health score: {healthScore} points

RECENT DIAGNOSES: {recentDiagnoses}

LATEST VITALS:
- Blood Pressure: {bp}
- Temperature: {temp}
- Weight: {weight}

ACTIVE MEDICINES: {activeMedicines}

Instructions:
Write a personalized health insights summary with these sections:

1. **Health Overview** (1-2 sentences): Summary of their overall health activity.

2. **Key Observations** (2-3 bullet points): Notable patterns — e.g., "Your blood pressure has been consistent", "You've completed most of your appointments", "You're currently on [X] medicines".

3. **Recommendations** (2-3 bullet points): Simple, actionable health tips based on the data — e.g., "Keep monitoring your blood pressure", "Continue your current medication schedule", "Consider a follow-up if symptoms persist".

4. **Positive Note** (1 sentence): Something encouraging about their health engagement.

Keep the tone warm, supportive, and easy to understand. Use simple English.
End with: "This summary is for your awareness only. Always follow your doctor's advice."
`);

export async function generateHealthInsights(input: HealthInsightsInput): Promise<string> {
  const llm = getLLM();
  const chain = insightsPrompt.pipe(llm).pipe(new StringOutputParser());

  const response = await chain.invoke({
    patientName: input.patientName,
    patientAge: input.patientAge?.toString() || 'Unknown',
    patientGender: input.patientGender || 'Unknown',
    totalVisits: input.totalVisits.toString(),
    totalPrescriptions: input.totalPrescriptions.toString(),
    apptTotal: input.appointmentStats.total.toString(),
    apptCompleted: input.appointmentStats.completed.toString(),
    apptCancelled: input.appointmentStats.cancelled.toString(),
    healthScore: input.healthScore.toString(),
    recentDiagnoses: input.recentDiagnoses.length > 0 ? input.recentDiagnoses.join(', ') : 'None recorded',
    bp: input.latestVitals.bp || 'N/A',
    temp: input.latestVitals.temp || 'N/A',
    weight: input.latestVitals.weight || 'N/A',
    activeMedicines: input.activeMedicines.length > 0 ? input.activeMedicines.join(', ') : 'None currently',
  });

  return response.trim();
}
