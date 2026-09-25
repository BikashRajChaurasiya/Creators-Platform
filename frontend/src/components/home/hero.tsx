'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme';
import type { PlatformStats } from '@ugcnp/shared';

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.55, ease: 'easeOut' as const } }),
};

export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

function Counter({ value, prefix = '', suffix = '', formatter }: { value: number; prefix?: string; suffix?: string; formatter?: (n: number) => string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 1000;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const rendered = formatter ? formatter(display) : display.toLocaleString('en-IN');
  return (
    <span>
      {prefix}
      {rendered}
      {suffix}
    </span>
  );
}

export function Hero({ stats }: { stats: PlatformStats | null }) {
  const { primaryColor, accentColor } = useTheme();

  const tiles = [
    { label: 'Creators on platform', value: stats?.creators ?? 0, formatter: undefined, suffix: '+' },
    { label: 'Brands partnered', value: stats?.brands ?? 0, formatter: undefined, suffix: '+' },
    { label: 'Campaigns completed', value: stats?.campaignsCompleted ?? 0, formatter: undefined },
    { label: 'Open campaigns', value: stats?.campaigns ?? 0, formatter: undefined },
    { label: 'Applications received', value: stats?.applications ?? 0, formatter: undefined },
    {
      label: 'Paid out to creators',
      value: stats?.paymentsProcessed ?? 0,
      prefix: 'Rs. ',
      formatter: (n: number) => Math.round(n).toLocaleString('en-IN'),
    },
  ];

  return (
    <section className="relative overflow-hidden bg-neutral-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
      <div
        className="pointer-events-none absolute -right-40 top-0 h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ backgroundColor: `${accentColor}1f` }}
      />
      <div
        className="pointer-events-none absolute -left-40 bottom-0 h-[30rem] w-[30rem] rounded-full blur-3xl"
        style={{ backgroundColor: `${primaryColor}30` }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:26px_26px]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium backdrop-blur"
            style={{ backgroundColor: `rgba(255,255,255,0.05)`, color: accentColor }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: accentColor }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
            </span>
            Live · Nepal&apos;s creator economy, connected
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="mx-auto mt-7 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl"
        >
          Connect brands with the
          <br />
          <span className="bg-gradient-to-r from-accent via-accent-dark to-accent bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(120deg, ${accentColor}, ${primaryColor}, ${accentColor})` }}>
            right creators.
          </span>
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
          The operating system for Nepal&apos;s creator economy — post campaigns, discover vetted talent, deliver
          content, and get paid through a secure, operator-verified payout pipeline.
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded-xl px-6 py-3 text-sm font-semibold text-neutral-950 shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110"
            style={{ backgroundColor: accentColor, boxShadow: `0 12px 28px -10px ${accentColor}90` }}
          >
            Join as a creator
          </Link>
          <Link
            href="/register?role=brand"
            className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all duration-150 hover:-translate-y-0.5 hover:border-white/40"
          >
            Join as a brand
          </Link>
          <Link href="/login" className="hidden px-2 py-3 text-sm font-medium text-white/60 transition-colors hover:text-white sm:block">
            Sign in →
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 backdrop-blur transition-colors hover:border-white/20">
              <p className="text-2xl font-bold tabular-nums sm:text-3xl" style={{ color: accentColor }}>
                <Counter value={t.value} prefix={t.prefix} suffix={t.suffix} formatter={t.formatter} />
              </p>
              <p className="mt-1 text-xs leading-snug text-white/55">{t.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}