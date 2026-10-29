#!/bin/bash
# 部署前配置验证脚本

echo "🔍 开始验证部署配置..."

# 检查是否设置了部署区域
if [ -z "$NEXT_PUBLIC_DEPLOYMENT_REGION" ]; then
    echo "⚠️  警告: NEXT_PUBLIC_DEPLOYMENT_REGION 未设置，默认使用 CN (中国)"
    export NEXT_PUBLIC_DEPLOYMENT_REGION="CN"
else
    echo "🌍 部署区域: $NEXT_PUBLIC_DEPLOYMENT_REGION"
fi

# 根据部署区域验证必需的环境变量
if [ "$NEXT_PUBLIC_DEPLOYMENT_REGION" = "CN" ]; then
    echo "📦 验证 CloudBase 配置..."
    
    missing_vars=()
    
    if [ -z "$NEXT_PUBLIC_WECHAT_CLOUDBASE_ID" ]; then
        missing_vars+=("NEXT_PUBLIC_WECHAT_CLOUDBASE_ID")
    fi
    
    if [ -z "$CLOUDBASE_SECRET_ID" ]; then
        missing_vars+=("CLOUDBASE_SECRET_ID")
    fi
    
    if [ -z "$CLOUDBASE_SECRET_KEY" ]; then
        missing_vars+=("CLOUDBASE_SECRET_KEY")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ 缺少必需的环境变量:"
        printf '%s\n' "${missing_vars[@]}" | sed 's/^/  - /'
        echo ""
        echo "💡 解决方案:"
        echo "  请设置以下环境变量后再部署:"
        printf '%s\n' "${missing_vars[@]}" | sed 's/^/  export /' | sed 's/$/=your_value/'
        exit 1
    else
        echo "✅ CloudBase 配置验证通过"
    fi
else
    echo "📦 验证 Supabase 配置..."
    
    missing_vars=()
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        missing_vars+=("NEXT_PUBLIC_SUPABASE_URL")
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        missing_vars+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        missing_vars+=("SUPABASE_SERVICE_ROLE_KEY")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ 缺少必需的环境变量:"
        printf '%s\n' "${missing_vars[@]}" | sed 's/^/  - /'
        echo ""
        echo "💡 解决方案:"
        echo "  请设置以下环境变量后再部署:"
        printf '%s\n' "${missing_vars[@]}" | sed 's/^/  export /' | sed 's/$/=your_value/'
        exit 1
    else
        echo "✅ Supabase 配置验证通过"
    fi
fi

# 检查网站 URL
if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
    echo "⚠️  警告: NEXT_PUBLIC_SITE_URL 未设置"
else
    echo "🌐 网站 URL: $NEXT_PUBLIC_SITE_URL"
fi

echo ""
echo "🎉 配置验证完成！所有必需的环境变量都已设置。"
echo "🚀 可以安全地继续部署流程。"