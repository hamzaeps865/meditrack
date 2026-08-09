'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BriefcaseMedical, Eye, EyeOff, Phone, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sendOtp, verifyOtp } from '@/server/actions/phone-auth.actions';

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
    if (!phone.trim() || phone.trim().length < 7) {
      toast.error('Enter a valid phone number');
      return;
    }
    setSendingOtp(true);
    try {
      const result = await sendOtp(phone);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to send code');
      } else {
        setOtpSent(true);
        // Show the code in a toast (in-app OTP — replace with SMS in production)
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

      // Sign in using the email — the OTP verified their identity, so we use
      // a special "otp-verified" password that the authorize function recognizes
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

          {/* Mode toggle */}
          <div className="flex items-center gap-2 mb-5 bg-muted/40 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-medium transition-colors ${
                mode === 'email' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setMode('phone')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-medium transition-colors ${
                mode === 'phone' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              Phone
            </button>
          </div>

          {mode === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <Link href="/forgot-password" className="text-sm text-primary font-medium hover:underline">
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
          )}

          {mode === 'phone' && (
            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="mt-1 w-full h-[44px]"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="w-full h-[48px] rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer flex items-center justify-center gap-2"
                  >
                    {sendingOtp ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : 'Send Code'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 text-center">
                    Enter the 4-digit code sent to <strong>{phone}</strong>
                  </div>
                  <div>
                    <Label htmlFor="otp" className="text-sm font-medium text-foreground">
                      Verification Code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="1234"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="mt-1 w-full h-[44px] text-center text-2xl tracking-[0.5em] font-bold"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || otpCode.length !== 4}
                    className="w-full h-[48px] rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify & Sign In'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← Use a different phone number
                  </button>
                </>
              )}
            </div>
          )}

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
