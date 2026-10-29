# 🚀 部署指南

## Vercel部署步骤

### 1. 准备工作
确保您已经安装了以下工具：
- Node.js (版本 18+)
- npm 或 yarn
- Vercel CLI

### 2. 安装Vercel CLI
```bash
npm install -g vercel
```

### 3. 登录Vercel
```bash
vercel login
```

### 4. 部署项目

#### 方法一：使用部署脚本
```bash
./deploy.sh
```

#### 方法二：手动部署
```bash
# 清理缓存
rm -rf .next
rm -rf .vercel/output

# 安装依赖
npm install

# 构建项目
npm run build

# 部署到Vercel
vercel --prod
```

### 5. 环境变量配置
在Vercel控制台中设置以下环境变量（如果需要）：
- `NODE_ENV=production`

### 6. 域名配置
部署完成后，您可以在Vercel控制台中：
1. 添加自定义域名
2. 配置SSL证书
3. 设置重定向规则

## 故障排除

### 404错误
如果遇到404错误，请检查：
1. 确保所有页面文件都存在
2. 检查`vercel.json`配置
3. 重新构建和部署

### 构建错误
如果构建失败，请检查：
1. 依赖是否正确安装
2. TypeScript错误
3. 语法错误

### 路由问题
如果路由不工作，请检查：
1. `next.config.mjs`配置
2. 页面文件结构
3. 动态路由配置

## 支持
如果遇到问题，请：
1. 检查Vercel部署日志
2. 查看构建输出
3. 联系技术支持 