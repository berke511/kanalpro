import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      {/* Baustellen-Banner */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-600 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-800 font-medium text-center">
            Diese Website befindet sich noch im Aufbau. Anmeldungen und Registrierungen sind derzeit nicht möglich.
          </p>
        </div>
      </div>

      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-xl text-gray-900">KanalPro</span>
          </div>
          <div className="flex gap-3">
            <span className="px-4 py-2 text-gray-300 font-medium cursor-not-allowed select-none">Anmelden</span>
            <span className="px-4 py-2 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed select-none">Kostenlos starten</span>
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

        <div className="inline-flex flex-col items-center gap-2">
          <span className="inline-block px-8 py-4 bg-gray-200 text-gray-400 text-lg font-semibold rounded-xl cursor-not-allowed select-none">
            Jetzt kostenlos testen →
          </span>
          <span className="text-sm text-amber-600 font-medium">Derzeit nicht verfügbar — Website im Aufbau</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
          {[
            {
              d: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
              title: 'Kundenverwaltung',
              desc: 'Alle Kundendaten, Adressen und Notizen übersichtlich gespeichert — kein Zettel mehr nötig.',
            },
            {
              d: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
              title: 'Auftragsverwaltung',
              desc: 'Aufträge anlegen, Status verfolgen und Notizen direkt beim Auftrag speichern.',
            },
            {
              d: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z',
              title: 'Rechnungen & PDF',
              desc: 'Professionelle Rechnungen erstellen und als PDF herunterladen — rechtssicher und schnell.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.d} />
                </svg>
              </div>
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