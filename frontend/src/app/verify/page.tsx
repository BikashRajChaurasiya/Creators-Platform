'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell, Form } from '@/components/auth-shell';
import { Button } from '@/components/ui';
import { apiRequest, ApiError } from '@/lib/api';
import { saveSession, Session } from '@/lib/session';
import type { AuthTokens, AuthUser } from '@ugcnp/shared';

const ROLE_PATH: Record<string, string> = { creator: '/creator', brand: '/brand', admin: '/admin' };

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const purpose = (params.get('purpose') ?? 'REGISTER') as 'REGISTER' | 'LOGIN';
  const next = params.get('next');

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  async function resend() {
    if (!email || sending || countdown > 0) return;
    setSending(true);
    setError(null);
    try {
      await apiRequest('/auth/request-otp', { method: 'POST', body: { email, purpose } });
      setResent(true);
      setCountdown(30);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send a new code.');
    } finally {
      setSending(false);
    }
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest<AuthUser & AuthTokens & { user?: AuthUser }>('/auth/verify-otp', {
        method: 'POST',
        body: { email, code, purpose },
      });
      const verifiedUser = data.user ?? (data as AuthUser);
      const session: Session = {
        user: verifiedUser,
        tokens: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessExpiresIn: data.accessExpiresIn,
          refreshExpiresIn: data.refreshExpiresIn,
          tokenType: data.tokenType ?? 'Bearer',
        },
      };
      saveSession(session);
      const role = verifiedUser.role.toLowerCase();
      router.push(next && next.startsWith('/') ? next : ROLE_PATH[role] ?? '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle={email ? <>We sent a 6-digit code to <span className="font-medium text-primary">{email}</span></> : 'Enter the code emailed to you'}
      footer={<Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
    >
      <Form onSubmit={verify}>
        <CodeInput value={code} onChange={setCode} />
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {resent && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">A new code has been sent.</p>}
        <Button type="submit" disabled={loading || code.length !== 6} className="w-full py-2.5">
          {loading ? 'Verifying…' : 'Verify'}
        </Button>
        <p className="text-center text-sm text-neutral-500">
          Didn&apos;t get it?{' '}
          <button type="button" onClick={resend} disabled={sending || countdown > 0} className="font-medium text-primary hover:underline disabled:opacity-50">
            {countdown > 0 ? `Resend in ${countdown}s` : sending ? 'Sending…' : 'Resend code'}
          </button>
        </p>
      </Form>
    </AuthShell>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-600">Verification code</span>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        pattern="[0-9]*"
        required
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="••••••"
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-center text-lg tracking-[0.5em] outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary-soft"
      />
    </label>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<AuthShell title="Verify your email" subtitle="Enter the code emailed to you" footer={null}>…</AuthShell>}>
      <VerifyForm />
    </Suspense>
  );
}