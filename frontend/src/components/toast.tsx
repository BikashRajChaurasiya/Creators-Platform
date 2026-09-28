'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({
  success: () => {},
  error: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const KIND_STYLE: Record<ToastKind, string> = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/70 dark:text-emerald-200',
  error:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-950/70 dark:text-red-200',
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/70 dark:text-sky-200',
};

const KIND_ICON = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      timers.current.push(window.setTimeout(() => dismiss(id), 4200));
    },
    [dismiss],
  );

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Full-width on small screens, anchored top-right from `sm` up. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-4 sm:inset-x-auto sm:right-4 sm:items-end sm:p-0 sm:pt-0"
      >
        <div className="flex w-full max-w-sm flex-col gap-2 sm:w-80">
          {toasts.map((t) => {
            const Icon = KIND_ICON[t.kind];
            return (
              <button
                key={t.id}
                onClick={() => dismiss(t.id)}
                className={cn(
                  'animate-fade-in pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm shadow-lg backdrop-blur transition-all',
                  KIND_STYLE[t.kind],
                )}
              >
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span className="flex-1">{t.message}</span>
                <X aria-hidden className="mt-0.5 size-3.5 shrink-0 opacity-60" />
              </button>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
