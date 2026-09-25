'use client';

import Link from 'next/link';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { BRAND_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { Badge, Card, EmptyState, SkeletonCard, StatCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  budgetMin: number;
  budgetMax: number;
  createdAt: string;
}

interface Profile {
  companyName: string;
  industry: string;
  verified: boolean;
  verificationStatus?: string;
}

interface BrandSummary {
  totalBilled: number;
  invoiceCount: number;
  unpaidTotal: number;
  payoutsTotal: number;
  commissionTotal: number;
  spendTotal: number;
  commissionPercent: number;
}

interface NotifRow {
  id: string;
  event: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

function BrandDash({ session }: { session: Session }) {
  const campaigns = useApi<CampaignRow[]>('/campaigns/mine?limit=5', session.tokens.accessToken);
  const profile = useApi<Profile>('/brand/me/profile', session.tokens.accessToken);
  const apps = useApi<{ id: string; status: string }[]>('/applications?scope=received&limit=50', session.tokens.accessToken);
  const summary = useApi<BrandSummary>('/payments/summary', session.tokens.accessToken);
  const activity = useApi<NotifRow[]>('/notifications?limit=5', session.tokens.accessToken);

  const list = campaigns.data ?? [];
  const received = apps.data ?? [];
  const s = summary.data;
  const feed = activity.data ?? [];
  const acceptedCount = received.filter((a) => a.status === 'ACCEPTED').length;
  const activeCount = list.filter((c) => !['DRAFT', 'COMPLETED', 'CLOSED', 'CANCELLED'].includes(c.status)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/70">Brand portal</p>
            <h1 className="mt-1 text-2xl font-bold">{profile.data?.companyName ?? session.user.name}</h1>
            <p className="mt-1 text-sm text-white/80">{profile.data?.industry ?? 'Your brand'}</p>
          </div>
          {profile.data && (
            <Badge color={statusColor(profile.data.verificationStatus ?? (profile.data.verified ? 'VERIFIED' : 'PENDING'))}>
              {profile.data.verificationStatus ?? (profile.data.verified ? 'VERIFIED' : 'PENDING')}
            </Badge>
          )}
        </div>
      </div>

      {apps.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active campaigns" value={activeCount} icon="📢" tint="primary" sub={`${list.length} total on record`} />
          <StatCard label="Applications received" value={received.length} icon="📥" tint="blue" sub="Across all campaigns" />
          <StatCard label="Accepted creators" value={acceptedCount} icon="🤝" tint="green" sub="Hired for campaigns" />
          <StatCard label="Pending decisions" value={received.filter((a) => a.status === 'PENDING').length} icon="⏳" tint="amber" sub="Awaiting your review" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total spend (incl. VAT)" value={CURRENCY(s?.spendTotal ?? 0)} icon="💳" tint="blue" sub={`Fee ${s?.commissionPercent ?? 15}% + VAT`} />
        <StatCard label="Paid to creators" value={CURRENCY(s?.payoutsTotal ?? 0)} icon="💰" tint="green" sub="Creators actually received" />
        <StatCard label="Unpaid invoices" value={CURRENCY(s?.unpaidTotal ?? 0)} icon="🧾" tint="amber" sub={`${s?.invoiceCount ?? 0} invoices total`} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">My campaigns</h2>
          <Link href="/brand/campaigns" className="text-sm font-medium text-primary hover:underline">
            Manage →
          </Link>
        </div>
        {campaigns.loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : campaigns.error ? (
          <EmptyState message={campaigns.error} />
        ) : list.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-neutral-400">
                    {CURRENCY(c.budgetMin)} – {CURRENCY(c.budgetMax)}
                  </p>
                </div>
                <Badge color={statusColor(c.status)}>{c.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No campaigns yet"
            message="Create your first campaign to start receiving creator applications."
            action={
              <Link href="/brand/campaigns" className="text-sm font-medium text-primary hover:underline">
                Create a campaign →
              </Link>
            }
          />
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent activity</h2>
          <span className="text-xs text-neutral-400">{feed.length} updates</span>
        </div>
        {activity.loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : activity.error ? (
          <EmptyState message={activity.error} />
        ) : feed.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {feed.map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-neutral-300' : 'bg-primary'}`} aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-neutral-500">{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No activity yet" message="Applications, reviews and payout updates will land here." />
        )}
      </Card>
    </div>
  );
}

export default function BrandDashboardPage() {
  return (
    <RequireAuth roles={['brand']}>
      {(session) => (
        <PortalShell title="Brand portal" session={session} items={BRAND_NAV}>
          <BrandDash session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}