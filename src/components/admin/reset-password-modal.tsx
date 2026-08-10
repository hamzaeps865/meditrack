'use client';

import { useState, useTransition } from 'react';
import { KeyRound, Eye, EyeOff, X, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import { resetUserPassword } from '@/server/actions/users.actions';
import { toast } from 'sonner';

interface ResetPasswordModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
}

export default function ResetPasswordModal({
  userId,
  userName,
  userEmail,
  onClose,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let res = 'Medi#';
    for (let i = 0; i < 7; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setConfirmPassword(res);
    toast.info('Random password generated.');
  }

  function handleCopy() {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success('Password copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      try {
        await resetUserPassword({ userId, newPassword: password });
        toast.success(`Password reset successfully for ${userName}!`);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to reset password.');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Reset User Password</h3>
              <p className="text-xs text-muted-foreground">Admin override for user access</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
            <p className="font-semibold text-foreground">{userName}</p>
            <p className="text-muted-foreground font-mono">{userEmail}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-foreground">New Password</label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Generate Random
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 8 chars)"
                minLength={8}
                className="w-full h-10 pl-3 pr-16 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {password && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy password"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={8}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border bg-white text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-9 px-5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Reset Password
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
