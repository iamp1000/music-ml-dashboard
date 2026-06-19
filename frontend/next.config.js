/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/music-ml-dashboard' : '',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
}

module.exports = nextConfig
