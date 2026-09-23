'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV, statusColor } from '@/lib/ui';
import { Badge, Card, EmptyState, Spinner } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';
import { useState } from 'react';

interface AppRow {
  id: string;
  status: string;
  pitch: string;
  createdAt: string;
  campaign: { id: string; title: string; budgetMin: number; budgetMax: number; status: string };
}

function MyApplications({ session }: { session: Session }) {
  const { data, loading, error } = useApi<AppRow[]>('/applications?scope=mine&limit=50', session.tokens.accessToken);
  const [tab, setTab] = useState<string>('ALL');

  const list = (data ?? []).filter((a) => tab === 'ALL' || a.status === tab);
  const tabs = ['ALL', ...Array.from(new Set((data ?? []).map((a) => a.status)))];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">My applications</h1>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === t ? 'bg-[#1b5e3b] text-white' : 'border border-neutral-300 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <EmptyState message={error} />
      ) : list.length > 0 ? (
        <div className="flex flex-col gap-3">
          {list.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{a.campaign.title}</p>
                  <p className="text-xs text-neutral-400">
                    Applied {new Date(a.createdAt).toLocaleDateString()} · {a.campaign.status}
                  </p>
                </div>
                <Badge color={statusColor(a.status)}>{a.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-neutral-600">{a.pitch}</p>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="You haven't applied to any campaigns yet." />
      )}
    </div>
  );
}

export default function CreatorApplicationsPage() {
  return (
    <RequireAuth roles={['creator']}>
      {(session) => (
        <PortalShell title="Creator portal" session={session} items={CREATOR_NAV}>
          <MyApplications session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}