'use client';

import Link from 'next/link';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { Badge, Card, EmptyState, SkeletonCard, StatCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';

interface AppRow {
  campaign: { id: string; title: string };
  status: string;
}

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  budgetMin: number;
  budgetMax: number;
}

interface PaySummary {
  totalEarned: number;
  paidCount: number;
  pendingCount: number;
  totalOutstanding: number;
}

interface NotifRow {
  id: string;
  event: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

function Dash({ session }: { session: Session }) {
  const apps = useApi<AppRow[]>('/applications?scope=mine&limit=50', session.tokens.accessToken);
  const discovery = useApi<CampaignRow[]>('/campaigns/discover?limit=5', session.tokens.accessToken);
  const summary = useApi<PaySummary>('/payments/summary', session.tokens.accessToken);
  const activity = useApi<NotifRow[]>('/notifications?limit=5', session.tokens.accessToken);

  const appList = apps.data ?? [];
  const pendingCount = appList.filter((a) => a.status === 'PENDING').length;
  const selectedCount = appList.filter((a) => a.status === 'ACCEPTED' || a.status === 'SHORTLISTED').length;
  const campaigns = discovery.data ?? [];
  const s = summary.data;
  const feed = activity.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">Creator portal</p>
        <h1 className="mt-1 text-2xl font-bold">Welcome, {session.user.name}</h1>
        <p className="mt-1 text-sm text-white/80">Track your campaigns, applications and earnings.</p>
      </div>

      {apps.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Applications" value={appList.length} icon="📋" tint="primary" sub={`${appList.length} across all campaigns`} />
          <StatCard label="Pending" value={pendingCount} icon="⏳" tint="amber" sub="Waiting for review" />
          <StatCard label="Selected" value={selectedCount} icon="⚡" tint="green" sub="Accepted or shortlisted" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total earned" value={CURRENCY(s?.totalEarned ?? 0)} icon="💰" tint="green" sub="Payouts received so far" />
        <StatCard label="Awaiting release" value={CURRENCY(s?.totalOutstanding ?? 0)} icon="⏳" tint="amber" sub={`${s?.pendingCount ?? 0} pending or approved`} />
        <Link href="/creator/payments" className="group">
          <Card className="h-full transition-all duration-200 hover:border-primary hover:shadow-md">
            <p className="text-sm text-neutral-500">Completed payouts</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{s?.paidCount ?? 0}</p>
            <p className="mt-1 text-xs font-medium text-primary group-hover:underline">View payout history →</p>
          </Card>
        </Link>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Open campaigns</h2>
          <Link href="/creator/discover" className="text-sm font-medium text-primary hover:underline">
            Browse all →
          </Link>
        </div>
        {discovery.loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : discovery.error ? (
          <EmptyState message={discovery.error} />
        ) : campaigns.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {campaigns.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-neutral-400">{CURRENCY(c.budgetMin)} – {CURRENCY(c.budgetMax)}</p>
                </div>
                <Badge color={statusColor(c.status)}>{c.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No open campaigns right now" message="New campaigns from brands will appear here as soon as they launch." />
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent activity</h2>
          <span className="text-xs text-neutral-400">Last {feed.length} updates</span>
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
          <EmptyState title="No activity yet" message="Campaign updates, application decisions and payout news will land here." />
        )}
      </Card>
    </div>
  );
}

export default function CreatorDashboardPage() {
  return (
    <RequireAuth roles={['creator']}>
      {(session) => (
        <PortalShell title="Creator portal" session={session} items={CREATOR_NAV}>
          <Dash session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}