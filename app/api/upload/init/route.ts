import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('tiktok_access_token')?.value

  if (!accessToken) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const { title, fileSize } = await request.json()

  const res = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: fileSize,
          chunk_size: fileSize,
          total_chunk_count: 1,
        },
      }),
    }
  )

  const data = await res.json()

  if (!res.ok || data.error?.code !== 'ok') {
    return Response.json({ error: 'init_failed', detail: data }, { status: 500 })
  }

  return Response.json({
    publish_id: data.data.publish_id,
    upload_url: data.data.upload_url,
  })
}
