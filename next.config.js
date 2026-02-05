/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/ToDoToday' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/ToDoToday' : '',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
