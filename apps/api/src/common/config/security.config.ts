const DEV_ACCESS_FALLBACK = 'dev-only-hospitality-access-secret-do-not-use-in-prod';
const DEV_REFRESH_FALLBACK = 'dev-only-hospitality-refresh-secret-do-not-use-in-prod';

let warnedDevSecrets = false;

function isWeakOrDefaultSecret(val: string | undefined): boolean {
  if (!val || val.trim().length < 24) return true;
  if (val.includes('change-in-production') || val.includes('super-secret-jwt')) return true;
  return false;
}

export function getJwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (isWeakOrDefaultSecret(secret)) {
      throw new Error(
        'FATAL SECURITY ERROR: JWT_ACCESS_SECRET must be set (>= 24 chars, non-default) in production.'
      );
    }
    return secret!;
  }
  if (!secret && !warnedDevSecrets && process.env.NODE_ENV !== 'test') {
    warnedDevSecrets = true;
    console.warn('[Security] Using development JWT secret fallback. Set JWT_ACCESS_SECRET in .env.');
  }
  return secret || DEV_ACCESS_FALLBACK;
}

export function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (isWeakOrDefaultSecret(secret)) {
      throw new Error(
        'FATAL SECURITY ERROR: JWT_REFRESH_SECRET must be set (>= 24 chars, non-default) in production.'
      );
    }
    return secret!;
  }
  return secret || DEV_REFRESH_FALLBACK;
}

export function getCorsOriginConfig(): boolean | string[] {
  const raw = process.env.CORS_ORIGIN;
  if (raw && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV === 'production') {
    // Strict default in production when CORS_ORIGIN is not explicitly configured
    return ['https://localhost', 'http://localhost:3000'];
  }
  return true;
}
