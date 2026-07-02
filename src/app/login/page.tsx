'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BriefcaseMedical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    });

    if (result?.error) {
      toast.error('Invalid email or password');
      setLoading(false);
      return;
    }

    router.push('/');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <div className="bg-card rounded-xl shadow-sm border border-border w-full max-w-[420px] overflow-hidden">
        <div className="px-6 sm:px-[33px] pt-8 pb-6">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BriefcaseMedical className="h-6 w-6 text-primary" strokeWidth={2.25} />
              <span className="text-xl font-bold text-primary">MediTrack</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              Sign in to MediTrack
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Clinic Patient &amp; Appointment Management
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="doctor@clinic.com"
                required
                className="mt-1 w-full h-[44px]"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full h-[44px] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-[48px] rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground mt-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mt-[32px]">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Secure Professional Access
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <p className="mt-[24px] text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Register
            </Link>
          </p>
        </div>

        {/* Footer strip */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 sm:px-[33px] py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            System Online
          </span>
          <div className="flex items-center gap-3">
            <Link href="/help" className="hover:underline">
              Help Center
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}