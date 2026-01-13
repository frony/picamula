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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://maps.googleapis.com https://maps.gstatic.com",
              "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: https://maps.googleapis.com https://maps.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: http://localhost:8001 https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com",
              "media-src 'self' blob: http://localhost:8001",
              "connect-src 'self' http://localhost:8001 https://www.juntatribo.com https://juntatribo.com https://unpkg.com blob: https://*.googleapis.com https://*.google.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-src 'self' https://*.google.com https://maps.google.com",
              "font-src 'self' data: https://fonts.gstatic.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
