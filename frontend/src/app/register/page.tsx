'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell, Form } from '@/components/auth-shell';
import { Button, Input } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { apiLogin } from '@/lib/session';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'creator' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        },
      });
      setError(null);
      const session = await apiLogin(form.email, form.password);
      const dest = session.user.role.toLowerCase() === 'brand' ? '/brand' : '/creator';
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Join UGCNP" subtitle="Create a creator or brand account" footer="Already have an account? Sign in.">
      <Form onSubmit={onSubmit}>
        <Input label="Full name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
        <Input label="Email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
        <Input label="Password" type="password" required value={form.password} onChange={(e) => set('password', e.target.value)} />
        <Input label="Confirm password" type="password" required value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">I am a…</span>
          <select
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#1b5e3b]"
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
          >
            <option value="creator">Creator</option>
            <option value="brand">Brand</option>
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </Form>
      <div className="mt-4 text-center text-sm">
        <Link href="/login" className="text-[#1b5e3b] hover:underline">
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}