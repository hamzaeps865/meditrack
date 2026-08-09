import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { patients } from '@/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

type Role = 'admin' | 'doctor' | 'receptionist' | 'patient' | 'nurse' | 'pharmacist';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// Ensures a session exists at all
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError('You must be logged in.');
  }
  return session;
}

// Ensures the logged-in user has one of the allowed roles
export async function requireRole(allowedRoles: Role[]) {
  const session = await requireSession();
  if (!allowedRoles.includes(session.user.role)) {
    throw new UnauthorizedError(`Requires one of: ${allowedRoles.join(', ')}`);
  }
  return session;
}

// Ensures a doctor can only act on their own patients/appointments
export async function assertDoctorOwnsResource(doctorUserId: string) {
  const session = await requireSession();
  if (session.user.role === 'admin') return session; // admins bypass scope checks
  if (session.user.role !== 'doctor' || session.user.id !== doctorUserId) {
    throw new UnauthorizedError('You do not have access to this resource.');
  }
  return session;
}

// Ensures a patient can only view their own records
export async function assertPatientOwnsResource(patientUserId: string) {
  const session = await requireSession();
  if (session.user.role === 'admin') return session;
  if (session.user.role !== 'patient' || session.user.id !== patientUserId) {
    throw new UnauthorizedError('You do not have access to this resource.');
  }
  return session;
}

// Ensures a patient (matched by email since there is no patients.user_id FK)
// can only act on their own patient record. Admins bypass.
//
// We resolve the patient row and require that its email equals the logged-in
// user's email. This is the email-join that links users → patients today.
export async function assertPatientOwnsPatientRecord(
  patientId: string,
  session?: Awaited<ReturnType<typeof requireSession>>,
) {
  const sess = session ?? (await requireSession());
  if (sess.user.role !== 'patient') return sess;

  const [patient] = await db
    .select({ email: patients.email, managedBy: patients.managedBy })
    .from(patients)
    .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)));

  // Access is granted if this is the patient's own record (matched by email)
  // OR if the logged-in patient user manages this record (Family Profiles).
  const isOwner = patient && patient.email === sess.user.email;
  const isManager = patient && patient.managedBy === sess.user.id;
  if (!patient || (!isOwner && !isManager)) {
    throw new UnauthorizedError('You do not have access to this resource.');
  }
  return sess;
}