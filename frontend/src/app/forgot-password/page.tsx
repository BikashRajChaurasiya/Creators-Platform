'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { AuthShell, Form } from '@/components/auth-shell';
import { Button, Input } from '@/components/ui';
import { apiRequest } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function sendCode() {
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: { email, purpose: 'PASSWORD_RESET' },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a code.');
    } finally {
      setLoading(false);
    }
  }

  function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void sendCode();
  }

  async function reset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters, with letters and numbers.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { email, code, newPassword },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Password reset"
        subtitle="Your password was successfully changed."
        footer={
          <Button onClick={() => router.push('/login')} className="mt-1 w-full py-2.5">
            Sign in with your new password
          </Button>
        }
      >
        <div className="flex flex-col items-center py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="mt-3 text-sm text-neutral-500">
            You can now sign in with your new password. All your existing sessions were signed out for safety.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we&apos;ll send a one-time code to reset it."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {!sent ? (
        <Form onSubmit={handleSend}>
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
          <p className="flex items-center gap-2 text-xs text-neutral-400">
            <Mail className="h-3.5 w-3.5" />
            The code expires in 5 minutes and works once.
          </p>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full py-2.5">
            {loading ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Sending code…
              </>
            ) : (
              'Send reset code'
            )}
          </Button>
        </Form>
      ) : (
        <Form onSubmit={reset}>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            We sent a 6-digit code to <span className="font-medium">{email}</span>. Check your inbox (and spam folder).
          </div>
          <Input
            label="6-digit code"
            required
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
          />
          <Input
            label="New password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm new password"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="Repeat your password"
          />
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full py-2.5">
            {loading ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Resetting…
              </>
            ) : (
              'Reset password'
            )}
          </Button>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={loading}
            className="mx-auto flex items-center gap-1.5 text-xs text-neutral-400 hover:text-primary disabled:opacity-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Resend code (codes are throttled to one per minute)
          </button>
        </Form>
      )}
    </AuthShell>
  );
}