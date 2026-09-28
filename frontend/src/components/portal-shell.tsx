'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Briefcase,
  CircleUser,
  Compass,
  FileText,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  type LucideIcon,
  ScrollText,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import { Session, apiLogout } from '@/lib/session';
import { Avatar } from '@/components/avatar';
import { useApi } from '@/lib/use-api';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { useColorScheme } from '@/components/ui/skeleton';
import { Moon, Sun } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  /** Short label used by the mobile bottom tab bar. */
  shortLabel?: string;
  icon?: LucideIcon;
}

const NAV_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  'Discover campaigns': Compass,
  'My applications': FileText,
  Campaigns: Megaphone,
  Applications: Briefcase,
  'Payments & invoices': Wallet,
  Payouts: Wallet,
  Messages: MessageSquare,
  Analytics: BarChart3,
  Users: Users,
  Settings: Settings,
  'Audit log': ScrollText,
  // Without these, `iconFor` falls back to LayoutDashboard and the sidebar
  // shows the same glyph twice.
  Finance: Landmark,
  Profile: CircleUser,
};

function iconFor(item: NavItem): LucideIcon {
  return item.icon ?? NAV_ICONS[item.label] ?? LayoutDashboard;
}

/** Matches nested routes so `/creator/discover` highlights "Dashboard" off. */
function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === pathname) return true;
  return pathname.startsWith(`${href}/`);
}

function SignOutButton({ session, className }: { session: Session; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await apiLogout(session.tokens.accessToken);
    router.replace('/login');
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={logout}
      disabled={busy}
      className={className}
      aria-label="Sign out"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}

function ColorSchemeToggle({ className }: { className?: string }) {
  const { scheme, toggle } = useColorScheme();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      className={className}
      aria-label={scheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={scheme === 'dark' ? 'Light theme' : 'Dark theme'}
    >
      {scheme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}

function NavLinks({
  items,
  pathname,
  unread,
  onNavigate,
  variant,
}: {
  items: readonly NavItem[];
  pathname: string;
  unread: number;
  onNavigate?: () => void;
  variant: 'sidebar' | 'tabbar';
}) {
  if (variant === 'tabbar') {
    // Mobile shows the four highest-priority destinations, with the rest
    // reachable from the "More" sheet.
    return (
      <>
        {items.slice(0, 4).map((item) => {
          const Icon = iconFor(item);
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-fg-subtle hover:text-fg-muted',
              )}
            >
              <span className="relative">
                <Icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 1.9} />
                {item.label === 'Messages' && unread > 0 && (
                  <span
                    aria-hidden
                    className="absolute -right-2 -top-1 min-w-4 rounded-full bg-accent px-1 text-[9px] font-bold text-accent-dark"
                  >
                    {unread}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-1">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {items.map((item) => {
        const Icon = iconFor(item);
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
              active
                ? 'bg-gradient-to-r from-primary to-primary-dark font-medium text-[var(--primary-fg)] shadow-sm'
                : 'text-fg-muted hover:bg-primary-soft hover:text-primary',
            )}
          >
            <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
            <span className="flex-1">{item.label}</span>
            {item.label === 'Messages' && unread > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-dark">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

function SidebarContent({
  title,
  session,
  items,
  onNavigate,
}: {
  title: string;
  session: Session;
  items: readonly NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const conv = useApi<{ unreadCount: number }[]>('/conversations?limit=50', session.tokens.accessToken);
  const unread = (conv.data ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-line bg-gradient-to-br from-primary to-primary-dark px-4 py-4">
        <Avatar name={session.user.name} size={8} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--primary-fg)]">{title}</p>
          <p className="truncate text-[11px] opacity-70">{session.user.role.toLowerCase()} portal</p>
        </div>
      </div>

      <nav aria-label={`${title} navigation`} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavLinks items={items} pathname={pathname} unread={unread} onNavigate={onNavigate} variant="sidebar" />
      </nav>

      <div className="border-t border-line bg-elevated p-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={session.user.name} url={null} size={8} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{session.user.name}</p>
            <p className="truncate text-xs text-fg-subtle">{session.user.email}</p>
          </div>
          <ColorSchemeToggle />
        </div>
        <SignOutButton session={session} className="mt-3 w-full" />
      </div>
    </div>
  );
}

/** Slide-over nav for the destinations that do not fit in the bottom tab bar. */
function MoreMenu({
  open,
  onClose,
  title,
  session,
  items,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  session: Session;
  items: readonly NavItem[];
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      // Keep Tab cycling inside the sheet while it is modal.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`More ${title} options`}
        className="animate-dialog-in absolute inset-x-0 bottom-0 rounded-t-2xl border border-line bg-elevated p-4 shadow-[var(--shadow-lift)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-fg">{title}</p>
          <Button ref={closeRef} variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <nav aria-label="More destinations" className="grid grid-cols-2 gap-2">
          {items.slice(4).map((item) => {
            const Icon = iconFor(item);
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-3 text-sm transition-colors',
                  active
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-line text-fg-muted hover:border-primary/40 hover:text-primary',
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-line pt-3">
          <p className="truncate text-sm font-medium text-fg">{session.user.name}</p>
          <p className="truncate text-xs text-fg-subtle">{session.user.email}</p>
          <div className="mt-3 flex items-center gap-2">
            <SignOutButton session={session} className="flex-1" />
            <ColorSchemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortalShell({
  title,
  session,
  items,
  children,
}: {
  title: string;
  session: Session;
  items: readonly NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const conv = useApi<{ unreadCount: number }[]>('/conversations?limit=50', session.tokens.accessToken);
  const unread = (conv.data ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-line bg-elevated lg:block">
        <SidebarContent title={title} session={session} items={items} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-elevated/85 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={session.user.name} size={7} />
            <p className="truncate font-semibold text-fg">{title}</p>
          </div>
          <div className="flex items-center gap-1">
            <ColorSchemeToggle />
          </div>
        </header>

        {/* pb-20 clears the fixed bottom tab bar on small screens */}
        <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">{children}</main>
      </div>

      {/* Mobile-first bottom tab bar (per the product blueprint) */}
      <nav
        aria-label={`${title} navigation`}
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-elevated/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <NavLinks items={items} pathname={pathname} unread={unread} variant="tabbar" />
        <button
          onClick={() => setMoreOpen(true)}
          aria-label="More options"
          aria-expanded={moreOpen}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-fg-subtle transition-colors hover:text-fg-muted"
        >
          <span className="flex size-5 items-center justify-center gap-0.5" aria-hidden>
            <span className="size-1 rounded-full bg-current" />
            <span className="size-1 rounded-full bg-current" />
            <span className="size-1 rounded-full bg-current" />
          </span>
          More
        </button>
      </nav>

      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} title={title} session={session} items={items} />
    </div>
  );
}

