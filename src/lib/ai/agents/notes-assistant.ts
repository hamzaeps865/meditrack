import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getLLM } from '../models';

// ─── Clinical Notes Assistant ─────────────────────────────────────────────────
// Takes visit data (complaint, vitals, diagnosis, medicines) and generates
// structured SOAP clinical notes.

export interface NotesInput {
  chiefComplaint: string;
  vitalsBp?: string;
  vitalsTemp?: string;
  vitalsWeight?: string;
  diagnosis?: string;
  medicines?: string[];
}

const notesPrompt = ChatPromptTemplate.fromTemplate(`
You are a clinical documentation assistant. Generate professional SOAP clinical notes based on the visit data below.

CHIEF COMPLAINT: {chiefComplaint}
VITALS: BP {vitalsBp}, Temp {vitalsTemp}, Weight {vitalsWeight}
DIAGNOSIS: {diagnosis}
MEDICINES: {medicines}

Generate SOAP notes in this exact format:

**Subjective:**
[1-2 sentences describing what the patient reported]

**Objective:**
[1-2 sentences with vitals and observable findings]

**Assessment:**
[1 sentence with the diagnosis]

**Plan:**
[2-3 bullet points: medicines prescribed, advice, follow-up]

Keep it concise and professional. Do NOT add any disclaimer.
`);

export async function generateClinicalNotes(input: NotesInput): Promise<string> {
  const llm = getLLM();
  const chain = notesPrompt.pipe(llm).pipe(new StringOutputParser());

  const response = await chain.invoke({
    chiefComplaint: input.chiefComplaint || 'Not specified',
    vitalsBp: input.vitalsBp || 'N/A',
    vitalsTemp: input.vitalsTemp || 'N/A',
    vitalsWeight: input.vitalsWeight || 'N/A',
    diagnosis: input.diagnosis || 'Pending',
    medicines: input.medicines?.join(', ') || 'None',
  });

  return response.trim();
}
