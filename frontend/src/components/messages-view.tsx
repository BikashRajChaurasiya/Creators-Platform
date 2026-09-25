'use client';

import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Button, Card, EmptyState, Spinner } from '@/components/ui';
import { Avatar } from '@/components/avatar';
import { Session } from '@/lib/session';
import { useApi } from '@/lib/use-api';

interface Conversation {
  id: string;
  unreadCount: number;
  lastMessage: { id: string; content: string; createdAt: string; senderId: string } | null;
  otherParticipants: { id: string; name: string; avatarUrl: string | null }[];
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

export function MessagesView({ session, newParticipantHref }: { session: Session; newParticipantHref: string }) {
  const conv = useApi<Conversation[]>('/conversations', session.tokens.accessToken);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function open(c: Conversation) {
    setActive(c);
    setLoading(true);
    try {
      const data = await apiRequest<Message[]>('/conversations/' + c.id + '/messages', { token: session.tokens.accessToken });
      setMessages(data);
      apiRequest('/conversations/' + c.id + '/read', { method: 'PATCH', token: session.tokens.accessToken }).catch(() => {});
      conv.reload();
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, active]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await apiRequest<Message>('/conversations/' + active.id + '/messages', {
        method: 'POST',
        token: session.tokens.accessToken,
        body: { content: text.trim() },
      });
      setMessages((m) => [...(m ?? []), msg]);
      setText('');
      conv.reload();
    } finally {
      setSending(false);
    }
  }

  const peerName = (c: Conversation) => c.otherParticipants.map((p) => p.name).join(', ') || 'Conversation';
  const peerAvatar = (c: Conversation) => c.otherParticipants[0]?.avatarUrl ?? null;
  const activePeer = active ? { name: peerName(active), avatarUrl: peerAvatar(active) } : null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
      <Card className="max-h-[75vh] overflow-hidden p-0 md:max-h-[calc(100vh-8rem)] md:max-h-none">
        <div className="border-b border-neutral-200 p-3">
          <a href={newParticipantHref} className="block w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-center text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary-soft">
            + Start a conversation
          </a>
        </div>
        {conv.loading ? (
          <Spinner />
        ) : conv.data && conv.data.length > 0 ? (
          <ul className="max-h-[60vh] divide-y divide-neutral-100 overflow-y-auto md:max-h-none">
            {conv.data.map((c) => {
              const activeRow = active?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => open(c)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                      activeRow ? 'bg-primary-soft' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <Avatar name={peerName(c)} url={peerAvatar(c)} size={9} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-neutral-800">{peerName(c)}</p>
                        <span className="ml-2 shrink-0 text-[10px] text-neutral-400">{c.lastMessage ? timeAgo(c.updatedAt) : ''}</span>
                      </div>
                      <p className={`mt-0.5 truncate text-xs ${c.unreadCount > 0 ? 'font-medium text-neutral-700' : 'text-neutral-400'}`}>
                        {c.unreadCount > 0 ? `● ${c.unreadCount} new · ` : ''}
                        {c.lastMessage ? c.lastMessage.content : 'No messages yet'}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No conversations yet" message="Message a brand or creator to get started." />
        )}
      </Card>

      <Card className="flex max-h-[75vh] flex-col p-0">
        {!active ? (
          <EmptyState title="Select a conversation" message="Choose a conversation on the left to start messaging." />
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-neutral-200 p-3">
              <Avatar name={activePeer?.name ?? ''} url={activePeer?.avatarUrl ?? null} size={8} />
              <p className="font-medium">{activePeer?.name}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {loading ? (
                <Spinner />
              ) : messages && messages.length > 0 ? (
                messages.map((m) => {
                  const mine = m.senderId === session.user.id;
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && (
                        <Avatar name={m.sender.name} url={m.sender.avatarUrl} size={6} />
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                          mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        <p>{m.content}</p>
                        <p className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-neutral-400'}`}>
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                      {mine && <Avatar name={session.user.name} url={null} size={6} />}
                    </div>
                  );
                })
              ) : (
                <EmptyState title="No messages yet" message="Say hello to kick off the conversation." />
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-neutral-200 p-3">
              <input
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary-soft"
                placeholder="Type a message…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <Button type="submit" disabled={sending || !text.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}