'use client'

import { useEffect, useRef, useState } from 'react'

interface UserInfo {
  display_name: string
  avatar_url: string
}

const HASHTAG_PRESETS = [
  '#affiliate #tiktokshop #muasắm',
  '#review #sảnphẩmtốt #tiktok',
  '#viral #fyp #xuhuong',
  '#lifestyle #beauty #fashion',
]

function buildCaption(caption: string, hashtags: string) {
  const parts = [caption.trim(), hashtags.trim()].filter(Boolean)
  return parts.join('\n\n')
}

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [customHashtag, setCustomHashtag] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'initializing' | 'uploading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [publishId, setPublishId] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((data) => { if (data?.data?.user) setUser(data.data.user) })
  }, [])

  // Min datetime = 20 minutes from now (TikTok requirement)
  function minScheduleTime() {
    const d = new Date(Date.now() + 20 * 60 * 1000)
    return d.toISOString().slice(0, 16)
  }

  // Max datetime = 10 days from now
  function maxScheduleTime() {
    const d = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 16)
  }

  function addHashtag(tag: string) {
    setHashtags((prev) => {
      const current = prev.trim()
      if (current.includes(tag)) return prev
      return current ? `${current} ${tag}` : tag
    })
  }

  function addCustomHashtag() {
    if (!customHashtag.trim()) return
    const tag = customHashtag.trim().startsWith('#')
      ? customHashtag.trim()
      : `#${customHashtag.trim()}`
    addHashtag(tag)
    setCustomHashtag('')
  }

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
    setIsScheduled(!!scheduledAt)
    setStatus('done')
  }

  function copyCaption() {
    navigator.clipboard.writeText(buildCaption(caption, hashtags))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setStatus('idle')
    setTitle('')
    setCaption('')
    setHashtags('')
    setScheduledAt('')
    setFile(null)
    setPublishId('')
    setErrorMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }

  if (status === 'done') {
    const fullCaption = buildCaption(caption, hashtags)
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
          <h2 className="text-xl font-bold text-green-800 mb-1">
            {isScheduled ? 'Đã hẹn lịch đăng thành công!' : 'Video đã upload thành công!'}
          </h2>
          <p className="text-green-700 text-sm mb-4">
            {isScheduled
              ? `Video sẽ tự động đăng lúc ${new Date(scheduledAt).toLocaleString('vi-VN')}.`
              : 'Video đang chờ trong Inbox TikTok của bạn.'}
          </p>

          {!isScheduled && (
            <>
              <h3 className="font-semibold mb-2">Bước tiếp theo để gắn link affiliate:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 mb-4">
                <li>Mở app <strong>TikTok</strong> → vào <strong>Hộp thư đến</strong></li>
                <li>Nhấn <strong>"Đăng ngay"</strong> → dán caption bên dưới</li>
                <li>Thêm sản phẩm TikTok Shop nếu có → nhấn <strong>Đăng</strong></li>
              </ol>
            </>
          )}

          {fullCaption && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-1">Caption đã soạn sẵn:</p>
              <pre className="bg-white border rounded-lg p-3 text-sm whitespace-pre-wrap mb-2">{fullCaption}</pre>
              <button onClick={copyCaption} className="w-full py-2 bg-gray-800 text-white rounded-lg text-sm">
                {copied ? '✓ Đã copy!' : 'Copy caption'}
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-3">Publish ID: {publishId}</p>
          <button onClick={reset} className="w-full py-2 border rounded-lg text-sm">Upload video khác</button>
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

      <div className="flex flex-col gap-5">
        {/* Video file */}
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

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Tiêu đề video</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề..."
            maxLength={150}
            className="w-full border rounded-lg px-3 py-2"
          />
          <p className="text-xs text-gray-400 mt-1">{title.length}/150 ký tự</p>
        </div>

        {/* Caption */}
        <div>
          <label className="block text-sm font-medium mb-1">Caption & link affiliate</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={`Mô tả video + link affiliate\nVD: Mua ngay tại: https://shopee.vn/...`}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Hashtags */}
        <div>
          <label className="block text-sm font-medium mb-2">Hashtag</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {HASHTAG_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => addHashtag(preset)}
                className="px-3 py-1 text-xs border rounded-full hover:bg-gray-100"
              >
                + {preset.split(' ')[0]}...
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={customHashtag}
              onChange={(e) => setCustomHashtag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomHashtag()}
              placeholder="Thêm hashtag tuỳ chỉnh..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={addCustomHashtag}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
            >
              Thêm
            </button>
          </div>
          <textarea
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            rows={2}
            placeholder="#affiliate #tiktok ..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Hẹn giờ đăng
            <span className="text-gray-400 font-normal ml-1">(tối thiểu 20 phút, tối đa 10 ngày)</span>
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            min={minScheduleTime()}
            max={maxScheduleTime()}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
          {scheduledAt && (
            <button onClick={() => setScheduledAt('')} className="text-xs text-gray-400 mt-1 hover:underline">
              Xoá lịch (đăng ngay vào inbox)
            </button>
          )}
        </div>

        {/* Progress bar */}
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
          {status === 'initializing' && 'Đang khởi tạo...'}
          {status === 'uploading' && `Đang upload... ${progress}%`}
          {status === 'idle' && (scheduledAt ? 'Hẹn lịch đăng' : 'Upload lên TikTok')}
        </button>

        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Thất bại.</p>
            {errorMsg && <pre className="text-xs mt-1 whitespace-pre-wrap">{errorMsg}</pre>}
          </div>
        )}
      </div>
    </div>
  )
}
