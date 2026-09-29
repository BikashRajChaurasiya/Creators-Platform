'use client';

import { AlertCircle, CheckCircle2, Info, Inbox, TriangleAlert } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { Button } from './button';
import { Card } from './card';

export const alertVariants = cva('flex items-start gap-3 rounded-lg border p-3 text-sm', {
  variants: {
    tone: {
      info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
      success:
        'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
      warning:
        'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
      danger:
        'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
    },
  },
  defaultVariants: { tone: 'info' },
});

const ALERT_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  /** Provides an accessible label when the alert conveys a state change. */
  role?: 'alert' | 'status';
}

export function Alert({ className, tone = 'info', title, children, role, ...rest }: AlertProps) {
  const Icon = ALERT_ICON[tone ?? 'info'];
  return (
    <div
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
      className={cn(alertVariants({ tone }), className)}
      {...rest}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-current/85')}>{children}</div>}
      </div>
    </div>
  );
}

export interface EmptyStateProps {
  title?: string;
  message?: string;
  /** Distinguishes "nothing here yet" from "the request failed". */
  variant?: 'empty' | 'error';
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}
export function EmptyState({
  title,
  message,
  variant = 'empty',
  icon,
  action,
  className,
}: EmptyStateProps) {
  const isError = variant === 'error';
  return (
    <Card
      tone="outline"
      className={cn('flex flex-col items-center gap-2 px-6 py-12 text-center', className)}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-11 items-center justify-center rounded-full [&_svg]:size-5',
          isError
            ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            : 'bg-primary-soft text-primary',
        )}
      >
        {icon ?? (isError ? <AlertCircle /> : <Inbox />)}
      </span>
      <p className="font-medium text-fg">{title ?? (isError ? 'Something went wrong' : 'Nothing here yet')}</p>
      {message && <p className="max-w-sm text-sm text-fg-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

/**
 * Failure state for a failed read, distinct from `EmptyState`'s "nothing here
 * yet". Always offers a retry, and prefers the server's own wording over a
 * generic headline so a 400 or 403 explains itself.
 */
export function ErrorState({
  error,
  onRetry,
  title,
  className,
}: {
  error: string;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <EmptyState
      variant="error"
      title={title ?? 'Could not load this'}
      message={error}
      className={className}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
