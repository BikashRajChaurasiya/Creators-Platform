import { defineRailway, github, postgres, preserve, project, redis, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "sfo" });
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const Redis = redis("Redis", { region: "sfo" });
  Redis.deploy = { startCommand: "/bin/sh -c \"rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH\"" };
  Redis.networking = { privateNetworkEndpoint: "redis" };
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });
  const minioVolume = volume("minio-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });
  const redisVolume = volume("redis-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });
  const backend = service("backend", {
    source: github("BikashRajChaurasiya/Creators-Platform", { branch: "main" }),
    healthcheck: "/api/v1/health",
    healthcheckTimeout: 300,
    replicas: { "sfo": 1 },
    env: { AI_SERVICE_URL: preserve(), APP_URL: preserve(), DATABASE_URL: preserve(), EMAIL_MODE: preserve(), JWT_ACCESS_SECRET: preserve(), JWT_REFRESH_SECRET: preserve(), NODE_ENV: preserve(), REDIS_URL: preserve(), STORAGE_ACCESS_KEY: preserve(), STORAGE_BUCKET: preserve(), STORAGE_ENDPOINT: preserve(), STORAGE_PUBLIC_BASE: preserve(), STORAGE_REGION: preserve(), STORAGE_SECRET_KEY: preserve(), STORAGE_USE_SSL: preserve() },
  });
  const ai = service("ai", {
    source: github("BikashRajChaurasiya/Creators-Platform", { branch: "main", rootDirectory: "ai-service" }),
    healthcheck: "/health",
    replicas: { "sfo": 1 },
  });
  const minio = service("minio", {
    source: github("BikashRajChaurasiya/Creators-Platform", { branch: "main", rootDirectory: "minio" }),
    replicas: { "sfo": 1 },
    volumeMounts: { "/data": minioVolume },
    env: { MINIO_API_CORS_ALLOW_ORIGIN: preserve(), MINIO_ROOT_PASSWORD: preserve(), MINIO_ROOT_USER: preserve() },
  });

  return project("ugcnp", {
    resources: [backend, Postgres, Redis, ai, minio, postgresVolume, minioVolume, redisVolume],
  });
});