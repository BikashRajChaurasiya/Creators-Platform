'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell, Form } from '@/components/auth-shell';
import { Button, Input } from '@/components/ui';
import { apiLogin } from '@/lib/session';
import { ApiError } from '@/lib/api';

const ROLE_PATH: Record<string, string> = { creator: '/creator', brand: '/brand', admin: '/admin' };

function PasswordEye({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      {open ? (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 002.8 2.8M6.2 6.2C4.1 7.5 2.7 9.6 2 12s3.5 6 10 6c1.7 0 3.2-.3 4.5-.9M9.4 4.2C10.2 4 11.1 4 12 4c6.5 0 10 8 10 8-.8 1.7-2 3.3-3.5 4.5" />
        </>
      )}
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await apiLogin(email, password, remember);
      const role = session.user.role.toLowerCase();
      const dest = params.get('next') ?? ROLE_PATH[role] ?? '/';
      router.push(dest);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your creator or brand account" footer={<>New here? <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link></>}>
      <Form onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <div className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">Password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:text-neutral-600"
            >
              <PasswordEye open={showPassword} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-sm">
          <label className="flex items-center gap-2 text-neutral-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-primary"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full py-2.5">
          {loading ? <span className="inline-flex items-center gap-2"><SpinnerSm /> Signing in…</span> : 'Sign in'}
        </Button>
      </Form>
    </AuthShell>
  );
}

function SpinnerSm() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/60 border-t-white" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="Welcome back" subtitle="Sign in to your creator or brand account" footer={null}>…</AuthShell>}>
      <LoginForm />
    </Suspense>
  );
}