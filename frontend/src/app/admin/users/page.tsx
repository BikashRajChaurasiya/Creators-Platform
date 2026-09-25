'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { ADMIN_NAV, ROLE_LABEL, statusColor } from '@/lib/ui';
import { apiRequest } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { Badge, Button, Card, EmptyState, SkeletonCard } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';
import { useToast } from '@/components/toast';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
  createdAt: string;
}

function Users({ session }: { session: Session }) {
  const { data, loading, error, reload } = useApi<UserRow[]>('/admin/users?limit=50', session.tokens.accessToken);
  const [action, setAction] = useState<string | null>(null);
  const toast = useToast();

  async function setStatus(u: UserRow, status: string) {
    setAction(u.id + status);
    try {
      await apiRequest('/admin/users/' + u.id + '/status', { method: 'PATCH', token: session.tokens.accessToken, body: { status } });
      toast.success(`${u.name} is now ${status.toLowerCase()}.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setAction(null);
    }
  }

  async function setRole(u: UserRow, role: string) {
    setAction(u.id + role);
    try {
      await apiRequest('/admin/users/' + u.id + '/role', { method: 'PATCH', token: session.tokens.accessToken, body: { role } });
      toast.success(`${u.name} is now a ${role.toLowerCase()} account.`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-neutral-500">Manage accounts, roles and statuses across the platform.</p>
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
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-neutral-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} url={u.avatarUrl} size={8} />
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-neutral-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs outline-none transition-colors focus:border-primary"
                      value={u.role}
                      onChange={(e) => setRole(u, e.target.value)}
                      disabled={action === u.id + u.role}
                    >
                      {Object.keys(ROLE_LABEL).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor(u.status)}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {u.status === 'ACTIVE' ? (
                        <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => setStatus(u, 'SUSPENDED')} disabled={action === u.id + 'SUSPENDED'}>
                          Suspend
                        </Button>
                      ) : u.status === 'SUSPENDED' ? (
                        <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => setStatus(u, 'ACTIVE')} disabled={action === u.id + 'ACTIVE'}>
                          Activate
                        </Button>
                      ) : (
                        <span className="text-xs text-neutral-400">n/a</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState title="No users found" />
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RequireAuth roles={['admin']}>
      {(session) => (
        <PortalShell title="Admin console" session={session} items={ADMIN_NAV}>
          <Users session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}