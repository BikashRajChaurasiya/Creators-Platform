'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session, loadSession } from '@/lib/session';
import { Spinner } from '@/components/ui';

export type AllowedRole = 'creator' | 'brand' | 'admin';

export function RequireAuth({ roles, children }: { roles: AllowedRole[]; children: (session: Session) => React.ReactNode }) {
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