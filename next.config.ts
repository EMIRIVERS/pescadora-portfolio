import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['simplex-noise'],
  turbopack: {
    rules: {
      '*.glsl': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [50, 65, 75],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
