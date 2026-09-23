'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { loadSession } from '@/lib/session';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = loadSession();
    if (session) {
      const role = session.user.role.toLowerCase();
      router.replace(`/${role === 'creator' ? 'creator' : role === 'brand' ? 'brand' : 'admin'}`);
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold text-[#1b5e3b]">UGCNP</h1>
      <p className="text-neutral-500">Nepal Creator Economy OS</p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-lg bg-[#1b5e3b] px-5 py-2 text-white">
          Sign in
        </Link>
        <Link href="/register" className="rounded-lg border border-neutral-300 px-5 py-2">
          Create account
        </Link>
      </div>
    </main>
  );
}