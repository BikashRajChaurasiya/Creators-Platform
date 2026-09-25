'use client';

import { Button } from '@/components/ui';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">⚠️</span>
        <h1 className="mt-4 text-lg font-bold text-neutral-900">Something went wrong</h1>
        <p className="mt-1 text-sm text-neutral-500">{error.message || 'An unexpected error occurred while loading.'}</p>
        <Button className="mt-5 w-full" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}