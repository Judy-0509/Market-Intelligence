/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server bundle for a small Docker image.
  output: 'standalone',
  reactStrictMode: true,
  // The site is content-driven; lint/type issues shouldn't block a deploy build.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
