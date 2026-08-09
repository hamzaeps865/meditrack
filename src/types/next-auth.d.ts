import 'next-auth';

declare module 'next-auth' {
  interface User {
    role: 'admin' | 'doctor' | 'receptionist' | 'patient' | 'nurse' | 'pharmacist';
  }
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'doctor' | 'receptionist' | 'patient' | 'nurse' | 'pharmacist';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'doctor' | 'receptionist' | 'patient' | 'nurse' | 'pharmacist';
  }
}