import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDoctorRatingSummaries } from '@/server/actions/reviews.actions';
import { getAllDoctors } from '@/server/actions/doctors.actions';
import { StarRating } from '@/components/shared/star-rating';
import { Stethoscope, ChevronRight } from 'lucide-react';

export default async function PatientDoctorsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'patient') redirect('/login');

  const doctors = await getAllDoctors();
  const ratingMap = await getDoctorRatingSummaries(doctors.map((d) => d.id));

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Find a Doctor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse our specialists, read patient reviews, and book an appointment.
          </p>
        </div>

        {/* Doctor cards */}
        {doctors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground shadow-sm">
            <Stethoscope className="h-8 w-8 opacity-30 mx-auto mb-3" />
            <p className="text-sm font-medium">No doctors available yet.</p>
            <p className="text-xs mt-1">Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {doctors.map((doc) => {
              const r = ratingMap.get(doc.id);
              const avg = r?.average ?? 0;
              const count = r?.count ?? 0;
              const initials = (doc.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
              return (
                <Link
                  key={doc.id}
                  href={`/patient/doctors/${doc.id}`}
                  className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        Dr. {doc.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.specialization}</p>
                      <div className="mt-2">
                        <StarRating rating={avg} showNumber count={count} />
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
