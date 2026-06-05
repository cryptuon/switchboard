/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    transpilePackages: ['@switchboard/services-shared']
  },
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
    BILLING_BASE_URL: process.env.BILLING_BASE_URL || 'http://localhost:3001'
  }
}

module.exports = nextConfig