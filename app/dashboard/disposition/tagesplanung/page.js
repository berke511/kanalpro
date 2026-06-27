'use client';
import { useState } from 'react';

const STUNDEN = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function CalendarIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
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

export default function Tagesplanung() {
  const [modalOffen, setModalOffen] = useState(false);

  const heute = new Date();
  const datumText = heute.toLocaleDateString('de-DE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Platzhalter – noch keine Einsätze aus der Datenbank
  const einsaetze = [];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tagesplanung</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plane und verwalte alle Einsätze für den heutigen Tag.
          </p>
        </div>
        <button
          onClick={() => setModalOffen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Einsatz planen
        </button>
      </div>

      {/* ── Datum-Badge ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Heute</span>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          {datumText}
        </span>
      </div>

      {/* ── Tageskalender-Bereich ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        {/* Kalender-Header */}
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Tagesansicht</span>
          <span className="text-xs text-gray-400">Kalenderansicht folgt in Kürze</span>
        </div>

        {einsaetze.length === 0 ? (
          /* ── Leerer Zustand ── */
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Keine Einsätze für heute geplant.</p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf „Einsatz planen“, um den ersten Einsatz hinzuzufügen.
            </p>
            <button
              onClick={() => setModalOffen(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Einsatz planen
            </button>
          </div>
        ) : (
          /* ── Einsatz-Liste (wird später mit echten Daten befüllt) ── */
          <div className="divide-y divide-gray-50">
            {einsaetze.map((e) => (
              <div key={e.id} className="px-6 py-4 flex items-center gap-4">
                <span className="text-xs text-gray-400 w-12 shrink-0">{e.uhrzeit}</span>
                <span className="flex-1 text-sm font-medium text-gray-900">{e.titel}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Zeitslot-Skeleton – Platzhalter für Kalenderansicht ── */}
        <div className="border-t border-gray-50 px-6 py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Zeitraster – Vorschau
          </p>
          <div className="space-y-px">
            {STUNDEN.map((h) => (
              <div key={h} className="flex items-center gap-4 group">
                <span className="text-xs text-gray-300 w-10 shrink-0 text-right py-2">
                  {String(h).padStart(2, '0')}:00
                </span>
                <div className="flex-1 h-10 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hinweis-Banner ── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-blue-700">
          Die vollständige Tagesplanung mit Drag & Drop, Mitarbeiter- und Fahrzeugzuweisung wird
          in einer kommenden Version verfügbar sein.
        </p>
      </div>

      {/* ── Platzhalter-Modal ── */}
      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Einsatz planen</h2>
                <p className="text-xs text-gray-400 mt-0.5">Funktion wird bald verfügbar sein.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Die Einsatzplanung wird in einer kommenden Version vollständig implementiert.
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
