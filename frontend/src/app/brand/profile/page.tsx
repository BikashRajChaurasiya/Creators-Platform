'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { BRAND_NAV } from '@/lib/ui';
import { Badge, Card, Input, TextArea } from '@/components/ui';
import { Avatar } from '@/components/avatar';
import { UploadImageButton } from '@/components/image-upload';
import { useApi } from '@/lib/use-api';
import { apiRequest } from '@/lib/api';
import { Session } from '@/lib/session';

interface BrandProfile {
  companyName: string;
  industry: string;
  website?: string | null;
  contactPerson: string;
  description?: string | null;
  address?: string | null;
  verificationStatus?: string;
  user: { name: string; avatarUrl?: string | null };
}

function BrandProfileForm({ session, profile }: { session: Session; profile: BrandProfile }) {
  const [form, setForm] = useState({
    companyName: profile.companyName ?? '',
    industry: profile.industry ?? '',
    website: profile.website ?? '',
    contactPerson: profile.contactPerson ?? '',
    description: profile.description ?? '',
    address: profile.address ?? '',
  });
  const [logo, setLogo] = useState(profile.user?.avatarUrl ?? null);
  const [docUrl, setDocUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setLogo(profile.user?.avatarUrl ?? null), [profile.user?.avatarUrl]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onLogo(url: string) {
    setLogo(url);
    await apiRequest('/users/me', {
      method: 'PATCH',
      token: session.tokens.accessToken,
      body: { avatarUrl: url },
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest('/brand/me/profile', {
        method: 'PUT',
        token: session.tokens.accessToken,
        body: {
          companyName: form.companyName,
          industry: form.industry,
          website: form.website || undefined,
          contactPerson: form.contactPerson,
          description: form.description || undefined,
          address: form.address || undefined,
        },
      });
      setMessage('Brand profile saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function submitVerification(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest('/brand/me/verification', {
        method: 'POST',
        token: session.tokens.accessToken,
        body: { documentUrl: docUrl },
      });
      setDocUrl('');
      setMessage('Verification submitted. Our team will review it shortly.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to submit verification.');
    } finally {
      setSaving(false);
    }
  }

  const verified = profile.verificationStatus;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Brand profile</h1>
          <p className="text-sm text-neutral-500">Make sure your company looks trustworthy to creators.</p>
        </div>
        <Badge color={verified === 'VERIFIED' ? 'green' : verified === 'PENDING' ? 'amber' : 'gray'}>
          {verified ?? 'UNVERIFIED'}
        </Badge>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 font-semibold">Logo & identity</h2>
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={form.companyName || 'Brand'} url={logo} size={16} />
            <UploadImageButton token={session.tokens.accessToken} onUploaded={onLogo} label="Upload logo" />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Company details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Company name" required value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            <Input label="Industry" required value={form.industry} onChange={(e) => set('industry', e.target.value)} />
            <Input label="Website" type="url" value={form.website} onChange={(e) => set('website', e.target.value)} />
            <Input label="Contact person" required value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
            <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="mt-3">
            <TextArea label="About the brand" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </Card>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save brand profile'}
          </button>
        </div>
      </form>

      {verified !== 'VERIFIED' && (
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> Verify your brand
          </h2>
          <p className="mb-4 text-xs text-neutral-400">
            Submit a public document (registration certificate, VAT certificate) to get the verified badge.
          </p>
          <form onSubmit={submitVerification} className="flex flex-wrap items-start gap-3">
            <div className="min-w-[260px] flex-1">
              <Input
                label="Document URL"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://… (uploaded via your storage)"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !docUrl}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
            >
              Submit for review
            </button>
          </form>
        </Card>
      )}

      {message && <p className="text-sm text-neutral-500">{message}</p>}
    </div>
  );
}

function BrandProfilePageInner({ session }: { session: Session }) {
  const { data, loading, error } = useApi<BrandProfile>('/brand/me/profile', session.tokens.accessToken);

  if (loading) {
    return <p className="text-sm text-neutral-400">Loading profile…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!data) return null;

  return <BrandProfileForm session={session} profile={data} />;
}

export default function BrandProfilePage() {
  return (
    <RequireAuth roles={['brand']}>
      {(session) => (
        <PortalShell title="Brand portal" session={session} items={BRAND_NAV}>
          <BrandProfilePageInner session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}