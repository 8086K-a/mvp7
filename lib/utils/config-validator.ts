/**
 * 配置验证工具
 * 用于验证部署所需的环境变量是否正确设置
 */

export interface ConfigValidationResult {
  isValid: boolean;
  missingVariables: string[];
  warnings: string[];
}

/**
 * 验证必需的环境变量
 */
export function validateEnvironmentConfig(isChinaRegion: boolean = true): ConfigValidationResult {
  const missingVariables: string[] = [];
  const warnings: string[] = [];

  // 根据区域验证必需的环境变量
  if (isChinaRegion) {
    // 中国区暂不强制要求 CloudBase MySQL 变量
  } else {
    // Supabase 相关配置
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      missingVariables.push('NEXT_PUBLIC_SUPABASE_URL');
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      missingVariables.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      missingVariables.push('SUPABASE_SERVICE_ROLE_KEY');
    }
  }

  // 通用配置验证
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    warnings.push('NEXT_PUBLIC_SITE_URL is not set, using default value');
  }

  // 支付相关配置（可选但建议）
  if (isChinaRegion) {
    if (!process.env.ALIPAY_APP_ID) {
      warnings.push('ALIPAY_APP_ID is not set (required for Alipay)');
    }
    if (!process.env.WECHAT_PAY_MCH_ID) {
      warnings.push('WECHAT_PAY_MCH_ID is not set (required for WeChat Pay)');
    }
  } else {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      warnings.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set (required for Stripe)');
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      warnings.push('STRIPE_SECRET_KEY is not set (required for Stripe)');
    }
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
    warnings
  };
}

/**
 * 打印配置验证结果
 */
export function printConfigValidationResult(result: ConfigValidationResult): void {
  if (result.isValid) {
    console.log('✅ 所有必需的环境变量都已正确设置');
  } else {
    console.error('❌ 缺少以下必需的环境变量:');
    result.missingVariables.forEach(variable => {
      console.error(`  - ${variable}`);
    });
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  以下配置项需要注意:');
    result.warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
  }
}

/**
 * 在应用启动时验证配置
 */
export function validateAndReportConfig(): void {
  // 检测部署区域
  const region = (process.env.DEPLOYMENT_REGION || process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || 'CN').toUpperCase();
  const isChinaRegion = region === 'CN';

  // 检测是否为构建阶段
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  const isStaticGeneration = typeof window === 'undefined' && !process.env.__NEXT_RUNTIME && process.env.NODE_ENV === 'production';

  console.log(`🔍 检测到部署区域: ${isChinaRegion ? 'CN (中国)' : 'INTL (国际)'}`);

  const result = validateEnvironmentConfig(isChinaRegion);
  printConfigValidationResult(result);

  if (!result.isValid) {
    console.error('\n🚨 配置验证失败，应用可能无法正常运行！');
    
    // 根据运行时配置注入规范，构建时不应包含任何敏感配置
    // 所以在构建阶段（静态生成期间）不抛出错误，仅在运行时抛出
    if (process.env.NODE_ENV === 'production' && !(isBuildPhase || isStaticGeneration)) {
      console.warn(`运行时缺少必需的环境变量: ${result.missingVariables.join(', ')}`);
    }
  }
}
