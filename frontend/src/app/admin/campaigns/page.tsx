'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { Badge, Card, EmptyState, Spinner } from '@/components/ui';
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
      <h1 className="text-xl font-semibold">Campaigns</h1>
      {loading ? (
        <Spinner />
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.length > 0 ? (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3">{c.brand?.companyName ?? '—'}</td>
                  <td className="px-4 py-3">{CURRENCY(c.budgetMin)} – {CURRENCY(c.budgetMax)}</td>
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
        <EmptyState message="No campaigns found." />
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