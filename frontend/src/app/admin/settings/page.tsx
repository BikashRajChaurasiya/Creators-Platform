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
import { useThemeRefresh } from '@/lib/theme';
import { useToast } from '@/components/toast';

function SettingsPage({ session }: { session: Session }) {
  const { data, loading, error, reload } = useApi<Settings>('/admin/settings', session.tokens.accessToken);
  const refreshTheme = useThemeRefresh();
  const toast = useToast();

  const [form, setForm] = useState({
    commissionPercent: 15,
    vatPercent: 13,
    tdsPercent: 15,
    brandName: 'UGCNP',
    primaryColor: '#1B5E3B',
    accentColor: '#A3E635',
    logoUrl: '',
    signupsOpen: true,
    maintenanceMode: false,
    emailFrom: '',
  });
  const [saving, setSaving] = useState(false);

  function applySettings(s: Settings) {
    setForm({
      commissionPercent: s.commissionPercent,
      vatPercent: s.vatPercent,
      tdsPercent: s.tdsPercent,
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
    try {
      await apiRequest('/admin/settings', {
        method: 'PUT',
        token: session.tokens.accessToken,
        body: {
          commissionPercent: Number(form.commissionPercent),
          vatPercent: Number(form.vatPercent),
          tdsPercent: Number(form.tdsPercent),
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
      refreshTheme();
      toast.success('Settings saved — your brand theme updated across the platform.');
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (data) applySettings(data);
  }, [data]);

  if (loading) return <Spinner label="Loading settings…" />;
  if (error) return <EmptyState message={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Platform settings</h1>
        <p className="text-sm text-neutral-500">Brand, theme and platform-wide configuration.</p>
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Brand theme</h2>
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
          <Input label="Brand name" value={form.brandName} onChange={(e) => set('brandName', e.target.value)} />
          <Input label="Primary color" type="color" value={form.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} />
          <Input label="Accent color" type="color" value={form.accentColor} onChange={(e) => set('accentColor', e.target.value)} />
          <div className="md:col-span-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
            <p className="text-xs text-neutral-500">Live preview</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: form.primaryColor }}
              >
                {form.brandName}
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: form.accentColor, color: form.primaryColor }}>
                Accent
              </span>
              <button
                className="rounded-lg border px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: form.primaryColor }}
              >
                Button
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Financial configuration</h2>
        <p className="mb-3 text-xs text-neutral-500">Fee, VAT and TDS percentages applied to payouts. Verify against current Nepal tax guidance before launch.</p>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Commission percent" type="number" min={0} max={60} value={form.commissionPercent} onChange={(e) => set('commissionPercent', Number(e.target.value))} />
          <Input label="VAT percent" type="number" min={0} max={30} value={form.vatPercent} onChange={(e) => set('vatPercent', Number(e.target.value))} />
          <Input label="TDS percent" type="number" min={0} max={40} value={form.tdsPercent} onChange={(e) => set('tdsPercent', Number(e.target.value))} />
        </form>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Configuration</h2>
        <form onSubmit={save} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Logo URL" value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://…/logo.png" />
          <Input label="Email from" value={form.emailFrom} onChange={(e) => set('emailFrom', e.target.value)} placeholder="no-reply@ugcnp.com" />
          <div className="flex items-end gap-6 pb-1">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input type="checkbox" checked={form.signupsOpen} onChange={(e) => set('signupsOpen', e.target.checked)} className="h-4 w-4 rounded accent-primary" />
              Signups open
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input type="checkbox" checked={form.maintenanceMode} onChange={(e) => set('maintenanceMode', e.target.checked)} className="h-4 w-4 rounded accent-primary" />
              Maintenance mode
            </label>
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
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