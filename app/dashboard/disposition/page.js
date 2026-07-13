'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TabNav from '@/components/ui/TabNav';
import supabase from '@/lib/supabase';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

const DISPOSITION_TABS = [
  { id: 'tagesplanung',  label: 'Tagesplanung'       },
  { id: 'wochenplanung', label: 'Wochenplanung'      },
  { id: 'mitarbeiter',   label: 'Mitarbeiterplanung' },
  { id: 'fahrzeuge',     label: 'Fahrzeugplanung'    },
  { id: 'notdienst',     label: 'Notdienstplanung'   },
  { id: 'routen',        label: 'Routenplanung'      },
];

const MODULE = {
  tagesplanung: {
    titel: 'Tagesplanung',
    beschreibung: 'Plane alle heutigen Einsätze übersichtlich nach Uhrzeit. Behalte den Überblick über laufende und anstehende Einsätze des Tages.',
    button: 'Tagesplanung öffnen', route: '/dashboard/disposition/tagesplanung',
    iconColor: 'bg-blue-50', textColor: 'text-blue-600', btnColor: 'bg-blue-600 hover:bg-blue-700',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  },
  wochenplanung: {
    titel: 'Wochenplanung',
    beschreibung: 'Plane Einsätze für die gesamte Woche. Behalte freie Slots und Kapazitäten aller Mitarbeiter auf einen Blick.',
    button: 'Wochenplanung öffnen', route: '/dashboard/disposition/wochenplanung',
    iconColor: 'bg-indigo-50', textColor: 'text-indigo-600', btnColor: 'bg-indigo-600 hover:bg-indigo-700',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  },
  mitarbeiter: {
    titel: 'Mitarbeiterplanung',
    beschreibung: 'Teile Mitarbeiter gezielt für Einsätze ein. Sieh Verfügbarkeit, Qualifikationen und aktuelle Auslastung auf einen Blick.',
    button: 'Mitarbeiterplanung öffnen', route: '/dashboard/disposition/mitarbeiterplanung',
    iconColor: 'bg-purple-50', textColor: 'text-purple-600', btnColor: 'bg-purple-600 hover:bg-purple-700',
    icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  },
  fahrzeuge: {
    titel: 'Fahrzeugplanung',
    beschreibung: 'Plane den Einsatz von Fahrzeugen und Transportmitteln. Verfolge Verfügbarkeit und Auslastung aller Fahrzeuge.',
    button: 'Fahrzeugplanung öffnen', route: '/dashboard/disposition/fahrzeugplanung',
    iconColor: 'bg-amber-50', textColor: 'text-amber-600', btnColor: 'bg-amber-600 hover:bg-amber-700',
    icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  },
  notdienst: {
    titel: 'Notdienstplanung',
    beschreibung: 'Plane und verwalte den Notdienst. Lege fest, welche Mitarbeiter in welcher Woche Bereitschaft haben.',
    button: 'Notdienst öffnen', route: '/dashboard/disposition/notdienstplanung',
    iconColor: 'bg-red-50', textColor: 'text-red-600', btnColor: 'bg-red-600 hover:bg-red-700',
    icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  },
  routen: {
    titel: 'Routenplanung',
    beschreibung: 'Plane und optimiere die Fahrtrouten deiner Mitarbeiter. Verfolge aktive Fahrten und Entfernungen in Echtzeit.',
    button: 'Routenplanung öffnen', route: '/dashboard/disposition/routenplanung',
    iconColor: 'bg-green-50', textColor: 'text-green-600', btnColor: 'bg-green-600 hover:bg-green-700',
    icon: 'M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z',
  },
};

function ModulKarte({ tabId, router }) {
  const m = MODULE[tabId];
  if (!m) return null;
  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${m.iconColor}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor" className={`w-7 h-7 ${m.textColor}`} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-2">{m.titel}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{m.beschreibung}</p>
        </div>
        <button
          onClick={() => router.push(m.route)}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition ${m.btnColor}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={2} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          {m.button}
        </button>
      </div>
    </div>
  );
}

export default function Disposition() {
  const router = useRouter();
  const [aktiveTab, setAktiveTab] = useState('tagesplanung');
  const [userId,    setUserId]    = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // OS-003: Live Sync Engine — hub ready; sub-pages handle their own fetchData
  useRealtimeSync(userId, () => {});

  return (
    <div className="space-y-5 max-w-6xl pb-10">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Disposition</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Plane Einsätze, Mitarbeiter, Fahrzeuge und Routen.
        </p>
      </div>
      <TabNav
        id="disposition-tabs"
        tabs={DISPOSITION_TABS}
        activeTab={aktiveTab}
        onChange={setAktiveTab}
        label="Dispositionsnavigation"
        className="mb-5"
      />
      <ModulKarte tabId={aktiveTab} router={router} />
    </div>
  );
}
