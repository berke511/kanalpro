'use client';
import { useState } from 'react';

const BEISPIEL_MITARBEITER = [
  { id: 1, kuerzel: 'MK', name: 'Max Kellner',   position: 'Techniker',   verfuegbar: true  },
  { id: 2, kuerzel: 'SK', name: 'Sara Klein',    position: 'Monteurin',   verfuegbar: true  },
  { id: 3, kuerzel: 'TH', name: 'Tim Haupt',     position: 'Fahrer',      verfuegbar: false },
];

function UserPlusIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  );
}

function UsersIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export default function Mitarbeiterplanung() {
  const [modalOffen, setModalOffen] = useState(false);
  const [zeigePlatzhalter, setZeigePlatzhalter] = useState(false);

  const zuweisungen = [];

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mitarbeiterplanung</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Weise Mitarbeiter den geplanten Einsätzen zu und behalte Verfügbarkeiten im Blick.
          </p>
        </div>
        <button
          onClick={() => setModalOffen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Mitarbeiter zuweisen
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Verfügbar heute', wert: '—', farbe: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'Im Einsatz',      wert: '—', farbe: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-100'  },
          { label: 'Nicht verfügbar', wert: '—', farbe: 'text-gray-400',  bg: 'bg-gray-50',  border: 'border-gray-100'  },
        ].map((karte) => (
          <div key={karte.label}
            className={`rounded-2xl border ${karte.border} ${karte.bg} px-5 py-4 flex items-center justify-between`}>
            <span className="text-sm text-gray-500">{karte.label}</span>
            <span className={`text-2xl font-bold ${karte.farbe}`}>{karte.wert}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Mitarbeiter-Übersicht</span>
          <button
            onClick={() => setZeigePlatzhalter(v => !v)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            {zeigePlatzhalter ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
          </button>
        </div>

        {zuweisungen.length === 0 && !zeigePlatzhalter ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              Noch keine Mitarbeiter für Einsätze eingeplant.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf „Mitarbeiter zuweisen", um die Planung zu starten.
            </p>
            <button
              onClick={() => setModalOffen(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Mitarbeiter zuweisen
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {BEISPIEL_MITARBEITER.map((ma) => (
              <div key={ma.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                  {ma.kuerzel}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{ma.name}</p>
                  <p className="text-xs text-gray-400">{ma.position}</p>
                </div>
                <div className="hidden sm:flex flex-1 items-center gap-2 max-w-xs">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-200 rounded-full w-0" />
                  </div>
                  <span className="text-xs text-gray-300 w-8 text-right">0 %</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                  ma.verfuegbar
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  {ma.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'}
                </span>
                <button
                  onClick={() => setModalOffen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition shrink-0"
                >
                  <UserPlusIcon className="w-3.5 h-3.5" />
                  Zuweisen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-blue-700">
          Die vollständige Mitarbeiterplanung mit Echtzeit-Verfügbarkeit, Schichtplanung und
          Auslastungsansicht wird in einer kommenden Version verfügbar sein.
        </p>
      </div>

      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <UserPlusIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Mitarbeiter zuweisen</h2>
                <p className="text-xs text-gray-400 mt-0.5">Funktion wird bald verfügbar sein.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Die Zuweisung von Mitarbeitern zu Einsätzen wird in einer kommenden Version
              vollständig implementiert.
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
