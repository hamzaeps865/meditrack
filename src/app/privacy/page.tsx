import Link from 'next/link';
import { BriefcaseMedical, ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
 title: 'Privacy Policy — MediTrack',
};

// ─── Static section data ───────────────────────────────────────────────────────

const sections = [
 {
  title: '1. Information We Collect',
  body: [
   'MediTrack collects the information needed to manage your clinic care, including your name, date of birth, gender, contact details (phone, email, address), blood group, allergies, and emergency contact.',
   'For system users (doctors, receptionists, administrators), we also store your name, email, role, and an authentication password hash. Audit logs record actions you perform, the record affected, and the IP address of the request.',
  ],
 },
 {
  title: '2. How We Use Your Information',
  body: [
   'Your information is used exclusively for clinic operations: scheduling appointments, recording consultations, issuing prescriptions, coordinating care between staff, and maintaining an accurate medical history.',
   'We do not sell or rent your personal data to third parties.',
  ],
 },
 {
  title: '3. Health Records & Retention',
  body: [
   'Medical records (visits, diagnoses, vitals, prescriptions) are retained as part of your permanent history for clinical and legal continuity.',
   'When a patient record is removed from active use, it is soft-deleted — a deletion timestamp is recorded but the underlying clinical data is preserved for historical and auditing purposes. Records are never hard-deleted through the application.',
  ],
 },
 {
  title: '4. Access Control',
  body: [
   'Access to your data is governed by role-based permissions. Only authenticated users with an authorized role can reach protected areas, and each role sees only the information relevant to their responsibilities.',
   'Patients can view only their own records. Doctors can access records for appointments assigned to them. Access to sensitive actions is recorded in the audit trail.',
  ],
 },
 {
  title: '5. Data Security',
  body: [
   'Passwords are never stored in plain text — they are hashed before storage. Sessions are maintained through signed JWT tokens. Database-level constraints prevent duplicate or invalid records.',
   'Despite these measures, no system can be guaranteed perfectly secure. Access is logged to support accountability.',
  ],
 },
 {
  title: '6. Your Rights',
  body: [
   'You may request access to the personal information we hold about you, ask for corrections to inaccurate data, or raise a concern about how your information is handled.',
   'To exercise these rights, contact your clinic administrator.',
  ],
 },
 {
  title: '7. Changes to This Policy',
  body: [
   'This policy may be updated as the system evolves. Material changes will be reflected on this page with an updated effective date.',
  ],
 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
 const today = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
 });

 return (
  <div className="min-h-screen bg-background">
   <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
    {/* Header */}
    <div className="flex flex-col items-center text-center mb-10">
     <div className="flex items-center gap-2 mb-5">
      <BriefcaseMedical className="h-6 w-6 text-primary" strokeWidth={2.25} />
      <span className="text-xl font-bold text-primary">MediTrack</span>
     </div>
     <div className="h-12 w-12 bg-primary/10 flex items-center justify-center mb-4">
      <ShieldCheck className="h-6 w-6 text-primary" />
     </div>
     <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
     <p className="text-sm text-muted-foreground mt-2">
      Last updated: {today}
     </p>
    </div>

    {/* Intro */}
    <div className="bg-card border border-border p-6 mb-8">
     <p className="text-sm text-muted-foreground leading-relaxed">
      MediTrack is a clinic management system that handles sensitive personal and
      health information. This policy explains what data we collect, why we collect it,
      how it is protected, and the rights you have over your information.
     </p>
    </div>

    {/* Sections */}
    <div className="space-y-8">
     {sections.map((section) => (
      <section key={section.title}>
       <h2 className="text-lg font-semibold text-foreground mb-3">
        {section.title}
       </h2>
       <div className="space-y-3">
        {section.body.map((paragraph, i) => (
         <p key={i} className="text-sm text-muted-foreground leading-relaxed">
          {paragraph}
         </p>
        ))}
       </div>
      </section>
     ))}
    </div>

    {/* Contact block */}
    <div className="mt-10 border border-border bg-muted/30 p-5 text-center">
     <p className="text-sm text-muted-foreground">
      Questions about your privacy or this policy?
     </p>
     <p className="text-sm font-medium text-foreground mt-1">
      Contact your clinic administrator.
     </p>
    </div>

    {/* Back link */}
    <div className="mt-8 text-center">
     <Link
      href="/login"
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
     >
      <ArrowLeft className="h-4 w-4" />
      Back to sign in
     </Link>
    </div>
   </div>
  </div>
 );
}
