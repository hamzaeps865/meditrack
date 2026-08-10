'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createReview, getReviewForAppointment } from '@/server/actions/reviews.actions';
import { Star, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewModal({
 appointmentId,
 doctorId,
 doctorName,
}: {
 appointmentId: string;
 doctorId: string;
 doctorName: string;
}) {
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [isPending, startTransition] = useTransition();
 const [rating, setRating] = useState(0);
 const [hover, setHover] = useState(0);
 const [comment, setComment] = useState('');
 const [alreadyReviewed, setAlreadyReviewed] = useState(false);
 const [checked, setChecked] = useState(false);

 // Check if this appointment was already reviewed (once, when first opened)
 useEffect(() => {
  if (!open || checked) return;
  startTransition(async () => {
   try {
    const existing = await getReviewForAppointment(appointmentId);
    if (existing) setAlreadyReviewed(true);
   } catch {
    /* non-critical */
   }
   setChecked(true);
  });
 }, [open, appointmentId, checked]);

 function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (rating === 0) {
   toast.error('Please select a star rating.');
   return;
  }
  startTransition(async () => {
   try {
    await createReview({ appointmentId, doctorId, rating, comment: comment || undefined });
    toast.success('Thank you! Your review has been submitted.');
    setOpen(false);
    router.refresh();
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to submit review.');
   }
  });
 }

 if (alreadyReviewed) {
  return (
   <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
    <CheckCircle2 className="h-3.5 w-3.5" />
    Reviewed
   </span>
  );
 }

 return (
  <>
   <button
    type="button"
    onClick={() => setOpen(true)}
    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
   >
    <Star className="h-3.5 w-3.5" />
    Leave Review
   </button>

   {open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
     <div className="bg-white shadow-xl border border-border w-full max-w-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
       <div>
        <h3 className="text-base font-bold text-foreground">Rate Your Visit</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Dr. {doctorName}</p>
       </div>
       <button
        type="button"
        onClick={() => setOpen(false)}
        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted"
       >
        <X className="h-4 w-4" />
       </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
       {/* Star picker */}
       <div className="text-center py-2">
        <label className="block text-xs font-medium text-muted-foreground mb-3">
         How was your experience?
        </label>
        <div className="flex items-center justify-center gap-2">
         {[1, 2, 3, 4, 5].map((star) => (
          <button
           key={star}
           type="button"
           onClick={() => setRating(star)}
           onMouseEnter={() => setHover(star)}
           onMouseLeave={() => setHover(0)}
           className="p-1"
          >
           <Star
            className={`h-8 w-8 transition-colors ${
             (hover || rating) >= star
              ? 'text-amber-400 fill-amber-400'
              : 'text-muted-foreground/30'
            }`}
           />
          </button>
         ))}
        </div>
        {rating > 0 && (
         <p className="text-xs font-medium text-foreground mt-2">
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
         </p>
        )}
       </div>

       {/* Comment */}
       <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
         Comments <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <textarea
         value={comment}
         onChange={(e) => setComment(e.target.value)}
         rows={3}
         placeholder="Share details about your visit..."
         className="w-full px-3 py-2.5 border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
        />
       </div>

       {/* Actions */}
       <div className="flex items-center justify-end gap-2 pt-2">
        <button
         type="button"
         onClick={() => setOpen(false)}
         className="h-10 px-4 border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
         Cancel
        </button>
        <button
         type="submit"
         disabled={isPending || rating === 0}
         className="h-10 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
         {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
         Submit Review
        </button>
       </div>
      </form>
     </div>
    </div>
   )}
  </>
 );
}
