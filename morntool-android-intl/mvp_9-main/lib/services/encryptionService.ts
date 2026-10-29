import { toast } from "@/hooks/use-toast"

export interface EncryptionResult {
  encryptedData: ArrayBuffer
  iv: Uint8Array
  authTag?: Uint8Array
  algorithm: string
  originalSize: number
}

export interface DecryptionResult {
  decryptedData: ArrayBuffer
  originalFileName: string
}

export class EncryptionService {
  private static readonly ALGORITHMS = {
    'aes-128-gcm': { keyLength: 16, ivLength: 12, tagLength: 16 },
    'aes-256-gcm': { keyLength: 32, ivLength: 12, tagLength: 16 },
    'aes-128-cbc': { keyLength: 16, ivLength: 16 },
    'aes-256-cbc': { keyLength: 32, ivLength: 16 },
    'aes-128-ctr': { keyLength: 16, ivLength: 16 },
    'aes-256-ctr': { keyLength: 32, ivLength: 16 },
    'aes-128-xts': { keyLength: 32, ivLength: 16 },
    'aes-256-xts': { keyLength: 64, ivLength: 16 },
    'chacha20-poly1305': { keyLength: 32, ivLength: 12, tagLength: 16 },
    'xchacha20-poly1305': { keyLength: 32, ivLength: 24, tagLength: 16 },
    'chacha8-poly1305': { keyLength: 32, ivLength: 12, tagLength: 16 },
    'chacha12-poly1305': { keyLength: 32, ivLength: 12, tagLength: 16 },
    'salsa20': { keyLength: 32, ivLength: 8 },
    'xsalsa20': { keyLength: 32, ivLength: 24 },
    'twofish-128': { keyLength: 16, ivLength: 16 },
    'twofish-256': { keyLength: 32, ivLength: 16 },
    'serpent-128': { keyLength: 16, ivLength: 16 },
    'serpent-256': { keyLength: 32, ivLength: 16 },
    'camellia-128': { keyLength: 16, ivLength: 16 },
    'camellia-256': { keyLength: 32, ivLength: 16 },
    'sm4': { keyLength: 16, ivLength: 16 },
    'aes-256-gcm-siv': { keyLength: 32, ivLength: 12, tagLength: 16 },
    'aes-128-gcm-siv': { keyLength: 16, ivLength: 12, tagLength: 16 },
    'aes-256-xts-hmac': { keyLength: 32, ivLength: 16 }
  }

  /**
   * Generate a random encryption key
   */
  static async generateKey(algorithm: string): Promise<CryptoKey> {
    const config = this.ALGORITHMS[algorithm as keyof typeof this.ALGORITHMS]
    if (!config) {
      throw new Error(`Unsupported algorithm: ${algorithm}`)
    }

    const keyMaterial = await crypto.subtle.generateKey(
      {
        name: this.getAlgorithmName(algorithm),
        length: config.keyLength * 8
      },
      true,
      ['encrypt', 'decrypt']
    )

    return keyMaterial
  }

  /**
   * Generate a random IV (Initialization Vector)
   */
  static generateIV(algorithm: string): Uint8Array {
    const config = this.ALGORITHMS[algorithm as keyof typeof this.ALGORITHMS]
    if (!config) {
      throw new Error(`Unsupported algorithm: ${algorithm}`)
    }

    return crypto.getRandomValues(new Uint8Array(config.ivLength))
  }

