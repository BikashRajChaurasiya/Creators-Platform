import { cn } from '@/lib/cn';

/** Consistent page title block used by every portal screen. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Standard vertical rhythm for a portal screen. */
export function PageShell({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-6', className)} {...rest} />;
}

/** Label/value pair used across dashboards and detail panels. */
export function Metric({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd
        className={cn(
          'mt-1 text-lg tabular-nums',
          strong ? 'font-bold text-primary' : 'font-semibold text-fg',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function MetricGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4', className)}>{children}</dl>;
}
