'use client'

import { useEffect, useRef, useState } from 'react'

interface UserInfo {
  display_name: string
  avatar_url: string
}

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'initializing' | 'uploading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [publishId, setPublishId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
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

    const initRes = await fetch('/api/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileSize: file.size }),
    })
    const initData = await initRes.json()

    if (!initRes.ok || !initData.upload_url) {
      setStatus('error')
      setErrorMsg(JSON.stringify(initData.detail ?? initData))
      return
    }

    const { publish_id, upload_url } = initData
    setStatus('uploading')

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`${xhr.status}`)))
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

    setPublishId(publish_id)
    setStatus('done')
  }

  function copyCaption() {
    navigator.clipboard.writeText(caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setStatus('idle')
    setCaption('')
    setFile(null)
    setPublishId('')
    setErrorMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const statusLabel: Record<string, string> = {
    initializing: 'Đang khởi tạo...',
    uploading: `Đang upload... ${progress}%`,
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen p-10 max-w-xl mx-auto">
        {user && (
          <div className="flex items-center gap-3 mb-8">
            <img src={user.avatar_url} className="w-12 h-12 rounded-full" alt="" />
            <div>
              <p className="font-semibold">{user.display_name}</p>
              <a href="/api/auth/logout" className="text-sm text-gray-500 hover:underline">Đăng xuất</a>
            </div>
          </div>
        )}

        <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
          <h2 className="text-xl font-bold text-green-800 mb-1">Video đã upload thành công! 🎉</h2>
          <p className="text-green-700 text-sm mb-4">Video đang chờ trong Inbox của TikTok.</p>

          <h3 className="font-semibold mb-2">Bước tiếp theo để gắn link affiliate:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-5">
            <li>Mở app <strong>TikTok</strong> trên điện thoại</li>
            <li>Vào <strong>Hộp thư đến</strong> (Inbox) → tìm thông báo video mới</li>
            <li>Nhấn <strong>"Đăng ngay"</strong> để chỉnh sửa trước khi đăng</li>
            <li>Dán caption + link affiliate vào phần mô tả</li>
            <li>Thêm <strong>sản phẩm TikTok Shop</strong> nếu có</li>
            <li>Nhấn <strong>Đăng</strong></li>
          </ol>

          {caption && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-1">Caption đã soạn sẵn (nhấn để copy):</p>
              <div className="relative">
                <pre className="bg-white border rounded-lg p-3 text-sm whitespace-pre-wrap">{caption}</pre>
                <button
                  onClick={copyCaption}
                  className="mt-2 w-full py-2 bg-gray-800 text-white rounded-lg text-sm"
                >
                  {copied ? '✓ Đã copy!' : 'Copy caption'}
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-4">Publish ID: {publishId}</p>

          <button onClick={reset} className="w-full py-2 border rounded-lg text-sm">
            Upload video khác
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-10 max-w-xl mx-auto">
      {user && (
        <div className="flex items-center gap-3 mb-8">
          <img src={user.avatar_url} className="w-12 h-12 rounded-full" alt="" />
          <div>
            <p className="font-semibold">{user.display_name}</p>
            <a href="/api/auth/logout" className="text-sm text-gray-500 hover:underline">Đăng xuất</a>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">Đăng video lên TikTok</h1>

      <div className="flex flex-col gap-4">
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

        <div>
          <label className="block text-sm font-medium mb-1">
            Caption &amp; link affiliate
            <span className="text-gray-400 font-normal ml-1">(sẽ hiện sau upload để copy vào TikTok)</span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={`Mô tả video...\n\nMua ngay tại: https://shopee.vn/...\n\n#affiliate #tiktokshop`}
            rows={5}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {status === 'uploading' && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-black h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || status === 'initializing' || status === 'uploading'}
          className="px-6 py-3 bg-black text-white rounded-lg disabled:opacity-50"
        >
          {statusLabel[status] ?? 'Upload lên TikTok'}
        </button>

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
