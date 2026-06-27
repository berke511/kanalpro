'use client';

export default function Kundenunterschrift() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Kundenunterschrift</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Hole die digitale Unterschrift des Kunden zur Bestätigung des Auftrags ein.
        </p>
      </div>

      {/* Unterschriftenfeld-Platzhalter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center gap-6">

        {/* Icon */}
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        </div>

        {/* Signaturfeld */}
        <div className="w-full max-w-md">
          <p className="text-xs text-gray-400 mb-2 text-center">Unterschriftenfeld</p>
          <div className="w-full h-36 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
            <svg className="w-7 h-7 text-gray-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            <span className="text-xs text-gray-300 italic">Digitale Unterschrift folgt im nächsten Sprint</span>
          </div>
        </div>

        {/* Metainfo-Platzhalter */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3">
          {['Datum &amp; Uhrzeit', 'Unterzeichner'].map((label) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1">
              <span className="text-xs text-gray-400" dangerouslySetInnerHTML={{ __html: label }} />
              <span className="text-sm text-gray-200">—</span>
            </div>
          ))}
        </div>

      </div>

      {/* Hinweis */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-blue-700">
          Touch-Unterschrift, PDF-Einbettung und rechtssichere Speicherung
          werden im nächsten Sprint implementiert.
        </p>
      </div>

    </div>
  );
}
