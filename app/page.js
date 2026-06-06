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
        <span className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          Speziell für Rohr- & Kanalservice
        </span>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Schluss mit Zettelwirtschaft.
          <br />
          <span className="text-blue-600">Alles digital, alles einfach.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          KanalPro ist die einfachste Verwaltungssoftware für kleine Rohr- und Kanalservice-Betriebe.
          Kundendaten, Aufträge und Rechnungen — alles an einem Ort.
        </p>
        <Link href="/register" className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">
          Jetzt kostenlos testen →
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
          {[
            { icon: '👥', title: 'Kundenverwaltung', desc: 'Alle Kundendaten, Adressen und Notizen übersichtlich gespeichert — kein Zettel mehr nötig.' },
            { icon: '📋', title: 'Auftragsverwaltung', desc: 'Aufträge anlegen, Status verfolgen und Notizen direkt beim Auftrag speichern.' },
            { icon: '🧾', title: 'Rechnungen & PDF', desc: 'Professionelle Rechnungen erstellen und als PDF herunterladen — rechtssicher und schnell.' },
          ].map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-24 py-8 text-center text-gray-400 text-sm">
        © 2025 KanalPro. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
}