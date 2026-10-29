/**
 * 部署配置验证入口
 *
 * 此文件用于在应用启动时验证部署配置
 * 可以作为独立脚本运行以检查配置
 */

import { validateAndReportConfig } from '@/lib/utils/config-validator';

// 如果直接运行此文件，则执行验证
if (require.main === module) {
  console.log('🔍 开始验证部署配置...');

  try {
    validateAndReportConfig();
    console.log('✅ 配置验证完成');
  } catch (error) {
    console.error('❌ 配置验证失败:', error);
    process.exit(1);
  }
}

export { validateAndReportConfig };