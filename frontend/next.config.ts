import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Uploads are served from S3-compatible storage (R2 in production) rather than
  // the Next.js image optimizer, so no remotePatterns are needed here.
  //
  // `standalone` is what the frontend/Dockerfile ships. Vercel ignores it and
  // builds from source, so enabling it costs nothing on the Vercel path and
  // keeps the container image small.
  output: 'standalone',
};

export default nextConfig;
