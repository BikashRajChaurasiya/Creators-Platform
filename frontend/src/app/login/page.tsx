'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell, Form } from '@/components/auth-shell';
import { Button, Input } from '@/components/ui';
import { apiLogin } from '@/lib/session';
import { ApiError } from '@/lib/api';

const ROLE_PATH: Record<string, string> = { creator: '/creator', brand: '/brand', admin: '/admin' };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await apiLogin(email, password);
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
    <AuthShell title="UGCNP" subtitle="Sign in to the creator economy platform" footer="New here? Create an account.">
      <p className="mb-2 text-center text-xs text-neutral-400">
        Demo: admin@ugcnp.local / aaravshrestha@ugcnp.local / himalayanteaco@ugcnp.local (password Password123!)
      </p>
      <Form onSubmit={onSubmit}>
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Form>
      <div className="mt-4 text-center text-sm">
        <Link href="/register" className="text-[#1b5e3b] hover:underline">
          Create account
        </Link>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="UGCNP" subtitle="Sign in to the creator economy platform" footer="New here? Create an account.">…</AuthShell>}>
      <LoginForm />
    </Suspense>
  );
}