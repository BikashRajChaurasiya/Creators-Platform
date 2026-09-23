'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV } from '@/lib/ui';
import { Card, EmptyState, Spinner } from '@/components/ui';
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
      <h1 className="text-xl font-semibold">Audit log</h1>
      {loading ? (
        <Spinner />
      ) : error ? (
        <EmptyState message={error} />
      ) : data && data.length > 0 ? (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-400">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.action}</td>
                  <td className="px-4 py-3">{a.actor?.name ?? a.actor?.email ?? 'system'}</td>
                  <td className="max-w-[40ch] truncate px-4 py-3 text-xs text-neutral-400">{JSON.stringify(a.metadata ?? {})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState message="No audit entries yet." />
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