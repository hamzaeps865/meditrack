import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getLLM } from '../models';

// ─── AI Symptom Checker ───────────────────────────────────────────────────────
// A conversation-based agent that helps patients describe their symptoms,
// assesses urgency, and recommends which type of doctor to see.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are MediTrack AI, a helpful health assistant for a clinic in Pakistan.

Your job is to help patients understand their symptoms and guide them. Follow these rules STRICTLY:

1. Ask 1-2 follow-up questions to understand their symptoms better (duration, severity, associated symptoms).
2. After understanding the symptoms, provide:
   - A brief possible explanation (NOT a diagnosis — use "this could suggest..." language)
   - An urgency level: ROUTINE (can wait for appointment), URGENT (see doctor within 24h), or EMERGENCY (go to hospital now)
   - Which type of doctor to book (GP, Cardiologist, etc.)
3. Keep responses SHORT (2-4 sentences max). Do not write long paragraphs.
4. You can respond in English or Roman Urdu — match the patient's language.
   If they write in Urdu, respond in simple Roman Urdu.
5. ALWAYS include this disclaimer when giving any assessment: "This is not a medical diagnosis. Please consult a doctor."
6. If symptoms sound like an EMERGENCY (chest pain, difficulty breathing, severe bleeding, unconsciousness, stroke signs), tell them to go to the hospital immediately.

Example conversation:
Patient: "Mujhe 3 din se bukhar hai"
You: "3 din ka bukhar ho gaya hai. Kya body pain, sore throat, ya cough bhi hai? Aap ka temperature kitna hai?"
Patient: "Body pain hai, temperature 102 hai"
You: "102°F with body pain for 3 days could suggest a viral infection like flu or dengue. I recommend booking with a General Practitioner. Drink plenty of fluids and rest. This is not a medical diagnosis. Please consult a doctor."`;

export async function symptomCheck(
  messages: ChatMessage[],
  patientName?: string,
): Promise<string> {
  const llm = getLLM();

  // Build conversation history
  const formattedMessages = messages.map((m) => ({
    role: m.role === 'user' ? 'human' : 'assistant',
    content: m.content,
  }));

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);

  // Get the last user message as input, rest as history
  const lastMessage = messages[messages.length - 1];
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'human' as const : 'assistant' as const,
    content: m.content,
  }));

  const chain = prompt.pipe(llm).pipe(new StringOutputParser());

  const response = await chain.invoke({
    history: history.length > 0 ? history : [{ role: 'human' as const, content: ' ' }],
    input: lastMessage?.content || 'Hello',
  });

  return response.trim();
}
