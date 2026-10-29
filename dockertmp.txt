# 使用多阶段构建减小镜像大小
FROM node:20-alpine AS base

# 安装pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# ========== 构建时环境变量声明 ==========
# 只声明必须在构建时使用的变量
# 注意：敏感配置（如数据库、API密钥等）不应在此处设置，仅在运行时注入
ARG NODE_ENV=production

# 将 ARG 转换为 ENV，使构建过程能访问这些变量
ENV NODE_ENV=$NODE_ENV

# ⚠️ 重要：移除所有其他 ARG 和 ENV 声明
# 所有与应用配置相关的变量（数据库、API密钥、认证等）
# 都应该在运行时由部署平台动态注入，不应该在构建时硬编码到镜像中

# 复制包管理文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用（此时环境变量已可用）
RUN pnpm build

# 生产阶段
FROM node:20-alpine AS production

# 安装pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# ========== 运行时环境变量声明 ==========
# 所有配置变量都应该在运行时由部署平台注入，不在 Dockerfile 中指定
#
# 部署平台（腾讯云、Vercel等）需要在运行时注入以下变量：
#
# 中国区部署（CN）- CloudBase 配置：
# - NEXT_PUBLIC_WECHAT_CLOUDBASE_ID (必需: CloudBase 环境 ID)
# - CLOUDBASE_SECRET_ID (必需: 腾讯云 Secret ID)
# - CLOUDBASE_SECRET_KEY (必需: 腾讯云 Secret Key)
# - VITE_CLOUDBASE_ACCESS_KEY (推荐: CloudBase 访问密钥)
# - NEXT_PUBLIC_DEPLOYMENT_REGION=CN (必需: 部署区域)
#
# 国际区部署（INTL）- Supabase 配置：
# - NEXT_PUBLIC_SUPABASE_URL (必需: Supabase 项目 URL)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY (必需: Supabase 匿名密钥)
# - SUPABASE_SERVICE_ROLE_KEY (必需: Supabase 服务角色密钥)
# - NEXT_PUBLIC_DEPLOYMENT_REGION=INTL (必需: 部署区域)
#
# 通用配置：
# - NEXT_PUBLIC_SITE_URL (必需: 站点 URL)
# - NEXT_PUBLIC_APP_NAME (可选: 应用名称)
#
# 支付配置（按需设置）：
# - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY (Stripe 支付)
# - ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY (支付宝)
# - WECHAT_PAY_MCH_ID / WECHAT_PAY_API_V3_KEY / WECHAT_PAY_PRIVATE_KEY (微信支付)
#
# ⚠️ 关键原则：
# 1. 构建时不硬编码任何配置
# 2. 所有配置在运行时由部署环境提供
# 3. 这样同一个镜像可以用于不同的环境（开发、测试、生产等）
# 4. 中国区部署必须包含 NEXT_PUBLIC_WECHAT_CLOUDBASE_ID、CLOUDBASE_SECRET_ID、CLOUDBASE_SECRET_KEY

ARG PORT=3000
ENV PORT=$PORT

# 从构建阶段复制必要的文件
COPY --from=base /app/package.json /app/pnpm-lock.yaml ./
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.mjs ./

# 安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 更改文件所有权
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
# 在启动前验证环境配置（配置验证器现在不会在构建时抛出错误）
CMD ["pnpm", "start"]

# test github action
