'use client';

import { FormEvent, useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { BRAND_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { ApiError, apiRequest } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Input, Spinner } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';

interface CampaignRow {
  id: string;
  title: string;
  description: string;
  status: string;
  budgetMin: number;
  budgetMax: number;
  deadline: string | null;
}

const CREATOR_CATEGORIES = ['LIFESTYLE', 'BEAUTY', 'FASHION', 'FOOD', 'TRAVEL', 'FITNESS', 'TECH', 'GAMING'] as const;
const PLATFORMS = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK'] as const;
const OBJECTIVES = ['BRAND_AWARENESS', 'PRODUCT_LAUNCH', 'SALES_CONVERSION', 'ENGAGEMENT', 'USER_GENERATED_CONTENT', 'TRAFFIC'] as const;
const DELIVERABLES = ['REEL', 'SHORT', 'PHOTO_CAROUSEL', 'SINGLE_PHOTO', 'STORY', 'YOUTUBE_VIDEO', 'TIKTOK', 'FACEBOOK_POST'] as const;

function BrandCampaigns({ session }: { session: Session }) {
  const { data, loading, error, reload } = useApi<CampaignRow[]>('/campaigns/mine?limit=50', session.tokens.accessToken);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    objective: 'BRAND_AWARENESS',
    product: '',
    targetLocations: 'Kathmandu, Pokhara',
    platforms: 'INSTAGRAM',
    category: 'FOOD',
    minFollowers: 5000,
    language: 'Nepali',
    deliverableType: 'REEL',
    deliverableQty: 1,
    deadline: '2026-12-31',
    budgetMin: 10000,
    budgetMax: 15000,
  });

  function set<K extends keyof typeof form>(k: K, v: string | number) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function createCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    try {
      await apiRequest('/campaigns', {
        method: 'POST',
        token: session.tokens.accessToken,
        body: {
          title: form.title,
          description: form.description,
          objective: form.objective,
          product: form.product,
          targetLocations: form.targetLocations.split(',').map((s) => s.trim()).filter(Boolean),
          platforms: [form.platforms],
          creatorRequirements: {
            categories: [form.category],
            minFollowers: Number(form.minFollowers),
            languages: [form.language],
          },
          deliverables: [{ type: form.deliverableType, quantity: Number(form.deliverableQty) }],
          deadline: new Date(form.deadline).toISOString(),
          budget: { amountMin: Number(form.budgetMin), amountMax: Number(form.budgetMax), currency: 'NPR', perCreator: true },
          usageRights: 'NON_EXCLUSIVE',
        },
      });
      setShowCreate(false);
      setFormError(null);
      resetForm();
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setForm((f) => ({ ...f, title: '', description: '', product: '' }));
  }

  async function changeState(c: CampaignRow, status: string) {
    try {
      await apiRequest('/campaigns/' + c.id + '/state', {
        method: 'POST',
        token: session.tokens.accessToken,
        body: { status },
      });
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'State change failed');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Campaigns</h1>
        <Button onClick={() => setShowCreate((s) => !s)}>{showCreate ? 'Cancel' : '+ New campaign'}</Button>
      </div>

      {showCreate && (
        <Card>
          <h2 className="mb-4 font-semibold">Create a campaign</h2>
          <form onSubmit={createCampaign} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Title" required value={form.title} onChange={(e) => set('title', e.target.value)} minLength={5} />
            <Input label="Product" required value={form.product} onChange={(e) => set('product', e.target.value)} />
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Description</span>
              <textarea
                required
                minLength={20}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#1b5e3b]"
                rows={3}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Objective</span>
              <select
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                value={form.objective}
                onChange={(e) => set('objective', e.target.value)}
              >
                {OBJECTIVES.map((o) => (
                  <option key={o} value={o}>
                    {o.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Creator category</span>
              <select className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CREATOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Platform</span>
              <select className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={form.platforms} onChange={(e) => set('platforms', e.target.value)}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <Input label="Target locations (comma separated)" value={form.targetLocations} onChange={(e) => set('targetLocations', e.target.value)} />
            <Input label="Min followers" type="number" value={form.minFollowers} onChange={(e) => set('minFollowers', Number(e.target.value))} />
            <Input label="Language" value={form.language} onChange={(e) => set('language', e.target.value)} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Deliverable type</span>
              <select
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                value={form.deliverableType}
                onChange={(e) => set('deliverableType', e.target.value)}
              >
                {DELIVERABLES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <Input label="Deliverable quantity" type="number" min={1} value={form.deliverableQty} onChange={(e) => set('deliverableQty', Number(e.target.value))} />
            <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
            <Input label="Budget min (NPR)" type="number" value={form.budgetMin} onChange={(e) => set('budgetMin', Number(e.target.value))} />
            <Input label="Budget max (NPR)" type="number" value={form.budgetMax} onChange={(e) => set('budgetMax', Number(e.target.value))} />
            {formError && <p className="text-sm text-red-600 md:col-span-2">{formError}</p>}
            <div className="md:col-span-2">
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create campaign'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{c.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{c.description}</p>
                  <p className="mt-2 text-xs text-neutral-400">
                    {CURRENCY(c.budgetMin)} – {CURRENCY(c.budgetMax)} · {c.deadline ? 'Due ' + new Date(c.deadline).toLocaleDateString() : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge color={statusColor(c.status)}>{c.status}</Badge>
                  <div className="flex gap-1.5">
                    {c.status === 'DRAFT' && (
                      <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => changeState(c, 'RECRUITING')}>
                        Publish
                      </Button>
                    )}
                    {c.status === 'RECRUITING' && (
                      <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => changeState(c, 'CLOSED')}>
                        Close
                      </Button>
                    )}
                    {c.status === 'CLOSED' && (
                      <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => changeState(c, 'RECRUITING')}>
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="No campaigns yet. Create your first campaign above." />
      )}
    </div>
  );
}

export default function BrandCampaignsPage() {
  return (
    <RequireAuth roles={['brand']}>
      {(session) => (
        <PortalShell title="Brand portal" session={session} items={BRAND_NAV}>
          <BrandCampaigns session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}