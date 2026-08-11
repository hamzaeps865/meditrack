'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BriefcaseMedical, Eye, EyeOff, Phone, Mail, Loader2, Sparkles, Flag, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sendOtp, verifyOtp } from '@/server/actions/phone-auth.actions';
import { isValidPakistaniPhone, pakistaniPhoneMessage } from '@/lib/validators/phone';

type LoginMode = 'email' | 'phone';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<LoginMode>('email');

  // Phone OTP state
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  async function handleSendOtp() {
    if (!isValidPakistaniPhone(phone)) {
      toast.error(pakistaniPhoneMessage);
      return;
    }
    setSendingOtp(true);
    try {
      const result = await sendOtp(phone);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to send code');
      } else {
        setOtpSent(true);
        toast.success(`Your verification code: ${result.code}`, { duration: 10000 });
      }
    } catch {
      toast.error('Failed to send code');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 4) {
      toast.error('Enter the 4-digit code');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp({ phone, code: otpCode });
      if (!result.success || !result.email) {
        toast.error(result.error ?? 'Verification failed');
        setLoading(false);
        return;
      }

      const signInResult = await signIn('credentials', {
        email: result.email,
        password: '__OTP_VERIFIED__',
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error('Login failed after verification');
        setLoading(false);
        return;
      }

      router.push('/');
    } catch {
      toast.error('Verification failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[url('/azadi_bg.png')] bg-cover bg-center bg-no-repeat px-4 py-10 relative overflow-hidden">
      {/* Dark Cinematic Backdrop Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00180a]/85 via-[#012d13]/80 to-[#001207]/90 backdrop-blur-[1px] pointer-events-none" />

      {/* Vibrant Ambient Glow Rings */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />



      {/* Main Glassmorphic Card (Flat rectangular layout without rounded corners) */}
      <div className="bg-white/95 backdrop-blur-2xl shadow-[0_0_50px_-10px_rgba(1,65,28,0.5)] border-2 border-emerald-500/30 w-full max-w-[380px] overflow-hidden rounded-none relative z-10">
        {/* Pakistani Flag Top Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#01411C] via-white to-[#01411C]" />

        <div className="px-5 sm:px-6 pt-5 pb-5">
          {/* Brand & Emblem */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-11 w-11 rounded-none bg-[#01411C] text-white flex items-center justify-center shadow-md border border-emerald-600/30">
                <BriefcaseMedical className="h-6 w-6 text-emerald-300" strokeWidth={2.25} />
              </div>
              <div className="text-left">
                <span className="text-2xl font-black tracking-tight text-[#01411C] block leading-none">
                  MediTrack
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-emerald-700 uppercase">
                  Healthcare Portal
                </span>
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              Sign in to your account
            </h1>
            <p className="text-gray-500 text-xs mt-1">
              Secure Access for Doctors, Staff & Patients
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1.5 mb-5 bg-gray-100 p-1 rounded-none border border-gray-200/80">
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-bold rounded-none transition-all ${
                mode === 'email'
                  ? 'bg-[#01411C] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Email Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('phone')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-bold rounded-none transition-all ${
                mode === 'phone'
                  ? 'bg-[#01411C] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              Phone OTP
            </button>
          </div>

          {mode === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-xs font-bold text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="doctor@clinic.com"
                  required
                  className="mt-1.5 w-full h-[44px] rounded-none border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white"
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-xs font-bold text-gray-700">
                  Password
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full h-[44px] pr-10 rounded-none border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#01411C] font-semibold hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-[48px] bg-[#01411C] hover:bg-[#013316] text-white font-bold rounded-none shadow-lg shadow-[#01411C]/20 mt-2 transition-all cursor-pointer flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Portal
                  </>
                )}
              </Button>
            </form>
          )}

          {mode === 'phone' && (
            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <div>
                    <Label htmlFor="phone" className="text-xs font-bold text-gray-700">
                      Pakistani Phone Number (11 digits)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="03001234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      maxLength={11}
                      className="mt-1.5 w-full h-[44px] rounded-none border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Must start with 0 (e.g. 03001234567)
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="w-full h-[48px] bg-[#01411C] hover:bg-[#013316] text-white font-bold rounded-none shadow-lg shadow-[#01411C]/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending Code...
                      </>
                    ) : (
                      'Send Verification Code'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-none text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Code sent to <strong>{phone}</strong>
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="otp" className="text-xs font-bold text-gray-700">
                      Enter 4-Digit Code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="1234"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="mt-1.5 w-full h-[48px] text-center text-2xl tracking-[0.5em] font-bold rounded-none border-gray-300 focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/20 bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || otpCode.length !== 4}
                    className="w-full h-[48px] bg-[#01411C] hover:bg-[#013316] text-white font-bold rounded-none shadow-lg shadow-[#01411C]/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      'Verify & Sign In'
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    className="w-full text-xs text-gray-500 hover:text-gray-800 font-medium"
                  >
                    ← Change phone number
                  </button>
                </>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mt-6">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-none border border-emerald-200/60">
              Secure Medical Access
            </span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <p className="mt-5 text-center text-xs text-gray-600">
            Don&apos;t have a patient account?{' '}
            <Link href="/register" className="text-[#01411C] font-bold hover:underline">
              Register New Patient
            </Link>
          </p>
        </div>

        {/* Patriotic Footer Strip */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-emerald-50/50 px-6 sm:px-[33px] py-3 text-[11px] text-gray-600">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-none bg-emerald-600 animate-ping" />
            MediTrack Systems Online
          </span>
          <div className="flex items-center gap-3 font-semibold text-[#01411C]">
            <span>Azadi Mubarak 🇵🇰</span>
          </div>
        </div>
      </div>
    </div>
  );
}
