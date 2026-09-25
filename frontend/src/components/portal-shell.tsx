'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Session, apiLogout } from '@/lib/session';
import { Avatar } from '@/components/avatar';
import { useApi } from '@/lib/use-api';
import { useState } from 'react';

export interface NavItem {
  href: string;
  label: string;
}

const NAV_ICONS: Record<string, string> = {
  Dashboard: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10',
  'Discover campaigns': 'M12 3v18M3 12h18M5 12a7 7 0 0114 0 7 7 0 01-14 0Z',
  'My applications': 'M9 12h6M9 16h6M9 8h6M4 4h16v16H4z',
  Campaigns: 'M3 21V8l7-5 7 5v13M3 21h18M10 11h4M10 15h4',
  Applications: 'M9 12h6M9 16h6M9 8h6M4 4h16v16H4z',
  Messages: 'M4 6h16v12H4zM4 6l8 6 8-6',
  Users: 'M16 5a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0',
  Settings: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  'Audit log': 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
};

function NavIcon({ label }: { label: string }) {
  const d = NAV_ICONS[label] ?? 'M4 6h16M4 12h10M4 18h13';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function SidebarContent({ title, session, items, onNavigate }: { title: string; session: Session; items: readonly NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const conv = useApi<{ unreadCount: number }[]>('/conversations?limit=50', session.tokens.accessToken);
  const unread = (conv.data ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  async function logout() {
    setBusy(true);
    await apiLogout(session.tokens.accessToken);
    router.replace('/login');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 bg-gradient-to-br from-primary to-primary-dark px-4 py-4">
        <Avatar name={session.user.name} size={8} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{title}</p>
          <p className="truncate text-[11px] text-white/60">{session.user.role.toLowerCase()} portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                active
                  ? 'bg-gradient-to-r from-primary to-primary-dark font-medium text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <span className={active ? 'text-white' : 'text-neutral-400'}>
                <NavIcon label={item.label} />
              </span>
              <span className="flex-1">{item.label}</span>
              {item.label === 'Messages' && unread > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-dark">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={session.user.name} url={null} size={8} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-800">{session.user.name}</p>
            <p className="truncate text-xs text-neutral-400">{session.user.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          disabled={busy}
          className="mt-3 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

export function PortalShell({ title, session, items, children }: { title: string; session: Session; items: readonly NavItem[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-neutral-200 bg-white lg:block">
        <SidebarContent title={title} session={session} items={items} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <SidebarContent title={title} session={session} items={items} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-100"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="font-semibold text-neutral-800">{title}</p>
          <Avatar name={session.user.name} size={7} />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}