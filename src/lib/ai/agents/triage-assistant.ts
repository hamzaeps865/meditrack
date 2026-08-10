import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getLLM } from '../models';

// ─── AI Triage Assistant ──────────────────────────────────────────────────────
// Takes nurse's vitals + chief complaint and suggests severity + clinical reasoning.
// Helps nurses (especially junior ones) not miss critical cases.

export interface TriageInput {
  chiefComplaint: string;
  vitalsBp?: string;
  vitalsTemp?: string;
  vitalsPulse?: string;
  vitalsWeight?: string;
  patientAge?: number;
  patientGender?: string;
  patientAllergies?: string;
}

const triagePrompt = ChatPromptTemplate.fromTemplate(`
You are an expert triage nurse AI assistant helping at a clinic in Pakistan. Analyze the following patient data and suggest a triage severity level with reasoning.

PATIENT INFO:
- Age: {patientAge}
- Gender: {patientGender}
- Allergies: {patientAllergies}

CHIEF COMPLAINT: {chiefComplaint}

VITAL SIGNS:
- Blood Pressure: {vitalsBp}
- Temperature: {vitalsTemp} °F
- Pulse: {vitalsPulse} bpm
- Weight: {vitalsWeight} kg

Instructions:
1. Assess the severity based on the vitals and complaint. Choose ONE:
   - CRITICAL: Life-threatening, needs immediate doctor attention (e.g., chest pain + high BP, very high fever >104°F, respiratory distress)
   - URGENT: Serious but not immediately life-threatening, should be seen within 1-2 hours (e.g., persistent high fever, severe pain, high BP)
   - STANDARD: Routine consultation, stable patient (e.g., mild fever, routine follow-up)
   - LOW: Minor issue, can wait (e.g., mild cough, prescription refill)

2. Provide your reasoning in 2-3 sentences explaining WHY you chose this level.

3. List any RED FLAGS — symptoms that the nurse should watch for that could indicate deterioration.

4. If this looks like dengue, malaria, typhoid, or other common Pakistan diseases, mention it as a possibility.

Format your response EXACTLY like this:

SEVERITY: [CRITICAL/URGENT/STANDARD/LOW]

REASONING: [2-3 sentences explaining why]

RED FLAGS: [comma-separated list of warning signs to watch for, or "None identified"]

POSSIBLE CONDITIONS: [1-2 possible conditions based on symptoms, or "Requires further assessment"]

Remember: This is a SUGGESTION to assist the nurse, not replace clinical judgment.
`);

export async function suggestTriage(input: TriageInput): Promise<string> {
  const llm = getLLM();
  const chain = triagePrompt.pipe(llm).pipe(new StringOutputParser());

  const response = await chain.invoke({
    chiefComplaint: input.chiefComplaint || 'Not specified',
    vitalsBp: input.vitalsBp || 'N/A',
    vitalsTemp: input.vitalsTemp || 'N/A',
    vitalsPulse: input.vitalsPulse || 'N/A',
    vitalsWeight: input.vitalsWeight || 'N/A',
    patientAge: input.patientAge?.toString() || 'Unknown',
    patientGender: input.patientGender || 'Unknown',
    patientAllergies: input.patientAllergies || 'None known',
  });

  return response.trim();
}
