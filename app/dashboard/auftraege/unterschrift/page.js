'use client';

const INFO_FELDER = [
  { label: 'Auftragsnummer', wert: '—', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z' },
  { label: 'Kunde',          wert: '—', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
  { label: 'Einsatzort',     wert: '—', icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z' },
  { label: 'Datum',          wert: '—', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
  { label: 'Uhrzeit',        wert: '—', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const BESTAETIGUNG_PUNKTE = [
  'Kunde bestätigt die Durchführung des Einsatzes.',
  'Kunde bestätigt die Vollständigkeit der Arbeiten.',
  'Kunde bestätigt den Erhalt der Leistung.',
];

function Icon({ path, className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export default function Kundenunterschrift() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Kundenunterschrift</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Lasse den Kunden den abgeschlossenen Einsatz direkt digital unterschreiben.
        </p>
      </div>

      {/* Bereich 1: Informationen */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <span className="text-sm font-semibold text-gray-900">Informationen</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
          {INFO_FELDER.map((f) => (
            <div key={f.label} className="bg-white px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                <Icon path={f.icon} className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{f.label}</p>
                <p className="text-sm font-medium text-gray-300 mt-0.5">{f.wert}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bereich 2: Unterschriftsfeld */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Unterschrift</span>
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            Maus · Touch · Tablet
          </span>
        </div>
        <div className="px-5 py-6">
          <div className="relative w-full h-52 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 select-none">
            <div className="absolute bottom-10 left-8 right-8 h-px bg-gray-200" />
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center">
              <Icon
                path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                className="w-6 h-6 text-gray-300"
              />
            </div>
            <p className="text-xs text-gray-300 italic relative">Hier unterschreiben</p>
          </div>
          <p className="text-xs text-gray-300 text-center mt-3">
            Unterschrift-Funktion folgt im nächsten Sprint
          </p>
        </div>
      </div>

      {/* Bereich 3: Bestätigung */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <span className="text-sm font-semibold text-gray-900">Bestätigung</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          {BESTAETIGUNG_PUNKTE.map((punkt, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 w-4 h-4 rounded border border-gray-200 bg-gray-50 shrink-0" />
              <p className="text-sm text-gray-400">{punkt}</p>
            </div>
          ))}
          <p className="text-xs text-gray-300 italic pt-1">
            Checkbox-Funktion folgt im nächsten Sprint.
          </p>
        </div>
      </div>

      {/* Bereich 4: Buttons */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button disabled className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed bg-gray-50 sm:w-auto w-full">
            <Icon path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" className="w-4 h-4" />
            Unterschrift löschen
          </button>
          <div className="flex-1" />
          <button disabled className="flex items-center justify-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-400 bg-blue-50 rounded-xl text-sm font-medium cursor-not-allowed sm:w-auto w-full">
            <Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" className="w-4 h-4" />
            Unterschrift speichern
          </button>
          <button disabled className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-400 rounded-xl text-sm font-semibold cursor-not-allowed sm:w-auto w-full">
            <Icon path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4" />
            Auftrag abschließen
          </button>
        </div>
        <p className="text-xs text-gray-300 italic mt-3 text-center">
          Buttons werden im nächsten Sprint aktiviert.
        </p>
      </div>

    </div>
  );
}
