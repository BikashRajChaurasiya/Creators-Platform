'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { BRAND_NAV, statusColor } from '@/lib/ui';
import { apiRequest } from '@/lib/api';
import { Badge, Button, Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';
import { useToast } from '@/components/toast';

interface AppRow {
  id: string;
  status: string;
  pitch: string;
  createdAt: string;
  creator: { user: { id: string; name: string; avatarUrl?: string | null } };
  campaign: { id: string; title: string };
}

function ReceivedApps({ session }: { session: Session }) {
  const { data, loading, error, reload } = useApi<AppRow[]>('/applications?scope=received&limit=50', session.tokens.accessToken);
  const [tab, setTab] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  const list = (data ?? []).filter((a) => tab === 'ALL' || a.status === tab);
  const tabs = ['ALL', ...Array.from(new Set((data ?? []).map((a) => a.status)))];

  async function review(a: AppRow, decision: 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED') {
    setBusyId(a.id);
    try {
      await apiRequest('/applications/' + a.id + '/review', {
        method: 'POST',
        token: session.tokens.accessToken,
        body: { decision, note: '' },
      });
      toast.success(`Application ${decision.toLowerCase()}.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Review failed');
    } finally {
      setBusyId(null);
    }
  }

  const reviewerName = (a: AppRow) => a.creator?.user?.name ?? 'Creator';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Applications received</h1>
        <p className="text-sm text-neutral-500">Review creator pitches and decide who joins your campaign.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
              tab === t
                ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-sm'
                : 'border border-neutral-300 bg-white text-neutral-600 hover:border-primary hover:text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
      ) : error ? (
        <EmptyState message={error} />
      ) : list.length > 0 ? (
        <div className="flex flex-col gap-3">
          {list.map((a) => (
            <Card key={a.id} hover>
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
                      <Button variant="outline" className="px-3 py-1 text-xs" disabled={busyId === a.id} onClick={() => review(a, 'SHORTLISTED')}>
                        Shortlist
                      </Button>
                      <Button variant="outline" className="px-3 py-1 text-xs" disabled={busyId === a.id} onClick={() => review(a, 'ACCEPTED')}>
                        Accept
                      </Button>
                      <Button variant="outline" className="px-3 py-1 text-xs text-red-600" disabled={busyId === a.id} onClick={() => review(a, 'REJECTED')}>
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
        <EmptyState
          title="No applications received yet"
          message="When creators apply to your campaigns, their pitches will show up here."
        />
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