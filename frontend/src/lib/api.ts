/**
 * In production the frontend and API are served from the same origin: vercel.json
 * rewrites `/api/*` to the backend service, so no hostname is hardcoded and no
 * CORS handshake happens. NEXT_PUBLIC_API_URL only exists to point a local dev
 * build at a separately hosted API.
 */
export const API_BASE = (() => {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!base) return '/api/v1';
  return base.replace(/\/+$/, '').replace(/\/api\/v1$/, '') + '/api/v1';
})();

/** Field-level issue emitted by the backend's Zod filter for a failed 400. */
export interface ApiFieldIssue {
  path: string;
  message: string;
}

export interface ApiErrorPayload {
  statusCode: number;
  message: string | string[];
  error?: string;
  /** Present on 400 responses produced by `ZodFilter`. */
  errors?: ApiFieldIssue[];
}

export class ApiError extends Error {
  statusCode: number;
  details?: string[];
  /**
   * Zod issues keyed by field path, e.g. `{ emailFrom: ['Invalid email'] }`.
   * Lets a form highlight the offending input instead of dumping every issue
   * into one toast. Empty when the failure was not a validation failure.
   */
  fieldErrors: Record<string, string[]>;

  constructor(payload: ApiErrorPayload) {
    super(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message);
    this.name = 'ApiError';
    this.statusCode = payload.statusCode;
    this.details = Array.isArray(payload.message) ? payload.message : undefined;
    this.fieldErrors = groupIssues(payload.errors);
  }
}

/** Collapses `[{path, message}]` into `{ path: [message, ...] }`. */
function groupIssues(issues: ApiFieldIssue[] | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!Array.isArray(issues)) return out;
  for (const issue of issues) {
    if (!issue || typeof issue.message !== 'string') continue;
    const key = issue.path || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Turns any thrown value into a message worth showing a user.
 *
 * A Zod 400 arrives with `message: 'Validation failed'`, which tells the user
 * nothing. When field issues are present they are rendered instead, e.g.
 * `emailFrom: Invalid email · logoUrl: Must be a valid URL`.
 */
export function describeApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const issues = Object.entries(err.fieldErrors).flatMap(([path, messages]) =>
      messages.map((m) => `${path}: ${m}`),
    );
    if (issues.length > 0) return issues.join(' · ');
    if (err.message) return err.message;
    return fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Pagination envelope every list endpoint returns alongside `data`.
 * `hasNext`/`hasPrevious` are authoritative; `totalPages` is derived and can
 * be 0 for an empty result set.
 */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  raw?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

let refreshTokenStore: string | null = null;
export function setRefreshToken(token: string | null) {
  refreshTokenStore = token;
}

/**
 * A non-JSON body is a real and common case here: the Vercel `/api/*` proxy
 * replies with an HTML page when the backend service is unreachable or throws,
 * and it returns plain text for some platform-level errors. Parsing that
 * unguarded produces "unexpected character at line 1 column 1" and throws away
 * the status code, content-type and body that actually explain the failure.
 */
function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toApiError(res: Response, text: string): ApiError {
  const parsed = safeJsonParse(text);
  if (parsed && typeof parsed === 'object') {
    return new ApiError({ statusCode: res.status, ...(parsed as object) } as ApiErrorPayload);
  }

  const contentType = res.headers.get('content-type') ?? 'no content-type';
  const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 200);

  return new ApiError({
    statusCode: res.status,
    message: snippet
      ? `Non-JSON response from ${res.url || 'the API'} — ${res.status} ${res.statusText}, ${contentType}. Body: ${snippet}`
      : `Empty response from ${res.url || 'the API'} — ${res.status} ${res.statusText}, ${contentType}.`,
  });
}

/**
 * Builds the absolute URL for a request path.
 *
 * The path is trimmed because a stray space inside an interpolated template
 * literal silently becomes `%20` in the URL, producing a 404 that looks like
 * a missing route rather than a typo.
 */
function resolveUrl(path: string): string {
  const clean = path.trim();
  return clean.startsWith('http') ? clean : `${API_BASE}${clean}`;
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options;
  const url = resolveUrl(path);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401 && token && refreshTokenStore) {
    try {
      const newToken = await refreshTokens();
      return apiRequest<T>(path, { ...options, token: newToken });
    } catch {
      setRefreshToken(null);
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new ApiError({ statusCode: 401, message: 'Session expired. Please sign in again.' });
    }
  }

  const text = await res.text();

  if (!res.ok) {
    throw toApiError(res, text);
  }

  const json = text ? safeJsonParse(text) : {};

  if (options.raw) {
    return json as T;
  }
  return (json as { data: T }).data;
}

/**
 * Same request path as `apiRequest`, but keeps the pagination `meta` that
 * `apiRequest` unwraps away. Use this for list endpoints; use `apiRequest` for
 * everything else.
 *
 * Endpoints that are not paginated return no `meta`, which surfaces here as
 * `null` rather than a fabricated zero-page object.
 */
export async function apiRequestPage<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: PageMeta | null }> {
  const { method = 'GET', body, token, signal } = options;
  const url = resolveUrl(path);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401 && token && refreshTokenStore) {
    try {
      const newToken = await refreshTokens();
      return apiRequestPage<T>(path, { ...options, token: newToken });
    } catch {
      setRefreshToken(null);
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new ApiError({ statusCode: 401, message: 'Session expired. Please sign in again.' });
    }
  }

  const text = await res.text();
  if (!res.ok) throw toApiError(res, text);

  const json = (text ? safeJsonParse(text) : {}) as ({ data?: T } & { meta?: unknown }) | undefined;
  const raw = json?.meta;
  const meta =
    raw && typeof raw === 'object' && typeof (raw as PageMeta).page === 'number'
      ? (raw as PageMeta)
      : null;

  // `data` may legitimately be null, so key off presence rather than `??`,
  // which would fall through and hand back the whole envelope.
  const data = json && 'data' in json ? (json.data as T) : (json as unknown as T);

  return { data, meta };
}

export async function refreshTokens(): Promise<string> {
  if (!refreshTokenStore) throw new ApiError({ statusCode: 401, message: 'No refresh token' });
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshTokenStore }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw toApiError(res, text);
  }

  const json = safeJsonParse(text) as { data?: RefreshResponse } | undefined;
  if (!json?.data) {
    throw new ApiError({ statusCode: 401, message: 'Refresh failed' });
  }
  if (typeof window !== 'undefined') {
    const storage = localStorage.getItem('ugcnp.refresh') ? localStorage : sessionStorage;
    storage.setItem('ugcnp.access', json.data.accessToken);
    storage.setItem('ugcnp.refresh', json.data.refreshToken);
  }
  refreshTokenStore = json.data.refreshToken;
  return json.data.accessToken;
}