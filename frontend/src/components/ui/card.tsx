import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const cardVariants = cva('rounded-[var(--radius-card)] border bg-elevated', {
  variants: {
    tone: {
      solid: 'border-line shadow-[var(--shadow-card)]',
      muted: 'border-line bg-canvas/60',
      outline: 'border-dashed border-line-strong bg-transparent',
      ghost: 'border-transparent bg-transparent shadow-none',
    },
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
    },
    hover: {
      none: '',
      true:
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]',
    },
  },
  defaultVariants: { tone: 'solid', padding: 'lg', hover: 'none' },
});

export type CardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>;

export function Card({ className, tone, padding, hover, ...rest }: CardProps) {
  return <div className={cn(cardVariants({ tone, padding, hover }), className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 border-b border-line p-4', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold text-fg', className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-fg-subtle', className)} {...rest} />;
}

export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2 border-t border-line px-4 py-3', className)} {...rest} />
  );
}

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
  {
    variants: {
      tone: {
        gray: 'bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800/60 dark:text-neutral-200 dark:ring-neutral-700',
        green:
          'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
        amber:
          'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
        red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
        blue: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
        primary: 'bg-primary-soft text-primary ring-primary/25',
      },
      dot: {
        true: '',
        false: '',
      },
    },
    defaultVariants: { tone: 'gray', dot: true },
  },
);

const DOT_CLASS: Record<string, string> = {
  gray: 'bg-neutral-400',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-sky-500',
  primary: 'bg-primary',
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  Omit<VariantProps<typeof badgeVariants>, 'dot'> & { dot?: boolean };

export function Badge({ children, className, tone = 'gray', dot = true, ...rest }: BadgeProps) {
  const key = tone ?? 'gray';
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...rest}>
      {dot && <span aria-hidden className={cn('size-1.5 rounded-full', DOT_CLASS[key])} />}
      {children}
    </span>
  );
}
