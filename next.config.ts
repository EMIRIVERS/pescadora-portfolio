import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
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
  // Conservative, embed-safe security headers (Vimeo/Supabase unaffected).
  // No HSTS preload / includeSubDomains so this stays fully reversible.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        ],
      },
    ]
  },
}

export default nextConfig
