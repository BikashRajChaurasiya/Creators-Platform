'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { BRAND_NAV } from '@/lib/ui';
import { MessagesView } from '@/components/messages-view';
import { Session } from '@/lib/session';
import { Spinner } from '@/components/ui';

function BrandMessagesInner({ session }: { session: Session }) {
  const params = useSearchParams();
  return (
    <MessagesView
      session={session}
      newParticipantHref="/brand/applications"
      initialConversationId={params.get('c')}
    />
  );
}

export default function BrandMessagesPage() {
  return (
    <RequireAuth roles={['brand']}>
      {(session) => (
        <PortalShell title="Brand portal" session={session} items={BRAND_NAV}>
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner />
              </div>
            }
          >
            <BrandMessagesInner session={session} />
          </Suspense>
        </PortalShell>
      )}
    </RequireAuth>
  );
}
