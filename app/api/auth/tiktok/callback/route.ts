import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('tiktok_oauth_state')?.value
  const codeVerifier = cookieStore.get('tiktok_code_verifier')?.value

  if (error || !code || !state || state !== savedState || !codeVerifier) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=auth_failed`
    )
  }

  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/tiktok/callback`,
      code_verifier: codeVerifier,
    }),
  })

  const token = await tokenRes.json()

  // Handle both response formats: direct or wrapped in data
  const accessToken = token.access_token ?? token.data?.access_token

  if (!tokenRes.ok || !accessToken) {
    // Redirect with debug info
    const errParam = encodeURIComponent(JSON.stringify(token))
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=token_failed&detail=${errParam}`
    )
  }

  const expiresIn = token.expires_in ?? token.data?.expires_in ?? 86400

  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`)
  response.cookies.set('tiktok_access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresIn,
    path: '/',
  })

  return response
}
