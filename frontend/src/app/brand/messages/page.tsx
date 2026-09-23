'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { BRAND_NAV } from '@/lib/ui';
import { MessagesView } from '@/components/messages-view';

export default function BrandMessagesPage() {
  return (
    <RequireAuth roles={['brand']}>
      {(session) => (
        <PortalShell title="Brand portal" session={session} items={BRAND_NAV}>
          <MessagesView session={session} newParticipantHref="/brand/applications" />
        </PortalShell>
      )}
    </RequireAuth>
  );
}