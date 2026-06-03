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
  cookieStore.delete('tiktok_oauth_state')
  cookieStore.delete('tiktok_code_verifier')

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

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=token_failed`
    )
  }

  const token = await tokenRes.json()

  cookieStore.set('tiktok_access_token', token.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: token.expires_in ?? 60 * 60 * 24,
    path: '/',
  })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`)
}
