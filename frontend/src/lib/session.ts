import { apiRequest, setRefreshToken } from '@/lib/api';
import type { AuthTokens, AuthUser } from '@ugcnp/shared';

export interface Session {
  user: AuthUser;
  tokens: AuthTokens;
}

const ACCESS_KEY = 'ugcnp.access';
const REFRESH_KEY = 'ugcnp.refresh';
const USER_KEY = 'ugcnp.user';

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const access = localStorage.getItem(ACCESS_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
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

export function saveSession(session: Session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_KEY, session.tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, session.tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  setRefreshToken(session.tokens.refreshToken);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  setRefreshToken(null);
}

export async function apiLogin(email: string, password: string): Promise<Session> {
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
  saveSession(session);
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
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}