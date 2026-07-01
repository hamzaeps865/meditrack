import { auth } from '@/server/auth';
import { NextResponse } from 'next/server';

const roleHomeMap: Record<string, string> = {
  admin: '/admin',
  doctor: '/doctor',
  receptionist: '/receptionist',
  patient: '/patient',
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtectedRoute = Object.values(roleHomeMap).some((p) => pathname.startsWith(p));

  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session && isAuthRoute) {
    const home = roleHomeMap[session.user.role] ?? '/';
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (session && isProtectedRoute) {
    const allowedPrefix = roleHomeMap[session.user.role];
    if (!pathname.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(allowedPrefix, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/doctor/:path*', '/receptionist/:path*', '/patient/:path*', '/login', '/register'],
};