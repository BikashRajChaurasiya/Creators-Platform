'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

const controlClass =
  'w-full rounded-lg border border-line-strong bg-elevated px-3 text-sm text-fg transition-colors duration-150 ' +
  'placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-primary-soft focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-100';

export interface FieldProps {
  label?: string;
  /** Validation message. Also marks the control as invalid for assistive tech. */
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
}

/**
 * Label + control + hint/error wrapper. Wires up `id`, `aria-describedby` and
 * `aria-invalid` so every form field is announced correctly.
 */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const describedBy = error || hint ? messageId : undefined;

  return (
    <div className={cn('block', className)}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg-muted">
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-red-600">
              *
            </span>
          )}
        </label>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <span id={messageId} role="alert" className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="mt-1 block text-xs text-fg-subtle">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  /** Icon rendered inside the control on the leading edge. */
  icon?: React.ReactNode;
};

export function Input({ label, error, hint, className, icon, required, ...rest }: InputProps) {
  if (icon) {
    return (
      <Field label={label} error={error} hint={hint} required={required} className={className}>
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle [&_svg]:size-4"
            >
              {icon}
            </span>
            <input
              id={id}
              required={required}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              className={cn(controlClass, 'h-10 pl-9', className)}
              {...rest}
            />
          </div>
        )}
      </Field>
    );
  }

  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'h-10', className)}
          {...rest}
        />
      )}
    </Field>
  );
}

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function TextArea({ label, error, hint, className, required, rows = 4, ...rest }: TextAreaProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'py-2 leading-relaxed', className)}
          {...rest}
        />
      )}
    </Field>
  );
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  /** Renders placeholders as uppercase enums in a human-readable form. */
  humanize?: boolean;
};

export function Select({ label, error, hint, className, required, humanize = true, children, ...rest }: SelectProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            controlClass,
            'h-10 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9',
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2386867f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E')]",
            className,
          )}
          {...rest}
        >
          {humanize ? humanizeOptions(children) : children}
        </select>
      )}
    </Field>
  );
}

function humanizeOptions(children: React.ReactNode): React.ReactNode {
  return (Array.isArray(children) ? children : [children]).map((child) => {
    if (!child || typeof child !== 'object' || !('props' in child)) return child;
    const value = (child.props as { value?: string }).value;
    if (!value || value === child.props.children) return child;
    return { ...child, props: { ...child.props, children: value.replace(/_/g, ' ') } };
  });
}

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: React.ReactNode;
  description?: string;
};

export function Checkbox({ label, description, className, id, ...rest }: CheckboxProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        aria-describedby={descriptionId}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-line-strong text-primary accent-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        {...rest}
      />
      <div className="min-w-0">
        <label htmlFor={inputId} className="cursor-pointer text-sm text-fg">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-xs text-fg-subtle">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
