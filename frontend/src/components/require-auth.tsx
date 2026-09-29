'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@ugcnp/shared';
import { Session, loadSession } from '@/lib/session';
import { Spinner } from '@/components/ui';

/**
 * Every role the API can authenticate, lowercased for route guards.
 *
 * This used to be a hand-written `'creator' | 'brand' | 'admin'`, which made
 * MANAGER, QA and FINANCE accounts unable to pass *any* guard — they signed in
 * successfully and were bounced straight back to the landing page.
 */
export type AllowedRole = Lowercase<UserRole>;

export function RequireAuth({ roles, children }: { roles: readonly AllowedRole[]; children: (session: Session) => React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const role = s.user.role.toLowerCase() as AllowedRole;
    if (!roles.includes(role)) {
      router.replace('/');
      return;
    }
    setSession(s);
  }, [router, roles]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <>{children(session)}</>;
}