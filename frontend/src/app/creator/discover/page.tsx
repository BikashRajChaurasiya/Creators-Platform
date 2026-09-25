'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { Badge, Button, Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { apiRequest } from '@/lib/api';
import { Session } from '@/lib/session';
import { useToast } from '@/components/toast';

interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  status: string;
  deadline: string | null;
  brand: { companyName: string };
}

function Discover({ session }: { session: Session }) {
  const { data, loading, error, reload } = useApi<Campaign[]>('/campaigns/discover?limit=50', session.tokens.accessToken);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const toast = useToast();

  async function apply(c: Campaign) {
    setPendingId(c.id);
    try {
      const res = await apiRequest<{ id: string; status: string }>(`/campaigns/${c.id}/apply`, {
        method: 'POST',
        token: session.tokens.accessToken,
        body: {
          pitch: `I would love to collaborate on "${c.title}". I create authentic content in ${c.category.toLowerCase()} with strong local engagement.`,
        },
      });
      toast.success(`Applied! Your application is now ${res.status.toLowerCase()}.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Discover campaigns</h1>
        <p className="text-sm text-neutral-500">Find brand campaigns that match your niche and audience.</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((c) => (
            <Card key={c.id} hover className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-neutral-400">{c.brand?.companyName ?? 'Brand'}</p>
                </div>
                <Badge color={statusColor(c.status)}>{c.status}</Badge>
              </div>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-neutral-600">{c.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-neutral-700">
                  {CURRENCY(c.budgetMin)} – {CURRENCY(c.budgetMax)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {c.category}
                </span>
                {c.deadline && (
                  <span className="text-xs text-neutral-400">Due {new Date(c.deadline).toLocaleDateString()}</span>
                )}
              </div>
              <div className="mt-3">
                <Button
                  variant={c.status === 'RECRUITING' ? 'primary' : 'outline'}
                  className="w-full"
                  disabled={c.status !== 'RECRUITING' || pendingId === c.id}
                  onClick={() => apply(c)}
                >
                  {pendingId === c.id ? 'Applying…' : c.status === 'RECRUITING' ? 'Apply now' : 'Not open'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No open campaigns right now"
          message="Brands are busy creating new opportunities — check back soon."
        />
      )}
    </div>
  );
}

export default function CreatorDiscoverPage() {
  return (
    <RequireAuth roles={['creator']}>
      {(session) => (
        <PortalShell title="Creator portal" session={session} items={CREATOR_NAV}>
          <Discover session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}