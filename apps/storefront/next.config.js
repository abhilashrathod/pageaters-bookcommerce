/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enables the styled-components SWC transform
    styledComponents: true
  },
  images: {
    domains: ['storebooks.s3.ap-south-1.amazonaws.com', 'd2jesamohckae0.cloudfront.net', 'via.placeholder.com'],
  },
};

module.exports = nextConfig;
