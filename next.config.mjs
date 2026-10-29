/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_DEPLOYMENT_REGION:
      process.env.NEXT_PUBLIC_DEPLOYMENT_REGION ||
      process.env.DEPLOYMENT_REGION ||
      "CN",
  },
}

export default nextConfig
