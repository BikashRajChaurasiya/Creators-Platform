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

export interface ApiErrorPayload {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export class ApiError extends Error {
  statusCode: number;
  details?: string[];

  constructor(payload: ApiErrorPayload) {
    super(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message);
    this.name = 'ApiError';
    this.statusCode = payload.statusCode;
    this.details = Array.isArray(payload.message) ? payload.message : undefined;
  }
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

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

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