'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { BriefcaseMedical, ArrowRight, AlertCircle, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { registerUser } from '@/server/actions/auth.actions';
import { toast } from 'sonner';
import { isValidPakistaniPhone, pakistaniPhoneMessage } from '@/lib/validators/phone';

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
    const dob = form.get('dob') as string;
    const gender = form.get('gender') as string;
    const phone = form.get('phone') as string;

    if (!isValidPakistaniPhone(phone)) {
      toast.error(pakistaniPhoneMessage);
      return;
    }

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
      await registerUser({ name, email, password, dob, gender, phone });

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[url('/azadi_register_bg.png')] bg-cover bg-center bg-no-repeat px-4 py-8 relative overflow-hidden">
      {/* Lighter Emerald Backdrop Overlay for High Image Visibility */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#002811]/60 via-[#01411C]/50 to-[#001c0b]/65 backdrop-blur-[1px] pointer-events-none" />

      {/* Radiant Glowing Elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Centered Glassmorphic Register Card */}
      <div className="bg-white/95 backdrop-blur-2xl shadow-[0_0_50px_-10px_rgba(1,65,28,0.5)] border-2 border-emerald-500/30 w-full max-w-[460px] overflow-hidden rounded-2xl relative z-10">
        {/* Pakistani Flag Top Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#01411C] via-white to-[#01411C]" />

        <div className="px-6 sm:px-8 pt-6 pb-6">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-10 w-10 rounded-xl bg-[#01411C] text-white flex items-center justify-center shadow-md border border-emerald-600/30">
                <BriefcaseMedical className="h-5.5 w-5.5 text-emerald-300" strokeWidth={2.25} />
              </div>
              <div className="text-left">
                <span className="text-2xl font-black tracking-tight text-[#01411C] block leading-none">
                  MediTrack
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-emerald-700 uppercase">
                  Patient Registration
                </span>
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              Create your Account
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              Book appointments &amp; manage your health record
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name & Email Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label htmlFor="name" className="text-xs font-bold text-gray-700">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Muhammad Ali"
                  required
                  minLength={2}
                  className="mt-1 w-full h-[44px] rounded-xl border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs font-bold text-gray-700">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ali@example.com"
                  required
                  className="mt-1 w-full h-[44px] rounded-xl border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Phone & DOB & Gender Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="phone" className="text-xs font-bold text-gray-700">
                  Phone (11 digits) *
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="03001234567"
                  required
                  minLength={11}
                  maxLength={11}
                  className="mt-1 w-full h-[44px] rounded-xl border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white text-xs"
                />
              </div>
              <div>
                <Label htmlFor="dob" className="text-xs font-bold text-gray-700">
                  Date of Birth *
                </Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  required
                  className="mt-1 w-full h-[44px] rounded-xl border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white text-xs px-2"
                />
              </div>
              <div>
                <Label htmlFor="gender" className="text-xs font-bold text-gray-700">
                  Gender *
                </Label>
                <select
                  id="gender"
                  name="gender"
                  required
                  defaultValue=""
                  className="mt-1 w-full h-[44px] px-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-800 focus:outline-none focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20"
                >
                  <option value="" disabled>Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Password & Confirm Password Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold text-gray-700">
                    Password *
                  </Label>
                  {strength.label && (
                    <span
                      className={`text-[10px] font-bold uppercase ${
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
                  placeholder="Min. 8 chars"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full h-[44px] rounded-xl border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white text-xs sm:text-sm"
                />
                {password && (
                  <div className="mt-1.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.score / 3) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirm" className="text-xs font-bold text-gray-700">
                  Confirm Password *
                </Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  placeholder="Repeat password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`mt-1 w-full h-[44px] rounded-xl border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white text-xs sm:text-sm ${
                    confirmTouched && !passwordsMatch
                      ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/40'
                      : ''
                  }`}
                />
                {confirmTouched && !passwordsMatch && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-center gap-2 pt-1.5">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="shrink-0 accent-[#01411C]"
              />
              <label htmlFor="terms" className="text-xs text-gray-600 font-normal leading-tight">
                I agree to the{' '}
                <Link href="/terms" className="text-[#01411C] font-bold hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-[#01411C] font-bold hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-[46px] bg-[#01411C] hover:bg-[#013316] text-white font-bold rounded-xl shadow-md shadow-[#01411C]/20 mt-1.5 cursor-pointer flex items-center justify-center gap-2 text-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-[#01411C] font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Patriotic Footer Strip */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-emerald-50/50 px-6 sm:px-8 py-3 text-[11px] text-gray-600">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            256-Bit SSL Encrypted
          </span>
          <span className="font-bold text-[#01411C]">
            Azadi Mubarak 🇵🇰
          </span>
        </div>
      </div>
    </div>
  );
}