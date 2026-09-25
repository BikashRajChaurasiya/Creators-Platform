'use client';

export function Button({
  children,
  className = '',
  variant = 'primary',
  type = 'button',
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) {
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white shadow-sm hover:bg-primary-dark active:scale-[0.98]'
      : variant === 'outline'
        ? 'border border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary'
        : 'text-neutral-600 hover:bg-neutral-100';
  return (
    <button
      type={type}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-neutral-600">{label}</span>}
      <input
        {...rest}
        className={`w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary-soft ${className}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function TextArea({ label, error, className = '', ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-neutral-600">{label}</span>}
      <textarea
        {...rest}
        className={`w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary-soft ${className}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const BADGE_DOT: Record<string, string> = {
  gray: 'bg-neutral-400',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-sky-500',
};

export function Badge({ children, color = 'gray', dot = true }: { children: React.ReactNode; color?: 'gray' | 'green' | 'amber' | 'red' | 'blue'; dot?: boolean }) {
  const map = {
    gray: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${map[color]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${BADGE_DOT[color]}`} />}
      {children}
    </span>
  );
}

export function Card({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 ${
        hover ? 'hover:-translate-y-0.5 hover:shadow-md hover:border-primary-soft' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label && <p className="text-sm text-neutral-400">{label}</p>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/80 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-8 w-20" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-3/4" />
    </Card>
  );
}

const ICON_TINTS: Record<string, string> = {
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent/20 text-accent-dark',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
};

export function StatCard({ label, value, sub, icon, tint = 'primary', className = '' }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; tint?: keyof typeof ICON_TINTS; className?: string }) {
  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {icon && (
        <span className={`absolute -right-4 -top-4 flex h-16 w-16 items-center justify-center rounded-full blur-sm ${ICON_TINTS[tint]}`} />
      )}
      <div className="relative">
        {icon && <span className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg ${ICON_TINTS[tint]}`}>{icon}</span>}
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
      </div>
    </Card>
  );
}

export function EmptyState({ title = 'Nothing here yet', message, action }: { title?: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-lg">✨</span>
      <p className="font-medium text-neutral-700">{title}</p>
      {message && <p className="max-w-sm text-sm text-neutral-400">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}