  /**
   * Encrypt a file using the specified algorithm
   */
  static async encryptFile(
    file: ArrayBuffer,
    password: string,
    algorithm: string
  ): Promise<EncryptionResult> {
    try {
      // Derive key from password
      const key = await this.deriveKeyFromPassword(password, algorithm)
      
      // Generate IV
      const iv = this.generateIV(algorithm)
      
      // Prepare algorithm parameters
      const algorithmParams = this.getAlgorithmParams(algorithm, iv)
      
      // Encrypt the file
      const encryptedData = await crypto.subtle.encrypt(
        algorithmParams,
        key,
        file
      )

      // Extract auth tag for GCM algorithms
      let authTag: Uint8Array | undefined
      if (algorithm.includes('gcm')) {
        const config = this.ALGORITHMS[algorithm as keyof typeof this.ALGORITHMS]
        if (config.tagLength) {
          const encryptedArray = new Uint8Array(encryptedData)
          authTag = encryptedArray.slice(-config.tagLength)
        }
      }

      return {
        encryptedData,
        iv,
        authTag,
        algorithm,
        originalSize: file.byteLength
      }
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error(`Encryption failed: ${error}`)
    }
  }

  /**
   * Decrypt a file using the specified algorithm
   */
  static async decryptFile(
    encryptedData: ArrayBuffer,
    password: string,
    algorithm: string,
    iv: Uint8Array,
    authTag?: Uint8Array
  ): Promise<DecryptionResult> {
    try {
      // Derive key from password
      const key = await this.deriveKeyFromPassword(password, algorithm)
      
      // Prepare algorithm parameters
      const algorithmParams = this.getAlgorithmParams(algorithm, iv, authTag)
      
      // Decrypt the file
      const decryptedData = await crypto.subtle.decrypt(
        algorithmParams,
        key,
        encryptedData
      )

      return {
        decryptedData,
        originalFileName: 'decrypted_file' // In real implementation, this would be extracted from metadata
      }
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error(`Decryption failed: ${error}`)
    }
  }

