'use client';

import { motion } from 'framer-motion';
import { Building2, UserRound } from 'lucide-react';
import { fadeUp, stagger } from './hero';

const BRAND_STEPS = [
  { title: 'Create your company profile', desc: 'Sign up as a brand, add your company details and visual identity, and get verified.' },
  { title: 'Post a campaign', desc: 'Define your brief, target audience, deliverables and budget. The right creators can apply instantly.' },
  { title: 'Hire, review & pay', desc: 'Shortlist and accept creators, review their submissions, and release payouts through secure finance ops.' },
];

const CREATOR_STEPS = [
  { title: 'Build your creator profile', desc: 'Add your category, social links, portfolio and payout details — verified in minutes.' },
  { title: 'Discover campaigns', desc: 'Browse and filter open campaigns matched to your niche, audience and location.' },
  { title: 'Apply with a pitch', desc: 'Pitch your idea, agree on deliverables and negotiate directly with brands in-platform.' },
  { title: 'Deliver & get paid', desc: 'Submit content, get reviewed, and receive verified payouts to eSewa, Khalti, IME Pay or your bank.' },
];

function StepList({
  steps,
  tone,
}: {
  steps: { title: string; desc: string }[];
  tone: 'brand' | 'creator';
}) {
  const accent = tone === 'brand' ? 'bg-primary text-white' : 'bg-accent text-neutral-950';
  return (
    <ol className="space-y-6">
      {steps.map((s, i) => (
        <motion.li key={s.title} variants={fadeUp} custom={0} className="flex gap-4">
          <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${accent}`}>
            {i + 1}
          </span>
          <div>
            <h3 className="font-semibold text-neutral-900">{s.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">{s.desc}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="text-center">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary">
            How it works
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            One workflow, two sides
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="mx-auto mt-4 max-w-xl text-neutral-500">
            Whether you&apos;re building a brand or building an audience, the path from brief to paid delivery is clear.
          </motion.p>
        </motion.div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="rounded-3xl border border-neutral-200 bg-white p-8">
            <div className="mb-7 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-neutral-900">For brands</h3>
                <p className="text-xs text-neutral-500">Launch, manage and pay for campaigns</p>
              </div>
            </div>
            <StepList steps={BRAND_STEPS} tone="brand" />
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-8">
            <div className="mb-7 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-neutral-950">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-neutral-900">For creators</h3>
                <p className="text-xs text-neutral-500">Discover, pitch, deliver and get paid</p>
              </div>
            </div>
            <StepList steps={CREATOR_STEPS} tone="creator" />
          </div>
        </div>
      </div>
    </section>
  );
}