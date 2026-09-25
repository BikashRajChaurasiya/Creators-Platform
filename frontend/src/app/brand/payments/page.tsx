'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { BRAND_NAV, CURRENCY, statusColor } from '@/lib/ui';
import { Badge, Button, Card, EmptyState, SkeletonCard, StatCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { apiRequest } from '@/lib/api';
import { Session } from '@/lib/session';
import { useToast } from '@/components/toast';

interface Summary {
  totalBilled: number;
  invoiceCount: number;
  unpaidTotal: number;
  payoutsTotal: number;
  commissionTotal: number;
  spendTotal: number;
  vatEstimate: number;
  commissionPercent: number;
}

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
  creator: { id: string; name: string; email: string };
}

interface InvoiceRow {
  id: string;
  amount: number;
  commissionAmount: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  campaign: { id: string; title: string };
}

interface AcceptedApp {
  id: string;
  status: string;
  campaign: { id: string; title: string; budgetMin: number; budgetMax: number };
  creator: { user: { id: string; name: string } };
}

function BrandPayments({ session }: { session: Session }) {
  const summary = useApi<Summary>('/payments/summary', session.tokens.accessToken);
  const payments = useApi<PaymentRow[]>('/payments?scope=outgoing&limit=50', session.tokens.accessToken);
  const invoices = useApi<InvoiceRow[]>('/payments/invoices?limit=50', session.tokens.accessToken);
  const apps = useApi<AcceptedApp[]>('/applications?scope=received&limit=50', session.tokens.accessToken);
  const toast = useToast();

  const accepted = (apps.data ?? []).filter((a) => a.status === 'ACCEPTED');
  const s = summary.data;
  const rows = payments.data ?? [];
  const invoiceRows = invoices.data ?? [];

  const [sel, setSel] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  async function initiate() {
    const app = accepted.find((a) => a.id === sel);
    if (!app) {
      toast.error('Pick an accepted creator first.');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid payout amount in NPR.');
      return;
    }
    setBusy(true);
    try {
      const p = await apiRequest<{ id: string }>('/payments', {
        method: 'POST',
        token: session.tokens.accessToken,
        body: { creatorId: app.creator.user.id, campaignId: app.campaign.id, amount: value },
      });
      toast.success(`Payout of ${CURRENCY(value)} prepared for approval.`);
      setSel('');
      setAmount('');
      payments.reload();
      invoices.reload();
      toast.success(`Payment ${p.id.slice(0, 8)}… recorded.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the payout.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Payments &amp; invoices</h1>
        <p className="text-sm text-neutral-500">
          You prepare payouts for accepted creators; finance approves and releases them, keeping a maker–checker on
          every disbursement.
        </p>
      </div>

      {summary.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      ) : summary.error ? (
        <EmptyState message={summary.error} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total billed" value={CURRENCY(s?.totalBilled ?? 0)} icon="🧾" tint="primary" sub={`${s?.invoiceCount ?? 0} invoices`} />
          <StatCard label="Spend (incl. VAT)" value={CURRENCY(s?.spendTotal ?? 0)} icon="💳" tint="blue" sub={`Payouts + ${s?.commissionPercent ?? 15}% fee`} />
          <StatCard label="Unpaid" value={CURRENCY(s?.unpaidTotal ?? 0)} icon="⏳" tint="amber" sub="Draft or sent invoices outstanding" />
          <StatCard label="Creator fees" value={CURRENCY(s?.commissionTotal ?? 0)} icon="🔧" tint="green" sub={`VAT est. ${CURRENCY(s?.vatEstimate ?? 0)}`} />
        </div>
      )}

      <Card>
        <div className="mb-3">
          <h2 className="font-semibold">Initiate a payout</h2>
          <p className="text-xs text-neutral-400">
            Creates a PENDING payment for an accepted creator on your campaign. Finance must approve it, then another
            operator releases it before any money moves.
          </p>
        </div>
        {accepted.length === 0 ? (
          <EmptyState message="Once you accept a creator application, they become eligible for a payout here." />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Accepted creator</span>
              <select
                value={sel}
                onChange={(e) => setSel(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary-soft"
              >
                <option value="">Select creator &amp; campaign…</option>
                {accepted.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.creator.user.name} — {a.campaign.title} ({CURRENCY(a.campaign.budgetMin)}–{CURRENCY(a.campaign.budgetMax)})
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-full sm:w-44">
              <span className="mb-1 block text-sm font-medium text-neutral-600">Gross amount (NPR)</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />
            </label>
            <Button onClick={initiate} disabled={busy || !sel || !amount} className="whitespace-nowrap">
              {busy ? 'Preparing…' : 'Prepare payout'}
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3">
            <h2 className="font-semibold">Transactions</h2>
            <p className="text-xs text-neutral-400">Every payout on your campaigns, newest first.</p>
          </div>
          {payments.loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
          ) : payments.error ? (
            <EmptyState message={payments.error} />
          ) : rows.length > 0 ? (
            <ul className="divide-y divide-neutral-100">
              {rows.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{p.creator.name}</p>
                    <p className="text-xs text-neutral-400">
                      {p.campaign.title} · {CURRENCY(p.amount)} · You pay {CURRENCY(p.commissionAmount)} fee
                      {p.channel ? ` · ${p.channel.replace(/_/g, ' ')}` : ''}
                    </p>
                  </div>
                  <Badge color={statusColor(p.status)}>{p.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No transactions yet" message="Payments you initiate will appear here with their status." />
          )}
        </Card>

        <Card>
          <div className="mb-3">
            <h2 className="font-semibold">Invoices</h2>
            <p className="text-xs text-neutral-400">An invoice is generated for every payout you prepare.</p>
          </div>
          {invoices.loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
          ) : invoices.error ? (
            <EmptyState message={invoices.error} />
          ) : invoiceRows.length > 0 ? (
            <ul className="divide-y divide-neutral-100">
              {invoiceRows.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{inv.campaign.title}</p>
                    <p className="text-xs text-neutral-400">
                      {CURRENCY(inv.amount)} · fee {CURRENCY(inv.commissionAmount)} · bill date {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge color={statusColor(inv.status)}>{inv.status === 'OVERDUE' ? 'OVERDUE' : inv.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No invoices yet" message="Preparing a payout generates the matching invoice automatically." />
          )}
        </Card>
      </div>
    </div>
  );
}

export default function BrandPaymentsPage() {
  return (
    <RequireAuth roles={['brand']}>
      {(session) => (
        <PortalShell title="Brand portal" session={session} items={BRAND_NAV}>
          <BrandPayments session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}