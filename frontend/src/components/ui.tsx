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
      ? 'bg-[#1b5e3b] text-white hover:bg-[#14482e]'
      : variant === 'outline'
        ? 'border border-neutral-300 hover:bg-neutral-100'
        : 'hover:bg-neutral-100';
  return (
    <button
      type={type}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${styles} ${className}`}
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
        className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-[#1b5e3b]/20 ${className}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'green' | 'amber' | 'red' | 'blue' }) {
  const map = {
    gray: 'bg-neutral-100 text-neutral-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-sky-100 text-sky-700',
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[color]}`}>{children}</span>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-neutral-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1b5e3b] border-t-transparent" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-neutral-400">{message}</p>;
}