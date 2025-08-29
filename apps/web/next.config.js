const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Load environment variables from root .env file
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001',
  },
  images: {
    domains: ['localhost'],
  },
  transpilePackages: ['@junta-tribo/shared'],
}

module.exports = nextConfig
