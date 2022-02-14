/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enables the styled-components SWC transform
    styledComponents: true
  },
  images: {
    domains: ['storebooks.s3.ap-south-1.amazonaws.com'],
  },
};

module.exports = nextConfig;
