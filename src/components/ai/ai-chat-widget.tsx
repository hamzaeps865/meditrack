'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, X, MessageCircle, Stethoscope } from 'lucide-react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'I have fever for 3 days',
  'Mujhe sir dard ho raha hai',
  'Chest pain and shortness of breath',
  'My blood sugar is high',
];

export default function AiChatWidget({ patientName }: { patientName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Assalam-o-Alaikum ${patientName}! 👋\n\nI'm your AI health assistant. Tell me what symptoms you're experiencing.\n\nYou can write in English or Urdu.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

    try {
      const res = await fetch('/api/ai/symptom-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I had an issue. Please try again.' }]);
        return;
      }

      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full
            bg-gradient-to-br from-emerald-600 to-emerald-700 text-white
            shadow-lg hover:shadow-xl hover:scale-105 transition-all
            flex items-center justify-center group"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="h-6 w-6" />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20" />
          {/* Badge */}
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500
            border-2 border-white flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 h-[500px] max-h-[calc(100vh-3rem)]
          bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">AI Health Assistant</p>
                <p className="text-[10px] text-white/70 mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Online
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 w-8 flex items-center justify-center rounded-full text-white/80 hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-emerald-50/30">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {msg.role === 'user' ? (
                    <span className="text-[10px] font-bold">{patientName[0]}</span>
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-sm'
                    : 'bg-white border border-border text-foreground rounded-tl-sm'
                }`}>
                  <p className="text-xs whitespace-pre-line leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {messages.length === 1 && !loading && (
              <div className="pt-2">
                <p className="text-[10px] text-muted-foreground mb-1.5 px-1">Try asking:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSend(s)}
                      className="px-2.5 py-1 rounded-full border border-border bg-white text-[11px] font-medium text-foreground hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-2.5 bg-white">
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
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-emerald-50/30 text-xs text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                style={{ minHeight: '36px', maxHeight: '80px' }}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 shrink-0 transition-colors"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[9px] text-muted-foreground/60">
                ⚠ Not medical advice. Consult a doctor.
              </p>
              <Link
                href="/patient/appointments/new"
                className="text-[9px] font-semibold text-emerald-700 hover:underline flex items-center gap-0.5"
              >
                <Stethoscope className="h-2.5 w-2.5" />
                Book
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
