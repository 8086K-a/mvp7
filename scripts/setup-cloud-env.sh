#!/bin/bash
# 云环境配置脚本
# 用于在不同云平台上设置正确的环境变量

echo "☁️  云环境配置助手"

# 检测当前部署区域
if [ -z "$DEPLOY_REGION" ]; then
    echo "🌍 请选择部署区域:"
    echo "  1) CN - 中国区 (使用 CloudBase)"
    echo "  2) INTL - 国际区 (使用 Supabase)"
    read -p "请输入选择 (1 或 2, 默认为 1): " choice
    case $choice in
        2) export DEPLOY_REGION="INTL";;
        *) export DEPLOY_REGION="CN";;
    esac
fi

echo "📋 部署区域: $DEPLOY_REGION"

if [ "$DEPLOY_REGION" = "CN" ]; then
    # 中国区 CloudBase 配置
    echo ""
    echo "🔐 中国区 (CloudBase) 配置"
    echo "请提供以下 CloudBase 信息:"
    
    if [ -z "$NEXT_PUBLIC_WECHAT_CLOUDBASE_ID" ]; then
        read -p "Enter NEXT_PUBLIC_WECHAT_CLOUDBASE_ID: " cloudbase_id
        export NEXT_PUBLIC_WECHAT_CLOUDBASE_ID="$cloudbase_id"
    fi
    
    if [ -z "$CLOUDBASE_SECRET_ID" ]; then
        read -p "Enter CLOUDBASE_SECRET_ID: " secret_id
        export CLOUDBASE_SECRET_ID="$secret_id"
    fi
    
    if [ -z "$CLOUDBASE_SECRET_KEY" ]; then
        read -s -p "Enter CLOUDBASE_SECRET_KEY: " secret_key
        echo ""  # 换行
        export CLOUDBASE_SECRET_KEY="$secret_key"
    fi
    
    # 设置部署区域
    export NEXT_PUBLIC_DEPLOYMENT_REGION="CN"
    
    echo "✅ CloudBase 配置设置完成"
    
elif [ "$DEPLOY_REGION" = "INTL" ]; then
    # 国际区 Supabase 配置
    echo ""
    echo "🔐 国际区 (Supabase) 配置"
    echo "请提供以下 Supabase 信息:"
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        read -p "Enter NEXT_PUBLIC_SUPABASE_URL: " supabase_url
        export NEXT_PUBLIC_SUPABASE_URL="$supabase_url"
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        read -p "Enter NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon_key
        export NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon_key"
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        read -s -p "Enter SUPABASE_SERVICE_ROLE_KEY: " service_key
        echo ""  # 换行
        export SUPABASE_SERVICE_ROLE_KEY="$service_key"
    fi
    
    # 设置部署区域
    export NEXT_PUBLIC_DEPLOYMENT_REGION="INTL"
    
    echo "✅ Supabase 配置设置完成"
fi

# 设置通用配置
if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
    read -p "Enter NEXT_PUBLIC_SITE_URL (e.g., https://yourdomain.com): " site_url
    export NEXT_PUBLIC_SITE_URL="$site_url"
fi

# 输出配置摘要
echo ""
echo "📋 配置摘要:"
echo "  部署区域: $NEXT_PUBLIC_DEPLOYMENT_REGION"
if [ "$NEXT_PUBLIC_DEPLOYMENT_REGION" = "CN" ]; then
    echo "  CloudBase 环境 ID: $NEXT_PUBLIC_WECHAT_CLOUDBASE_ID"
    echo "  Secret ID: ${CLOUDBASE_SECRET_ID:0:6}..."  # 只显示前6位
    echo "  Secret Key: ${CLOUDBASE_SECRET_KEY:0:6}..."  # 只显示前6位
else
    echo "  Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
    echo "  Anon Key: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:6}..."  # 只显示前6位
    echo "  Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY:0:6}..."  # 只显示前6位
fi
echo "  站点 URL: $NEXT_PUBLIC_SITE_URL"

# 提供部署命令建议
echo ""
echo "🚀 部署建议:"
if command -v vercel >/dev/null 2>&1; then
    echo "  Vercel 部署: vercel --env NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION"
fi

if command -v docker >/dev/null 2>&1; then
    echo "  Docker 部署示例:"
    if [ "$NEXT_PUBLIC_DEPLOYMENT_REGION" = "CN" ]; then
        echo "    docker run -e NEXT_PUBLIC_DEPLOYMENT_REGION=CN \\"
        echo "               -e NEXT_PUBLIC_WECHAT_CLOUDBASE_ID='$NEXT_PUBLIC_WECHAT_CLOUDBASE_ID' \\"
        echo "               -e CLOUDBASE_SECRET_ID='$CLOUDBASE_SECRET_ID' \\"
        echo "               -e CLOUDBASE_SECRET_KEY='$CLOUDBASE_SECRET_KEY' \\"
        echo "               -e NEXT_PUBLIC_SITE_URL='$NEXT_PUBLIC_SITE_URL' \\"
        echo "               your-image-name"
    else
        echo "    docker run -e NEXT_PUBLIC_DEPLOYMENT_REGION=INTL \\"
        echo "               -e NEXT_PUBLIC_SUPABASE_URL='$NEXT_PUBLIC_SUPABASE_URL' \\"
        echo "               -e NEXT_PUBLIC_SUPABASE_ANON_KEY='$NEXT_PUBLIC_SUPABASE_ANON_KEY' \\"
        echo "               -e SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_ROLE_KEY' \\"
        echo "               -e NEXT_PUBLIC_SITE_URL='$NEXT_PUBLIC_SITE_URL' \\"
        echo "               your-image-name"
    fi
fi

echo ""
echo "💡 提示: 这些环境变量也可以通过云平台控制台设置"