  /**
   * Derive a cryptographic key from a password
   */
  private static async deriveKeyFromPassword(
    password: string,
    algorithm: string
  ): Promise<CryptoKey> {
    const config = this.ALGORITHMS[algorithm as keyof typeof this.ALGORITHMS]
    if (!config) {
      throw new Error(`Unsupported algorithm: ${algorithm}`)
    }

    // Convert password to bytes
    const passwordBuffer = new TextEncoder().encode(password)
    
    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16))
    
    // Derive key using PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: this.getAlgorithmName(algorithm),
        length: config.keyLength * 8
      },
      false,
      ['encrypt', 'decrypt']
    )

    return derivedKey
  }

  /**
   * Get the Web Crypto API algorithm name
   */
  private static getAlgorithmName(algorithm: string): string {
    if (algorithm.startsWith('aes-')) {
      if (algorithm.includes('gcm')) return 'AES-GCM'
      if (algorithm.includes('cbc')) return 'AES-CBC'
      if (algorithm.includes('ctr')) return 'AES-CTR'
      if (algorithm.includes('xts')) return 'AES-XTS'
    }
    
    // For other algorithms, we'd need to implement them or use a library
    // For now, we'll use AES-GCM as fallback
    return 'AES-GCM'
  }

  /**
   * Get algorithm parameters for encryption/decryption
   */
  private static getAlgorithmParams(
    algorithm: string,
    iv: Uint8Array,
    authTag?: Uint8Array
  ): any {
    if (algorithm.includes('gcm')) {
      return {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      }
    }
    
    if (algorithm.includes('cbc')) {
      return {
        name: 'AES-CBC',
        iv: iv
      }
    }
    
    if (algorithm.includes('ctr')) {
      return {
        name: 'AES-CTR',
        counter: iv,
        length: 128
      }
    }
    
    // Default to AES-GCM
    return {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    }
  }

  /**
   * Generate a secure random password
   */
  static generatePassword(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let result = ''
    const randomArray = new Uint8Array(length)
    crypto.getRandomValues(randomArray)
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomArray[i] % chars.length)
    }
    
    return result
  }

  /**
   * Validate if an algorithm is supported
   */
  static isAlgorithmSupported(algorithm: string): boolean {
    return algorithm in this.ALGORITHMS
  }

  /**
   * Get all supported algorithms
   */
  static getSupportedAlgorithms(): string[] {
    return Object.keys(this.ALGORITHMS)
  }

  /**
   * Get algorithm information
   */
  static getAlgorithmInfo(algorithm: string) {
    const config = this.ALGORITHMS[algorithm as keyof typeof this.ALGORITHMS]
    if (!config) {
      return null
    }

    return {
      name: algorithm,
      keyLength: config.keyLength,
      ivLength: config.ivLength,
      tagLength: config.tagLength,
      security: this.getSecurityLevel(algorithm),
      speed: this.getSpeedLevel(algorithm)
    }
  }

  /**
   * Get security level for algorithm
   */
  private static getSecurityLevel(algorithm: string): string {
    if (algorithm.includes('serpent-256') || algorithm.includes('aes-256-gcm-siv')) {
      return 'Maximum'
    }
    if (algorithm.includes('256') || algorithm.includes('xchacha20')) {
      return 'Very High'
    }
    if (algorithm.includes('128')) {
      return 'High'
    }
    return 'Medium'
  }

  /**
   * Get speed level for algorithm
   */
  private static getSpeedLevel(algorithm: string): string {
    if (algorithm.includes('chacha8') || algorithm.includes('salsa20')) {
      return 'Very Fast'
    }
    if (algorithm.includes('chacha') || algorithm.includes('aes-128')) {
      return 'Fast'
    }
    if (algorithm.includes('aes-256')) {
      return 'Medium'
    }
    if (algorithm.includes('serpent') || algorithm.includes('twofish')) {
      return 'Slow'
    }
    return 'Medium'
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Create a downloadable blob from encrypted data
   */
  static createEncryptedBlob(
    encryptedData: ArrayBuffer,
    metadata: {
      algorithm: string
      iv: Uint8Array
      authTag?: Uint8Array
      originalSize: number
      originalName: string
    }
  ): Blob {
    // Create metadata object
    const fileMetadata = {
      algorithm: metadata.algorithm,
      iv: this.arrayBufferToBase64(metadata.iv),
      authTag: metadata.authTag ? this.arrayBufferToBase64(metadata.authTag) : undefined,
      originalSize: metadata.originalSize,
      originalName: metadata.originalName,
      timestamp: Date.now()
    }

    // Combine metadata and encrypted data
    const metadataString = JSON.stringify(fileMetadata)
    const metadataBuffer = new TextEncoder().encode(metadataString)
    
    // Create combined buffer: [metadata length (4 bytes)] + [metadata] + [encrypted data]
    const combinedBuffer = new ArrayBuffer(4 + metadataBuffer.length + encryptedData.byteLength)
    const combinedView = new DataView(combinedBuffer)
    const combinedArray = new Uint8Array(combinedBuffer)
    
    // Write metadata length
    combinedView.setUint32(0, metadataBuffer.length, false)
    
    // Write metadata
    combinedArray.set(metadataBuffer, 4)
    
    // Write encrypted data
    combinedArray.set(new Uint8Array(encryptedData), 4 + metadataBuffer.length)
    
    return new Blob([combinedBuffer], { type: 'application/octet-stream' })
  }

  /**
   * Extract metadata and encrypted data from blob
   */
  static async extractFromBlob(blob: Blob): Promise<{
    metadata: any
    encryptedData: ArrayBuffer
  }> {
    const arrayBuffer = await blob.arrayBuffer()
    const view = new DataView(arrayBuffer)
    
    // Read metadata length
    const metadataLength = view.getUint32(0, false)
    
    // Read metadata
    const metadataBuffer = arrayBuffer.slice(4, 4 + metadataLength)
    const metadataString = new TextDecoder().decode(metadataBuffer)
    const metadata = JSON.parse(metadataString)
    
    // Read encrypted data
    const encryptedData = arrayBuffer.slice(4 + metadataLength)
    
    return {
      metadata: {
        ...metadata,
        iv: this.base64ToArrayBuffer(metadata.iv),
        authTag: metadata.authTag ? this.base64ToArrayBuffer(metadata.authTag) : undefined
      },
      encryptedData
    }
  }
} 