import { auth } from '@/server/auth';

type Role = 'admin' | 'doctor' | 'receptionist' | 'patient';

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