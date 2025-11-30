const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  transpilePackages: ['@junta-tribo/shared'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "media-src 'self' blob:",
              "connect-src 'self' https://www.juntatribo.com https://juntatribo.com https://unpkg.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
