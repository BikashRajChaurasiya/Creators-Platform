'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV } from '@/lib/ui';
import { Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';

interface AuditRow {
  id: string;
  action: string;
  actor?: { id: string; name: string; email: string } | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

function Audit({ session }: { session: Session }) {
  const { data, loading, error } = useApi<AuditRow[]>('/admin/audit-logs?limit=50', session.tokens.accessToken);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Audit log</h1>
        <p className="text-sm text-neutral-500">A trail of every important action taken across the platform.</p>
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
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-neutral-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-400">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700">{a.action}</code>
                  </td>
                  <td className="px-4 py-3">{a.actor?.name ?? a.actor?.email ?? 'system'}</td>
                  <td className="max-w-[40ch] truncate px-4 py-3 text-xs text-neutral-400">{JSON.stringify(a.metadata ?? {})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState title="No audit entries yet" />
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <RequireAuth roles={['admin']}>
      {(session) => (
        <PortalShell title="Admin console" session={session} items={ADMIN_NAV}>
          <Audit session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}