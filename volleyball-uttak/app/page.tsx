export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Volleyball uttak</h1>
      <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded">
        Gå til innlogging
      </a>
    </main>
  );
}
