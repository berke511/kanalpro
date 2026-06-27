'use client';
import { useState } from 'react';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getWochenstart(datum) {
  const d = new Date(datum);
  const tag = d.getDay();
  const diff = tag === 0 ? -6 : 1 - tag;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ShieldIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function PhoneIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
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

function BellIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

const BEISPIEL_BEREITSCHAFT = [
  { id: 1, kuerzel: 'MK', name: 'Max Kellner', telefon: '+49 170 1234567', schicht: 'Nacht', von: '20:00', bis: '06:00' },
  { id: 2, kuerzel: 'SK', name: 'Sara Klein',  telefon: '+49 171 7654321', schicht: 'Tag',   von: '06:00', bis: '18:00' },
];

export default function Notdienstplanung() {
  const [modalOffen, setModalOffen] = useState(false);
  const [zeigePlatzhalter, setZeigePlatzhalter] = useState(false);

  const heute = new Date();
  const wochenstart = getWochenstart(heute);
  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(wochenstart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const notdienste = [];

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notdienstplanung</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plane Bereitschaften und Notdienste für dein Team.
          </p>
        </div>
        <button
          onClick={() => setModalOffen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 active:bg-red-800 transition shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Notdienst eintragen
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Aktuell im Notdienst', wert: '—', farbe: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-100',   icon: <PhoneIcon  className="w-4 h-4 text-red-400"   /> },
          { label: 'Diese Woche geplant',  wert: '—', farbe: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: <BellIcon   className="w-4 h-4 text-amber-400" /> },
          { label: 'Offene Schichten',     wert: '—', farbe: 'text-gray-400',  bg: 'bg-gray-50',  border: 'border-gray-100',  icon: <ShieldIcon className="w-4 h-4 text-gray-300"  /> },
        ].map((karte) => (
          <div key={karte.label}
            className={`rounded-2xl border ${karte.border} ${karte.bg} px-5 py-4 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              {karte.icon}
              <span className="text-sm text-gray-500">{karte.label}</span>
            </div>
            <span className={`text-2xl font-bold ${karte.farbe}`}>{karte.wert}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Bereitschaftsplan — aktuelle Woche</span>
          <button
            onClick={() => setZeigePlatzhalter(v => !v)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            {zeigePlatzhalter ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-50 bg-gray-50">
          {tage.map((tag, i) => {
            const istHeute = tag.toDateString() === heute.toDateString();
            const istWE = i >= 5;
            return (
              <div key={i} className="py-2 text-center">
                <p className={`text-xs font-semibold uppercase tracking-wide ${istWE ? 'text-gray-400' : 'text-gray-500'}`}>
                  {WOCHENTAGE[i]}
                </p>
                <div className={`mx-auto mt-1 w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${istHeute ? 'bg-red-600 text-white' : istWE ? 'text-gray-400' : 'text-gray-700'}`}>
                  {tag.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {notdienste.length === 0 && !zeigePlatzhalter ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldIcon className="w-7 h-7 text-red-200" />
            </div>
            <p className="text-sm font-medium text-gray-500">Keine Notdienste geplant.</p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf „Notdienst eintragen", um Bereitschaften zu erfassen.
            </p>
            <button
              onClick={() => setModalOffen(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Notdienst eintragen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-7 min-h-28 divide-x divide-gray-50">
            {tage.map((_, i) => (
              <div key={i} className={`p-1.5 ${i >= 5 ? 'bg-gray-50/40' : 'bg-white'}`} />
            ))}
          </div>
        )}
      </div>

      {zeigePlatzhalter && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <span className="text-sm font-semibold text-gray-900">Bereitschaftsdienste — Vorschau</span>
          </div>
          <div className="divide-y divide-gray-50">
            {BEISPIEL_BEREITSCHAFT.map((nd) => (
              <div key={nd.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm shrink-0">
                  {nd.kuerzel}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{nd.name}</p>
                  <p className="text-xs text-gray-400">{nd.telefon}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                  nd.schicht === 'Nacht'
                    ? 'bg-gray-800 text-gray-100 border border-gray-700'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {nd.schicht}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {nd.von} – {nd.bis} Uhr
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-red-700">
          Die vollständige Notdienstplanung mit Schichtrotation, automatischen Erinnerungen
          und Rufbereitschafts-Verwaltung wird in einer kommenden Version verfügbar sein.
        </p>
      </div>

      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <ShieldIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Notdienst eintragen</h2>
                <p className="text-xs text-gray-400 mt-0.5">Funktion wird bald verfügbar sein.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Die Erfassung von Notdiensten und Bereitschaften wird in einer kommenden Version
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
