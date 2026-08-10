import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { invoices } from '@/server/db/schema';
import { getActivePatient } from '@/server/actions/active-patient';
import { and, eq, gt } from 'drizzle-orm';
import NotificationBell from '@/components/shared/notification-bell';
import { format } from 'date-fns';
import { Receipt, TrendingUp, AlertCircle, Download } from 'lucide-react';
import Link from 'next/link';

function formatAmount(cents: number) {
 return `Rs ${(cents / 100).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
}

export default async function PatientBillingPage() {
 const session = await auth();
 if (!session || session.user.role !== 'patient') redirect('/login');

 const active = await getActivePatient();
 if (!active) redirect('/patient/appointments');

 const patientInvoices = await db
  .select()
  .from(invoices)
  .where(and(eq(invoices.patientId, active.id), gt(invoices.amount, 0)));

 const totalPaid = patientInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
 const totalOutstanding = patientInvoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0);

 const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  waived: 'bg-muted text-muted-foreground',
 };

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
    <p className="text-sm font-semibold text-foreground">My Billing</p>
    <NotificationBell />
   </div>

   <div className="px-6 py-8 max-w-3xl mx-auto">
    <h1 className="text-2xl font-bold text-foreground mb-1">Billing & Payments</h1>
    <p className="text-sm text-muted-foreground mb-6">View your invoices and payment history</p>

    {/* Summary */}
    <div className="grid grid-cols-2 gap-4 mb-6">
     <div className="bg-white border border-border p-5 shadow-sm">
      <div className="h-10 w-10 bg-emerald-50 flex items-center justify-center mb-3">
       <TrendingUp className="h-5 w-5 text-emerald-600" />
      </div>
      <p className="text-2xl font-bold text-foreground">{formatAmount(totalPaid)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Total Paid</p>
     </div>
     <div className="bg-white border border-border p-5 shadow-sm">
      <div className={`h-10 w-10 flex items-center justify-center mb-3 ${totalOutstanding > 0 ? 'bg-amber-50' : 'bg-muted'}`}>
       <AlertCircle className={`h-5 w-5 ${totalOutstanding > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{formatAmount(totalOutstanding)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Outstanding Balance</p>
     </div>
    </div>

    {/* Invoice list */}
    {patientInvoices.length === 0 ? (
     <div className="bg-white border border-border p-12 text-center shadow-sm">
      <Receipt className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground">No invoices yet</p>
      <p className="text-xs text-muted-foreground mt-1">Invoices are generated when you complete a consultation.</p>
     </div>
    ) : (
     <div className="bg-white border border-border overflow-hidden shadow-sm">
      <table className="w-full text-sm">
       <thead><tr className="border-b border-border bg-muted/30 text-left">
        <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
        <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
        <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
        <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Receipt</th>
       </tr></thead>
       <tbody className="divide-y divide-border">
        {patientInvoices.map((inv) => (
         <tr key={inv.id} className="hover:bg-muted/20">
          <td className="px-5 py-3.5 text-muted-foreground">{format(new Date(inv.createdAt), 'MMM d, yyyy')}</td>
          <td className="px-5 py-3.5 font-semibold text-foreground">{formatAmount(inv.amount)}</td>
          <td className="px-5 py-3.5">
           <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${statusStyles[inv.status] ?? statusStyles.pending}`}>
            {inv.status}
           </span>
          </td>
          <td className="px-5 py-3.5 text-right">
           {inv.status === 'paid' && (
            <Link href={`/invoices/${inv.id}/print`} target="_blank" className="text-xs font-medium text-primary hover:underline flex items-center gap-1 justify-end">
             <Download className="h-3 w-3" /> Receipt
            </Link>
           )}
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    )}
   </div>
  </div>
 );
}
