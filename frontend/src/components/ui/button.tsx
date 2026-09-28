import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-[var(--primary-fg)] shadow-sm hover:bg-primary-dark active:scale-[0.98]',
        outline:
          'border border-line-strong bg-elevated text-fg-muted hover:border-primary hover:text-primary',
        ghost: 'text-fg-muted hover:bg-primary-soft hover:text-primary',
        subtle: 'bg-primary-soft text-primary hover:bg-primary hover:text-[var(--primary-fg)]',
        danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98]',
        link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        md: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonVariant = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariant {
  /** Shows a spinner and blocks interaction while an action is in flight. */
  loading?: boolean;
  /** Forwarded so dialogs can move focus onto a trigger or dismiss control. */
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  children,
  className,
  variant,
  size,
  loading = false,
  disabled,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
    >
      {loading && <Loader2 aria-hidden className="animate-spin" />}
      {children}
    </button>
  );
}
