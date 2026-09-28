'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Card } from './card';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-line', className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-3/4' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-8 w-20" />
      <SkeletonText className="mt-3" lines={2} />
    </Card>
  );
}

export function SkeletonGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

const ICON_TINTS = {
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent/20 text-accent-dark',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  blue: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
} as const;

export type Tint = keyof typeof ICON_TINTS;

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /**
   * A lucide icon component, or any already-rendered node. Emoji are
   * intentionally not used as icons: they render inconsistently across
   * platforms and carry no meaning for assistive technology.
   */
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> | React.ReactNode;
  tint?: Tint;
  className?: string;
}

function renderIcon(icon: StatCardProps['icon'], className: string): React.ReactNode {
  if (!icon) return null;
  if (typeof icon === 'function') {
    const Icon = icon as React.ComponentType<{ className?: string }>;
    return <Icon className={className} />;
  }
  return icon;
}

export function StatCard({ label, value, sub, icon, tint = 'primary', className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {icon && (
        <span
          aria-hidden
          className={cn('absolute -right-4 -top-4 size-16 rounded-full opacity-40 blur-sm', ICON_TINTS[tint])}
        />
      )}
      <div className="relative">
        {icon && (
          <span
            className={cn(
              'mb-2 inline-flex size-9 items-center justify-center rounded-lg',
              ICON_TINTS[tint],
            )}
          >
            {renderIcon(icon, 'size-4')}
          </span>
        )}
        <p className="text-sm text-fg-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-fg tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-xs text-fg-subtle">{sub}</p>}
      </div>
    </Card>
  );
}

export function Progress({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-line', className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10" role="status">
      <div
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
      />
      {label && <p className="text-sm text-fg-subtle">{label}</p>}
    </div>
  );
}

/** Renders a full-page route fallback. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

/**
 * Toggles the `dark` class on <html> and persists the choice. Falls back to
 * the OS preference until the user makes an explicit selection.
 *
 * State lives in a module-level store rather than per-hook `useState`, so every
 * toggle on the page (desktop sidebar, mobile bar, settings page) reads and
 * writes the same value instead of silently desyncing from one another.
 */
const SCHEME_KEY = 'ugcnp.color-scheme';
const schemeListeners = new Set<(s: ColorScheme) => void>();
let currentScheme: ColorScheme | null = null;

type ColorScheme = 'light' | 'dark';

function systemScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(SCHEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return systemScheme();
}

/** Applies the scheme to the document. Safe to call before hydration. */
export function applyColorScheme(scheme: ColorScheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', scheme === 'dark');
  document.documentElement.style.colorScheme = scheme;
}

function setColorScheme(scheme: ColorScheme) {
  currentScheme = scheme;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SCHEME_KEY, scheme);
    } catch {
      // Private browsing or blocked storage: the in-memory value still applies.
    }
  }
  applyColorScheme(scheme);
  for (const listener of schemeListeners) listener(scheme);
}

function subscribe(listener: (s: ColorScheme) => void) {
  schemeListeners.add(listener);
  return () => {
    schemeListeners.delete(listener);
  };
}

export function useColorScheme() {
  const [scheme, setScheme] = useState<ColorScheme | null>(currentScheme);

  useEffect(() => {
    // Adopt whatever the blocking script in the document head already applied,
    // so SSR and client markup agree.
    if (currentScheme === null) {
      const resolved = storedScheme();
      currentScheme = resolved;
      setScheme(resolved);
    }
    return subscribe(setScheme);
  }, []);

  // Follow OS changes only while the user has not made an explicit choice.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (localStorage.getItem(SCHEME_KEY)) return;
      setColorScheme(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const base = currentScheme ?? storedScheme();
    setColorScheme(base === 'dark' ? 'light' : 'dark');
  };

  return { scheme, setScheme: setColorScheme, toggle };
}
