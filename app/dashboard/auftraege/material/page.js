'use client';

const SEKTIONEN = [
  {
    titel: 'Material',
    beschreibung: 'Verwendetes Material und Verbrauchsmittel erfassen.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    titel: 'Arbeitszeiten',
    beschreibung: 'Geleistete Stunden und Zeiterfassung pro Mitarbeiter.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    titel: 'Kostenzusammenfassung',
    beschreibung: 'Übersicht über Material- und Lohnkosten des Auftrags.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

export default function MaterialArbeitszeiten() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Material &amp; Arbeitszeiten</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Erfasse verwendetes Material und geleistete Arbeitszeiten für diesen Auftrag.
        </p>
      </div>

      {/* Sektionen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SEKTIONEN.map((s) => (
          <div key={s.titel} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                {s.icon}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{s.titel}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{s.beschreibung}</p>
              </div>
            </div>
            <div className="flex-1 min-h-20 bg-gray-50 rounded-xl flex items-center justify-center">
              <span className="text-xs text-gray-300 italic">Funktion folgt im nächsten Sprint</span>
            </div>
          </div>
        ))}
      </div>

      {/* Hinweis */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-blue-700">
          Materialerfassung, Zeitbuchung und automatische Kostenberechnung
          werden im nächsten Sprint implementiert.
        </p>
      </div>

    </div>
  );
}
