import type { NextConfig } from 'next';

const backendBaseUrl = process.env.BACKEND_BASE_URL || 'http://localhost:3000';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
