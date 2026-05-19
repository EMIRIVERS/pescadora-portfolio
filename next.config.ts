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
    // WebP only: AVIF encodes far slower on-demand, which on a fresh Vercel
    // deploy with many gallery images shows up as "photos slow to appear".
    // WebP is ~30% lighter than JPEG, encodes fast, universally supported.
    formats: ['image/webp'],
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
