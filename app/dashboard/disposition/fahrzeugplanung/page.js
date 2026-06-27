'use client';
import { useState } from 'react';

const BEISPIEL_FAHRZEUGE = [
  { id: 1, kuerzel: 'B-KP 1', name: 'Mercedes Sprinter',  typ: 'Transporter',      verfuegbar: true  },
  { id: 2, kuerzel: 'B-KP 2', name: 'VW Crafter',         typ: 'Transporter',      verfuegbar: false },
  { id: 3, kuerzel: 'B-KP 3', name: 'Ford Transit',       typ: 'Kleintransporter', verfuegbar: true  },
];

function TruckIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
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

function CheckIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export default function Fahrzeugplanung() {
  const [modalOffen, setModalOffen] = useState(false);
  const [zeigePlatzhalter, setZeigePlatzhalter] = useState(false);

  const zuweisungen = [];

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fahrzeugplanung</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plane Fahrzeuge für Einsätze und vermeide Doppelbelegungen.
          </p>
        </div>
        <button
          onClick={() => setModalOffen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Fahrzeug zuweisen
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Verfügbar heute', wert: '—', farbe: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-100' },
          { label: 'Im Einsatz',      wert: '—', farbe: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-100'  },
          { label: 'In Wartung',      wert: '—', farbe: 'text-amber-500', bg: 'bg-amber-50',  border: 'border-amber-100' },
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
          <span className="text-sm font-semibold text-gray-900">Fahrzeug-Übersicht</span>
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
              <TruckIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              Noch keine Fahrzeuge für Einsätze eingeplant.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf „Fahrzeug zuweisen", um die Planung zu starten.
            </p>
            <button
              onClick={() => setModalOffen(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Fahrzeug zuweisen
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {BEISPIEL_FAHRZEUGE.map((fz) => (
              <div key={fz.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <TruckIcon className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{fz.name}</p>
                  <p className="text-xs text-gray-400">{fz.typ} · {fz.kuerzel}</p>
                </div>
                <div className="hidden sm:flex flex-1 items-center gap-2 max-w-xs">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-200 rounded-full w-0" />
                  </div>
                  <span className="text-xs text-gray-300 w-8 text-right">0 %</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                  fz.verfuegbar
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  {fz.verfuegbar ? 'Verfügbar' : 'Im Einsatz'}
                </span>
                <button
                  onClick={() => setModalOffen(true)}
                  disabled={!fz.verfuegbar}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition shrink-0 ${
                    fz.verfuegbar
                      ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'border border-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  Zuweisen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <span className="text-sm font-semibold text-gray-900">Belegungsplan — Vorschau</span>
        </div>
        <div className="px-6 py-4 space-y-3">
          {BEISPIEL_FAHRZEUGE.map((fz) => (
            <div key={fz.id} className="flex items-center gap-4">
              <span className="text-xs text-gray-400 w-28 shrink-0 truncate">{fz.name}</span>
              <div className="flex-1 h-7 bg-gray-50 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="px-6 pb-3">
          <p className="text-xs text-gray-300 text-center">
            Gantt-Ansicht folgt in einer kommenden Version
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-blue-700">
          Die vollständige Fahrzeugplanung mit Belegungskalender, Doppelbelegungs-Warnung
          und Wartungsintegration wird in einer kommenden Version verfügbar sein.
        </p>
      </div>

      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <TruckIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Fahrzeug zuweisen</h2>
                <p className="text-xs text-gray-400 mt-0.5">Funktion wird bald verfügbar sein.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Die Zuweisung von Fahrzeugen zu Einsätzen wird in einer kommenden Version
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
