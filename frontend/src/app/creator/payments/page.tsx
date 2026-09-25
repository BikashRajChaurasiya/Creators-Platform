'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { Badge, Card, EmptyState, SkeletonCard, StatCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';

interface PaymentRow {
  id: string;
  amount: number;
  payoutAmount: number;
  commissionAmount: number;
  status: string;
  channel: string | null;
  providerRef: string | null;
  createdAt: string;
  paidAt: string | null;
  campaign: { id: string; title: string };
}

interface Summary {
  totalEarned: number;
  paidCount: number;
  pendingCount: number;
  totalOutstanding: number;
  payoutChannel: string | null;
  fallbackChannel: string | null;
}

const STEPS = ['Submitted', 'Reviewed', 'Approved', 'Paid'];

function stepIndex(status: string): number {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'APPROVED':
      return 2;
    case 'PAID':
      return 3;
    default:
      return -1;
  }
}

function PayoutStepper({ status }: { status: string }) {
  const idx = stepIndex(status);
  if (idx < 0) {
    return <Badge color={statusColor(status)}>{status}</Badge>;
  }
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div
              className={`h-2.5 w-2.5 rounded-full ${i <= idx ? 'bg-primary' : 'bg-neutral-200'}`}
              aria-hidden
            />
            <span className={`mt-0.5 text-[10px] ${i <= idx ? 'font-semibold text-primary' : 'text-neutral-400'}`}>
              {s}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className={`h-0.5 w-5 rounded ${i < idx ? 'bg-primary' : 'bg-neutral-200'}`} aria-hidden />}
        </div>
      ))}
    </div>
  );
}

function Payouts({ session }: { session: Session }) {
  const payments = useApi<PaymentRow[]>('/payments?scope=received&limit=50', session.tokens.accessToken);
  const summary = useApi<Summary>('/payments/summary', session.tokens.accessToken);
  const s = summary.data;
  const rows = payments.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">Creator portal</p>
        <h1 className="mt-1 text-2xl font-bold">Payouts</h1>
        <p className="mt-1 text-sm text-white/80">
          {s?.payoutChannel
            ? `Receiving via ${s.payoutChannel.replace(/_/g, ' ')}${s.fallbackChannel ? ` · fallback ${s.fallbackChannel.replace(/_/g, ' ')}` : ''}`
            : 'Set a payout channel to receive payments.'}
        </p>
      </div>

      {summary.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      ) : summary.error ? (
        <EmptyState message={summary.error} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total earned" value={CURRENCY(s?.totalEarned ?? 0)} icon="💰" tint="green" sub="Payouts received" />
          <StatCard label="Awaiting release" value={CURRENCY(s?.totalOutstanding ?? 0)} icon="⏳" tint="amber" sub={`${s?.pendingCount ?? 0} reviewed or pending`} />
          <StatCard label="Payouts" value={s?.paidCount ?? 0} icon="✅" tint="primary" sub="Completed payouts" />
        </div>
      )}

      <Card>
        <div className="mb-3">
          <h2 className="font-semibold">Payout history</h2>
          <p className="text-xs text-neutral-400">Status moves Submitted → Reviewed → Approved → Paid.</p>
        </div>
        {payments.loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : payments.error ? (
          <EmptyState message={payments.error} />
        ) : rows.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.campaign.title}</p>
                  <p className="text-xs text-neutral-400">
                    Gross {CURRENCY(p.amount)} · You receive {CURRENCY(p.payoutAmount)} · Fee {CURRENCY(p.commissionAmount)}
                    {p.channel ? ` · ${p.channel.replace(/_/g, ' ')}${p.providerRef ? ` (${p.providerRef})` : ''}` : ''}
                  </p>
                </div>
                <PayoutStepper status={p.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No payouts yet" message="Your approved campaign deliveries will be released here." />
        )}
      </Card>
    </div>
  );
}

export default function CreatorPayoutsPage() {
  return (
    <RequireAuth roles={['creator']}>
      {(session) => (
        <PortalShell title="Creator portal" session={session} items={CREATOR_NAV}>
          <Payouts session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}