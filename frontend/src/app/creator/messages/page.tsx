'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV } from '@/lib/ui';
import { MessagesView } from '@/components/messages-view';
import { Session } from '@/lib/session';
import { Spinner } from '@/components/ui';

function CreatorMessagesInner({ session }: { session: Session }) {
  const params = useSearchParams();
  return (
    <MessagesView
      session={session}
      newParticipantHref="/creator/applications"
      initialConversationId={params.get('c')}
    />
  );
}

export default function CreatorMessagesPage() {
  return (
    <RequireAuth roles={['creator']}>
      {(session) => (
        <PortalShell title="Creator portal" session={session} items={CREATOR_NAV}>
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner />
              </div>
            }
          >
            <CreatorMessagesInner session={session} />
          </Suspense>
        </PortalShell>
      )}
    </RequireAuth>
  );
}
