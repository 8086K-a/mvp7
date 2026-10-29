#!/bin/bash

echo "🚀 开始部署到Vercel..."

# 检查是否安装了Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装，正在安装..."
    npm install -g vercel
fi

# 清理构建缓存
echo "🧹 清理构建缓存..."
rm -rf .next
rm -rf .vercel/output
rm -rf node_modules/.cache

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
else
    echo "❌ 构建失败！"
    exit 1
fi

# 部署到Vercel
echo "🚀 部署到Vercel..."
vercel --prod --yes

echo "✅ 部署完成！"
echo "🌐 请检查您的Vercel控制台获取部署URL" 