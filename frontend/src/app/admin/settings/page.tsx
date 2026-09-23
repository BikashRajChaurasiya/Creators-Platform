'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV } from '@/lib/ui';
import { ApiError, apiRequest } from '@/lib/api';
import { Button, Card, EmptyState, Input, Spinner } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';
import { Settings } from '@ugcnp/shared';

function SettingsPage({ session }: { session: Session }) {
  const { data, loading, error, reload } = useApi<Settings>('/admin/settings', session.tokens.accessToken);
  const [form, setForm] = useState({
    commissionPercent: 15,
    brandName: 'UGCNP',
    primaryColor: '#1B5E3B',
    accentColor: '#A3E635',
    logoUrl: '',
    signupsOpen: true,
    maintenanceMode: false,
    emailFrom: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function applySettings(s: Settings) {
    setForm({
      commissionPercent: s.commissionPercent,
      brandName: s.theme?.brandName ?? 'UGCNP',
      primaryColor: s.theme?.primaryColor ?? '#1B5E3B',
      accentColor: s.theme?.accentColor ?? '#A3E635',
      logoUrl: s.theme?.logoUrl ?? '',
      signupsOpen: s.signupsOpen,
      maintenanceMode: s.maintenanceMode,
      emailFrom: s.emailFrom ?? '',
    });
  }

  function set<K extends keyof typeof form>(k: K, v: string | number | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await apiRequest('/admin/settings', {
        method: 'PUT',
        token: session.tokens.accessToken,
        body: {
          commissionPercent: Number(form.commissionPercent),
          theme: {
            brandName: form.brandName,
            primaryColor: form.primaryColor,
            accentColor: form.accentColor,
            logoUrl: form.logoUrl,
          },
          signupsOpen: form.signupsOpen,
          maintenanceMode: form.maintenanceMode,
          ...(form.emailFrom ? { emailFrom: form.emailFrom } : {}),
        },
      });
      setSaved(true);
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (data) applySettings(data);
  }, [data]);

  if (loading) return <Spinner />;
  if (error) return <EmptyState message={error} />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Platform settings</h1>
      <Card>
        <form onSubmit={save} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Commission percent" type="number" min={0} max={60} value={form.commissionPercent} onChange={(e) => set('commissionPercent', Number(e.target.value))} />
          <Input label="Brand name" value={form.brandName} onChange={(e) => set('brandName', e.target.value)} />
          <Input label="Primary color" type="color" value={form.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} />
          <Input label="Accent color" type="color" value={form.accentColor} onChange={(e) => set('accentColor', e.target.value)} />
          <Input label="Logo URL" value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} />
          <Input label="Email from" value={form.emailFrom} onChange={(e) => set('emailFrom', e.target.value)} />
          <div className="flex gap-6 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.signupsOpen} onChange={(e) => set('signupsOpen', e.target.checked)} />
              Signups open
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.maintenanceMode} onChange={(e) => set('maintenanceMode', e.target.checked)} />
              Maintenance mode
            </label>
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
            {saved && <span className="text-sm text-emerald-600">Saved.</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <RequireAuth roles={['admin']}>
      {(session) => (
        <PortalShell title="Admin console" session={session} items={ADMIN_NAV}>
          <SettingsPage session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}