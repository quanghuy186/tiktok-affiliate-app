export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">
        TikTok Auto Poster
      </h1>

      <a
        href="/api/auth/tiktok"
        className="px-6 py-3 bg-black text-white rounded-lg"
      >
        Login with TikTok
      </a>
    </div>
  );
}