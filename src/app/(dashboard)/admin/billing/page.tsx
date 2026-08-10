import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getInvoices, getBillingSummary } from '@/server/actions/billing.actions';
import BillingActions from '@/components/admin/billing-actions';
import NotificationBell from '@/components/shared/notification-bell';
import { format } from 'date-fns';
import { Receipt, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

function formatAmount(cents: number) {
 return `Rs ${(cents / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
}

export default async function AdminBillingPage() {
 const session = await auth();
 if (!session || (session.user.role !== 'admin' && session.user.role !== 'receptionist')) {
  redirect('/login');
 }

 const [invoices, summary] = await Promise.all([
  getInvoices(),
  getBillingSummary(),
 ]);

 const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  waived: 'bg-muted text-muted-foreground',
 };

 return (
  <div className="min-h-full bg-[#f0f7f3]">
   <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-2">
     <Receipt className="h-4 w-4 text-primary" />
     <p className="text-sm font-semibold text-foreground">Billing & Invoices</p>
    </div>
    <NotificationBell />
   </div>

   <div className="px-6 py-8 max-w-5xl mx-auto">
    <h1 className="text-2xl font-bold text-foreground mb-1">Billing</h1>
    <p className="text-sm text-muted-foreground mb-6">
     Track invoices, payments, and outstanding balances.
    </p>

    {/* Summary cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="premium-card premium-card-pad">
      <div className="h-10 w-10 bg-emerald-50 flex items-center justify-center mb-3">
       <TrendingUp className="h-5 w-5 text-emerald-600" />
      </div>
      <p className="text-2xl font-bold text-foreground">{formatAmount(summary.totalRevenue)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Total Revenue (Paid)</p>
     </div>
    <div className="premium-card premium-card-pad">
      <div className="h-10 w-10 bg-amber-50 flex items-center justify-center mb-3">
       <AlertCircle className="h-5 w-5 text-amber-600" />
      </div>
      <p className="text-2xl font-bold text-foreground">{formatAmount(summary.outstanding)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Outstanding</p>
     </div>
    <div className="premium-card premium-card-pad">
      <div className="h-10 w-10 bg-emerald-50 flex items-center justify-center mb-3">
       <Receipt className="h-5 w-5 text-emerald-700" />
      </div>
      <p className="text-2xl font-bold text-foreground">{summary.totalInvoices}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Total Invoices</p>
     </div>
    <div className="premium-card premium-card-pad">
      <div className="h-10 w-10 bg-emerald-50 flex items-center justify-center mb-3">
       <CheckCircle2 className="h-5 w-5 text-emerald-700" />
      </div>
      <p className="text-2xl font-bold text-foreground">{summary.paidCount}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Paid Invoices</p>
     </div>
    </div>

    {/* Invoice list */}
    {invoices.length === 0 ? (
        <div className="premium-card p-12 text-center">
      <Receipt className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground">No invoices yet</p>
      <p className="text-xs text-muted-foreground mt-1">
       Invoices are generated automatically when a doctor completes a visit.
      </p>
     </div>
    ) : (
        <div className="premium-card overflow-hidden">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-border bg-muted/30 text-left">
         <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Patient</th>
         <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Doctor</th>
         <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
         <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
         <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
         <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Actions</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {invoices.map((inv) => (
         <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
          <td className="px-5 py-3.5 font-medium text-foreground">{inv.patientName ?? '—'}</td>
          <td className="px-5 py-3.5 text-muted-foreground">Dr. {inv.doctorName ?? '—'}</td>
          <td className="px-5 py-3.5 text-muted-foreground">{format(new Date(inv.createdAt), 'MMM d, yyyy')}</td>
          <td className="px-5 py-3.5 font-semibold text-foreground">{formatAmount(inv.amount)}</td>
          <td className="px-5 py-3.5">
           <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${statusStyles[inv.status] ?? statusStyles.pending}`}>
            {inv.status}
           </span>
          </td>
          <td className="px-5 py-3.5 text-right">
           <div className="flex items-center justify-end gap-2">
            <Link
             href={`/invoices/${inv.id}/print`}
             target="_blank"
             className="text-xs font-medium text-primary hover:underline"
            >
             Receipt
            </Link>
            {inv.status === 'pending' && <BillingActions invoiceId={inv.id} />}
           </div>
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
