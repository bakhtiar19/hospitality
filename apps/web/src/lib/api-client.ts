export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const AUTH_STORAGE_KEY = 'pms_auth_session_v1';

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  propertyId: string;
  permissions: string[];
  fullName: string;
  propertyName: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  activePropertyId?: string;
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.user?.propertyId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }
  window.dispatchEvent(new Event('pms_auth_changed'));
}

let refreshingPromise: Promise<AuthSession | null> | null = null;

async function refreshAccessToken(): Promise<AuthSession | null> {
  if (refreshingPromise) return refreshingPromise;
  const session = getStoredSession();
  if (!session?.refreshToken) return null;

  refreshingPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      if (!res.ok) {
        saveStoredSession(null);
        return null;
      }
      const json = await res.json();
      const data = json?.data || json;
      if (!data?.accessToken) {
        saveStoredSession(null);
        return null;
      }
      const updated: AuthSession = {
        ...session,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || session.refreshToken,
      };
      saveStoredSession(updated);
      return updated;
    } catch {
      return null;
    } finally {
      refreshingPromise = null;
    }
  })();

  return refreshingPromise;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, headers: customHeaders, ...fetchOptions } = options;
  const session = getStoredSession();

  const buildHeaders = (token?: string): Record<string, string> => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };
    if (!skipAuth && token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    if (!skipAuth && session?.user?.propertyId) {
      const targetProp =
        session.user.role === 'SUPER_ADMIN' && session.activePropertyId
          ? session.activePropertyId
          : session.user.propertyId;
      h['x-property-id'] = targetProp;
    }
    return h;
  };

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: buildHeaders(session?.accessToken),
  });

  if (res.status === 401 && !skipAuth && session?.refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed?.accessToken) {
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        headers: buildHeaders(refreshed.accessToken),
      });
    }
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json?.error?.message ||
      (Array.isArray(json?.message) ? json.message.join(', ') : json?.message) ||
      `HTTP Error ${res.status}`;
    throw new ApiError(msg, res.status);
  }

  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}
