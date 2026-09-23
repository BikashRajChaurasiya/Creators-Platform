'use client';

import Link from 'next/link';
import { FormEvent, ReactNode } from 'react';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#1b5e3b]">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">{children}</div>
        <div className="mt-4 text-center text-sm text-neutral-500">{footer}</div>
      </div>
    </main>
  );
}

export function Form({ onSubmit, children }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void; children: ReactNode }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {children}
    </form>
  );
}