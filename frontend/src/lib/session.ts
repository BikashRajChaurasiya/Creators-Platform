import { apiRequest, setRefreshToken } from '@/lib/api';
import type { AuthTokens, AuthUser } from '@ugcnp/shared';

export interface Session {
  user: AuthUser;
  tokens: AuthTokens;
}

const ACCESS_KEY = 'ugcnp.access';
const REFRESH_KEY = 'ugcnp.refresh';
const USER_KEY = 'ugcnp.user';

function rememberStorage(): Storage | null {
  return typeof window === 'undefined' ? null : (localStorage.getItem(ACCESS_KEY) || localStorage.getItem(USER_KEY) ? localStorage : sessionStorage);
}

function findStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  if (localStorage.getItem(ACCESS_KEY) || localStorage.getItem(REFRESH_KEY) || localStorage.getItem(USER_KEY)) return localStorage;
  if (sessionStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(USER_KEY)) return sessionStorage;
  return null;
}

export function loadSession(): Session | null {
  const storage = findStorage();
  if (!storage) return null;
  try {
    const access = storage.getItem(ACCESS_KEY);
    const refresh = storage.getItem(REFRESH_KEY);
    const userRaw = storage.getItem(USER_KEY);
    if (!access || !refresh || !userRaw) return null;
    setRefreshToken(refresh);
    return {
      user: JSON.parse(userRaw) as AuthUser,
      tokens: {
        accessToken: access,
        refreshToken: refresh,
        accessExpiresIn: 0,
        refreshExpiresIn: 0,
        tokenType: 'Bearer',
      },
    };
  } catch {
    return null;
  }
}

export function saveSession(session: Session, remember = true) {
  if (typeof window === 'undefined') return;
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(ACCESS_KEY, session.tokens.accessToken);
  storage.setItem(REFRESH_KEY, session.tokens.refreshToken);
  storage.setItem(USER_KEY, JSON.stringify(session.user));
  setRefreshToken(session.tokens.refreshToken);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  for (const s of [localStorage, sessionStorage]) {
    s.removeItem(ACCESS_KEY);
    s.removeItem(REFRESH_KEY);
    s.removeItem(USER_KEY);
  }
  setRefreshToken(null);
}

export async function apiLogin(email: string, password: string, remember = true): Promise<Session> {
  const data = await apiRequest<AuthUser & AuthTokens & { user?: AuthUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const user = data.user ?? (data as AuthUser);
  const { accessToken, refreshToken, accessExpiresIn, refreshExpiresIn, tokenType } = data;
  const session: Session = {
    user,
    tokens: {
      accessToken,
      refreshToken,
      accessExpiresIn,
      refreshExpiresIn,
      tokenType: tokenType ?? 'Bearer',
    },
  };
  saveSession(session, remember);
  return session;
}

export async function apiLogout(accessToken: string) {
  try {
    await apiRequest('/auth/logout', { method: 'POST', token: accessToken });
  } catch {
    // ignore network errors on logout
  }
  clearSession();
}

export function accessToken(): string | null {
  const storage = findStorage();
  if (!storage) return null;
  return storage.getItem(ACCESS_KEY);
}

export { rememberStorage };