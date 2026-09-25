'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { fadeUp, stagger } from './hero';

const TESTIMONIALS = [
  {
    quote:
      'Within two weeks we shortlisted ten micro-creators for our launch. The pitch-to-payment flow is the cleanest we have used — everything happens in one place.',
    name: 'Anisha Shrestha',
    role: 'Brand Manager, Kathmandu Skincare Co.',
    initial: 'A',
  },
  {
    quote:
      'I went from zero brand deals to three paid campaigns in a month. My portfolio, social links and payout details were all set up before my first application.',
    name: 'Prakash Rana',
    role: 'Travel creator · 84K on Instagram',
    initial: 'P',
  },
  {
    quote:
      'The maker–checker payout flow and SLA-tracked disputes gave our finance team real confidence. It feels like a serious, operator-grade platform.',
    name: 'Diwakar Karki',
    role: 'Founder, Pokhara Food Fest',
    initial: 'D',
  },
];

export function Testimonials() {
  const { primaryColor } = useTheme();

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="text-center">
        <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary">
          Testimonials
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Trusted across the creator economy
        </motion.h2>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="mt-14 grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <motion.figure
            key={t.name}
            variants={fadeUp}
            custom={0}
            className="flex flex-col justify-between rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div>
              <div className="flex gap-0.5" aria-label="5 star rating">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" style={{ color: primaryColor, fill: primaryColor }} />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-neutral-700">&ldquo;{t.quote}&rdquo;</blockquote>
            </div>
            <figcaption className="mt-6 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white">
                {t.initial}
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{t.name}</p>
                <p className="text-xs text-neutral-500">{t.role}</p>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>
    </section>
  );
}