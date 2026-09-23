'use client';

import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Button, Card, EmptyState, Input, Spinner } from '@/components/ui';
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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      <Card className="max-h-[70vh] overflow-auto p-0 md:max-h-none">
        <div className="border-b border-neutral-200 p-3">
          <button
            onClick={() => setActive(null)}
            className="w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50"
          >
            + New conversation
          </button>
        </div>
        {conv.loading ? (
          <Spinner />
        ) : conv.data && conv.data.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {conv.data.map((c) => (
              <li key={c.id}>
                <button onClick={() => open(c)} className={`w-full px-3 py-3 text-left hover:bg-neutral-50 ${active?.id === c.id ? 'bg-neutral-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">
                      {c.otherParticipants.map((p) => p.name).join(', ') || 'Conversation'}
                    </p>
                    {c.unreadCount > 0 && <span className="rounded-full bg-[#1b5e3b] px-2 py-0.5 text-[10px] text-white">{c.unreadCount}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-400">
                    {c.lastMessage ? c.lastMessage.content : 'No messages yet'} ·{' '}
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No conversations yet." />
        )}
      </Card>

      <Card className="flex max-h-[70vh] flex-col p-0">
        {!active ? (
          <EmptyState message="Select a conversation to start messaging." />
        ) : (
          <>
            <div className="border-b border-neutral-200 p-3">
              <p className="font-medium">{active.otherParticipants.map((p) => p.name).join(', ')}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-auto p-4">
              {loading ? (
                <Spinner />
              ) : messages && messages.length > 0 ? (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderId === session.user.id ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        m.senderId === session.user.id ? 'bg-[#1b5e3b] text-white' : 'bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      {m.senderId !== session.user.id && <p className="text-[10px] text-neutral-400">{m.sender.name}</p>}
                      <p>{m.content}</p>
                      <p className={`mt-0.5 text-right text-[10px] ${m.senderId === session.user.id ? 'text-white/70' : 'text-neutral-400'}`}>
                        {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="No messages yet in this conversation." />
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-neutral-200 p-3">
              <input
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#1b5e3b]"
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