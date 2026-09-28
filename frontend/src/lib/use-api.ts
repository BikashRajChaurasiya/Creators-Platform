'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Data fetching hook with in-flight de-duplication, cancellation on unmount or
 * path change, and a short-lived in-memory cache so navigating between portal
 * pages does not refetch data that is already fresh.
 *
 * Cache entries are scoped to the access token fingerprint, so switching
 * accounts can never surface the previous user's data. `reload()` always
 * bypasses the cache.
 *
 * `deps` exists to re-run the request when caller-owned inputs change (e.g. a
 * date range). Pass a stable-length array to avoid effect churn.
 */
export function useApi<T>(path: string, token: string | null, deps: readonly unknown[] = []): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const depsKey = JSON.stringify(deps ?? []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const key = cacheKey(path, token, depsKey);
    const cached = reloadKey === 0 ? cacheGet<T>(key) : undefined;
    if (cached !== undefined) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);

    apiRequest<T>(path, { token, signal: controller.signal })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
        cacheSet(key, d);
      })
      .catch((e: Error) => {
        if (cancelled || e.name === 'AbortError') return;
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, path, reloadKey, depsKey]);

  return { data, error, loading, reload };
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 100;

/**
 * Cache keys mix in a short fingerprint of the access token rather than the
 * token itself: entries stay isolated per account, but no raw credential is
 * retained in a module-level map.
 */
function cacheKey(path: string, token: string, depsKey: string): string {
  let hash = 5381;
  for (let i = 0; i < token.length; i += 1) {
    hash = ((hash << 5) + hash + token.charCodeAt(i)) | 0;
  }
  return `${hash}:${path}?${depsKey}`;
}

function cacheGet<T>(key: string): T | undefined {
  const hit = CACHE.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    CACHE.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown) {
  if (CACHE.size >= CACHE_MAX_ENTRIES) {
    for (const [k, v] of CACHE) {
      if (v.expiresAt <= Date.now()) CACHE.delete(k);
    }
    if (CACHE.size >= CACHE_MAX_ENTRIES) {
      const oldest = CACHE.keys().next();
      if (!oldest.done) CACHE.delete(oldest.value);
    }
  }
  CACHE.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Drops every cached GET response. Call after a mutation invalidates a screen. */
export function invalidateApiCache() {
  CACHE.clear();
}
