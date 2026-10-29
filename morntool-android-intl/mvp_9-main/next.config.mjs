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
  // 确保输出为静态文件
  output: 'standalone',
  // 服务器外部包
  serverExternalPackages: [],
}

export default nextConfig
