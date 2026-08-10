import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getLLM } from '../models';

// ─── Lab Report Explainer ─────────────────────────────────────────────────────
// Takes a lab test result + reference range and generates a plain-language
// explanation suitable for patients. Works in both English and Urdu.

export interface LabExplainInput {
  testName: string;
  result: string;
  referenceRange?: string | null;
  patientName?: string;
}

const labExplainPrompt = ChatPromptTemplate.fromTemplate(`
You are a helpful medical assistant explaining lab results to a patient in simple, easy-to-understand language.

PATIENT NAME: {patientName}
TEST NAME: {testName}
RESULT: {result}
REFERENCE RANGE (normal values): {referenceRange}

Instructions:
1. Explain what the test is for (1 sentence).
2. Compare the result to the reference range and say if it's normal, high, or low.
3. Explain what an abnormal result might mean in plain language (1-2 sentences).
4. Give 1-2 practical, actionable tips (diet, lifestyle, follow-up).
5. Always end with: "This is not medical advice. Please consult your doctor for proper diagnosis."

Keep the explanation under 100 words. Use simple English that anyone can understand. If the result value looks normal, reassure the patient.

Explanation:
`);

export async function explainLabResult(input: LabExplainInput): Promise<string> {
  const llm = getLLM();
  const parser = new StringOutputParser();

  const chain = labExplainPrompt.pipe(llm).pipe(parser);

  const response = await chain.invoke({
    testName: input.testName,
    result: input.result,
    referenceRange: input.referenceRange || 'Not available',
    patientName: input.patientName || 'Patient',
  });

  return response.trim();
}
