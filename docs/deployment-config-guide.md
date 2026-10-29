# 部署配置指南

## 问题说明

在云服务器构建时无法读取配置的问题主要源于以下原因：

1. **环境变量未正确注入**：构建时环境变量未正确设置，导致应用无法连接到后端服务
2. **构建时与运行时分离**：Docker 构建过程中不包含敏感配置，但运行时需要这些配置才能正常工作
3. **区域特定配置**：中国区域需要 CloudBase 配置，国际区域需要 Supabase 配置

## 解决方案

### 1. Docker 构建配置

在云服务器部署时，需要确保以下环境变量在**运行时**被正确注入：

#### 中国区域 (CN) 配置
```bash
# CloudBase 配置
NEXT_PUBLIC_WECHAT_CLOUDBASE_ID=your_cloudbase_env_id
CLOUDBASE_SECRET_ID=your_secret_id
CLOUDBASE_SECRET_KEY=your_secret_key
VITE_CLOUDBASE_ACCESS_KEY=your_access_key

# 网站 URL
NEXT_PUBLIC_SITE_URL=your_production_url

# 支付配置 (可选)
ALIPAY_APP_ID=your_alipay_app_id
WECHAT_PAY_MCH_ID=your_wechat_pay_mch_id
```

#### 国际区域 (INTL) 配置
```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 网站 URL
NEXT_PUBLIC_SITE_URL=your_production_url

# 支付配置 (可选)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 2. 部署时配置注入

#### 腾讯云 CloudBase 部署
1. 在 CloudBase 控制台的环境变量设置中添加上述变量
2. 确保部署配置中指定了 `NEXT_PUBLIC_DEPLOYMENT_REGION=CN`

#### Vercel 部署
1. 在 Vercel 项目设置中添加环境变量
2. 对于国际部署，设置 `NEXT_PUBLIC_DEPLOYMENT_REGION=INTL`

#### 自定义服务器部署
1. 在启动容器前确保环境变量已设置
2. 使用 docker-compose 或 Kubernetes 时确保 secrets 正确挂载

### 3. 验证配置

应用启动时会自动验证配置完整性，并输出类似信息：
```
🔍 检测到部署区域: CN (中国)
✅ 所有必需的环境变量都已正确设置
```

如果缺少必需变量，将显示警告：
```
❌ 缺少以下必需的环境变量:
  - NEXT_PUBLIC_WECHAT_CLOUDBASE_ID
  - CLOUDBASE_SECRET_ID
```

## 最佳实践

1. **安全性**：绝不在代码中硬编码敏感信息
2. **环境一致性**：确保开发、测试、生产环境使用相同的配置结构
3. **验证机制**：部署前验证所有必需的环境变量
4. **日志记录**：启用适当的日志级别以便调试配置问题

## 故障排除

如果部署后仍有配置问题：

1. 检查环境变量是否正确设置
2. 验证区域设置 (`NEXT_PUBLIC_DEPLOYMENT_REGION`) 是否正确
3. 确认部署平台是否支持所需的环境变量格式
4. 查看应用启动日志以获取配置验证详情