'use client';
import { useState } from 'react';

function PlusIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export default function AuftragErstellen() {
  const [modalOffen, setModalOffen] = useState(false);

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Auftrag erstellen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Erstelle einen neuen Auftrag für einen Kunden.
          </p>
        </div>
        <button
          onClick={() => setModalOffen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Neuer Auftrag
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-300">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500">Weitere Funktionen folgen im nächsten Sprint.</p>
      </div>

      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <PlusIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Neuer Auftrag</h2>
                <p className="text-xs text-gray-400 mt-0.5">Funktion folgt im nächsten Sprint.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Die Auftragserfassung wird in Kürze vollständig implementiert.
            </p>
            <button
              onClick={() => setModalOffen(false)}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
