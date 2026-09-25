'use client';

import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV, CURRENCY } from '@/lib/ui';
import { Card, EmptyState, SkeletonCard, StatCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';

interface SeriesPoint {
  date: string;
  users: number;
  campaigns: number;
  applications: number;
  submissions: number;
  payments: number;
  platformRevenue: number;
}

interface SeriesData {
  from: string;
  to: string;
  days: number;
  series: SeriesPoint[];
}

interface PlatformReport {
  users: number;
  creators: number;
  brands: number;
  campaigns: number;
  activeCampaigns: number;
  applications: number;
  submissions: number;
  payments: number;
  grossVolume: number;
  platformRevenue: number;
  invitesSent: number;
  openTasks: number;
  openDisputes: number;
  period: {
    from: string;
    to: string;
    newUsers: number;
    newCampaigns: number;
    newApplications: number;
    newSubmissions: number;
    grossVolume: number;
    platformRevenue: number;
  };
}

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const COLORS = {
  users: '#1b5e3b',
  campaigns: '#0ea5e9',
  applications: '#a855f7',
  submissions: '#f59e0b',
  revenue: '#84cc16',
};

function daysAgoISO(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function Analytics({ session }: { session: Session }) {
  const [days, setDays] = useState(30);
  const from = daysAgoISO(days);
  const report = useApi<PlatformReport>(`/analytics/platform?from=${encodeURIComponent(from)}`, session.tokens.accessToken, [days]);
  const series = useApi<SeriesData>(`/analytics/platform/series?from=${encodeURIComponent(from)}`, session.tokens.accessToken, [days]);

  const r = report.data;
  const points = series.data?.series ?? [];
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const fmtLabel = (label: unknown) => (typeof label === 'string' ? fmtDate(label) : '');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Platform analytics</h1>
          <p className="text-sm text-neutral-500">Signups, campaigns, applications and commission by day.</p>
        </div>
        <div className="flex rounded-full border border-neutral-300 bg-white p-1">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                days === p.days ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-sm' : 'text-neutral-600 hover:text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {report.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      ) : report.error ? (
        <EmptyState message={report.error} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="New signups" value={r?.period.newUsers ?? 0} icon="👥" tint="primary" sub={`${r?.users ?? 0} total users`} />
          <StatCard label="New campaigns" value={r?.period.newCampaigns ?? 0} icon="📢" tint="blue" sub={`${r?.campaigns ?? 0} all time`} />
          <StatCard label="New applications" value={r?.period.newApplications ?? 0} icon="📥" tint="amber" sub={`${r?.applications ?? 0} all time`} />
          <StatCard label="Comm. this period" value={CURRENCY(r?.period.platformRevenue ?? 0)} icon="📈" tint="green" sub="Platform fees earned in window" />
        </div>
      )}

      {series.loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonCard /> <SkeletonCard />
        </div>
      ) : series.error ? (
        <EmptyState message={series.error} />
      ) : points.length > 1 ? (
        <>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Growth by day</h2>
              <span className="text-xs text-neutral-400">{series.data?.days ?? 0} days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.users} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={COLORS.users} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gCampaigns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.campaigns} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={COLORS.campaigns} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.applications} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={COLORS.applications} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} stroke="#9ca3af" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                  <Tooltip labelFormatter={fmtLabel} />
                  <Legend />
                  <Area type="monotone" dataKey="users" name="Signups" stroke={COLORS.users} fill="url(#gUsers)" />
                  <Area type="monotone" dataKey="campaigns" name="Campaigns" stroke={COLORS.campaigns} fill="url(#gCampaigns)" />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke={COLORS.applications} fill="url(#gApps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="mb-3">
              <h2 className="font-semibold">Platform revenue by day</h2>
              <p className="text-xs text-neutral-400">Commission earned on payments prepared each day (NPR).</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} stroke="#9ca3af" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                  <Tooltip
                    labelFormatter={fmtLabel}
                    formatter={(value) => [CURRENCY(Number(value)), 'Platform revenue']}
                  />
                  <Bar dataKey="platformRevenue" name="Platform revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="mb-3">
              <h2 className="font-semibold">Workload by day</h2>
              <p className="text-xs text-neutral-400">Submissions received and payments prepared.</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.submissions} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={COLORS.submissions} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} stroke="#9ca3af" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                  <Tooltip labelFormatter={fmtLabel} />
                  <Legend />
                  <Area type="monotone" dataKey="submissions" name="Submissions" stroke={COLORS.submissions} fill="url(#gSub)" />
                  <Area type="monotone" dataKey="payments" name="Payments" stroke="#14b8a6" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      ) : (
        <EmptyState title="Not enough data yet" message="Charts appear once there is more than one day of activity in the window." />
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <RequireAuth roles={['admin']}>
      {(session) => (
        <PortalShell title="Admin console" session={session} items={ADMIN_NAV}>
          <Analytics session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}
