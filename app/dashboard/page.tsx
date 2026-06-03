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
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [publishId, setPublishId] = useState('')
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
    setStatus('uploading')

    const formData = new FormData()
    formData.append('video', file)
    formData.append('title', title)

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()

    if (data.success) {
      setPublishId(data.publish_id)
      setStatus('done')
      setFile(null)
      setTitle('')
      if (fileRef.current) fileRef.current.value = ''
    } else {
      setStatus('error')
    }
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

        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className="px-6 py-3 bg-black text-white rounded-lg disabled:opacity-50"
        >
          {status === 'uploading' ? 'Đang upload...' : 'Đăng lên TikTok'}
        </button>

        {status === 'done' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Upload thành công! Publish ID: <code className="text-xs">{publishId}</code>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            Upload thất bại. Thử lại nhé.
          </div>
        )}
      </div>
    </div>
  )
}
