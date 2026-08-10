import 'next-auth';

declare module 'next-auth' {
  interface User {
    role: 'admin' | 'doctor' | 'receptionist' | 'patient' | 'nurse' | 'pharmacist' | 'lab';
  }
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'doctor' | 'receptionist' | 'patient' | 'nurse' | 'pharmacist' | 'lab';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'doctor' | 'receptionist' | 'patient' | 'nurse' | 'pharmacist' | 'lab';
  }
}