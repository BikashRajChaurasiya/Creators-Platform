'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { BRAND_NAV, statusColor } from '@/lib/ui';
import { apiRequest } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Spinner } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';

interface AppRow {
  id: string;
  status: string;
  pitch: string;
  createdAt: string;
  creator: { user: { id: string; name: string } };
  campaign: { id: string; title: string };
}

function ReceivedApps({ session }: { session: Session }) {
  const { data, loading, error, reload } = useApi<AppRow[]>('/applications?scope=received&limit=50', session.tokens.accessToken);
  const [tab, setTab] = useState('ALL');
  const list = (data ?? []).filter((a) => tab === 'ALL' || a.status === tab);
  const tabs = ['ALL', ...Array.from(new Set((data ?? []).map((a) => a.status)))];

  async function review(a: AppRow, decision: 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED') {
    try {
      await apiRequest('/applications/' + a.id + '/review', {
        method: 'POST',
        token: session.tokens.accessToken,
        body: { decision, note: '' },
      });
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Review failed');
    }
  }

  const reviewerName = (a: AppRow) => a.creator?.user?.name ?? 'Creator';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Applications received</h1>
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{reviewerName(a)}</p>
                  <p className="text-xs text-neutral-400">
                    {a.campaign.title} · {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-neutral-600">{a.pitch}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge color={statusColor(a.status)}>{a.status}</Badge>
                  {a.status === 'PENDING' && (
                    <div className="flex gap-1.5">
                      <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => review(a, 'SHORTLISTED')}>
                        Shortlist
                      </Button>
                      <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => review(a, 'ACCEPTED')}>
                        Accept
                      </Button>
                      <Button variant="outline" className="px-3 py-1 text-xs text-red-600" onClick={() => review(a, 'REJECTED')}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="No applications received yet." />
      )}
    </div>
  );
}

export default function BrandApplicationsPage() {
  return (
    <RequireAuth roles={['brand']}>
      {(session) => (
        <PortalShell title="Brand portal" session={session} items={BRAND_NAV}>
          <ReceivedApps session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}