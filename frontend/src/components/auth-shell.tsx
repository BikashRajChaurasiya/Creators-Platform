'use client';

import Link from 'next/link';
import { FormEvent, ReactNode } from 'react';
import { useTheme } from '@/lib/theme';

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { brandName } = useTheme();
  const dim = size === 'lg' ? 'h-16 w-16 text-2xl' : size === 'sm' ? 'h-9 w-9 text-base' : 'h-12 w-12 text-xl';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark font-black text-white shadow-lg shadow-primary/30 ${dim}`}
      aria-hidden
    >
      {brandName.slice(0, 1)}
    </span>
  );
}

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="flex min-h-screen">
      {/* Brand panel */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-neutral-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

        <Link href="/" className="relative flex items-center gap-3">
          <BrandMark />
          <span className="text-xl font-bold text-white">{useBrandTitle()}</span>
        </Link>

        <div className="relative">
          <h1 className="max-w-md text-4xl font-bold leading-tight text-white">
            Nepal&apos;s creator economy,
            <span className="text-accent">{` connected.`}</span>
          </h1>
          <p className="mt-4 max-w-md text-white/70">{subtitle}</p>
        </div>

        <ul className="relative flex gap-8 text-sm text-white/80">
          <li className="flex items-center gap-2">
            <Check /> Discover campaigns
          </li>
          <li className="flex items-center gap-2">
            <Check /> Collab with brands
          </li>
          <li className="flex items-center gap-2">
            <Check /> Get paid securely
          </li>
        </ul>
      </aside>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-neutral-900">{title}</h1>
            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-200/50">{children}</div>
          <div className="mt-4 text-center text-sm text-neutral-500">{footer}</div>
        </div>
      </section>
    </main>
  );
}

function useBrandTitle() {
  const { brandName } = useTheme();
  return `${brandName} — Nepal Creator Economy OS`;
}

function Check() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/25 text-accent">
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Form({ onSubmit, children }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void; children: ReactNode }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {children}
    </form>
  );
}