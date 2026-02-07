/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for @stellar/stellar-sdk
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      buffer: false,
    };
    return config;
  },
};

module.exports = nextConfig;
