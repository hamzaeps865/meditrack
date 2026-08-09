import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getReviewsForDoctor, getDoctorRatingSummary } from '@/server/actions/reviews.actions';
import { getAllDoctors } from '@/server/actions/doctors.actions';
import { StarRating } from '@/components/shared/star-rating';
import { Calendar, Stethoscope, BadgeCheck, Quote } from 'lucide-react';
import { format } from 'date-fns';

export default async function PatientDoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  const { id } = await params;

  // Find this doctor from the list (avoids a new query + role-scoped)
  const allDoctors = await getAllDoctors();
  const doctor = allDoctors.find((d) => d.id === id);

  if (!doctor) {
    return (
      <div className="min-h-full bg-[#f5f7fa] flex items-center justify-center">
        <div className="text-center">
          <Stethoscope className="h-10 w-10 text-muted-foreground opacity-30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Doctor not found.</p>
          <Link href="/patient/doctors" className="text-xs text-primary hover:underline mt-2 inline-block">
            ← Back to all doctors
          </Link>
        </div>
      </div>
    );
  }

  const [reviews, summary] = await Promise.all([
    getReviewsForDoctor(doctor.id),
    getDoctorRatingSummary(doctor.id),
  ]);

  const initials = (doctor.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  // Star distribution (5→1)
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <div className="px-6 py-8 max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/patient/doctors" className="text-xs text-muted-foreground hover:text-foreground mb-4 inline-block">
          ← All doctors
        </Link>

        {/* Doctor header card */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-5">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">Dr. {doctor.name}</h1>
                <BadgeCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{doctor.specialization}</p>
              <div className="flex items-center gap-3 mt-2">
                <StarRating rating={summary.average} size={16} showNumber count={summary.count} />
              </div>
            </div>
            <Link
              href="/patient/appointments/new"
              className="shrink-0 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="h-4 w-4" />
              Book
            </Link>
          </div>
        </div>

        {/* Rating breakdown */}
        {summary.count > 0 && (
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm mb-5">
            <h2 className="text-sm font-bold text-foreground mb-4">Rating Breakdown</h2>
            <div className="space-y-2">
              {distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">{d.star} star</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${summary.count > 0 ? (d.count / summary.count) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground mb-4">
            Patient Reviews {summary.count > 0 && <span className="text-muted-foreground font-normal">({summary.count})</span>}
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <Quote className="h-8 w-8 text-muted-foreground opacity-20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review after your visit!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-border last:border-b-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">
                        {review.patientName?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm font-medium text-foreground">{review.patientName ?? 'Anonymous'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(review.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <StarRating rating={review.rating} size={13} />
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
