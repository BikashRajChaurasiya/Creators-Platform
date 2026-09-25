'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadSession } from '@/lib/session';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme';
import { BrandMark } from '@/components/auth-shell';
import { apiRequest } from '@/lib/api';
import { Hero } from '@/components/home/hero';
import { Features } from '@/components/home/features';
import { HowItWorks } from '@/components/home/how-it-works';
import { Testimonials } from '@/components/home/testimonials';
import { SiteFooter } from '@/components/home/site-footer';
import type { PlatformStats } from '@ugcnp/shared';

function useStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiRequest<PlatformStats>('/settings/stats')
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  return stats;
}

export default function HomePage() {
  const router = useRouter();
  const { primaryColor, brandName } = useTheme();
  const stats = useStats();

  useEffect(() => {
    const session = loadSession();
    if (session) {
      const role = session.user.role.toLowerCase();
      router.replace(`/${role === 'creator' ? 'creator' : role === 'brand' ? 'brand' : 'admin'}`);
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="text-lg font-bold text-white">{brandName}</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-950 transition-all duration-150 hover:brightness-110"
              style={{ backgroundColor: primaryColor }}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <Hero stats={stats} />

      <Features />

      <HowItWorks />

      {/* Social proof band */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-neutral-400">
          Live platform numbers below are fetched from the public API every 30 seconds — no static counters.
        </p>
      </section>

      <Testimonials />

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div
          className="rounded-3xl p-10 text-center text-white sm:p-14"
          style={{ backgroundImage: `linear-gradient(120deg, ${primaryColor}, #14532d)` }}
        >
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to make something great?</h2>
          <p className="mx-auto mt-2 max-w-md text-white/80">
            Create a free account and start connecting with Nepal&apos;s growing creator community today.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5"
            style={{ backgroundColor: '#A3E635', color: '#052e16' }}
          >
            Create your account
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}