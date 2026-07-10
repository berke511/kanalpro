'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ─────────────────────────────────────────────────────────────
   SVG-Icon-Helfer (Heroicons Outline 24px)
───────────────────────────────────────────────────────────── */
function Svg({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICO = {
  shield:
    'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  phone:
    'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
  pencil:
    'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  check:
    'M4.5 12.75l6 6 9-13.5',
  x:
    'M6 18L18 6M6 6l12 12',
  calendar:
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z',
  info:
    'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
  user:
    'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
};

/* ─────────────────────────────────────────────────────────────
   Hilfsfunktionen
───────────────────────────────────────────────────────────── */
const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// Generiert ein Datum-Array: heute -7 Tage bis heute +20 Tage (28 Tage)
function generiereTagesliste(heuteDatum) {
  const liste = [];
  const basis = new Date(heuteDatum + 'T00:00:00');
  for (let i = -7; i <= 20; i++) {
    const d = new Date(basis);
    d.setDate(d.getDate() + i);
    liste.push(d.toISOString().split('T')[0]);
  }
  return liste;
}

// ISO-KW-Berechnung
function getKW(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const donnerstag = new Date(d);
  donnerstag.setDate(d.getDate() + (4 - (d.getDay() || 7)));
  const jahresBeginn = new Date(donnerstag.getFullYear(), 0, 1);
  return Math.ceil(((donnerstag - jahresBeginn) / 86400000 + 1) / 7);
}

/* ─────────────────────────────────────────────────────────────
   Hauptkomponente
───────────────────────────────────────────────────────────── */
export default function Notdienstplanung() {
  const router = useRouter();

  const [companyId,        setCompanyId]        = useState(null);
  const [mitarbeiter,      setMitarbeiter]      = useState([]);
  const [notdienste,       setNotdienste]       = useState({});   // { 'YYYY-MM-DD': { id, mitarbeiter_id, notiz } }
  const [laden,            setLaden]            = useState(true);
  const [editTag,          setEditTag]          = useState(null); // Datum-String der Zeile im Bearbeitungsmodus
  const [editWahl,         setEditWahl]         = useState('');   // mitarbeiter_id im Dropdown
  const [speichernLaeuft,  setSpeichernLaeuft]  = useState(false);
  const [erfolg,           setErfolg]           = useState('');
  const [fehler,           setFehler]           = useState('');

  // Stabil für diese Render-Session
  const heute = new Date().toISOString().split('T')[0];
  const tage  = generiereTagesliste(heute);

  /* ── Daten laden ────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!member) { setLaden(false); return; }
      setCompanyId(member.company_id);

      // Parallel: Mitarbeiter + Notdienste für den Zeitraum
      const [{ data: maData }, { data: ndData }] = await Promise.all([
        supabase
          .from('mitarbeiter')
          .select('id, vorname, nachname, position, telefon')
          .eq('company_id', member.company_id)
          .order('nachname', { ascending: true }),
        supabase
          .from('notdienst')
          .select('id, datum, mitarbeiter_id, notiz')
          .eq('company_id', member.company_id)
          .gte('datum', tage[0])
          .lte('datum', tage[tage.length - 1]),
      ]);

      setMitarbeiter(maData ?? []);

      const map = {};
      for (const eintrag of ndData ?? []) map[eintrag.datum] = eintrag;
      setNotdienste(map);
      setLaden(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /* ── Bearbeitung starten ─────────────────────────────────── */
  function handleBearbeitenStarten(datum) {
    setEditTag(datum);
    setEditWahl(notdienste[datum]?.mitarbeiter_id ?? '');
    setFehler('');
  }

  /* ── Speichern ───────────────────────────────────────────── */
  async function handleSpeichern() {
    if (!companyId || !editTag) return;
    setSpeichernLaeuft(true);
    setFehler('');

    const existing = notdienste[editTag];

    try {
      if (editWahl === '') {
        // Zuweisung entfernen
        if (existing) {
          const { error } = await supabase
            .from('notdienst')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
        }
        setNotdienste(prev => {
          const copy = { ...prev };
          delete copy[editTag];
          return copy;
        });
      } else if (existing) {
        // Bestehenden Eintrag aktualisieren
        const { data, error } = await supabase
          .from('notdienst')
          .update({ mitarbeiter_id: editWahl })
          .eq('id', existing.id)
          .select('id, datum, mitarbeiter_id, notiz')
          .maybeSingle();
        if (error) throw error;
        setNotdienste(prev => ({ ...prev, [editTag]: data }));
      } else {
        // Neuen Eintrag anlegen
        const { data, error } = await supabase
          .from('notdienst')
          .insert({ company_id: companyId, datum: editTag, mitarbeiter_id: editWahl })
          .select('id, datum, mitarbeiter_id, notiz')
          .maybeSingle();
        if (error) throw error;
        setNotdienste(prev => ({ ...prev, [editTag]: data }));
      }

      setErfolg('Notdienst gespeichert.');
      setTimeout(() => setErfolg(''), 3000);
      setEditTag(null);
      setEditWahl('');
    } catch (e) {
      setFehler(e.message ?? 'Fehler beim Speichern.');
    } finally {
      setSpeichernLaeuft(false);
    }
  }

  /* ── Bearbeitung abbrechen ──────────────────────────────── */
  function handleAbbrechen() {
    setEditTag(null);
    setEditWahl('');
    setFehler('');
  }

  /* ── KPI-Berechnungen ──────────────────────────────────── */
  const heuteMa = notdienste[heute]
    ? mitarbeiter.find(m => m.id === notdienste[heute].mitarbeiter_id)
    : null;

  // Montag dieser Woche
  const montagDieserWoche = (() => {
    const d = new Date(heute + 'T00:00:00');
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d.toISOString().split('T')[0];
  })();
  const sonntagDieserWoche = (() => {
    const d = new Date(montagDieserWoche + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })();
  const besetzteTageDieseWoche = Object.keys(notdienste)
    .filter(d => d >= montagDieserWoche && d <= sonntagDieserWoche).length;

  // Unbesetzte Tage in den nächsten 7 Tagen (inkl. heute)
  const naechste7 = tage.filter(d => d >= heute).slice(0, 7);
  const unbesetztNaechste7 = naechste7.filter(d => !notdienste[d]).length;

  /* ── Ladescreen ─────────────────────────────────────────── */
  if (laden) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */
  let letzteKW = null;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notdienstplanung</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Rufbereitschaft und Notdienste für dein Team planen.
        </p>
      </div>

      {/* ── Erfolgs-Banner ── */}
      {erfolg && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <Svg d={ICO.check} cls="w-4 h-4 shrink-0" />
          {erfolg}
        </div>
      )}

      {/* ── KPI-Karten ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Heute */}
        <div className="rounded-2xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Svg d={ICO.phone} cls="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Heute im Notdienst</span>
          </div>
          {heuteMa ? (
            <>
              <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                {heuteMa.vorname} {heuteMa.nachname}
              </p>
              {heuteMa.position && (
                <p className="text-xs text-gray-400 mt-0.5">{heuteMa.position}</p>
              )}
              {heuteMa.telefon && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 font-medium">{heuteMa.telefon}</p>
              )}
            </>
          ) : (
            <p className="text-base font-bold text-gray-400 dark:text-gray-500">Nicht besetzt</p>
          )}
        </div>

        {/* Diese Woche */}
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Svg d={ICO.calendar} cls="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Diese Woche besetzt</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {besetzteTageDieseWoche}
            <span className="text-sm font-normal text-gray-400 ml-1">/ 7 Tage</span>
          </p>
        </div>

        {/* Nächste 7 Tage offen */}
        <div className={`rounded-2xl border px-5 py-4 ${
          unbesetztNaechste7 === 0
            ? 'border-green-100 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Svg d={ICO.shield} cls={`w-4 h-4 ${unbesetztNaechste7 === 0 ? 'text-green-400' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">Nächste 7 Tage offen</span>
          </div>
          <p className={`text-2xl font-bold ${
            unbesetztNaechste7 === 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {unbesetztNaechste7}
            <span className="text-sm font-normal text-gray-400 ml-1">Tage</span>
          </p>
        </div>

      </div>

      {/* ── Tagesliste ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

        {/* Listen-Header */}
        <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
          <Svg d={ICO.calendar} cls="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Bereitschaftsplan</span>
          <span className="ml-auto text-xs text-gray-400">
            {new Date(tage[0] + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
            {' – '}
            {new Date(tage[tage.length - 1] + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {tage.map(datum => {
            const d        = new Date(datum + 'T00:00:00');
            const wochentag = WOCHENTAGE[d.getDay()];
            const istHeute  = datum === heute;
            const istVergang = datum < heute;
            const istWE     = d.getDay() === 0 || d.getDay() === 6;
            const eintrag   = notdienste[datum];
            const ma        = eintrag ? mitarbeiter.find(m => m.id === eintrag.mitarbeiter_id) : null;
            const istEditModus = editTag === datum;
            const kw        = getKW(datum);
            const zeigeKW   = d.getDay() === 1 || (datum === tage[0] && letzteKW !== kw);

            // KW-Trennzeile merken
            const kwLabel = (zeigeKW && letzteKW !== kw) ? kw : null;
            if (zeigeKW && letzteKW !== kw) letzteKW = kw;zeigeKW && letzteKW !== kw) letzteKW = kw;

            return (
              <div key={datum}>

                {/* KW-Trenner */}
                {kwLabel && (
                  <div className="px-6 py-1.5 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                      KW {kwLabel}
                    </span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                  </div>
                )}

                {/* Tageszeile */}
                <div className={`px-6 py-3 flex flex-wrap items-center gap-3 transition-colors ${
                  istHeute
                    ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500'
                    : istVergang
                    ? 'opacity-60'
                    : ''
                } ${istWE && !istHeute ? 'bg-orange-50/20 dark:bg-orange-900/5' : ''}`}
                >

                  {/* Wochentag + Datum */}
                  <div className="w-20 shrink-0 select-none">
                    <span className={`block text-[11px] font-bold uppercase tracking-wide ${
                      istHeute
                        ? 'text-red-500 dark:text-red-400'
                        : istWE
                        ? 'text-orange-500 dark:text-orange-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {wochentag}
                    </span>
                    <span className={`text-sm font-semibold ${
                      istHeute
                        ? 'text-red-700 dark:text-red-300'
                        : istVergang
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                      {d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    </span>
                    {istHeute && (
                      <span className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-600 text-white leading-none">
                        HEUTE
                      </span>
                    )}
                  </div>

                  {/* Edit-Modus */}
                  {istEditModus ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                      <select
                        value={editWahl}
                        onChange={e => setEditWahl(e.target.value)}
                        className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                      >
                        <option value="">— Kein Notdienst —</option>
                        {mitarbeiter.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.nachname}, {m.vorname}{m.position ? ` (${m.position})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleSpeichern}
                        disabled={speichernLaeuft}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition shrink-0"
                      >
                        {speichernLaeuft
                          ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                          : <Svg d={ICO.check} cls="w-3.5 h-3.5" />
                        }
                        Speichern
                      </button>
                      <button
                        onClick={handleAbbrechen}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium transition shrink-0"
                      >
                        <Svg d={ICO.x} cls="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (

                    /* Anzeige-Modus */
                    <div className="flex flex-1 items-center gap-3 min-w-0">
                      {ma ? (
                        <>
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-300 font-bold text-xs shrink-0 select-none">
                            {ma.vorname[0]}{ma.nachname[0]}
                          </div>
                          {/* Name + Info */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {ma.vorname} {ma.nachname}
                            </p>
                            {(ma.position || ma.telefon) && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                {ma.position}
                                {ma.position && ma.telefon ? ' · ' : ''}
                                {ma.telefon}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className={`text-sm flex-1 ${
                          istVergang
                            ? 'text-gray-300 dark:text-gray-600'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          Nicht besetzt
                        </span>
                      )}

                      {/* Ändern-Button */}
                      <button
                        onClick={() => handleBearbeitenStarten(datum)}
                        className="ml-auto shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition"
                      >
                        <Svg d={ICO.pencil} cls="w-3 h-3" />
                        Ändern
                      </button>
                    </div>
                  )}
                </div>

                {/* Fehler inline unter der bearbeiteten Zeile */}
                {istEditModus && fehler && (
                  <div className="px-6 pb-2">
                    <p className="text-xs text-red-600 dark:text-red-400">{fehler}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hinweis: Keine Mitarbeiter ── */}
      {mitarbeiter.length === 0 && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl px-4 py-3">
          <Svg d={ICO.info} cls="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Noch keine Mitarbeiter angelegt. Bitte zuerst Mitarbeiter im Bereich{' '}
            <a href="/dashboard/mitarbeiter" className="underline font-medium">Mitarbeiter</a>{' '}
            erfassen.
          </p>
        </div>
      )}

    </div>
  );
}
