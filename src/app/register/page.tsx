'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { registerUser } from '@/server/actions/auth.actions';
import { toast } from 'sonner';

// --- Password strength helper -------------------------------------------
type Strength = { label: string; score: number; color: string };

function getPasswordStrength(password: string): Strength {
  if (!password) return { label: '', score: 0, color: 'bg-gray-200' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-red-500' };
  if (score <= 3) return { label: 'Medium', score: 2, color: 'bg-amber-500' };
  return { label: 'Strong', score: 3, color: 'bg-emerald-600' };
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const confirmTouched = confirm.length > 0;
  const passwordsMatch = password === confirm;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const email = form.get('email') as string;

    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    if (!agreed) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      await registerUser({ name, email, password });

      // Auto sign-in after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Account created but sign-in failed. Please log in manually.');
        router.push('/login');
        return;
      }

      toast.success('Account created successfully!');
      router.push('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10 sm:py-10">
      {/* Brand */}
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" strokeWidth={2.25} />
        <span className="text-xl font-bold text-primary">MediTrack</span>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border w-full max-w-[420px] px-6 sm:px-[33px] py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            Create your account
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Join thousands of healthcare professionals today.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Full Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Dr. Jane Smith"
              required
              minLength={2}
              className="mt-1 w-full h-[44px]"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane.smith@clinic.com"
              required
              className="mt-1 w-full h-[44px]"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              {strength.label && (
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    strength.score === 1
                      ? 'text-red-500'
                      : strength.score === 2
                      ? 'text-amber-500'
                      : 'text-emerald-600'
                  }`}
                >
                  {strength.label}
                </span>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Min. 8 characters"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full h-[44px]"
            />
            {password && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${(strength.score / 3) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
              Confirm Password
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="Repeat your password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`mt-1 w-full h-[44px] ${
                confirmTouched && !passwordsMatch
                  ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/40'
                  : ''
              }`}
            />
            {confirmTouched && !passwordsMatch && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                Passwords don&apos;t match
              </p>
            )}
          </div>

          {/* Terms agreement */}
          <div className="flex items-start gap-2 pt-1 w-full">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5 shrink-0"
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground font-normal leading-snug">
              I agree to the{' '}
              <Link href="/terms" className="text-primary font-semibold hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary font-semibold hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-[48px] rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground mt-2 gap-2"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <hr className="mt-[48px] border-border" />

        <p className="mt-[24px] text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground/60">
          <Link href="/support" className="hover:underline">Support</Link>
          <span>•</span>
          <Link href="/docs" className="hover:underline">Documentation</Link>
          <span>•</span>
          <Link href="/status" className="hover:underline">System Status</Link>
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground/40">
          © 2024 MediTrack SaaS. All rights reserved.
        </p>
      </div>
    </div>
  );
}