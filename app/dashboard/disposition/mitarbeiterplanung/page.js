'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

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

function ChevronIcon({ direction, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d={direction === 'left' ? 'M15.75 19.5L8.25 12l7.5-7.5' : 'M8.25 4.5l7.5 7.5-7.5 7.5'} />
    </svg>
  );
}

const STATUS_CONFIG = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-100 text-yellow-700' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700'    },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-100 text-green-700'  },
};

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function Mitarbeiterplanung() {
  const [modalOffen,    setModalOffen]    = useState(false);
  const [mitarbeiter,   setMitarbeiter]   = useState([]);
  const [auftraege,     setAuftraege]     = useState([]);
  const [companyId,     setCompanyId]     = useState(null);
  const [laden,         setLaden]         = useState(true);
  const [gewaehlterTag, setGewaehlterTag] = useState(new Date().toISOString().split('T')[0]);

  // Company laden
  useEffect(() => {
    async function loadCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      setCompanyId(data?.company_id ?? null);
    }
    loadCompany();
  }, []);

  // Mitarbeiter laden
  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      const { data } = await supabase
        .from('mitarbeiter')
        .select('id, vorname, nachname, position')
        .eq('company_id', companyId)
        .order('nachname');
      setMitarbeiter(data ?? []);
    };
    load();
  }, [companyId]);

  // Aufträge für gewählten Tag laden
  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLaden(true);
      const { data } = await supabase
        .from('auftraege')
        .select('id, titel, status, uhrzeit, dauer_minuten, prioritaet, techniker_id')
        .eq('company_id', companyId)
        .eq('datum', gewaehlterTag);
      setAuftraege(data ?? []);
      setLaden(false);
    };
    load();
  }, [companyId, gewaehlterTag]);

  const datumText = new Date(gewaehlterTag + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const mitImEinsatz  = mitarbeiter.filter(m => auftraege.some(a => a.techniker_id === m.id)).length;
  const mitVerfuegbar = mitarbeiter.length - mitImEinsatz;

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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Verfügbar heute', wert: laden ? '—' : String(mitVerfuegbar),      farbe: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'Im Einsatz',      wert: laden ? '—' : String(mitImEinsatz),       farbe: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-100'  },
          { label: 'Gesamt',          wert: laden ? '—' : String(mitarbeiter.length), farbe: 'text-gray-600',  bg: 'bg-gray-50',  border: 'border-gray-100'  },
        ].map((karte) => (
          <div key={karte.label}
            className={`rounded-2xl border ${karte.border} ${karte.bg} px-5 py-4 flex items-center justify-between`}>
            <span className="text-sm text-gray-500">{karte.label}</span>
            <span className={`text-2xl font-bold ${karte.farbe}`}>{karte.wert}</span>
          </div>
        ))}
      </div>

      {/* Datum-Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setGewaehlterTag(prev => addDays(prev, -1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-600"
        >
          <ChevronIcon direction="left" className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          {datumText}
        </span>
        <button
          onClick={() => setGewaehlterTag(prev => addDays(prev, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-600"
        >
          <ChevronIcon direction="right" className="w-4 h-4" />
        </button>
        {gewaehlterTag !== new Date().toISOString().split('T')[0] && (
          <button
            onClick={() => setGewaehlterTag(new Date().toISOString().split('T')[0])}
            className="ml-2 text-xs text-blue-600 hover:underline font-medium"
          >
            Heute
          </button>
        )}
      </div>

      {/* Mitarbeiter-Liste */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Mitarbeiter-Übersicht</span>
          <span className="text-xs text-gray-400">
            {laden ? 'Lädt…' : `${mitarbeiter.length} Mitarbeiter`}
          </span>
        </div>

        {laden ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-400">Wird geladen…</p>
          </div>
        ) : mitarbeiter.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              Noch keine Mitarbeiter angelegt.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Lege zuerst Mitarbeiter in der Mitarbeiterverwaltung an.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {mitarbeiter.map((ma) => {
              const maAuftraege = auftraege.filter(a => a.techniker_id === ma.id);
              const auslastung  = maAuftraege.reduce((sum, a) => sum + (a.dauer_minuten ?? 0), 0);
              const kuerzel     = `${ma.vorname?.[0] ?? ''}${ma.nachname?.[0] ?? ''}`.toUpperCase();

              return (
                <div key={ma.id} className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {kuerzel}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{ma.vorname} {ma.nachname}</p>
                      <p className="text-xs text-gray-400">{ma.position ?? '—'}</p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-0.5">
                      <span className="text-xs text-gray-500 font-medium">
                        {maAuftraege.length} Einsatz{maAuftraege.length !== 1 ? 'ätze' : ''}
                      </span>
                      {auslastung > 0 && (
                        <span className="text-xs text-gray-400">{auslastung} Min.</span>
                      )}
                    </div>
                    <button
                      onClick={() => setModalOffen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition shrink-0"
                    >
                      <UserPlusIcon className="w-3.5 h-3.5" />
                      Zuweisen
                    </button>
                  </div>

                  {/* Auftragsliste */}
                  {maAuftraege.length > 0 ? (
                    <div className="mt-3 space-y-1 pl-[52px]">
                      {maAuftraege.map(a => {
                        const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.offen;
                        return (
                          <div key={a.id} className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${cfg.cls}`}>{cfg.label}</span>
                            {a.uhrzeit && <span className="text-xs text-gray-400">{a.uhrzeit.slice(0, 5)}</span>}
                            <span className="text-xs text-gray-600 truncate">{a.titel}</span>
                            {a.dauer_minuten && <span className="text-xs text-gray-400 shrink-0">{a.dauer_minuten} Min.</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-2 pl-[52px]">Kein Einsatz heute</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
