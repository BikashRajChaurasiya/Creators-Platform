'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { Badge, Button, Card, EmptyState, Spinner } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { apiRequest } from '@/lib/api';
import { Session } from '@/lib/session';

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
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  async function apply(c: Campaign) {
    setFeedback(null);
    try {
      const res = await apiRequest<{ id: string; status: string }>(`/campaigns/${c.id}/apply`, {
        method: 'POST',
        token: session.tokens.accessToken,
        body: {
          pitch: `I would love to collaborate on "${c.title}". I create authentic content in ${c.category.toLowerCase()} with strong local engagement.`,
        },
      });
      setFeedback({ id: c.id, ok: true, message: `Applied! Status: ${res.status}` });
      reload();
    } catch (e) {
      setFeedback({ id: c.id, ok: false, message: e instanceof Error ? e.message : 'Apply failed' });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Discover campaigns</h1>
      {loading ? (
        <Spinner />
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-neutral-400">{c.brand?.companyName ?? 'Brand'}</p>
                </div>
                <Badge color={statusColor(c.status)}>{c.status}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{c.description}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-neutral-500">
                  {CURRENCY(c.budgetMin)} – {CURRENCY(c.budgetMax)}
                </span>
                <span className="text-xs text-neutral-400">{c.category}</span>
              </div>
              <div className="mt-3">
                <Button variant="outline" className="w-full" disabled={c.status !== 'RECRUITING'} onClick={() => apply(c)}>
                  {c.status === 'RECRUITING' ? 'Apply' : 'Not open'}
                </Button>
              </div>
              {feedback && feedback.id === c.id && (
                <p className={`mt-2 text-center text-xs ${feedback.ok ? 'text-emerald-600' : 'text-red-600'}`}>{feedback.message}</p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="No campaigns open for applications right now." />
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