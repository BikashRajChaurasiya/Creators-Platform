const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

const NUMERIC_INT = [
  'PORT',
  'JWT_ACCESS_EXPIRES',
  'JWT_REFRESH_EXPIRES',
  'EMAIL_OTP_EXPIRES',
  'THROTTLE_TTL',
  'THROTTLE_LIMIT',
  'STORAGE_PORT',
];

const DEFAULTS: Record<string, string> = {
  APP_URL: 'http://localhost:3000',
  PORT: '4000',
  STORAGE_REGION: 'auto',
  STORAGE_USE_SSL: 'true',
  STORAGE_FORCE_PATH_STYLE: 'false',
  STORAGE_AUTO_CREATE: 'false',
  STORAGE_BUCKET: 'ugcnp-media',
  AI_SERVICE_URL: 'http://localhost:5001',
  EMAIL_MODE: 'console',
  PLATFORM_COMMISSION_PERCENT: '15',
  PLATFORM_VAT_PERCENT: '13',
  PLATFORM_TDS_PERCENT: '15',
  THROTTLE_TTL: '60',
  THROTTLE_LIMIT: '120',
  WEBSOCKETS_ENABLED: 'false',
};

/**
 * Fails fast on missing critical values, applies defaults for optional
 * settings, and coerces numeric strings to integers.
 */
export function validateEnv(config: Record<string, unknown>) {
  for (const key of REQUIRED) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  const coerced: Record<string, unknown> = { ...config };
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (coerced[key] === undefined || coerced[key] === '') {
      coerced[key] = value;
    }
  }
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
