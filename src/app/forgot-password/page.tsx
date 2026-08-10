import Link from 'next/link';
import { BriefcaseMedical, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
 title: 'Forgot Password — MediTrack',
};

export default function ForgotPasswordPage() {
 return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
   <div className="bg-card shadow-sm border border-border w-full max-w-[460px] overflow-hidden">
    <div className="px-6 sm:px-[33px] pt-8 pb-7">
     {/* Brand */}
     <div className="flex flex-col items-center text-center mb-6">
      <div className="flex items-center gap-2 mb-4">
       <BriefcaseMedical className="h-6 w-6 text-primary" strokeWidth={2.25} />
       <span className="text-xl font-bold text-primary">MediTrack</span>
      </div>
      <div className="h-12 w-12 bg-primary/10 flex items-center justify-center mb-4">
       <ShieldCheck className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground leading-tight">
       Reset your password
      </h1>
      <p className="text-muted-foreground text-sm mt-1.5 max-w-xs">
       Password resets are managed by your clinic administrator for security.
      </p>
     </div>

     {/* Info card */}
     <div className=" border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
       <div className="h-8 w-8 bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Mail className="h-4 w-4 text-primary" />
       </div>
       <div className="text-sm text-foreground space-y-1.5">
        <p className="font-medium">To reset your password:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
         <li>Contact your clinic reception or administrator.</li>
         <li>Verify your identity in person.</li>
         <li>They will issue you a new temporary password.</li>
        </ol>
       </div>
      </div>
     </div>

     <p className="mt-4 text-xs text-muted-foreground text-center leading-relaxed">
      Automated email password reset is not yet available for this clinic.
      If you are an administrator, reset other users from the{' '}
      <Link href="/admin/users" className="text-primary font-medium hover:underline">
       User Management
      </Link>{' '}
      page.
     </p>

     {/* Back to login */}
     <Link
      href="/login"
      className="mt-6 flex items-center justify-center gap-2 w-full h-11 border border-border bg-card
       text-sm font-medium text-foreground hover:bg-muted transition-colors"
     >
      <ArrowLeft className="h-4 w-4" />
      Back to sign in
     </Link>
    </div>

    {/* Footer strip */}
    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 sm:px-[33px] py-3 text-xs text-muted-foreground">
     <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 bg-emerald-500" />
      System Online
     </span>
     <div className="flex items-center gap-3">
      <Link href="/help" className="hover:underline">
       Help Center
      </Link>
      <Link href="/privacy" className="hover:underline">
       Privacy
      </Link>
     </div>
    </div>
   </div>
  </div>
 );
}
