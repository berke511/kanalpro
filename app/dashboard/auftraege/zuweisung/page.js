'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ─────────────────────────────────────────────────────────────
   Statische Beispieldaten — NUR für Fahrzeuge & Geräte (Sprint 1)
   Mitarbeiter werden aus der Datenbank geladen.
───────────────────────────────────────────────────────────── */

const FAHRZEUGE = [
  { id: '1', kennzeichen: 'KAN-001', typ: 'Spülfahrzeug',    status: 'verfuegbar' },
  { id: '2', kennzeichen: 'KAN-002', typ: 'Servicefahrzeug', status: 'im_einsatz' },
];

const GERAETE = [
  { id: '1', name: 'Kamera 1',          kategorie: 'Kamerasystem',     status: 'verfuegbar' },
  { id: '2', name: 'Hochdruckgerät 1',  kategorie: 'Hochdrucktechnik', status: 'verfuegbar' },
];

/* ─────────────────────────────────────────────────────────────
   Status-Konfiguration
───────────────────────────────────────────────────────────── */

const STATUS_CFG = {
  verfuegbar: { label: 'Verfügbar',  bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  im_einsatz: { label: 'Im Einsatz', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  urlaub:     { label: 'Urlaub',     bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-400'   },
  krank:      { label: 'Krank',      bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'alle',       label: 'Alle'       },
  { value: 'verfuegbar', label: 'Verfügbar'  },
  { value: 'im_einsatz', label: 'Im Einsatz' },
  { value: 'urlaub',     label: 'Urlaub'     },
  { value: 'krank',      label: 'Krank'      },
];

/* ─────────────────────────────────────────────────────────────
   Hilfskomponenten
───────────────────────────────────────────────────────────── */

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Avatar({ vorname = '', nachname = '', sel = false }) {
  const ini = `${vorname[0] ?? ''}${nachname[0] ?? ''}`.toUpperCase();
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition
      ${sel ? 'bg-blue-600 text-white ring-2 ring-blue-300' : 'bg-gray-100 text-gray-500'}`}>
      {ini || '?'}
    </div>
  );
}

function CheckCircle() {
  return (
    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
        strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
  );
}

function SectionCard({ title, beschreibung, badge, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {beschreibung && (
            <p className="text-xs text-gray-400 mt-0.5">{beschreibung}</p>
          )}
        </div>
        {badge != null && (
          <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100 shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hauptkomponente
───────────────────────────────────────────────────────────── */

export default function ZuweisungPage() {
  const router = useRouter();

  /* ── Mitarbeiter aus Datenbank ── */
  const [mitarbeiter,   setMitarbeiter]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [hatStatus,     setHatStatus]     = useState(false); // true wenn status-Spalte in DB vorhanden

  /* ── Filter & Suche ── */
  const [suche,         setSuche]         = useState('');
  const [statusFilter,  setStatusFilter]  = useState('alle');

  /* ── Auswahl ── */
  const [selMA,         setSelMA]         = useState(new Set());
  const [selFZ,         setSelFZ]         = useState(null);
  const [selGeraete,    setSelGeraete]    = useState(new Set());

  /* ── Validierung ── */
  const [fehler,        setFehler]        = useState('');
  const [erfolg,        setErfolg]        = useState(false);

  /* ── Mitarbeiter laden ── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // company_id des aktuell eingeloggten Nutzers ermitteln (Multi-Tenant)
        const { data: member } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!member) { setLoading(false); return; }

        // Nur Mitarbeiter der eigenen Firma laden
        const { data } = await supabase
          .from('mitarbeiter')
          .select('id, vorname, nachname, position, status')
          .eq('company_id', member.company_id)
          .order('nachname', { ascending: true });

        const rows = data ?? [];
        setMitarbeiter(rows);

        // Prüfen ob status-Spalte vorhanden ist (Wert ungleich undefined bei mind. einem Eintrag)
        const statusVorhanden = rows.some(m => 'status' in m && m.status !== undefined);
        setHatStatus(statusVorhanden);
      } catch {
        // Kein Absturz — leere Liste anzeigen
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  /* ── Gefilterte Mitarbeiterliste ── */
  const gefilterteMitarbeiter = useMemo(() => {
    let liste = mitarbeiter;

    // Suche: Vorname, Nachname, Position
    if (suche.trim()) {
      const q = suche.trim().toLowerCase();
      liste = liste.filter(m =>
        (m.vorname  ?? '').toLowerCase().includes(q) ||
        (m.nachname ?? '').toLowerCase().includes(q) ||
        (m.position ?? '').toLowerCase().includes(q)
      );
    }

    // Statusfilter (nur wenn status-Spalte vorhanden)
    if (hatStatus && statusFilter !== 'alle') {
      liste = liste.filter(m => m.status === statusFilter);
    }

    return liste;
  }, [mitarbeiter, suche, statusFilter, hatStatus]);

  /* ── Toggle-Funktionen ── */
  function toggleMA(id) {
    setSelMA(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleGeraet(id) {
    setSelGeraete(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function resetAuswahl() {
    setSelMA(new Set());
    setSelFZ(null);
    setSelGeraete(new Set());
    setFehler('');
    setErfolg(false);
  }

  function handleSpeichern() {
    setErfolg(false);
    if (selMA.size === 0 && selFZ === null) {
      setFehler('Bitte wähle mindestens einen Mitarbeiter und ein Fahrzeug aus.');
      return;
    }
    if (selMA.size === 0) {
      setFehler('Bitte wähle mindestens einen Mitarbeiter aus.');
      return;
    }
    if (selFZ === null) {
      setFehler('Bitte wähle ein Fahrzeug aus.');
      return;
    }
    setFehler('');
    setErfolg(true);
  }

  /* ── Ausgewählte Mitarbeiter (für Zusammenfassung) ── */
  const ausgewaehlteMA = mitarbeiter.filter(m => selMA.has(m.id));

  const hatAuswahl = selMA.size > 0 || selFZ !== null || selGeraete.size > 0;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mitarbeiter &amp; Fahrzeuge</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Weise dem Auftrag Mitarbeiter, Fahrzeuge und Geräte zu.
          </p>
        </div>
        {hatAuswahl && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {selMA.size} Mitarbeiter · {selFZ ? 1 : 0} Fahrzeug · {selGeraete.size} Gerät{selGeraete.size !== 1 ? 'e' : ''}
          </div>
        )}
      </div>

      {/* ── Bereich 1: Mitarbeiter (echte Daten) ── */}
      <SectionCard
        title="Mitarbeiter zuweisen"
        beschreibung="Mehrfachauswahl — wähle alle Einsatzkräfte für diesen Auftrag."
        badge={selMA.size > 0 ? `${selMA.size} ausgewählt` : undefined}
      >
        {/* Suche + Statusfilter */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          {/* Suchfeld */}
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor"
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={suche}
              onChange={e => setSuche(e.target.value)}
              placeholder="Name oder Position suchen…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Statusfilter — nur wenn status-Spalte vorhanden */}
          {hatStatus && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 shrink-0"
            >
              {STATUS_FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Ausgewählt-Zähler */}
        {selMA.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-xs font-semibold text-blue-700">
              Ausgewählt: {selMA.size} Mitarbeiter
            </span>
            {ausgewaehlteMA.map(m => (
              <span key={m.id}
                className="inline-flex items-center px-2 py-0.5 bg-white text-blue-700 text-xs rounded-lg border border-blue-200 font-medium">
                {m.vorname} {m.nachname}
              </span>
            ))}
          </div>
        )}

        {/* Ladezustand */}
        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 animate-spin">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="text-sm">Mitarbeiter werden geladen …</span>
          </div>
        )}

        {/* Empty State — keine Mitarbeiter im System */}
        {!loading && mitarbeiter.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">Noch keine Mitarbeiter angelegt.</p>
            <p className="text-xs text-gray-400 mt-1">
              Lege zuerst Mitarbeiter im Bereich{' '}
              <a href="/dashboard/mitarbeiter" className="text-blue-600 hover:underline font-medium">
                Mitarbeiter
              </a>{' '}
              an.
            </p>
          </div>
        )}

        {/* Keine Treffer bei aktiver Suche/Filter */}
        {!loading && mitarbeiter.length > 0 && gefilterteMitarbeiter.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-400">Keine Mitarbeiter gefunden.</p>
            <button
              onClick={() => { setSuche(''); setStatusFilter('alle'); }}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}

        {/* Mitarbeiterkarten — echte Daten aus DB */}
        {!loading && gefilterteMitarbeiter.length > 0 && (
          <div className="space-y-2">
            {gefilterteMitarbeiter.map(m => {
              const sel = selMA.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMA(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition
                    ${sel
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                >
                  <Avatar vorname={m.vorname} nachname={m.nachname} sel={sel} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate
                      ${sel ? 'text-blue-900' : 'text-gray-800'}`}>
                      {m.vorname} {m.nachname}
                    </p>
                    {m.position && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{m.position}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status nur anzeigen wenn Spalte vorhanden */}
                    {hatStatus && m.status && <StatusPill status={m.status} />}
                    {sel && <CheckCircle />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Bereich 2: Fahrzeug (Sprint 1 – statisch) ── */}
      <SectionCard
        title="Fahrzeug zuweisen"
        beschreibung="Einzelauswahl — wähle das Fahrzeug für diesen Einsatz."
        badge={selFZ ? '1 ausgewählt' : undefined}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FAHRZEUGE.map(f => {
            const sel = selFZ === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelFZ(sel ? null : f.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition
                  ${sel
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition
                  ${sel ? 'bg-blue-600' : 'bg-gray-100'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={1.5} stroke="currentColor"
                    className={`w-4 h-4 ${sel ? 'text-white' : 'text-gray-400'}`}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold font-mono truncate
                    ${sel ? 'text-blue-900' : 'text-gray-800'}`}>
                    {f.kennzeichen}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{f.typ}</p>
                  <div className="mt-1.5">
                    <StatusPill status={f.status} />
                  </div>
                </div>
                {sel && (
                  <div className="shrink-0 mt-0.5">
                    <CheckCircle />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Bereich 3: Geräte (Sprint 1 – statisch) ── */}
      <SectionCard
        title="Maschinen &amp; Geräte"
        beschreibung="Mehrfachauswahl — wähle alle benötigten Geräte für diesen Einsatz."
        badge={selGeraete.size > 0 ? `${selGeraete.size} ausgewählt` : undefined}
      >
        <div className="space-y-2">
          {GERAETE.map(g => {
            const sel = selGeraete.has(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGeraet(g.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition
                  ${sel
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition
                  ${sel ? 'bg-blue-600' : 'bg-gray-100'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={1.5} stroke="currentColor"
                    className={`w-3.5 h-3.5 ${sel ? 'text-white' : 'text-gray-400'}`}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate
                    ${sel ? 'text-blue-900' : 'text-gray-800'}`}>
                    {g.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{g.kategorie}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={g.status} />
                  {sel && <CheckCircle />}
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Zusammenfassung ── */}
      {hatAuswahl && (
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Ausgewählte Ressourcen</p>
          <div className="space-y-2.5">

            {selMA.size > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Mitarbeiter</span>
                <div className="flex flex-wrap gap-1.5">
                  {ausgewaehlteMA.map(m => (
                    <span key={m.id}
                      className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 font-medium">
                      {m.vorname} {m.nachname}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selFZ && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Fahrzeug</span>
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 font-mono font-medium">
                  {FAHRZEUGE.find(f => f.id === selFZ)?.kennzeichen}
                </span>
              </div>
            )}

            {selGeraete.size > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Geräte</span>
                <div className="flex flex-wrap gap-1.5">
                  {GERAETE.filter(g => selGeraete.has(g.id)).map(g => (
                    <span key={g.id}
                      className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 font-medium">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Aktionsbereich ── */}
      {hatAuswahl && (
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5">

          {/* Fehlermeldung */}
          {fehler && (
            <div className="flex items-start gap-2.5 px-4 py-3 mb-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mt-0.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {fehler}
            </div>
          )}

          {/* Erfolgsmeldung */}
          {erfolg && (
            <div className="flex items-start gap-2.5 px-4 py-3 mb-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mt-0.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Zuweisung gespeichert. Datenbankanbindung folgt in Sprint 2.
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={resetAuswahl}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition sm:w-auto w-full"
            >
              Auswahl zurücksetzen
            </button>
            <div className="flex-1" />
            <button
              onClick={handleSpeichern}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition sm:w-auto w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Zuweisung speichern
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
