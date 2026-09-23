'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV, CURRENCY } from '@/lib/ui';
import { Badge, Card, EmptyState, Spinner } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';

interface Report {
  users: number;
  creators: number;
  brands: number;
  campaigns: number;
  pendingApplications: number;
  submissions: number;
  grossVolume: number;
  platformRevenue: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

function AdminDash({ session }: { session: Session }) {
  const rep = useApi<Report>('/admin/reports/summary', session.tokens.accessToken);
  const users = useApi<{ data: UserRow[]; meta: { total: number } }>('/admin/users?limit=1', session.tokens.accessToken);

  const r = rep.data;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-neutral-500">Platform-wide oversight.</p>
      </div>

      {rep.loading ? (
        <Spinner />
      ) : rep.error ? (
        <EmptyState message={rep.error} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <p className="text-sm text-neutral-500">Users</p>
            <p className="mt-1 text-2xl font-bold">{r?.users ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-500">Campaigns</p>
            <p className="mt-1 text-2xl font-bold">{r?.campaigns ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-500">Applications</p>
            <p className="mt-1 text-2xl font-bold">{r?.pendingApplications ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-neutral-500">Gross volume</p>
            <p className="mt-1 text-2xl font-bold">{CURRENCY(r?.grossVolume ?? 0)}</p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-neutral-500">Creators</p>
          <p className="mt-1 text-xl font-bold">{r?.creators ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">Brands</p>
          <p className="mt-1 text-xl font-bold">{r?.brands ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">Platform fees</p>
          <p className="mt-1 text-xl font-bold">{r ? CURRENCY(r.platformRevenue) : '–'}</p>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireAuth roles={['admin']}>
      {(session) => (
        <PortalShell title="Admin console" session={session} items={ADMIN_NAV}>
          <AdminDash session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}