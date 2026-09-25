'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { ApiError, apiRequest } from '@/lib/api';
import { Badge, Button, Card, EmptyState, SkeletonCard, StatCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';
import { useToast } from '@/components/toast';

interface FinanceOverview {
  platformRevenue: { commissionCollected: number; reservedCommission: number; vatOnCommission: number; vatPercent: number; total: number };
  creatorDues: { paidOut: number; outstanding: number; outstandingCount: number; tdsWithheld: number; tdsPercent: number };
  grossVolume: number;
  volumePending: number;
  payerCount: number;
  makerCheck: { awaitingApproval: number; awaitingRelease: number };
  channels: { channel: string; count: number; amount: number }[];
  invoices: { billed: number; commissionOnBilled: number; count: number };
}

interface PaymentRow {
  id: string;
  amount: number;
  payoutAmount: number;
  commissionAmount: number;
  status: string;
  channel: string | null;
  providerRef: string | null;
  preparedById: string | null;
  approvedById: string | null;
  campaign: { id: string; title: string };
  creator: { id: string; name: string; email: string };
}

function Finance({ session }: { session: Session }) {
  const finance = useApi<FinanceOverview>('/admin/finance', session.tokens.accessToken);
  const payments = useApi<PaymentRow[]>('/payments?scope=all&limit=100', session.tokens.accessToken);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  const f = finance.data;
  const queue = (payments.data ?? []).filter((p) => p.status === 'PENDING' || p.status === 'APPROVED');
  const me = session.user.id;

  async function act(id: string, action: 'approve' | 'release') {
    setBusyId(id);
    try {
      await apiRequest(`/payments/${id}/${action}`, {
        method: 'POST',
        token: session.tokens.accessToken,
        body: action === 'release' ? {} : undefined,
      });
      toast.success(action === 'approve' ? 'Payment approved.' : 'Payment released.');
      finance.reload();
      payments.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `${action} failed`);
    } finally {
      setBusyId(null);
    }
  }

  const canRelease = (p: PaymentRow) => me !== p.preparedById && me !== p.approvedById;
  const canApprove = (p: PaymentRow) => me !== p.preparedById;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">Admin console</p>
        <h1 className="mt-1 text-2xl font-bold">Finance — revenue vs creator dues</h1>
        <p className="mt-1 text-sm text-white/80">
          Maker–checker: prepare / approve / release must be done by different operators. VAT and TDS are estimates pending verification.
        </p>
      </div>

      {finance.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      ) : finance.error ? (
        <EmptyState message={finance.error} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Platform revenue" value={CURRENCY(f?.platformRevenue.total ?? 0)} icon="📈" tint="accent" sub={`Incl. ${f?.platformRevenue.vatPercent ?? 13}% VAT estimate`} />
            <StatCard label="Reserved commission" value={CURRENCY(f?.platformRevenue.reservedCommission ?? 0)} icon="⏳" tint="amber" sub="Pending or approved" />
            <StatCard label="Creator dues outstanding" value={CURRENCY(f?.creatorDues.outstanding ?? 0)} icon="💸" tint="blue" sub={`${f?.creatorDues.outstandingCount ?? 0} payment(s)`} />
            <StatCard label="Maker-check queue" value={(f?.makerCheck.awaitingApproval ?? 0) + (f?.makerCheck.awaitingRelease ?? 0)} icon="🛡️" tint="primary" sub={`${f?.makerCheck.awaitingApproval ?? 0} to approve · ${f?.makerCheck.awaitingRelease ?? 0} to release`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold">Platform revenue</h2>
              <div className="space-y-1 text-sm">
                <Row label="Commission collected" value={CURRENCY(f?.platformRevenue.commissionCollected ?? 0)} />
                <Row label={`VAT on commission (${f?.platformRevenue.vatPercent ?? 13}%)`} value={CURRENCY(f?.platformRevenue.vatOnCommission ?? 0)} />
                <Row label="Reserved (pending)" value={CURRENCY(f?.platformRevenue.reservedCommission ?? 0)} />
                <Row label="Invoice value billed" value={CURRENCY(f?.invoices.billed ?? 0)} strong />
                <Divider />
                <Row label="Total platform revenue" value={CURRENCY(f?.platformRevenue.total ?? 0)} strong />
              </div>
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">Creator dues</h2>
              <div className="space-y-1 text-sm">
                <Row label="Paid out to creators" value={CURRENCY(f?.creatorDues.paidOut ?? 0)} />
                <Row label="Outstanding" value={CURRENCY(f?.creatorDues.outstanding ?? 0)} />
                <Row label={`TDS withheld (${f?.creatorDues.tdsPercent ?? 15}%)`} value={CURRENCY(f?.creatorDues.tdsWithheld ?? 0)} />
                <Row label="Distinct payers" value={String(f?.payerCount ?? 0)} />
                <Divider />
                <Row label="Gross volume (PAID)" value={CURRENCY(f?.grossVolume ?? 0)} strong />
              </div>
            </Card>
          </div>

          {f && f.channels.length > 0 && (
            <Card>
              <h2 className="mb-3 font-semibold">Disbursement channels (PAID)</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-400">
                    <th className="pb-2">Channel</th>
                    <th className="pb-2">Payouts</th>
                    <th className="pb-2">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {f.channels.map((c) => (
                    <tr key={c.channel} className="border-t border-neutral-100">
                      <td className="py-2 capitalize">{String(c.channel).replace(/_/g, ' ')}</td>
                      <td className="py-2">{c.count}</td>
                      <td className="py-2">{CURRENCY(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      <Card>
        <div className="mb-3">
          <h2 className="font-semibold">Maker–check queue</h2>
          <p className="text-xs text-neutral-400">Prepare and release must be performed by different operators.</p>
        </div>
        {payments.loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : payments.error ? (
          <EmptyState message={payments.error} />
        ) : queue.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {queue.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.campaign.title}</p>
                  <p className="text-xs text-neutral-400">
                    {p.creator.name} · {p.creator.email} · Payout {CURRENCY(p.payoutAmount)} ({CURRENCY(p.amount)} gross)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={statusColor(p.status)}>{p.status}</Badge>
                  {p.status === 'PENDING' && (
                    <Button variant="outline" className="px-3 py-1 text-xs" disabled={busyId === p.id || !canApprove(p)} onClick={() => act(p.id, 'approve')}>
                      {me === p.preparedById ? 'Prepared by you' : busyId === p.id ? '…' : 'Approve'}
                    </Button>
                  )}
                  {p.status === 'APPROVED' && (
                    <Button variant="outline" className="px-3 py-1 text-xs" disabled={busyId === p.id || !canRelease(p)} onClick={() => act(p.id, 'release')}>
                      {me === p.preparedById || me === p.approvedById ? 'Your sign-off' : busyId === p.id ? '…' : 'Release'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Queue clear" message="No payments awaiting approval or release." />
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? 'font-semibold text-neutral-800' : 'text-neutral-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-neutral-100" />;
}

export default function AdminFinancePage() {
  return (
    <RequireAuth roles={['admin']}>
      {(session) => (
        <PortalShell title="Admin console" session={session} items={ADMIN_NAV}>
          <Finance session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}