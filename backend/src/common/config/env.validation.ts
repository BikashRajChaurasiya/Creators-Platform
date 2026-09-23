const REQUIRED = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'STORAGE_ENDPOINT',
  'STORAGE_BUCKET',
];

const NUMERIC_INT = [
  'PORT',
  'JWT_ACCESS_EXPIRES',
  'JWT_REFRESH_EXPIRES',
  'EMAIL_OTP_EXPIRES',
  'THROTTLE_TTL',
  'THROTTLE_LIMIT',
];

/**
 * Lightweight env validation — fails fast on missing critical values
 * and coerces numeric strings to integers.
 */
export function validateEnv(config: Record<string, unknown>) {
  for (const key of REQUIRED) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  const coerced: Record<string, unknown> = { ...config };
  for (const key of NUMERIC_INT) {
    const raw = coerced[key];
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n)) {
        throw new Error(`Environment variable ${key} must be an integer`);
      }
      coerced[key] = n;
    }
  }
  return coerced;
}