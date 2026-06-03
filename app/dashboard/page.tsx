'use client'

import { useEffect, useRef, useState } from 'react'

interface UserInfo {
  display_name: string
  avatar_url: string
}

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'initializing' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [publishId, setPublishId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.user) setUser(data.data.user)
      })
  }, [])

  async function handleUpload() {
    if (!file) return
    setStatus('initializing')
    setErrorMsg('')
    setProgress(0)

    // Step 1: Get upload URL from TikTok via our server
    const initRes = await fetch('/api/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, fileSize: file.size }),
    })
    const initData = await initRes.json()

    if (!initRes.ok || !initData.upload_url) {
      setStatus('error')
      setErrorMsg(JSON.stringify(initData.detail ?? initData))
      return
    }

    const { publish_id, upload_url } = initData

    // Step 2: Upload video directly to TikTok CDN from browser
    setStatus('uploading')
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)))
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', 'video/mp4')
        xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`)
        xhr.send(file)
      })
    } catch (e: unknown) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Upload failed')
      return
    }

    // Step 3: Poll for processing status
    setStatus('processing')
    setPublishId(publish_id)

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      const statusRes = await fetch(`/api/upload/status?publish_id=${publish_id}`)
      const statusData = await statusRes.json()
      const processStatus = statusData?.data?.status

      if (processStatus === 'PUBLISH_COMPLETE') {
        setStatus('done')
        return
      }
      if (processStatus === 'FAILED') {
        setStatus('error')
        setErrorMsg('TikTok xử lý thất bại')
        return
      }
    }

    setStatus('done')
  }

  const statusLabel: Record<string, string> = {
    initializing: 'Đang khởi tạo...',
    uploading: `Đang upload... ${progress}%`,
    processing: 'TikTok đang xử lý...',
  }

  return (
    <div className="min-h-screen p-10 max-w-xl mx-auto">
      {user && (
        <div className="flex items-center gap-3 mb-8">
          <img src={user.avatar_url} className="w-12 h-12 rounded-full" alt="" />
          <div>
            <p className="font-semibold">{user.display_name}</p>
            <a href="/api/auth/logout" className="text-sm text-gray-500 hover:underline">
              Đăng xuất
            </a>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">Đăng video lên TikTok</h1>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tiêu đề video</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề..."
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Chọn video (mp4, mov)</label>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full"
          />
        </div>

        {status === 'uploading' && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-black h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || status === 'initializing' || status === 'uploading' || status === 'processing'}
          className="px-6 py-3 bg-black text-white rounded-lg disabled:opacity-50"
        >
          {statusLabel[status] ?? 'Đăng lên TikTok'}
        </button>

        {status === 'done' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Đăng thành công! Video đang được xử lý trên TikTok.
            <br />
            <span className="text-xs text-gray-500">Publish ID: {publishId}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Upload thất bại.</p>
            {errorMsg && <pre className="text-xs mt-1 whitespace-pre-wrap">{errorMsg}</pre>}
          </div>
        )}
      </div>
    </div>
  )
}
