'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-2xl">🔍</span>
        <h1 className="mt-4 text-lg font-bold text-neutral-900">Page not found</h1>
        <p className="mt-1 text-sm text-neutral-500">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link href="/">
          <Button className="mt-5 w-full">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}