'use client';
import { useState } from 'react';

const STATUS_CONFIG = {
  aktiv:         { label: 'Aktiv',   cls: 'bg-green-50 text-green-700 border-green-100'  },
  geplant:       { label: 'Geplant', cls: 'bg-blue-50 text-blue-700 border-blue-100'     },
  pausiert:      { label: 'Pausiert',cls: 'bg-amber-50 text-amber-700 border-amber-100'  },
  abgeschlossen: { label: 'Fertig',  cls: 'bg-gray-100 text-gray-500 border-gray-200'    },
};

const BEISPIEL_ROUTEN = [
  { id: 1, fahrer: 'Max Kellner', fahrzeug: 'B-KP 1', ziel: 'Musterstraße 12, Berlin', status: 'aktiv',    entfernung: '14 km', dauer: '22 min' },
  { id: 2, fahrer: 'Sara Klein',  fahrzeug: 'B-KP 3', ziel: 'Hauptallee 5, Berlin',    status: 'geplant',  entfernung: '8 km',  dauer: '15 min' },
  { id: 3, fahrer: 'Tim Haupt',   fahrzeug: 'B-KP 2', ziel: 'Parkweg 3, Potsdam',      status: 'pausiert', entfernung: '31 km', dauer: '40 min' },
];

function MapIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function LocationIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function TruckIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function SignalIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
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

export default function RoutenplanungLiveStatus() {
  const [modalOffen, setModalOffen] = useState(false);
  const [zeigePlatzhalter, setZeigePlatzhalter] = useState(false);

  const routen = [];

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Routenplanung & Live-Status</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Behalte Einsätze, Fahrten und Live-Status deiner Teams im Blick.
          </p>
        </div>
        <button
          onClick={() => setModalOffen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Route planen
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Aktive Routen',    wert: '—', farbe: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', dot: 'bg-green-500' },
          { label: 'Geplante Routen',  wert: '—', farbe: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-100',  dot: 'bg-blue-500'  },
          { label: 'Fahrzeuge aktiv',  wert: '—', farbe: 'text-gray-700',  bg: 'bg-white',    border: 'border-gray-100',  dot: null           },
          { label: 'Ø Fahrzeit heute', wert: '—', farbe: 'text-gray-400',  bg: 'bg-gray-50',  border: 'border-gray-100',  dot: null           },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} px-4 py-3 flex flex-col gap-1`}>
            <div className="flex items-center gap-1.5">
              {k.dot && <span className={`w-1.5 h-1.5 rounded-full ${k.dot} animate-pulse`} />}
              <span className="text-xs text-gray-400">{k.label}</span>
            </div>
            <span className={`text-2xl font-bold ${k.farbe}`}>{k.wert}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">Live-Kartenansicht</span>
          </div>
          <span className="text-xs text-gray-400">GPS-Integration folgt in Kürze</span>
        </div>
        <div className="relative bg-gray-50 h-52 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center">
              <MapIcon className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-400">Kartenansicht nicht verfügbar</p>
            <p className="text-xs text-gray-300">Live-GPS-Tracking wird in einer kommenden Version integriert.</p>
          </div>
          <div className="absolute top-8 left-16 w-3 h-3 bg-blue-400 rounded-full opacity-50 shadow" />
          <div className="absolute top-20 right-24 w-3 h-3 bg-green-400 rounded-full opacity-50 shadow" />
          <div className="absolute bottom-10 left-32 w-3 h-3 bg-amber-400 rounded-full opacity-50 shadow" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Aktuelle Routen</span>
          <button
            onClick={() => setZeigePlatzhalter(v => !v)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            {zeigePlatzhalter ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
          </button>
        </div>

        {routen.length === 0 && !zeigePlatzhalter ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <LocationIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              Noch keine aktiven Routen vorhanden.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf „Route planen", um die erste Route zu erstellen.
            </p>
            <button
              onClick={() => setModalOffen(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Route planen
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {BEISPIEL_ROUTEN.map((route) => {
              const cfg = STATUS_CONFIG[route.status] ?? STATUS_CONFIG.geplant;
              return (
                <div key={route.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <TruckIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{route.fahrer}</p>
                      <span className="text-xs text-gray-300">·</span>
                      <p className="text-xs text-gray-400">{route.fahrzeug}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{route.ziel}</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-xs font-medium text-gray-600">{route.entfernung}</span>
                    <span className="text-xs text-gray-400">{route.dauer}</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(route.ziel)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition shrink-0"
                  >
                    <LocationIcon className="w-3.5 h-3.5" />
                    Navi
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <SignalIcon className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          Die vollständige Routenplanung mit Live-GPS-Tracking, automatischer Routenoptimierung
          und Echtzeit-Status wird in einer kommenden Version verfügbar sein.
        </p>
      </div>

      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <MapIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Route planen</h2>
                <p className="text-xs text-gray-400 mt-0.5">Funktion wird bald verfügbar sein.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Die Routenplanung mit GPS-Integration wird in einer kommenden Version
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
