'use client';

import { useEffect, useState } from 'react';
import {
 Search, HelpCircle, Shield,
 SlidersHorizontal, BarChart2,
 Users, ChevronDown, ChevronUp,
 Send, AlertCircle, CheckCircle2,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import { toast } from 'sonner';
import { createSupportRequest } from '@/server/actions/settings.actions';

// ─── Quick Topics ─────────────────────────────────────────────────────────────

const TOPICS = [
 {
  icon: Users,
  title: 'Managing User Permissions',
  description: 'Control access levels and clinical roles.',
 },
 {
  icon: Shield,
  title: 'Auditing Data Access',
  description: 'Track compliance and patient record views.',
 },
 {
  icon: SlidersHorizontal,
  title: 'Configuring Clinic Settings',
  description: 'Setup hours, branches, and custom fields.',
 },
 {
  icon: BarChart2,
  title: 'Generating Reports',
  description: 'Extract operational data and health insights.',
 },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS: { category: string; items: { q: string; a: string }[] }[] = [
 {
  category: 'APPOINTMENTS',
  items: [
   {
    q: 'How do I override a cancellation?',
    a: 'Go to the appointment detail page, click the status dropdown, and select "Scheduled" to reinstate it. Only administrators and receptionists can override cancellations. Cancellations within 24 hours require a written reason which is logged to the audit trail.',
   },
   {
    q: 'Can I export the schedule?',
    a: 'Yes. From the Appointments page, click the Download icon in the filter bar to export the current view as a CSV. You can also access bulk exports from Admin → Settings → Reports.',
   },
  ],
 },
 {
  category: 'SECURITY',
  items: [
   {
    q: 'What is the data retention policy?',
    a: 'Patient records are retained indefinitely and cannot be hard-deleted (soft delete only). Audit logs are retained for a minimum of 7 years in compliance with HIPAA and applicable regional regulations. Contact your clinic administrator for custom retention settings.',
   },
   {
    q: 'How do I reset an admin password?',
    a: 'Admins can reset any user password from Admin → Users — click the three-dot menu on the user row and select "Reset Password". A temporary password will be emailed to the user. To reset your own admin password, go to Admin → Settings → Security.',
   },
  ],
 },
 {
  category: 'PATIENT RECORDS',
  items: [
   {
    q: 'Can a patient record be permanently deleted?',
    a: 'No. MediTrack uses soft-delete only — patient records are deactivated, not removed. This preserves clinical history and audit integrity. If legally required, contact support for a data removal request.',
   },
   {
    q: 'How are prescriptions linked to visits?',
    a: 'Each prescription is tied to a specific visit. When a doctor completes a visit, they can issue one or more prescriptions with individual medicine line items. All prescriptions are visible on the patient profile and in the patient portal.',
   },
  ],
 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpPage() {
 const [searchQuery, setSearchQuery]  = useState('');
 const [openFaqs,  setOpenFaqs]   = useState<Set<string>>(new Set());
 const [subject,   setSubject]    = useState('');
 const [message,   setMessage]    = useState('');
 const [sent,    setSent]     = useState(false);
 const [sending,   setSending]    = useState(false);
 const [isSearching, setIsSearching]  = useState(false);

 function toggleFaq(key: string) {
  setOpenFaqs((prev) => {
   const next = new Set(prev);
   if (next.has(key)) next.delete(key);
   else next.add(key);
   return next;
  });
 }

 async function handleSend(e: React.FormEvent) {
  e.preventDefault();
  if (!subject.trim() || !message.trim()) return;
  setSending(true);
  try {
   await createSupportRequest({ subject, message });
   setSent(true);
   setSubject('');
   setMessage('');
   toast.success('Your message has been sent.');
  } catch (err) {
   toast.error(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
  } finally {
   setSending(false);
  }
 }

 useEffect(() => {
  if (!searchQuery.trim()) {
   setIsSearching(false);
   return;
  }

  setIsSearching(true);
  const timer = window.setTimeout(() => setIsSearching(false), 180);
  return () => window.clearTimeout(timer);
 }, [searchQuery]);

 // Filter FAQs by search
 const filteredFaqs = FAQS.map((section) => ({
  ...section,
  items: section.items.filter(
   (item) =>
    !searchQuery ||
    item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.a.toLowerCase().includes(searchQuery.toLowerCase()),
  ),
 })).filter((section) => section.items.length > 0);

 const filteredTopics = TOPICS.filter(
  (t) =>
   !searchQuery ||
   t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
   t.description.toLowerCase().includes(searchQuery.toLowerCase()),
 );

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3
    flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-lg">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
      text-muted-foreground" />
     <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Global search..."
      className="w-full h-9 pl-9 pr-4 border border-border bg-muted/40
       text-sm text-foreground placeholder:text-muted-foreground
       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
     />
    </div>
    <div className="flex items-center gap-2.5">
     <NotificationBell />
     <button type="button" aria-label="Help"
      className="h-8 w-8 flex items-center justify-center 
       text-primary bg-primary/10 transition-colors">
      <HelpCircle className="h-4 w-4" />
     </button>
     <div className="pl-2.5 border-l border-border">
      <span className="text-sm font-bold text-primary">MediTrack</span>
     </div>
    </div>
   </div>

   {/* ── Page body ── */}
   <div className="px-6 py-8 max-w-4xl mx-auto">

    {/* ── Hero header ── */}
    <div className="text-center mb-8">
     <h1 className="text-2xl font-bold text-foreground mb-5">
      Help &amp; Support
     </h1>

     {/* Search bar */}
     <div className="relative max-w-lg mx-auto">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5
       text-muted-foreground pointer-events-none" />
      <input
       type="text"
       value={searchQuery}
       onChange={(e) => setSearchQuery(e.target.value)}
       placeholder="Search help articles..."
       className="w-full h-12 pl-12 pr-5 border border-border
        bg-white text-sm text-foreground placeholder:text-muted-foreground
         focus:outline-none focus:ring-2 focus:ring-primary/20
        transition-colors"
      />
      {searchQuery && (
       <p className="mt-2 text-xs text-muted-foreground">
        {isSearching ? 'Searching...' : filteredFaqs.length === 0 ? 'No matching help articles found.' : `${filteredFaqs.length} section${filteredFaqs.length === 1 ? '' : 's'} found.`}
       </p>
      )}
     </div>
    </div>

    {/* ── Quick Topics ── */}
    {filteredTopics.length > 0 && (
     <section className="mb-8">
      <h2 className="text-base font-bold text-primary mb-4">Quick Topics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
       {filteredTopics.map((topic) => {
        const Icon = topic.icon;
        return (
         <button
          key={topic.title}
          type="button"
          className="bg-white border border-border p-5 text-left
            hover: hover:border-primary/30
           transition-all group"
         >
          <div className="h-9 w-9 bg-muted flex items-center
           justify-center mb-3 group-hover:bg-primary/10 transition-colors">
           <Icon className="h-4 w-4 text-muted-foreground
            group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm font-bold text-foreground leading-snug mb-1">
           {topic.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
           {topic.description}
          </p>
         </button>
        );
       })}
      </div>
     </section>
    )}

    {/* ── Two-column: FAQ + Contact ── */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

     {/* ── Common Questions ── */}
     <section>
      <h2 className="text-base font-bold text-primary mb-4">Common Questions</h2>

      {filteredFaqs.length === 0 ? (
       <div className="bg-white border border-border p-8
        text-center text-muted-foreground ">
        <p className="text-sm font-medium">No results for "{searchQuery}"</p>
        <p className="text-xs mt-1">Try a different search term or contact support.</p>
       </div>
      ) : (
       <div className="space-y-5">
        {filteredFaqs.map((section) => (
         <div key={section.category}>
          <p className="text-[10px] font-bold uppercase tracking-widest
           text-muted-foreground mb-2 px-1">
           {section.category}
          </p>
          <div className="bg-white border border-border
           overflow-hidden ">
           {section.items.map((item, i) => {
            const key  = `${section.category}-${i}`;
            const isOpen = openFaqs.has(key);
            return (
             <div key={key}
              className={`${i < section.items.length - 1 ? 'border-b border-border' : ''}`}>
              <button
               type="button"
               onClick={() => toggleFaq(key)}
               className="w-full flex items-center justify-between gap-4
                px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
               <p className={`text-sm font-medium leading-snug
                ${isOpen ? 'text-primary' : 'text-foreground'}`}>
                {item.q}
               </p>
               {isOpen
                ? <ChevronUp className="h-4 w-4 text-primary shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
              {isOpen && (
               <div className="px-5 pb-4 pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed
                 pl-3">
                 {item.a}
                </p>
               </div>
              )}
             </div>
            );
           })}
          </div>
         </div>
        ))}
       </div>
      )}
     </section>

     {/* ── Contact / Support form ── */}
     <section>
      <div className="bg-white border border-border p-5 ">
       <h3 className="text-base font-bold text-foreground mb-1">
        Still need help?
       </h3>
       <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
        Can't find what you're looking for? Our support team is here to assist.
       </p>

       {sent ? (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
         <div className="h-12 w-12 bg-emerald-50 flex items-center
          justify-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
         </div>
         <p className="text-sm font-semibold text-foreground">Message sent!</p>
         <p className="text-xs text-muted-foreground text-center">
          Our support team will respond within 24 hours.
         </p>
         <button
          type="button"
          onClick={() => setSent(false)}
          className="text-xs text-primary font-medium hover:underline mt-1"
         >
          Send another message
         </button>
        </div>
       ) : (
        <form onSubmit={handleSend} className="space-y-3">
         <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
           Subject
          </label>
          <input
           type="text"
           value={subject}
           onChange={(e) => setSubject(e.target.value)}
           placeholder="Briefly describe the issue"
           required
           className="w-full h-10 px-3 border border-border bg-muted/30
            text-sm text-foreground placeholder:text-muted-foreground/60
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
            transition-colors"
          />
         </div>

         <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
           Message
          </label>
          <textarea
           value={message}
           onChange={(e) => setMessage(e.target.value)}
           placeholder="Provide as much detail as possible..."
           rows={5}
           required
           className="w-full px-3 py-2.5 border border-border bg-muted/30
            text-sm text-foreground placeholder:text-muted-foreground/60 resize-none
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
            transition-colors"
          />
         </div>

         <button
          type="submit"
          disabled={sending}
          className="w-full h-11 text-sm font-bold text-white
           hover:opacity-90 transition-opacity disabled:opacity-60
           flex items-center justify-center gap-2"
          style={{ backgroundColor: '#01411C' }}
         >
          {sending ? (
           <>
            <span className="h-4 w-4 border-2 border-white/30
             border-t-white animate-spin" />
            Sending...
           </>
          ) : (
           <>
            <Send className="h-4 w-4" />
            Send Message
           </>
          )}
         </button>
        </form>
       )}

       {/* Urgent banner */}
       <div className="mt-4 border border-red-200 bg-red-50
        px-4 py-3 flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-600 font-medium leading-relaxed">
         Urgent Clinic Issue? Contact your clinic administrator directly via the
         emergency protocol.
        </p>
       </div>
      </div>
     </section>
    </div>
   </div>

   {/* ── Footer ── */}
   <footer className="border-t border-border mt-8 px-6 py-4 bg-white">
    <div className="max-w-4xl mx-auto flex flex-wrap items-center
     justify-between gap-3">
     <p className="text-xs text-muted-foreground">
      © 2024 MediTrack Medical Solutions. System Version 4.2.1-Stable
     </p>
     <div className="flex items-center gap-5">
      <a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
       Privacy Policy
      </a>
      {['Service Status', 'System Log'].map((link) => (
       <button
        key={link}
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
       >
        {link}
       </button>
      ))}
     </div>
    </div>
   </footer>
  </div>
 );
}
