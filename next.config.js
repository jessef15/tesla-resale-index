/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the scraper to run as a cron job via API route
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
};

module.exports = nextConfig;
