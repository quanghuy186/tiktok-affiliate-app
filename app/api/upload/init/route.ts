import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('tiktok_access_token')?.value

  if (!accessToken) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const { fileSize, title, scheduledAt } = await request.json()

  // If scheduled or has title → use direct post endpoint (requires video.publish)
  // Otherwise → use inbox/draft endpoint (requires video.upload)
  const useDirectPost = !!(scheduledAt || title)
  const endpoint = useDirectPost
    ? 'https://open.tiktokapis.com/v2/post/publish/video/init/'
    : 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/'

  const postInfo = useDirectPost
    ? {
        title: title || ' ',
        privacy_level: 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        ...(scheduledAt
          ? { scheduled_publish_time: Math.floor(new Date(scheduledAt).getTime() / 1000) }
          : {}),
      }
    : undefined

  const body: Record<string, unknown> = {
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: fileSize,
      chunk_size: fileSize,
      total_chunk_count: 1,
    },
  }
  if (postInfo) body.post_info = postInfo

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok || data.error?.code !== 'ok') {
    return Response.json({ error: 'init_failed', detail: data }, { status: 500 })
  }

  return Response.json({
    publish_id: data.data.publish_id,
    upload_url: data.data.upload_url,
    scheduled: !!scheduledAt,
  })
}
