export async function GET() {
  return Response.json({
    has_client_key: !!process.env.TIKTOK_CLIENT_KEY,
    has_client_secret: !!process.env.TIKTOK_CLIENT_SECRET,
    base_url: process.env.NEXT_PUBLIC_BASE_URL,
    client_key_prefix: process.env.TIKTOK_CLIENT_KEY?.slice(0, 4),
  })
}
