'use client';

import Link from 'next/link';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { Badge, Card, EmptyState, Spinner } from '@/components/ui';
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

function Dash({ session }: { session: Session }) {
  const apps = useApi<AppRow[]>('/applications?scope=mine&limit=50', session.tokens.accessToken);
  const discovery = useApi<CampaignRow[]>('/campaigns/discover?limit=5', session.tokens.accessToken);

  const appList = apps.data ?? [];
  const pendingCount = appList.filter((a) => a.status === 'PENDING').length;
  const selectedCount = appList.filter((a) => a.status === 'ACCEPTED' || a.status === 'SHORTLISTED').length;
  const campaigns = discovery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome, {session.user.name}</h1>
        <p className="text-sm text-neutral-500">Track your campaigns, applications and earnings.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-neutral-500">Applications</p>
          <p className="mt-1 text-2xl font-bold">{appList.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">Pending</p>
          <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">Selected</p>
          <p className="mt-1 text-2xl font-bold">{selectedCount}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Open campaigns</h2>
          <Link href="/creator/discover" className="text-sm text-[#1b5e3b] hover:underline">
            Browse all
          </Link>
        </div>
        {discovery.loading ? (
          <Spinner />
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
          <EmptyState message="No open campaigns right now." />
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