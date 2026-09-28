import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// `env('DATABASE_URL')` from `prisma/config` throws when the variable is unset.
// That breaks `prisma generate` on Vercel, where the build machine has no
// DATABASE_URL (it is a runtime secret, not a build-time one). Generate only
// parses the schema and never opens a connection, so requiring a real URL there
// is wrong. Migrations and the seed do connect, and they still fail loudly with
// a connection error if this placeholder is ever actually used.
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://ugcnp:ugcnp@localhost:5432/ugcnp?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node -r ts-node/register prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});