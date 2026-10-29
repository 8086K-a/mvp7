# 云环境部署指南

本文档详细介绍如何在云环境中正确部署应用，确保所有必需的配置都能正确加载。

## 部署前准备

在部署到云环境之前，请确保已完成以下准备工作：

1. **选择部署平台**：
   - 腾讯云 CloudBase（适用于中国区部署）
   - Vercel、AWS、Azure 等（适用于国际区部署）

2. **准备云服务账户**：
   - 如需使用 CloudBase，准备腾讯云账户及 CloudBase 环境
   - 如需使用 Supabase，准备 Supabase 项目

## 环境配置

### 中国区部署 (CN)

对于中国区部署，您需要配置以下环境变量：

#### 必需配置
```bash
# 部署区域标识
NEXT_PUBLIC_DEPLOYMENT_REGION=CN

# CloudBase 配置
NEXT_PUBLIC_WECHAT_CLOUDBASE_ID=your_cloudbase_environment_id
CLOUDBASE_SECRET_ID=your_tencent_cloud_secret_id
CLOUDBASE_SECRET_KEY=your_tencent_cloud_secret_key

# 站点配置
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

#### 可选配置
```bash
# CloudBase 访问密钥（推荐）
VITE_CLOUDBASE_ACCESS_KEY=your_access_key

# 支付配置（按需）
ALIPAY_APP_ID=your_alipay_app_id
WECHAT_PAY_MCH_ID=your_wechat_pay_merchant_id
WECHAT_PAY_API_V3_KEY=your_wechat_pay_api_v3_key
```

### 国际区部署 (INTL)

对于国际区部署，您需要配置以下环境变量：

#### 必需配置
```bash
# 部署区域标识
NEXT_PUBLIC_DEPLOYMENT_REGION=INTL

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 站点配置
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

#### 可选配置
```bash
# 支付配置（按需）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

## 平台部署指南

### 腾讯云 CloudBase 部署

1. 登录腾讯云控制台并创建 CloudBase 环境
2. 在 CloudBase 控制台中设置环境变量：
   - 进入环境设置 → 环境变量
   - 添加上述必需的环境变量

3. 部署命令示例：
```bash
# 使用 CloudBase CLI 部署
tcb login
tcb deploy
```

### Vercel 部署

1. 登录 Vercel 并创建新项目
2. 在项目设置中添加环境变量：
   - 进入 Settings → Environment Variables
   - 添加所需的环境变量

3. 部署命令示例：
```bash
# 使用 Vercel CLI 部署
vercel --prod
```

### Docker 部署

如果您选择使用 Docker 部署，请确保在运行容器时正确传递环境变量：

```bash
# 中国区部署示例
docker run \
  -e NEXT_PUBLIC_DEPLOYMENT_REGION=CN \
  -e NEXT_PUBLIC_WECHAT_CLOUDBASE_ID=your_cloudbase_env_id \
  -e CLOUDBASE_SECRET_ID=your_secret_id \
  -e CLOUDBASE_SECRET_KEY=your_secret_key \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain.com \
  your-image-name

# 国际区部署示例
docker run \
  -e NEXT_PUBLIC_DEPLOYMENT_REGION=INTL \
  -e NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain.com \
  your-image-name
```

## 验证部署

部署完成后，可以通过以下方式验证配置是否正确：

1. **查看应用日志**：检查是否有配置验证成功的日志
2. **访问应用**：尝试访问应用的主要功能
3. **API 测试**：调用 `/api/health` 或类似健康检查端点

## 故障排除

### 配置验证失败

如果应用启动时报告配置验证失败：

1. 检查环境变量是否正确设置
2. 确认环境变量名称拼写正确
3. 验证敏感信息（如密钥）是否完整无误

### 数据库连接问题

如果出现数据库连接问题：

1. 确认 CloudBase 或 Supabase 的环境变量已正确设置
2. 检查网络连接是否正常
3. 验证云服务账户权限是否足够

### 服务启动失败

如果服务启动失败：

1. 查看完整的错误日志
2. 确认所有必需的环境变量都已设置
3. 检查 Docker 镜像版本是否正确

## 最佳实践

1. **安全性**：始终使用环境变量管理敏感配置，不要将密钥硬编码在代码中
2. **一致性**：确保开发、测试和生产环境使用相同的配置结构
3. **监控**：定期检查应用日志以确保配置持续有效
4. **备份**：保存好环境变量配置，以便在需要时快速重建环境