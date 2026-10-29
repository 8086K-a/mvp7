export interface CompressionResult {
  compressedData: ArrayBuffer
  originalSize: number
  compressedSize: number
  compressionRatio: number
  algorithm: string
}

export interface MultiCompressionResult {
  iterations: number
  finalSize: number
  originalSize: number
  totalCompressionRatio: number
  stepResults: CompressionResult[]
}

export class CompressionService {
  /**
   * 模拟Gzip压缩
   */
  static async gzipCompress(data: ArrayBuffer): Promise<CompressionResult> {
    // 模拟Gzip压缩效果
    const originalSize = data.byteLength
    let compressedSize = originalSize
    
    // 模拟不同文件类型的压缩比
    const textContent = new TextDecoder().decode(data.slice(0, Math.min(1000, originalSize)))
    const isText = /[a-zA-Z]/.test(textContent)
    
    if (isText) {
      // 文本文件压缩比更高
      compressedSize = Math.floor(originalSize * (0.3 + Math.random() * 0.2)) // 30-50%
    } else {
      // 二进制文件压缩比较低
      compressedSize = Math.floor(originalSize * (0.7 + Math.random() * 0.2)) // 70-90%
    }
    
    // 确保不会小于原始大小的10%
    compressedSize = Math.max(compressedSize, originalSize * 0.1)
    
    return {
      compressedData: data, // 实际实现中这里会是真正的压缩数据
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
      algorithm: 'gzip'
    }
  }

  /**
   * 模拟Brotli压缩
   */
  static async brotliCompress(data: ArrayBuffer): Promise<CompressionResult> {
    const originalSize = data.byteLength
    let compressedSize = originalSize
    
    const textContent = new TextDecoder().decode(data.slice(0, Math.min(1000, originalSize)))
    const isText = /[a-zA-Z]/.test(textContent)
    
    if (isText) {
      compressedSize = Math.floor(originalSize * (0.25 + Math.random() * 0.15)) // 25-40%
    } else {
      compressedSize = Math.floor(originalSize * (0.6 + Math.random() * 0.2)) // 60-80%
    }
    
    compressedSize = Math.max(compressedSize, originalSize * 0.08)
    
    return {
      compressedData: data,
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
      algorithm: 'brotli'
    }
  }

  /**
   * 模拟LZMA压缩
   */
  static async lzmaCompress(data: ArrayBuffer): Promise<CompressionResult> {
    const originalSize = data.byteLength
    let compressedSize = originalSize
    
    const textContent = new TextDecoder().decode(data.slice(0, Math.min(1000, originalSize)))
    const isText = /[a-zA-Z]/.test(textContent)
    
    if (isText) {
      compressedSize = Math.floor(originalSize * (0.2 + Math.random() * 0.1)) // 20-30%
    } else {
      compressedSize = Math.floor(originalSize * (0.5 + Math.random() * 0.2)) // 50-70%
    }
    
    compressedSize = Math.max(compressedSize, originalSize * 0.05)
    
    return {
      compressedData: data,
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
      algorithm: 'lzma'
    }
  }

  /**
   * 多次压缩测试
   */
  static async multiCompress(
    data: ArrayBuffer,
    iterations: number = 100,
    algorithm: 'gzip' | 'brotli' | 'lzma' = 'gzip'
  ): Promise<MultiCompressionResult> {
    const stepResults: CompressionResult[] = []
    let currentData = data
    const originalSize = data.byteLength

    for (let i = 0; i < iterations; i++) {
      let result: CompressionResult
      
      switch (algorithm) {
        case 'gzip':
          result = await this.gzipCompress(currentData)
          break
        case 'brotli':
          result = await this.brotliCompress(currentData)
          break
        case 'lzma':
          result = await this.lzmaCompress(currentData)
          break
        default:
          result = await this.gzipCompress(currentData)
      }

      stepResults.push(result)
      currentData = result.compressedData

      // 如果压缩比接近1，说明已经无法进一步压缩
      if (result.compressionRatio < 1.01) {
        break
      }
    }

    const finalSize = stepResults[stepResults.length - 1]?.compressedSize || originalSize

    return {
      iterations: stepResults.length,
      finalSize,
      originalSize,
      totalCompressionRatio: originalSize / finalSize,
      stepResults
    }
  }

  /**
   * 分析多次压缩的效果
   */
  static analyzeMultiCompression(results: MultiCompressionResult): {
    isReversible: boolean
    efficiencyAnalysis: string
    recommendations: string[]
  } {
    const { stepResults, totalCompressionRatio, iterations } = results
    
    // 检查是否可逆
    const isReversible = stepResults.every(step => step.compressionRatio > 1)
    
    // 分析效率
    let efficiencyAnalysis = ''
    if (totalCompressionRatio > 10) {
      efficiencyAnalysis = '压缩效果显著'
    } else if (totalCompressionRatio > 3) {
      efficiencyAnalysis = '压缩效果良好'
    } else if (totalCompressionRatio > 1.5) {
      efficiencyAnalysis = '压缩效果一般'
    } else {
      efficiencyAnalysis = '压缩效果有限'
    }

    // 生成建议
    const recommendations: string[] = []
    
    if (iterations < 10) {
      recommendations.push('压缩次数较少，可能还有压缩空间')
    } else if (iterations > 50) {
      recommendations.push('压缩次数较多，建议检查是否值得继续')
    }

    if (totalCompressionRatio < 2) {
      recommendations.push('总体压缩比不高，考虑使用更高效的算法')
    }

    if (stepResults.length > 0) {
      const lastStep = stepResults[stepResults.length - 1]
      if (lastStep.compressionRatio < 1.05) {
        recommendations.push('最后一次压缩效果很小，已达到压缩极限')
      }
    }

    return {
      isReversible,
      efficiencyAnalysis,
      recommendations
    }
  }

  /**
   * 生成压缩报告
   */
  static generateCompressionReport(results: MultiCompressionResult): string {
    const analysis = this.analyzeMultiCompression(results)
    
    let report = `# 多次压缩测试报告\n\n`
    report += `## 基本信息\n`
    report += `- 原始大小: ${(results.originalSize / 1024 / 1024).toFixed(2)} MB\n`
    report += `- 最终大小: ${(results.finalSize / 1024 / 1024).toFixed(2)} MB\n`
    report += `- 压缩次数: ${results.iterations}\n`
    report += `- 总压缩比: ${results.totalCompressionRatio.toFixed(2)}:1\n`
    report += `- 可逆性: ${analysis.isReversible ? '✅ 完全可逆' : '❌ 可能不可逆'}\n\n`
    
    report += `## 效率分析\n`
    report += `- 评价: ${analysis.efficiencyAnalysis}\n\n`
    
    report += `## 详细步骤\n`
    results.stepResults.forEach((step, index) => {
      report += `${index + 1}. 第${index + 1}次压缩: ${step.compressionRatio.toFixed(2)}:1\n`
    })
    
    report += `\n## 建议\n`
    analysis.recommendations.forEach(rec => {
      report += `- ${rec}\n`
    })
    
    return report
  }
} 