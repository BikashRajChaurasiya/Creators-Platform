'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV } from '@/lib/ui';
import { MessagesView } from '@/components/messages-view';

export default function CreatorMessagesPage() {
  return (
    <RequireAuth roles={['creator']}>
      {(session) => (
        <PortalShell title="Creator portal" session={session} items={CREATOR_NAV}>
          <MessagesView session={session} newParticipantHref="/creator/applications" />
        </PortalShell>
      )}
    </RequireAuth>
  );
}