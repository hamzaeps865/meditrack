import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getLLM } from '../models';

// ─── Drug Interaction Checker ────────────────────────────────────────────────
// Takes a list of medicines and checks for known drug-drug interactions.

export interface DrugCheckInput {
  medicines: string[];
}

export interface DrugInteractionResult {
  hasInteractions: boolean;
  explanation: string;
}

const drugCheckPrompt = ChatPromptTemplate.fromTemplate(`
You are a clinical pharmacy AI assistant. Check the following medicines for known drug-drug interactions.

MEDICINES TO CHECK: {medicines}

Instructions:
1. Identify the generic/active ingredient of each medicine.
2. Check for known major drug-drug interactions between these medicines.
3. If there are interactions, describe them clearly:
   - Which medicines interact
   - What the risk is (e.g., "increased bleeding risk", "reduced effectiveness")
   - Severity: MAJOR / MODERATE / MINOR
4. If NO significant interactions exist, say "No major interactions found between these medicines."
5. Keep the response concise and clear.

Format your response as:

STATUS: [SAFE / WARNING / DANGEROUS]

Then explain each interaction (or confirm safety) in 2-3 sentences max.

Always end with: "This is not a substitute for professional pharmacy review."

Response:
`);

export async function checkDrugInteractions(
  input: DrugCheckInput,
): Promise<DrugInteractionResult> {
  const llm = getLLM();
  const chain = drugCheckPrompt.pipe(llm).pipe(new StringOutputParser());

  const response = await chain.invoke({
    medicines: input.medicines.join(', '),
  });

  const hasInteractions =
    response.includes('WARNING') ||
    response.includes('DANGEROUS') ||
    response.includes('MAJOR') ||
    response.includes('MODERATE');

  return {
    hasInteractions,
    explanation: response.trim(),
  };
}
