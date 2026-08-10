import { ChatOpenAI } from '@langchain/openai';

// ─── LLM Model Configuration ──────────────────────────────────────────────────
// Uses Groq's free API (OpenAI-compatible endpoint) with Llama 3.3 70B.
// Groq is free, ultra-fast (~500 tokens/sec), and doesn't store data.
//
// To use: sign up at https://console.groq.com → get API key → add to .env:
//   GROQ_API_KEY=your_key_here

export function getLLM() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set. Get a free key at https://console.groq.com');
  }

  return new ChatOpenAI({
    model: 'llama-3.3-70b-versatile',
    apiKey,
    configuration: {
      baseURL: 'https://api.groq.com/openai/v1',
    },
    temperature: 0.3, // Low temperature for factual medical explanations
    maxTokens: 1000,
  });
}
