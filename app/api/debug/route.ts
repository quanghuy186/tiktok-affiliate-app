import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll().map((c) => c.name)

  return Response.json({
    has_client_key: !!process.env.TIKTOK_CLIENT_KEY,
    has_client_secret: !!process.env.TIKTOK_CLIENT_SECRET,
    base_url: process.env.NEXT_PUBLIC_BASE_URL,
    client_key_prefix: process.env.TIKTOK_CLIENT_KEY?.slice(0, 4),
    has_access_token: !!cookieStore.get('tiktok_access_token')?.value,
    all_cookies: allCookies,
  })
}
