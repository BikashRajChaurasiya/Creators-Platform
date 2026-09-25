'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface UploadImageButtonProps {
  token: string;
  onUploaded: (url: string) => void;
  label?: string;
}

const ACCEPTED = 'image/*';
const MAX_BYTES = 5 * 1024 * 1024;

export function UploadImageButton({ token, onUploaded, label = 'Upload image' }: UploadImageButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('Image must be under 5MB.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const presigned = await apiRequest<{ uploadUrl: string; key: string }>('/upload/presign', {
        method: 'POST',
        token,
        body: { fileName: file.name, mimeType: file.type, size: file.size },
      });
      const put = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error('Upload to storage failed');
      const done = await apiRequest<{ url: string }>('/upload/complete', {
        method: 'POST',
        token,
        body: {
          key: presigned.key,
          fileName: file.name,
          mimeType: file.type,
          kind: 'IMAGE',
          size: file.size,
        },
      });
      onUploaded(done.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? 'Uploading…' : label}
      </button>
      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFile} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}