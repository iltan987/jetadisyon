import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['http://localhost:3000'],
  transpilePackages: ['@repo/ui'],
};

export default nextConfig;
