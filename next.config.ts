/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignore les warnings d'ESLint pendant le build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore les erreurs TypeScript pendant le build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;