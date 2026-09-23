'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Session } from '@/lib/session';
import { apiLogout } from '@/lib/session';
import { useState } from 'react';

export interface NavItem {
  href: string;
  label: string;
}

export function PortalShell({ title, session, items, children }: { title: string; session: Session; items: readonly NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await apiLogout(session.tokens.accessToken);
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4">
          <p className="font-bold text-[#1b5e3b]">UGCNP</p>
          <p className="text-xs text-neutral-400">{title}</p>
        </div>
        <nav className="flex-1 px-2 py-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                pathname === item.href ? 'bg-[#1b5e3b] font-medium text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-neutral-200 p-3">
          <p className="truncate text-xs text-neutral-500">{session.user.name}</p>
          <p className="truncate text-[11px] text-neutral-400">{session.user.email}</p>
          <button onClick={logout} disabled={busy} className="mt-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100 disabled:opacity-50">
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-neutral-50 p-6">{children}</main>
    </div>
  );
}