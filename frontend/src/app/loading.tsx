import { Spinner } from '@/components/ui';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner label="Loading…" />
      </div>
    </div>
  );
}