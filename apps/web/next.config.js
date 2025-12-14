const path = require('path')
const { config } = require('dotenv')

// Load .env from monorepo root
config({ path: path.resolve(__dirname, '../../.env') })

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  transpilePackages: ['@junta-tribo/shared'],
  serverActions: {
    allowedOrigins: ['juntatribo.com', 'www.juntatribo.com', 'localhost:3003'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
              "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: http://localhost:8001",
              "media-src 'self' blob: http://localhost:8001",
              "connect-src 'self' http://localhost:8001 https://www.juntatribo.com https://juntatribo.com https://unpkg.com blob:",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
