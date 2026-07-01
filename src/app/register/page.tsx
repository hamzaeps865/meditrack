'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerUser } from '@/server/actions/auth.actions';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name     = form.get('name') as string;
    const email    = form.get('email') as string;
    const password = form.get('password') as string;
    const confirm  = form.get('confirm') as string;

    if (password !== confirm) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-md">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-700">MediTrack</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              required
              minLength={2}
              className="mt-1"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="mt-1"
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Min. 8 characters"
              required
              minLength={8}
              className="mt-1"
            />
          </div>

          {/* Confirm password */}
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="Repeat your password"
              required
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-cyan-700 hover:bg-cyan-800 mt-2"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
