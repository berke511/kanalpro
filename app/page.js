import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-xl text-gray-900">KanalPro</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">Anmelden</Link>
            <Link href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Kostenlos starten</Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">Schluss mit Zettelwirtschaft.</h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">KanalPro ist die einfachste Verwaltungssoftware fuer kleine Rohr- und Kanalservice-Betriebe.</p>
        <Link href="/register" className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition">Jetzt kostenlos testen</Link>
      </main>
    </div>
  );
}
