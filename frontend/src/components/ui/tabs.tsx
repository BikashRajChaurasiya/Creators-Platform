'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

/**
 * Segmented control used for filtering views. Implements the tabs pattern with
 * roving `aria-selected` state so it is announced correctly.
 */
export function Tabs({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: readonly TabItem[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex flex-wrap gap-1 rounded-full border border-line bg-elevated p-1', className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            id={`${id}-${item.value}`}
            aria-selected={active}
            aria-controls={`${id}-${item.value}-panel`}
            onClick={() => onChange(item.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
              active
                ? 'bg-primary text-[var(--primary-fg)] shadow-sm'
                : 'text-fg-muted hover:bg-primary-soft hover:text-primary',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('ml-1.5 tabular-nums', active ? 'opacity-80' : 'text-fg-subtle')}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
