'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV, CURRENCY } from '@/lib/ui';
import { Card, EmptyState, SkeletonCard, StatCard } from '@/components/ui';
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

interface FinanceOverview {
  platformRevenue: { commissionCollected: number; reservedCommission: number; vatOnCommission: number; vatPercent: number; total: number };
  creatorDues: { paidOut: number; outstanding: number; outstandingCount: number; tdsWithheld: number; tdsPercent: number };
  makerCheck: { awaitingApproval: number; awaitingRelease: number };
}

function AdminDash({ session }: { session: Session }) {
  const rep = useApi<Report>('/admin/reports/summary', session.tokens.accessToken);
  const finance = useApi<FinanceOverview>('/admin/finance', session.tokens.accessToken);
  const f = finance.data;

  const r = rep.data;
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">Admin console</p>
        <h1 className="mt-1 text-2xl font-bold">Platform overview</h1>
        <p className="mt-1 text-sm text-white/80">Platform-wide oversight of users, campaigns and revenue.</p>
      </div>

      {rep.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      ) : rep.error ? (
        <EmptyState message={rep.error} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Users" value={r?.users ?? 0} icon="👥" tint="primary" sub="Total accounts" />
            <StatCard label="Campaigns" value={r?.campaigns ?? 0} icon="📢" tint="blue" sub="Across all brands" />
            <StatCard label="Applications" value={r?.pendingApplications ?? 0} icon="📥" tint="amber" sub="Pending review" />
            <StatCard label="Gross volume" value={CURRENCY(r?.grossVolume ?? 0)} icon="💰" tint="green" sub="All campaign value" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Creators" value={r?.creators ?? 0} icon="🎨" tint="accent" sub="Active creator profiles" />
            <StatCard label="Brands" value={r?.brands ?? 0} icon="🏢" tint="blue" sub="Registered brands" />
            <StatCard label="Platform fees" value={r ? CURRENCY(r.platformRevenue) : '–'} icon="📈" tint="amber" sub="Commission collected" />
          </div>

          <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Submissions" value={r?.submissions ?? 0} />
            <Metric label="Creators" value={r?.creators ?? 0} />
            <Metric label="Brands" value={r?.brands ?? 0} />
            <Metric label="Net revenue" value={CURRENCY((r?.platformRevenue ?? 0))} />
          </Card>

          <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Platform revenue" value={f ? CURRENCY(f.platformRevenue.total) : '–'} />
            <Metric label="Reserved fees" value={f ? CURRENCY(f.platformRevenue.reservedCommission) : '–'} />
            <Metric label="Creator dues outstanding" value={f ? CURRENCY(f.creatorDues.outstanding) : '–'} />
            <Metric label="Maker-check queue" value={f ? String(f.makerCheck.awaitingApproval + f.makerCheck.awaitingRelease) : '–'} />
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-800">{value}</p>
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