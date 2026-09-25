'use client';

import Link from 'next/link';
import { Camera, Video, ThumbsUp, MessageCircle, Mail } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { BrandMark } from '@/components/auth-shell';

const LINK_GROUPS = [
  {
    title: 'Explore',
    links: [
      { label: 'Browse campaigns', href: '/login' },
      { label: 'Join as a creator', href: '/register' },
      { label: 'Join as a brand', href: '/register?role=brand' },
      { label: 'Sign in', href: '/login' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Contact', href: 'mailto:hello@ugcnp.com' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
    ],
  },
];

export function SiteFooter() {
  const { brandName } = useTheme();
  const socials = [
    { icon: Camera, label: 'Photo network', href: 'https://instagram.com' },
    { icon: Video, label: 'Video network', href: 'https://youtube.com' },
    { icon: ThumbsUp, label: 'Social network', href: 'https://facebook.com' },
    { icon: MessageCircle, label: 'Chat', href: 'mailto:hello@ugcnp.com' },
  ];

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark size="sm" />
              <span className="text-lg font-bold text-neutral-900">{brandName}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              The operating system for Nepal&apos;s creator economy — connecting brands with the right creators and
              paying everyone securely.
            </p>
            <div className="mt-5 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith('http') ? '_blank' : undefined}
                  rel={s.href.startsWith('http') ? 'noreferrer' : undefined}
                  aria-label={s.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-primary hover:text-primary"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {LINK_GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-sm font-semibold text-neutral-900">{g.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {g.links.map((l) =>
                  l.href.startsWith('http') ? (
                    <li key={l.label}>
                      <a href={l.href} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-primary">
                        <Mail className="h-3.5 w-3.5" />
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-neutral-500 transition-colors hover:text-primary">
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-neutral-100 pt-6 text-xs text-neutral-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {brandName} · Nepal Creator Economy OS
          </p>
          <p>Made in Nepal for the world&apos;s most creative people</p>
        </div>
      </div>
    </footer>
  );
}