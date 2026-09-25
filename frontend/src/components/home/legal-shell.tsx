'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { useTheme } from '@/lib/theme';
import { BrandMark } from '@/components/auth-shell';
import { SiteFooter } from '@/components/home/site-footer';

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const { brandName } = useTheme();

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="text-lg font-bold text-neutral-900">{brandName}</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900">
            ← Back home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{title}</h1>
        <p className="mt-2 text-xs text-neutral-400">Last updated: {updated}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-600">{children}</div>
      </section>

      <SiteFooter />
    </main>
  );
}

export function LegalBlock({ heading, body }: { heading: string; body: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-neutral-900">{heading}</h2>
      <div className="mt-2 space-y-2">{body}</div>
    </section>
  );
}