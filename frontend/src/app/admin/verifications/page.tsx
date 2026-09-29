'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import type { AllowedRole } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { adminNavFor } from '@/lib/ui';
import { Button, Card, EmptyState, ErrorState, SkeletonCard } from '@/components/ui';
import { apiRequest, describeApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';
import { useToast } from '@/components/toast';

interface Party {
  id: string;
  name: string;
  email: string;
}

interface VerificationRow {
  id: string;
  documentUrl: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface CreatorVerification extends VerificationRow {
  profile: Party & { verificationStatus: string };
}

interface BrandVerification extends VerificationRow {
  brand: Party & { verificationStatus: string };
}

interface Queue {
  creators: CreatorVerification[];
  brands: BrandVerification[];
}

function Verifications({ session }: { session: Session }) {
  const queue = useApi<Queue>('/admin/verifications?status=PENDING', session.tokens.accessToken);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const toast = useToast();

  async function decide(kind: 'creator' | 'brand', id: string, status: 'VERIFIED' | 'REJECTED') {
    setBusyId(id);
    setRowError(null);
    try {
      await apiRequest(`/admin/${kind}-verifications/${id}`, {
        method: 'PATCH',
        token: session.tokens.accessToken,
        body: { status },
      });
      toast.success(`Marked ${status.toLowerCase()}.`);
      queue.reload();
    } catch (err) {
      const message = describeApiError(err, 'Could not record the decision.');
      setRowError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  const creators = queue.data?.creators ?? [];
  const brands = queue.data?.brands ?? [];
  const total = creators.length + brands.length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Identity verification</h1>
        <p className="text-sm text-neutral-500">
          Review documents submitted by creators and brands. A decision updates the profile badge that
          creator discovery and the portals read.
        </p>
      </div>

      {rowError && <ErrorState error={rowError} onRetry={queue.reload} />}

      {queue.loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : queue.error ? (
        <ErrorState error={queue.error} onRetry={queue.reload} />
      ) : total === 0 ? (
        <EmptyState title="Nothing waiting" message="No pending verification requests." />
      ) : (
        <>
          {creators.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-3">Creator</th>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {creators.map((v) => (
                    <tr key={v.id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium">{v.profile.name}</p>
                        <p className="text-xs text-neutral-400">{v.profile.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {v.documentUrl ? (
                          <a
                            href={v.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-2"
                          >
                            View document
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-400">None attached</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-400">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button
                            className="px-3 py-1 text-xs"
                            disabled={busyId === v.id}
                            onClick={() => decide('creator', v.id, 'VERIFIED')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs text-red-600"
                            disabled={busyId === v.id}
                            onClick={() => decide('creator', v.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {brands.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {brands.map((v) => (
                    <tr key={v.id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium">{v.brand.name}</p>
                        <p className="text-xs text-neutral-400">{v.brand.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {v.documentUrl ? (
                          <a
                            href={v.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-2"
                          >
                            View document
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-400">None attached</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-400">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button
                            className="px-3 py-1 text-xs"
                            disabled={busyId === v.id}
                            onClick={() => decide('brand', v.id, 'VERIFIED')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs text-red-600"
                            disabled={busyId === v.id}
                            onClick={() => decide('brand', v.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <p className="text-xs text-neutral-400">
            Showing {total} pending request{total === 1 ? '' : 's'}. Decided requests move to the audit log.
          </p>
        </>
      )}
    </div>
  );
}

export default function AdminVerificationsPage() {
  return (
    <RequireAuth roles={['admin']}>
      {(session) => (
        <PortalShell
          title="Admin console"
          session={session}
          items={adminNavFor(session.user.role.toLowerCase() as AllowedRole)}
        >
          <Verifications session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}
