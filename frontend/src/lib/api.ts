export const API_BASE = (() => {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
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
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new ApiError({ ...json });
  }

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
  const json = (await res.json()) as { data?: RefreshResponse };
  if (!res.ok || !json.data) {
    throw new ApiError({ statusCode: 401, message: 'Refresh failed' });
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('ugcnp.access', json.data.accessToken);
    localStorage.setItem('ugcnp.refresh', json.data.refreshToken);
  }
  refreshTokenStore = json.data.refreshToken;
  return json.data.accessToken;
}