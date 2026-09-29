'use client';

import { useState } from 'react';

import { RequireAuth } from '@/components/require-auth';
import type { AllowedRole } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_CONSOLE_ROLES, CURRENCY, adminNavFor, statusColor } from '@/lib/ui';
import { Badge, Card, EmptyState, ErrorState, SkeletonCard, Pagination } from '@/components/ui';
import { useApiPage } from '@/lib/use-api';
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
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useApiPage<CampaignRow[]>(`/admin/campaigns?limit=50&page=${page}`, session.tokens.accessToken);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Campaigns</h1>
        <p className="text-sm text-neutral-500">All campaigns created by brands on the platform.</p>
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && data.length > 0 ? (
        <>
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
                    <Badge tone={statusColor(c.status)}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </Card>
          <Pagination page={page} pageCount={meta?.totalPages ?? 1} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState title="No campaigns found" />
      )}
    </div>
  );
}

export default function AdminCampaignsPage() {
  return (
    <RequireAuth roles={ADMIN_CONSOLE_ROLES}>
      {(session) => (
        <PortalShell title="Admin console" session={session} items={adminNavFor(session.user.role.toLowerCase() as AllowedRole)}>
          <AdminCampaigns session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}
