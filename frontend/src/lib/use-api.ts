'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, apiRequestPage, type PageMeta } from '@/lib/api';

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

interface PaginatedApiState<T> extends ApiState<T> {
  /** Null when the endpoint is not paginated. */
  meta: PageMeta | null;
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
  return useApiInternal<T>(path, token, deps, false);
}

/**
 * `useApi` for list endpoints, additionally exposing the `meta` the backend
 * sends next to `data`. Pass `page`/`limit` through `path` (or `deps`) and feed
 * `meta` to `<Pagination />`.
 */
export function useApiPage<T>(
  path: string,
  token: string | null,
  deps: readonly unknown[] = [],
): PaginatedApiState<T> {
  return useApiInternal<T>(path, token, deps, true);
}

function useApiInternal<T>(
  path: string,
  token: string | null,
  deps: readonly unknown[],
  paginated: boolean,
): PaginatedApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const depsKey = JSON.stringify(deps ?? []);
  // Trimmed so the cache key and the request URL agree even if the caller's
  // template literal has stray whitespace.
  const requestPath = path.trim();

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const key = cacheKey(requestPath, token, depsKey);
    const cached = reloadKey === 0 ? cacheGet<CachedValue<T>>(key) : undefined;
    if (cached !== undefined) {
      setData(cached.data);
      setMeta(cached.meta);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);

    const request = paginated
      ? apiRequestPage<T>(requestPath, { token, signal: controller.signal }).then((r) => ({
          data: r.data,
          meta: r.meta,
        }))
      : apiRequest<T>(requestPath, { token, signal: controller.signal }).then((d) => ({ data: d, meta: null }));

    request
      .then((r) => {
        if (cancelled) return;
        setData(r.data);
        setMeta(r.meta);
        setError(null);
        cacheSet(key, r);
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
  }, [token, requestPath, reloadKey, depsKey, paginated]);

  return { data, meta, error, loading, reload };
}

/** Cache payloads are uniform so a non-paginated read is cache-compatible too. */
interface CachedValue<T> {
  data: T;
  meta: PageMeta | null;
}

interface CacheEntry {
  path: string;
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
  const path = key.slice(key.indexOf(':') + 1).split('?')[0];
  CACHE.set(key, { path, value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Drops cached GET responses so the next mount refetches.
 *
 * With no argument every entry is cleared. Pass path prefixes to scope the
 * drop, e.g. `invalidateApiCache(['/admin/users', '/admin/finance'])` after
 * changing a user's status, which otherwise leaves those lists showing stale
 * data for up to the 30s TTL.
 */
export function invalidateApiCache(prefixes?: string | string[]) {
  if (!prefixes) {
    CACHE.clear();
    return;
  }
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  if (list.length === 0) {
    CACHE.clear();
    return;
  }
  for (const [key, entry] of CACHE) {
    if (list.some((p) => entry.path === p || entry.path.startsWith(p))) {
      CACHE.delete(key);
    }
  }
}
