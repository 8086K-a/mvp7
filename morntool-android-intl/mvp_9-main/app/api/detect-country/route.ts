import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get the client's IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || '127.0.0.1'

    // Use a free IP geolocation service
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch location data')
    }

    const data = await response.json()
    
    // Check if the country is China
    const isChina = data.countryCode === 'CN'
    
    return NextResponse.json({
      countryCode: data.countryCode,
      isChina,
      recommendedLanguage: isChina ? 'zh' : 'en'
    })
  } catch (error) {
    console.error('Error detecting country:', error)
    
    // Fallback to English if detection fails
    return NextResponse.json({
      countryCode: 'unknown',
      isChina: false,
      recommendedLanguage: 'en'
    })
  }
} 