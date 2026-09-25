'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { CREATOR_CATEGORIES, PAYOUT_CHANNELS } from '@ugcnp/shared';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV } from '@/lib/ui';
import { Card, Input, TextArea } from '@/components/ui';
import { Avatar } from '@/components/avatar';
import { UploadImageButton } from '@/components/image-upload';
import { useApi } from '@/lib/use-api';
import { apiRequest } from '@/lib/api';
import { Session } from '@/lib/session';

interface CreatorProfile {
  id: string;
  bio?: string | null;
  city?: string | null;
  district?: string | null;
  category?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  facebook?: string | null;
  skills: string[];
  collaborations: string[];
  availableForWork: boolean;
  followersEstimate?: number | null;
  engagementRate?: number | null;
  payoutChannel?: string | null;
  payoutChannelDetail?: string | null;
  fallbackChannel?: string | null;
  fallbackChannelDetail?: string | null;
  verificationStatus: string;
  user: { name: string; username?: string | null; avatarUrl?: string | null };
}

function toList(v: string): string[] {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toText(v: string[] | undefined | null): string {
  return (v ?? []).join(', ');
}

function CreatorProfileForm({ session, profile }: { session: Session; profile: CreatorProfile }) {
  const [form, setForm] = useState({
    username: profile.user?.username ?? '',
    category: profile.category ?? '',
    city: profile.city ?? '',
    district: profile.district ?? '',
    bio: profile.bio ?? '',
    instagram: profile.instagram ?? '',
    tiktok: profile.tiktok ?? '',
    youtube: profile.youtube ?? '',
    facebook: profile.facebook ?? '',
    skills: toText(profile.skills),
    collaborations: toText(profile.collaborations),
    followersEstimate: profile.followersEstimate?.toString() ?? '',
    engagementRate: profile.engagementRate?.toString() ?? '',
    availableForWork: profile.availableForWork,
    payoutChannel: profile.payoutChannel ?? '',
    payoutChannelDetail: profile.payoutChannelDetail ?? '',
    fallbackChannel: profile.fallbackChannel ?? '',
    fallbackChannelDetail: profile.fallbackChannelDetail ?? '',
  });
  const [avatar, setAvatar] = useState(profile.user?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setAvatar(profile.user?.avatarUrl ?? null), [profile.user?.avatarUrl]);

  function set<K extends keyof typeof form>(k: K, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onAvatar(url: string) {
    setAvatar(url);
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
      await apiRequest('/creator/me/profile', {
        method: 'PUT',
        token: session.tokens.accessToken,
        body: {
          username: form.username,
          category: form.category || undefined,
          city: form.city || undefined,
          district: form.district || undefined,
          bio: form.bio || undefined,
          instagram: form.instagram || undefined,
          tiktok: form.tiktok || undefined,
          youtube: form.youtube || undefined,
          facebook: form.facebook || undefined,
          skills: toList(form.skills),
          collaborations: toList(form.collaborations),
          followersEstimate: form.followersEstimate ? Number(form.followersEstimate) : undefined,
          engagementRate: form.engagementRate ? Number(form.engagementRate) : undefined,
          availableForWork: form.availableForWork,
          payoutChannel: form.payoutChannel || undefined,
          payoutChannelDetail: form.payoutChannelDetail || undefined,
          fallbackChannel: form.fallbackChannel || undefined,
          fallbackChannelDetail: form.fallbackChannelDetail || undefined,
        },
      });
      setMessage('Profile saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  const PayoutSelect = ({ field, label }: { field: 'payoutChannel' | 'fallbackChannel'; label: string }) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-600">{label}</span>
      <select
        value={form[field]}
        onChange={(e) => set(field, e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary-soft"
      >
        <option value="">Not set</option>
        {PAYOUT_CHANNELS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Identity */}
      <Card>
        <h2 className="mb-4 font-semibold">Identity & avatar</h2>
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={profile.user?.name ?? 'Creator'} url={avatar} size={16} />
          <div className="flex flex-col gap-2">
            <Input label="Username" value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="@username" />
            <UploadImageButton token={session.tokens.accessToken} onUploaded={onAvatar} label="Change avatar" />
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Verification status:{' '}
          <span className="font-medium text-neutral-600">{profile.verificationStatus ?? 'UNVERIFIED'}</span>
        </p>
      </Card>

      {/* Basics */}
      <Card>
        <h2 className="mb-4 font-semibold">About you</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-600">Primary category</span>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary-soft"
            >
              <option value="">Select</option>
              {CREATOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <Input label="District" value={form.district} onChange={(e) => set('district', e.target.value)} />
          <div className="flex items-end gap-2">
            <Input
              label="Followers (est.)"
              type="number"
              min="0"
              value={form.followersEstimate}
              onChange={(e) => set('followersEstimate', e.target.value)}
            />
            <Input
              label="Engagement %"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.engagementRate}
              onChange={(e) => set('engagementRate', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <TextArea label="Bio" rows={4} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
          <input
            id="avail"
            type="checkbox"
            checked={form.availableForWork}
            onChange={(e) => set('availableForWork', e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          <label htmlFor="avail" className="font-medium">
            Available for new work
          </label>
        </p>
      </Card>

      {/* Socials */}
      <Card>
        <h2 className="mb-4 font-semibold">Social profiles</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Instagram" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/@handle" />
          <Input label="TikTok" value={form.tiktok} onChange={(e) => set('tiktok', e.target.value)} placeholder="https://tiktok.com/@handle" />
          <Input label="YouTube" value={form.youtube} onChange={(e) => set('youtube', e.target.value)} placeholder="https://youtube.com/@handle" />
          <Input label="Facebook" value={form.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/page" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input label="Skills (comma separated)" value={form.skills} onChange={(e) => set('skills', e.target.value)} placeholder="UGC, Reels, Product demos" />
          <Input
            label="Previous collaborations (comma separated)"
            value={form.collaborations}
            onChange={(e) => set('collaborations', e.target.value)}
            placeholder="Brand A – Reel, Brand B – Story"
          />
        </div>
      </Card>

      {/* Payout */}
      <Card>
        <h2 className="mb-1 font-semibold">Payout details</h2>
        <p className="mb-4 text-xs text-neutral-400">Where would you like to receive verified payouts?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <PayoutSelect field="payoutChannel" label="Primary channel" />
          <Input
            label="Channel detail"
            value={form.payoutChannelDetail}
            onChange={(e) => set('payoutChannelDetail', e.target.value)}
            placeholder="eSewa ID / Khalti ID / IME Pay ID / Account no."
          />
          <PayoutSelect field="fallbackChannel" label="Fallback channel" />
          <Input
            label="Fallback detail"
            value={form.fallbackChannelDetail}
            onChange={(e) => set('fallbackChannelDetail', e.target.value)}
            placeholder="Bank name + account no."
          />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {message && <p className="text-sm text-neutral-500">{message}</p>}
      </div>
    </form>
  );
}

function CreatorProfilePageInner({ session }: { session: Session }) {
  const { data, loading, error } = useApi<CreatorProfile>('/creator/me/profile', session.tokens.accessToken);

  if (loading) {
    return <p className="text-sm text-neutral-400">Loading profile…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!data) return null;

  return <CreatorProfileForm session={session} profile={data} />;
}

export default function CreatorProfilePage() {
  return (
    <RequireAuth roles={['creator']}>
      {(session) => (
        <PortalShell title="Creator portal" session={session} items={CREATOR_NAV}>
          <CreatorProfilePageInner session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}