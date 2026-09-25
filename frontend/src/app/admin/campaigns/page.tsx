'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { Badge, Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  budgetMin: number;
  budgetMax: number;
  createdAt: string;
  brand?: { companyName: string } | null;
}

function AdminCampaigns({ session }: { session: Session }) {
  const { data, loading, error } = useApi<CampaignRow[]>('/admin/campaigns?limit=50', session.tokens.accessToken);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Campaigns</h1>
        <p className="text-sm text-neutral-500">All campaigns created by brands on the platform.</p>
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-neutral-50/60">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.brand?.companyName ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{CURRENCY(c.budgetMin)} – {CURRENCY(c.budgetMax)}</td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor(c.status)}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState title="No campaigns found" />
      )}
    </div>
  );
}

export default function AdminCampaignsPage() {
  return (
    <RequireAuth roles={['admin']}>
      {(session) => (
        <PortalShell title="Admin console" session={session} items={ADMIN_NAV}>
          <AdminCampaigns session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}