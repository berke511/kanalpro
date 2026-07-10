'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

// ── Inline SVG (Heroicons Outline 24px) ─────────────────────────────────────
function Ico({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const D = {
  search:
    'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  x:
    'M6 18L18 6M6 6l12 12',
  users:
    'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  clipboard:
    'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
  tag:
    'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z',
  receipt:
    'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  worker:
    'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  home:
    'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  truck:
    'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
};

// ── Suchergebnis-Gruppen ──────────────────────────────────────────────
const GRUPPEN = [
  { key: 'kunden',      label: 'Kunden',      icon: 'users'     },
  { key: 'auftraege',   label: 'Aufträge',    icon: 'clipboard' },
  { key: 'angebote',    label: 'Angebote',    icon: 'tag'       },
  { key: 'rechnungen',  label: 'Rechnungen',  icon: 'receipt'   },
  { key: 'mitarbeiter', label: 'Mitarbeiter', icon: 'worker'    },
  { key: 'objekte',     label: 'Objekte',     icon: 'home'      },
  { key: 'fahrzeuge',   label: 'Fahrzeuge',   icon: 'truck'     },
];

// ── Parallele Supabase-Abfragen ──────────────────────────────────────────────
async function sucheAlles(q, userId) {
  const w = `%${q}%`;

  const [k, a, ang, r, m, o, f] = await Promise.all([
    // Kunden: name, firmenname, telefon, mobil, email
    supabase
      .from('kunden')
      .select('id, name, firmenname, kundentyp, telefon, email')
      .or(`name.ilike.${w},firmenname.ilike.${w},telefon.ilike.${w},mobil.ilike.${w},email.ilike.${w}`)
      .limit(5),

    // Aufträge: auftragsnummer, titel, adresse
    supabase
      .from('auftraege')
      .select('id, auftragsnummer, titel, status, einsatzort_strasse, einsatzort_ort')
      .or(`auftragsnummer.ilike.${w},titel.ilike.${w},einsatzort_strasse.ilike.${w},einsatzort_ort.ilike.${w}`)
      .limit(5),

    // Angebote: angebotsnummer
    supabase
      .from('angebote')
      .select('id, angebotsnummer, status, kunden(name)')
      .ilike('angebotsnummer', w)
      .limit(5),

    // Rechnungen: rechnungsnummer (user_id-basiert wie bestehende Seite)
    supabase
      .from('rechnungen')
      .select('id, rechnungsnummer, status, kunden(name)')
      .eq('user_id', userId ?? '')
      .ilike('rechnungsnummer', w)
      .limit(5),

    // Mitarbeiter: vorname, nachname
    supabase
      .from('mitarbeiter')
      .select('id, vorname, nachname, rolle')
      .or(`vorname.ilike.${w},nachname.ilike.${w}`)
      .limit(5),

    // Objekte: bezeichnung, adresse
    supabase
      .from('objekte')
      .select('id, bezeichnung, adresse, kunde_id')
      .or(`bezeichnung.ilike.${w},adresse.ilike.${w}`)
      .limit(5),

    // Fahrzeuge: kennzeichen, marke, modell
    supabase
      .from('fahrzeuge')
      .select('id, kennzeichen, marke, modell, zustand')
      .or(`kennzeichen.ilike.${w},marke.ilike.${w},modell.ilike.${w}`)
      .limit(5),
  ]);

  return {
    kunden:      k.data      ?? [],
    auftraege:   a.data      ?? [],
    angebote:    ang.data    ?? [],
    rechnungen:  r.data      ?? [],
    mitarbeiter: m.data      ?? [],
    objekte:     o.data      ?? [],
    fahrzeuge:   f.data      ?? [],
  };
}

// ── Helfer ───────────────────────────────────────────────────────────────────
function getLink(gruppe, item) {
  switch (gruppe) {
    case 'kunden':      return `/dashboard/kunden/${item.id}`;
    case 'auftraege':   return `/dashboard/auftraege/${item.id}`;
    case 'angebote':    return `/dashboard/angebote/${item.id}`;
    case 'rechnungen':  return `/dashboard/rechnungen/${item.id}`;
    case 'mitarbeiter': return `/dashboard/mitarbeiter/${item.id}`;
    case 'objekte':     return `/dashboard/kunden/${item.kunde_id}/objekte/${item.id}`;
    case 'fahrzeuge':   return `/dashboard/fahrzeuge/${item.id}`;
    default:            return '/dashboard';
  }
}

function getTitel(gruppe, item) {
  switch (gruppe) {
    case 'kunden':
      return (item.kundentyp === 'firma' && item.firmenname)
        ? item.firmenname
        : (item.name ?? '–');
    case 'auftraege':
      return item.titel || `Auftrag #${item.auftragsnummer ?? item.id?.slice(0, 8)}`;
    case 'angebote':    return item.angebotsnummer ?? 'Angebot';
    case 'rechnungen':  return item.rechnungsnummer ?? 'Rechnung';
    case 'mitarbeiter':
      return [item.vorname, item.nachname].filter(Boolean).join(' ') || '–';
    case 'objekte':     return item.bezeichnung ?? 'Objekt';
    case 'fahrzeuge':   return item.kennzeichen ?? 'Fahrzeug';
    default:            return '';
  }
}

function getUntertitel(gruppe, item) {
  switch (gruppe) {
    case 'kunden':      return item.email ?? item.telefon ?? '';
    case 'auftraege':
      return [item.einsatzort_strasse, item.einsatzort_ort].filter(Boolean).join(', ');
    case 'angebote':    return item.kunden?.name ?? '';
    case 'rechnungen':  return item.kunden?.name ?? '';
    case 'mitarbeiter': return item.rolle ?? '';
    case 'objekte':     return item.adresse ?? '';
    case 'fahrzeuge':
      return [item.marke, item.modell].filter(Boolean).join(' ');
    default:            return '';
  }
}

function getStatus(gruppe, item) {
  switch (gruppe) {
    case 'auftraege':  return item.status  ?? null;
    case 'angebote':   return item.status  ?? null;
    case 'rechnungen': return item.status  ?? null;
    case 'fahrzeuge':  return item.zustand ?? null;
    default:           return null;
  }
}

// ── Hauptkomponente ──────────────────────────────────────────────────────────
export default function GlobalSearch({ mobile = false }) {
  const router       = useRouter();
  const [query,      setQuery]      = useState('');
  const [ergebnisse, setErgebnisse] = useState(null);  // null = noch nicht gesucht
  const [laden,      setLaden]      = useState(false);
  const [offen,      setOffen]      = useState(false);
  const [fokusIdx,   setFokusIdx]   = useState(-1);
  const [userId,     setUserId]     = useState(null);

  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const timerRef     = useRef(null);

  // User-ID einmalig laden
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Click außerhalb → schließen
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOffen(false);
        setFokusIdx(-1);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced Suche
  useEffect(() => {
    clearTimeout(timerRef.current);
    const q = query.trim();

    if (q.length < 2) {
      setErgebnisse(null);
      setOffen(false);
      setLaden(false);
      return;
    }

    setLaden(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await sucheAlles(q, userId);
        setErgebnisse(res);
        setOffen(true);
        setFokusIdx(-1);
      } catch {
        setErgebnisse({});
        setOffen(true);
      } finally {
        setLaden(false);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query, userId]);

  // Flache Liste für Keyboard-Navigation
  const flach = ergebnisse
    ? GRUPPEN.flatMap(g => (ergebnisse[g.key] ?? []).map(item => ({ gruppe: g.key, item })))
    : [];

  const hatErgebnisse = flach.length > 0;

  function navigiere(gruppe, item) {
    router.push(getLink(gruppe, item));
    setQuery('');
    setOffen(false);
    setErgebnisse(null);
    setFokusIdx(-1);
  }

  function leeren() {
    setQuery('');
    setOffen(false);
    setErgebnisse(null);
    setFokusIdx(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(e) {
    if (!offen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFokusIdx(i => Math.min(i + 1, flach.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFokusIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && fokusIdx >= 0) {
      e.preventDefault();
      const { gruppe, item } = flach[fokusIdx];
      navigiere(gruppe, item);
    } else if (e.key === 'Escape') {
      setOffen(false);
      setQuery('');
      setErgebnisse(null);
      inputRef.current?.blur();
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${mobile ? 'w-full' : 'w-[420px] max-w-full'}`}
    >
      {/* ── Eingabefeld ─────────────────────────────────────────────── */}
      <div className="relative">
        <Ico
          d={D.search}
          cls="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (ergebnisse && hatErgebnisse) setOffen(true);
          }}
          placeholder="Suchen…"
          autoComplete="off"
          aria-label="Globale Suche"
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm
            text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white
            transition"
        />
        {query && (
          <button
            type="button"
            onClick={leeren}
            aria-label="Suche leeren"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded
              text-gray-400 hover:text-gray-600 transition"
          >
            <Ico d={D.x} cls="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Ergebnis-Dropdown ───────────────────────────────────────── */}
      {offen && (
        <div
          className={`absolute top-full mt-2 z-[200] bg-white border border-gray-200
            rounded-2xl shadow-xl overflow-hidden
            ${mobile ? 'left-0 right-0 w-full' : 'w-full min-w-[340px]'}`}
        >
          {/* Ladeanzeige */}
          {laden && (
            <div className="px-4 py-5 text-sm text-gray-400 text-center">
              Suche läuft…
            </div>
          )}

          {/* Keine Ergebnisse */}
          {!laden && !hatErgebnisse && (
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Ico d={D.search} cls="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Keine Ergebnisse gefunden</p>
              <p className="text-xs text-gray-400 mt-1">Versuche einen anderen Suchbegriff</p>
            </div>
          )}

          {#* Ergebnisse */}
          {!laden && hatErgebnisse && (
            <div className="max-h-[420px] overflow-y-auto">
              {GRUPPEN.map(g => {
                const items = ergebnisse?.[g.key] ?? [];
                if (!items.length) return null;

                return (
                  <div key={g.key} className="border-b border-gray-50 last:border-0">
                    {/* Gruppenüberschrift */}
                    <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                      {g.label}
                    </div>

                    {/* Ergebniszeilen */}
                    {items.map(item => {
                      const idx      = flach.findIndex(f => f.gruppe === g.key && f.item.id === item.id);
                      const isAktiv  = idx === fokusIdx;
                      const st       = getStatus(g.key, item);
                      const sub      = getUntertitel(g.key, item);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigiere(g.key, item)}
                          onMouseEnter={() => setFokusIdx(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition
                            ${isAktiv ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition
                            ${isAktiv
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-500'}`}>
                            <Ico d={D[g.icon]} cls="w-4 h-4" />
                          </div>

                          {/* Titel + Untertitel */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate
                              ${isAktiv ? 'text-blue-700' : 'text-gray-900'}`}>
                              {getTitel(g.key, item)}
                            </p>
                            {sub && (
                              <p className="text-xs text-gray-500 truncate">{sub}</p>
                            )}
                          </div>

                          {/* Status-Badge */}
                          {st && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                              bg-gray-100 text-gray-500 whitespace-nowrap shrink-0">
                              {st}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Keyboard-Hint */}
              <div className="px-4 py-2 text-[10px] text-gray-400 text-center border-t border-gray-50">
                ↑↓ navigieren · Enter öffnen · Esc schließen
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
