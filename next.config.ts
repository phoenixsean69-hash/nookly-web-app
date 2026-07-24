/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev origins for cross-origin access
  allowedDevOrigins: ['192.168.1.79', 'localhost', '127.0.0.1'],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fra.cloud.appwrite.io',
        port: '',
        pathname: '/v1/storage/buckets/**',
      },
      {
        protocol: 'https',
        hostname: 'cloud.appwrite.io',
        port: '',
        pathname: '/v1/storage/buckets/**',
      },
      // ✅ Add ui-avatars.com for avatar generation
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/api/**',
      },
    ],
  },
};

module.exports = nextConfig;