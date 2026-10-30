/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    styledComponents: true
  },
  images: {
    domains: ['storebooks.s3.ap-south-1.amazonaws.com', 'd2jesamohckae0.cloudfront.net'],
  },
};

module.exports = nextConfig;
