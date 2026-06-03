import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('tiktok_access_token')?.value

  if (!accessToken) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const publishId = request.nextUrl.searchParams.get('publish_id')
  if (!publishId) {
    return Response.json({ error: 'missing_publish_id' }, { status: 400 })
  }

  const res = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    }
  )

  const data = await res.json()
  return Response.json(data)
}
