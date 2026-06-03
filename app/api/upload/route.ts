import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('tiktok_access_token')?.value

  if (!accessToken) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('video') as File
  const title = (formData.get('title') as string) || ''

  if (!file) {
    return Response.json({ error: 'no_file' }, { status: 400 })
  }

  // Step 1: Initialize upload
  const initRes = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title,
          privacy_level: 'SELF_ONLY',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: file.size,
          chunk_size: file.size,
          total_chunk_count: 1,
        },
      }),
    }
  )

  const initData = await initRes.json()

  if (!initRes.ok || initData.error?.code !== 'ok') {
    return Response.json({ error: 'init_failed', detail: initData }, { status: 500 })
  }

  const { publish_id, upload_url } = initData.data

  // Step 2: Upload video chunk
  const uploadRes = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
      'Content-Length': String(file.size),
    },
    body: file,
  })

  if (!uploadRes.ok) {
    return Response.json({ error: 'upload_failed' }, { status: 500 })
  }

  return Response.json({ success: true, publish_id })
}
