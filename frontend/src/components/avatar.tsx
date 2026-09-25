import { useEffect, useState } from 'react';

const AVATAR_HUES = [150, 200, 260, 20, 320, 190, 30, 90];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ name, url, size = 9, className = '' }: { name: string; url?: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const hue = AVATAR_HUES[hashName(name) % AVATAR_HUES.length];

  useEffect(() => setFailed(false), [url]);

  const dim = `${size * 4}px`;
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        width={size * 4}
        height={size * 4}
        onError={() => setFailed(true)}
        className={`rounded-full object-cover ring-2 ring-white ${className}`}
        style={{ width: dim, height: dim }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${className}`}
      style={{ width: dim, height: dim, fontSize: size * 1.6, backgroundColor: `hsl(${hue}, 48%, 45%)` }}
    >
      {initials(name) || '?'}
    </span>
  );
}