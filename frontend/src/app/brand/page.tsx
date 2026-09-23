'use client';

import Link from 'next/link';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { BRAND_NAV, CURRENCY, statusColor } from '@/lib/ui';
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
}

interface Profile {
  companyName: string;
  industry: string;
  verified: boolean;
  verificationStatus?: string;
}

function BrandDash({ session }: { session: Session }) {
  const campaigns = useApi<CampaignRow[]>('/campaigns/mine?limit=5', session.tokens.accessToken);
  const profile = useApi<Profile>('/brand/me/profile', session.tokens.accessToken);
  const apps = useApi<{ id: string; status: string }[]>('/applications?scope=received&limit=50', session.tokens.accessToken);

  const list = campaigns.data ?? [];
  const received = apps.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Brand dashboard</h1>
          <p className="text-sm text-neutral-500">{profile.data?.companyName ?? session.user.name} · {profile.data?.industry ?? ''}</p>
        </div>
        {profile.data && (
          <Badge color={statusColor(profile.data.verificationStatus ?? (profile.data.verified ? 'VERIFIED' : 'PENDING'))}>
            {profile.data.verificationStatus ?? (profile.data.verified ? 'VERIFIED' : 'PENDING')}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-neutral-500">Campaigns</p>
          <p className="mt-1 text-2xl font-bold">{list.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">Applications received</p>
          <p className="mt-1 text-2xl font-bold">{received.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">Pending</p>
          <p className="mt-1 text-2xl font-bold">{received.filter((a) => a.status === 'PENDING').length}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">My campaigns</h2>
          <Link href="/brand/campaigns" className="text-sm text-[#1b5e3b] hover:underline">
            Manage
          </Link>
        </div>
        {campaigns.loading ? (
          <Spinner />
        ) : campaigns.error ? (
          <EmptyState message={campaigns.error} />
        ) : list.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-neutral-400">
                    {CURRENCY(c.budgetMin)} – {CURRENCY(c.budgetMax)}
                  </p>
                </div>
                <Badge color={statusColor(c.status)}>{c.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No campaigns yet. Create your first campaign." />
        )}
      </Card>
    </div>
  );
}

export default function BrandDashboardPage() {
  return (
    <RequireAuth roles={['brand']}>
      {(session) => (
        <PortalShell title="Brand portal" session={session} items={BRAND_NAV}>
          <BrandDash session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}