export default function Dashboard() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>

      <div className="mt-5">
        <input type="file" />
      </div>

      <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Upload Video
      </button>
    </div>
  );
}