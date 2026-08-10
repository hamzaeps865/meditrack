'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Stethoscope, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Message {
 role: 'user' | 'assistant';
 content: string;
}

const SUGGESTIONS = [
 'I have fever for 3 days',
 'Mujhe sir dard ho raha hai',
 'Chest pain and shortness of breath',
 'My blood sugar is 220',
];

export default function SymptomChat({ patientName }: { patientName: string }) {
 const [messages, setMessages] = useState<Message[]>([
  {
   role: 'assistant',
   content: `Assalam-o-Alaikum ${patientName}! 👋\n\nI'm your AI health assistant. Tell me what symptoms you're experiencing and I'll help guide you.\n\nYou can describe in English or Urdu.`,
  },
 ]);
 const [input, setInput] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(false);
 const scrollRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
 }, [messages, loading]);

 async function handleSend(text?: string) {
  const msgText = text || input.trim();
  if (!msgText || loading) return;

  const userMsg: Message = { role: 'user', content: msgText };
  const newMessages = [...messages, userMsg];
  setMessages(newMessages);
  setInput('');
  setLoading(true);
  setError(false);

  try {
   const res = await fetch('/api/ai/symptom-checker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: newMessages }),
   });

   const data = await res.json();

   if (!res.ok) {
    setError(true);
    return;
   }

   setMessages([...newMessages, { role: 'assistant', content: data.response }]);
  } catch {
   setError(true);
  } finally {
   setLoading(false);
  }
 }

 return (
  <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
   {/* Chat messages */}
   <div
    ref={scrollRef}
    className="flex-1 overflow-y-auto space-y-4 px-1 py-2"
   >
    {messages.map((msg, i) => (
     <div
      key={i}
      className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
     >
      {/* Avatar */}
      <div className={`h-8 w-8 flex items-center justify-center shrink-0 ${
       msg.role === 'user'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-emerald-100 text-emerald-700'
      }`}>
       {msg.role === 'user' ? (
        <span className="text-xs font-bold">{patientName[0]}</span>
       ) : (
        <Sparkles className="h-4 w-4" />
       )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] px-4 py-2.5 ${
       msg.role === 'user'
        ? 'bg-primary text-primary-foreground'
        : 'bg-white border border-border text-foreground'
      }`}>
       <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
      </div>
     </div>
    ))}

    {/* Loading indicator */}
    {loading && (
     <div className="flex gap-2.5">
      <div className="h-8 w-8 bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
       <Sparkles className="h-4 w-4" />
      </div>
      <div className="bg-white border border-border px-4 py-3 flex items-center gap-2">
       <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
       <span className="text-sm text-muted-foreground">Thinking...</span>
      </div>
     </div>
    )}

    {/* Error */}
    {error && (
     <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2">
      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
      <p className="text-xs text-amber-700">Something went wrong. Please try again.</p>
     </div>
    )}

    {/* Suggestions (only on first interaction) */}
    {messages.length === 1 && !loading && (
     <div className="pt-2">
      <p className="text-xs text-muted-foreground mb-2 px-1">Try asking:</p>
      <div className="flex flex-wrap gap-2">
       {SUGGESTIONS.map((s) => (
        <button
         key={s}
         type="button"
         onClick={() => handleSend(s)}
         className="px-3 py-1.5 border border-border bg-white text-xs font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-all"
        >
         {s}
        </button>
       ))}
      </div>
     </div>
    )}
   </div>

   {/* Input bar */}
   <div className="border-t border-border pt-3 mt-3">
    <div className="flex items-end gap-2">
     <textarea
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
       if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
       }
      }}
      placeholder="Describe your symptoms..."
      rows={1}
      className="flex-1 px-3 py-2.5 border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
      style={{ minHeight: '44px', maxHeight: '120px' }}
     />
     <button
      type="button"
      onClick={() => handleSend()}
      disabled={!input.trim() || loading}
      className="h-11 w-11 bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
     >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
     </button>
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between mt-2 px-1">
     <p className="text-[10px] text-muted-foreground/60">
      ⚠ AI advice is not a medical diagnosis. Always consult a doctor.
     </p>
     <Link
      href="/patient/appointments/new"
      className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1"
     >
      <Stethoscope className="h-3 w-3" />
      Book Appointment
     </Link>
    </div>
   </div>
  </div>
 );
}
