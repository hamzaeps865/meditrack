import 'next-auth';

declare module 'next-auth' {
  interface User {
    role: 'admin' | 'doctor' | 'receptionist' | 'patient';
  }
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'doctor' | 'receptionist' | 'patient';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'doctor' | 'receptionist' | 'patient';
  }
}