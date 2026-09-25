'use client';

import { motion } from 'framer-motion';
import { Megaphone, Compass, ShieldCheck, BadgeCheck, Scale, LockKeyhole, BarChart3, MessageSquare } from 'lucide-react';
import { fadeUp, stagger } from './hero';

const FEATURES = [
  {
    icon: Megaphone,
    title: 'Campaign marketplace',
    desc: 'Launch branded campaigns with precise audience targeting — categories, follower counts, locations and content formats.',
  },
  {
    icon: Compass,
    title: 'Smart creator discovery',
    desc: 'Find Nepal&apos;s creators by niche, engagement rate and past work, matched to your brief with a relevance score.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure payouts',
    desc: 'Every rupee moves through an operator-approved maker–checker pipeline with eSewa, Khalti, IME Pay or bank transfers.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified identities',
    desc: 'Email OTP verification, creator verification documents and brand background checks keep the network trustworthy.',
  },
  {
    icon: Scale,
    title: 'SLA-backed disputes',
    desc: 'Raise a dispute and our team responds within 24 hours, with a binding 7-day resolution SLA tracked on every case.',
  },
  {
    icon: LockKeyhole,
    title: 'Maker–checker finance',
    desc: 'Payments require three separate operators to prepare, approve and release — no single person can move money.',
  },
  {
    icon: BarChart3,
    title: 'Real-time analytics',
    desc: 'Live platform stats, campaign performance and revenue reporting kept automatically in sync with the ledger.',
  },
  {
    icon: MessageSquare,
    title: 'Built-in messaging',
    desc: 'Creators and brands brief, negotiate and deliver with in-platform messaging and notifications — no WhatsApp threads.',
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="text-center">
        <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary">
          Why {''} the platform works
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Everything a serious creator economy needs
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="mx-auto mt-4 max-w-xl text-neutral-500">
          From onboarding to payouts, every layer of the workflow is built to be safe, transparent and fast.
        </motion.p>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            custom={0}
            className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform duration-200 group-hover:scale-110">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold text-neutral-900">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}