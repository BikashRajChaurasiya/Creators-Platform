'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { CREATOR_NAV, statusColor } from '@/lib/ui';
import { Badge, Button, Card, EmptyState, SkeletonCard, TextArea } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { UploadImageButton } from '@/components/image-upload';
import { useApi } from '@/lib/use-api';
import { Session } from '@/lib/session';
import { useToast } from '@/components/toast';

interface AppRow {
  id: string;
  status: string;
  pitch: string;
  createdAt: string;
  campaign: { id: string; title: string; budgetMin: number; budgetMax: number; status: string };
  _count?: { submissions: number };
}

function MyApplications({ session }: { session: Session }) {
  const { data, loading, error, reload } = useApi<AppRow[]>('/applications?scope=mine&limit=50', session.tokens.accessToken);
  const [tab, setTab] = useState<string>('ALL');
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const list = (data ?? []).filter((a) => tab === 'ALL' || a.status === tab);
  const tabs = ['ALL', ...Array.from(new Set((data ?? []).map((a) => a.status)))];

  async function submitDeliverable(a: AppRow) {
    if (!fileUrl) {
      toast.error('Upload an image of your deliverable first.');
      return;
    }
    setBusy(true);
    try {
      await apiRequest(`/applications/${a.id}/submissions`, {
        method: 'POST',
        token: session.tokens.accessToken,
        body: { fileUrl, caption, notes },
      });
      toast.success('Deliverable submitted for review.');
      setOpenFor(null);
      setFileUrl('');
      setCaption('');
      setNotes('');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">My applications</h1>
        <p className="text-sm text-neutral-500">Track the status of every campaign you&apos;ve applied to, and submit deliverables once accepted.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
              tab === t
                ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-sm'
                : 'border border-neutral-300 bg-white text-neutral-600 hover:border-primary hover:text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
      ) : error ? (
        <EmptyState message={error} />
      ) : list.length > 0 ? (
        <div className="flex flex-col gap-3">
          {list.map((a) => (
            <Card key={a.id} hover>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.campaign.title}</p>
                  <p className="text-xs text-neutral-400">
                    Applied {new Date(a.createdAt).toLocaleDateString()} · {a.campaign.status}
                    {' · '}
                    {a._count?.submissions ?? 0} deliverable(s) submitted
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge color={statusColor(a.status)}>{a.status}</Badge>
                  {a.status === 'ACCEPTED' && (
                    <Button
                      variant="outline"
                      className="px-3 py-1 text-xs"
                      onClick={() => {
                        setOpenFor(openFor === a.id ? null : a.id);
                        setFileUrl('');
                        setCaption('');
                        setNotes('');
                      }}
                    >
                      {openFor === a.id ? 'Cancel' : 'Submit deliverable'}
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-neutral-600">{a.pitch}</p>
              {openFor === a.id && a.status === 'ACCEPTED' && (
                <div className="mt-4 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
                  <UploadImageButton token={session.tokens.accessToken} onUploaded={setFileUrl} label={fileUrl ? 'Change image' : 'Upload final image'} />
                  {fileUrl && (
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="block text-xs font-medium text-primary hover:underline">
                      Preview uploaded file ↗
                    </a>
                  )}
                  <TextArea label="Caption (shown post)" placeholder="Your post caption…" rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} />
                  <TextArea label="Notes for brand" placeholder="Timeline, screenshots link, or anything the brand should know…" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <Button onClick={() => submitDeliverable(a)} disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit deliverable'}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="You haven't applied to any campaigns yet" message="Explore open campaigns and send your first pitch." />
      )}
    </div>
  );
}

export default function CreatorApplicationsPage() {
  return (
    <RequireAuth roles={['creator']}>
      {(session) => (
        <PortalShell title="Creator portal" session={session} items={CREATOR_NAV}>
          <MyApplications session={session} />
        </PortalShell>
      )}
    </RequireAuth>
  );
}