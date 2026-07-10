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

/* ─────────────────────────────────────────────────────────────
   Status-Badge
───────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  verfuegbar: {
    label: 'Verfügbar',
    bg:    'bg-green-50 dark:bg-green-900/30',
    text:  'text-green-700 dark:text-green-400',
    dot:   'bg-green-500',
  },
  im_einsatz: {
    label: 'Im Einsatz',
    bg:    'bg-blue-50 dark:bg-blue-900/30',
    text:  'text-blue-700 dark:text-blue-400',
    dot:   'bg-blue-500',
  },
  urlaub: {
    label: 'Urlaub',
    bg:    'bg-orange-50 dark:bg-orange-900/30',
    text:  'text-orange-700 dark:text-orange-400',
    dot:   'bg-orange-400',
  },
  krank: {
    label: 'Krank',
    bg:    'bg-red-50 dark:bg-red-900/30',
    text:  'text-red-600 dark:text-red-400',
    dot:   'bg-red-500',
  },
};

function StatusPill({ status }) {
  const key = (status ?? '').toLowerCase();
  const cfg = STATUS_CFG[key] ?? {
    label: status || 'Unbekannt',
    bg:    'bg-gray-50 dark:bg-gray-700',
    text:  'text-gray-500 dark:text-gray-400',
    dot:   'bg-gray-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   KrankmeldungModal — 2-Schritt-Workflow
───────────────────────────────────────────────────────────── */
function KrankmeldungModal({ mitarbeiter, companyId, alleMitarbeiter, onClose, onSuccess }) {
  const heute = new Date().toISOString().split('T')[0];

  const [datum,              setDatum]              = useState(heute);
  const [schritt,            setSchritt]            = useState(0);
  const [laden,              setLaden]              = useState(false);
  const [fehler,             setFehler]             = useState('');
  const [betroffeneAuftraege, setBetroffeneAuftraege] = useState([]);
  const [ersatz,             setErsatz]             = useState({});
  const [speichernLaeuft,    setSpeichernLaeuft]    = useState(false);
  const [gespeichertIds,     setGespeichertIds]     = useState(new Set());
  const [alleGespeichert,    setAlleGespeichert]    = useState(false);

  const ma = mitarbeiter;

  const datumAnzeige = datum
    ? new Date(datum + 'T00:00:00').toLocaleDateString('de-DE', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : '';

  function kundenName(k) {
    if (!k) return '';
    return k.kundentyp === 'firma' ? (k.firmenname || k.name || '') : (k.name || '');
  }

  /* ── Schritt 0: Krankmeldung erfassen + Einsätze laden ── */
  async function handleBestaetigen() {
    if (!datum) { setFehler('Bitte ein Datum auswählen.'); return; }
    setFehler('');
    setLaden(true);

    try {
      /* 1. Kranktag in arbeitszeiten eintragen */
      const { error: azErr } = await supabase
        .from('arbeitszeiten')
        .insert({
          company_id:     companyId,
          mitarbeiter_id: ma.id,
          datum,
          typ:            'krank',
          notiz:          'Krankmeldung via Mitarbeiterplanung',
        });
      if (azErr) throw azErr;

      /* 2. Mitarbeiterstatus auf krank setzen (nur bei heutiger Meldung) */
      if (datum === heute) {
        await supabase
          .from('mitarbeiter')
          .update({ status: 'krank' })
          .eq('id', ma.id)
          .eq('company_id', companyId);
      }

      /* 3a. Auftrag-IDs via auftrag_mitarbeiter laden */
      const { data: amRows } = await supabase
        .from('auftrag_mitarbeiter')
        .select('auftrag_id')
        .eq('mitarbeiter_id', ma.id)
        .eq('company_id', companyId);

      const junctionIds = (amRows ?? []).map(r => r.auftrag_id);

      /* 3b. Aufträge via direktem mitarbeiter_id-Feld */
      const { data: direktData } = await supabase
        .from('auftraege')
        .select('id, nummer, titel, status, einsatzdatum, einsatzort_strasse, einsatzort_ort, mitarbeiter_id, kunden:kunden_id(name, firmenname, kundentyp)')
        .eq('company_id', companyId)
        .eq('einsatzdatum', datum)
        .eq('mitarbeiter_id', ma.id)
        .not('status', 'in', '(Abgeschlossen,Storniert)');

      /* 3c. Aufträge via Junction für diesen Tag */
      let junctionData = [];
      if (junctionIds.length > 0) {
        const { data } = await supabase
          .from('auftraege')
          .select('id, nummer, titel, status, einsatzdatum, einsatzort_strasse, einsatzort_ort, mitarbeiter_id, kunden:kunden_id(name, firmenname, kundentyp)')
          .eq('company_id', companyId)
          .eq('einsatzdatum', datum)
          .in('id', junctionIds)
          .not('status', 'in', '(Abgeschlossen,Storniert)');
        junctionData = data ?? [];
      }

      /* Deduplizieren */
      const auftraegMap = new Map((direktData ?? []).map(a => [a.id, a]));
      for (const a of junctionData) {
        if (!auftraegMap.has(a.id)) auftraegMap.set(a.id, a);
      }

      setBetroffeneAuftraege([...auftraegMap.values()]);
      setSchritt(1);
    } catch (err) {
      console.error(err);
      setFehler(err.message ?? 'Fehler beim Speichern. Bitte erneut versuchen.');
    } finally {
      setLaden(false);
    }
  }

  /* ── Schritt 1: Ersatz-Techniker speichern ── */
  async function handleErsatzSpeichern() {
    const zuSpeichern = Object.entries(ersatz).filter(([, v]) => v);
    if (zuSpeichern.length === 0) return;

    setSpeichernLaeuft(true);
    setFehler('');

    const neuGespeichert = new Set(gespeichertIds);

    for (const [auftragId, ersatzId] of zuSpeichern) {
      if (gespeichertIds.has(auftragId)) continue;
      try {
        const auftrag = betroffeneAuftraege.find(a => a.id === auftragId);

        /* Kranken aus auftrag_mitarbeiter entfernen */
        await supabase
          .from('auftrag_mitarbeiter')
          .delete()
          .eq('auftrag_id', auftragId)
          .eq('mitarbeiter_id', ma.id)
          .eq('company_id', companyId);

        /* Ersatz in auftrag_mitarbeiter eintragen (nur wenn noch nicht vorhanden) */
        const { data: existing } = await supabase
          .from('auftrag_mitarbeiter')
          .select('id')
          .eq('auftrag_id', auftragId)
          .eq('mitarbeiter_id', ersatzId)
          .eq('company_id', companyId)
          .maybeSingle();

        if (!existing) {
          await supabase
            .from('auftrag_mitarbeiter')
            .insert({ auftrag_id: auftragId, mitarbeiter_id: ersatzId, company_id: companyId });
        }

        /* Direktes mitarbeiter_id-Feld auf Auftrag aktualisieren */
        if (auftrag && auftrag.mitarbeiter_id === ma.id) {
          await supabase
            .from('auftraege')
            .update({ mitarbeiter_id: ersatzId })
            .eq('id', auftragId)
            .eq('company_id', companyId);
        }

        neuGespeichert.add(auftragId);
      } catch (err) {
        console.error('Fehler bei Auftrag', auftragId, err);
      }
    }

    setGespeichertIds(neuGespeichert);
    setSpeichernLaeuft(false);

    if (neuGespeichert.size > 0) {
      setAlleGespeichert(true);
      setTimeout(() => onSuccess(ma.id, datum), 1500);
    }
  }

  const verfuegbareMitarbeiter = alleMitarbeiter.filter(m =>
    m.id !== ma.id && m.status !== 'krank' && m.status !== 'urlaub'
  );

  const anzahlMitErsatz = Object.values(ersatz).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Modal-Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="w-9 h-9 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center shrink-0">
            <Svg
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              cls="w-5 h-5 text-red-500"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Krank melden</p>
            <p className="text-xs text-gray-400 truncate">{ma.vorname} {ma.nachname}</p>
          </div>

          {/* Schritt-Indikator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              schritt === 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}>
              {schritt === 0 ? '1' : <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3" />}
            </span>
            <span className="w-4 h-px bg-gray-200 dark:bg-gray-600" />
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              schritt === 1 ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}>
              2
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 ml-1 rounded-lg text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center transition shrink-0"
          >
            <Svg d="M6 18L18 6M6 6l12 12" cls="w-4 h-4" />
          </button>
        </div>

        {/* ── Modal-Body (scrollbar) ── */}
        <div className="overflow-y-auto flex-1">

          {/* ════ SCHRITT 0: Datum wählen ════ */}
          {schritt === 0 && (
            <div className="px-5 py-5 space-y-4">

              {/* Mitarbeiter-Info */}
              <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  ma.status === 'krank'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                  {(ma.vorname?.[0] ?? '?').toUpperCase()}{(ma.nachname?.[0] ?? '').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {ma.vorname} {ma.nachname}
                  </p>
                  <p className="text-xs text-gray-400">{ma.position || 'Mitarbeiter'}</p>
                </div>
                <StatusPill status={ma.status} />
              </div>

              {/* Datum-Auswahl */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Krankmeldung für den Tag
                </label>
                <input
                  type="date"
                  value={datum}
                  onChange={e => { setDatum(e.target.value); setFehler(''); }}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
                />
                {datum && (
                  <p className="text-xs text-gray-400 mt-1.5">{datumAnzeige}</p>
                )}
              </div>

              {/* Hinweis */}
              <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl px-3.5 py-3">
                <Svg
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  cls="w-4 h-4 text-amber-500 mt-0.5 shrink-0"
                />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Nach der Bestätigung werden alle betroffenen Einsätze für diesen Tag geladen.
                  Du kannst direkt einen Ersatz-Techniker einteilen.
                </p>
              </div>

              {fehler && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-3.5 h-3.5 shrink-0" />
                  {fehler}
                </div>
              )}

              {/* Aktionen */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleBestaetigen}
                  disabled={laden || !datum}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {laden
                    ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                    : <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4" />
                  }
                  {laden ? 'Verarbeite…' : 'Krankmeldung bestätigen'}
                </button>
              </div>
            </div>
          )}

          {/* ════ SCHRITT 1: Einsätze neu besetzen ════ */}
          {schritt === 1 && (
            <div className="px-5 py-5 space-y-4">

              {/* Bestätigungs-Banner */}
              <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
                <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    {ma.vorname} {ma.nachname} ist krank gemeldet
                  </p>
                  <p className="text-xs text-red-400 mt-0.5">{datumAnzeige}</p>
                </div>
              </div>

              {/* Keine betroffenen Einsätze */}
              {betroffeneAuftraege.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Keine betroffenen Einsätze
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {ma.vorname} hat für {datumAnzeige} keine zugewiesenen Aufträge.
                  </p>
                </div>
              )}

              {/* Liste betroffener Einsätze */}
              {betroffeneAuftraege.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {betroffeneAuftraege.length}{' '}
                    betroffene{betroffeneAuftraege.length === 1 ? 'r' : ''}{' '}
                    {betroffeneAuftraege.length === 1 ? 'Einsatz' : 'Einsätze'}
                  </p>

                  {betroffeneAuftraege.map(auftrag => {
                    const istGespeichert = gespeichertIds.has(auftrag.id);
                    const adresse = [auftrag.einsatzort_strasse, auftrag.einsatzort_ort]
                      .filter(Boolean).join(', ');

                    return (
                      <div key={auftrag.id}
                        className={`rounded-xl border p-4 transition-colors ${
                          istGespeichert
                            ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                        }`}>

                        {/* Auftrags-Kopf */}
                        <div className="flex items-start gap-2.5 mb-3">
                          <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                            <Svg
                              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                              cls="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {auftrag.nummer ? `#${auftrag.nummer} ` : ''}{auftrag.titel || 'Auftrag'}
                            </p>
                            {auftrag.kunden && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {kundenName(auftrag.kunden)}
                              </p>
                            )}
                            {adresse && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{adresse}</p>
                            )}
                          </div>
                          {istGespeichert && (
                            <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-5 h-5 text-green-500 shrink-0" />
                          )}
                        </div>

                        {/* Ersatz-Auswahl */}
                        {istGespeichert ? (
                          <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                            <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3.5 h-3.5" />
                            Ersatz erfolgreich eingetragen
                          </p>
                        ) : (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Ersatz-Techniker
                            </label>
                            <select
                              value={ersatz[auftrag.id] ?? ''}
                              onChange={e => setErsatz(prev => ({ ...prev, [auftrag.id]: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                            >
                              <option value="">— Techniker auswählen —</option>
                              {verfuegbareMitarbeiter.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.vorname} {m.nachname}{m.position ? ` · ${m.position}` : ''}
                                </option>
                              ))}
                            </select>
                            {verfuegbareMitarbeiter.length === 0 && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Kein verføgbarer Techniker vorhanden.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {fehler && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-3.5 h-3.5 shrink-0" />
                  {fehler}
                </div>
              )}

              {alleGespeichert && (
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-700 rounded-xl px-4 py-3">
                  <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-5 h-5 text-green-500 shrink-0" />
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    Einsätze erfolgreich neu besetzt.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal-Footer (nur Schritt 1) ── */}
        {schritt === 1 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Schließen
            </button>

            {betroffeneAuftraege.length > 0 && !alleGespeichert && (
              <button
                onClick={handleErsatzSpeichern}
                disabled={speichernLaeuft || anzahlMitErsatz === 0}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {speichernLaeuft
                  ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                  : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-4 h-4" />
                }
                {speichernLaeuft ? 'Speichere…' : `${anzahlMitErsatz} Ersatz speichern`}
              </button>
            )}

            {alleGespeichert && (
              <button
                onClick={() => onSuccess(ma.id, datum)}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-green-600 transition"
              >
                <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4" />
                Abgeschlossen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hauptseite: Mitarbeiterplanung
───────────────────────────────────────────────────────────── */
export default function Mitarbeiterplanung() {
  const router = useRouter();
  const [companyId,        setCompanyId]        = useState(null);
  const [mitarbeiter,      setMitarbeiter]      = useState([]);
  const [laden,            setLaden]            = useState(true);
  const [krankmeldungFuer, setKrankmeldungFuer] = useState(null);
  const [erfolg,           setErfolg]           = useState('');

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

      const { data } = await supabase
        .from('mitarbeiter')
        .select('id, vorname, nachname, position, status')
        .eq('company_id', member.company_id)
        .order('nachname', { ascending: true });

      setMitarbeiter(data ?? []);
      setLaden(false);
    }
    load();
  }, [router]);

  function handleKrankmeldungErfolgreich(mitarbeiterId, datum) {
    const heute = new Date().toISOString().split('T')[0];
    if (datum === heute) {
      setMitarbeiter(prev =>
        prev.map(m => m.id === mitarbeiterId ? { ...m, status: 'krank' } : m)
      );
    }
    setKrankmeldungFuer(null);
    setErfolg('Krankmeldung erfasst. Betroffene Einsätze wurden neu besetzt.');
    setTimeout(() => setErfolg(''), 6000);
  }

  /* ── Statistiken ── */
  const anzahlVerfuegbar = mitarbeiter.filter(m => m.status === 'verfuegbar' || !m.status).length;
  const anzahlImEinsatz  = mitarbeiter.filter(m => m.status === 'im_einsatz').length;
  const anzahlKrank      = mitarbeiter.filter(m => m.status === 'krank').length;
  const anzahlUrlaub     = mitarbeiter.filter(m => m.status === 'urlaub').length;

  const KPIS = [
    {
      label:  'Verføgbar',
      wert:   anzahlVerfuegbar,
      farbe:  'text-green-600 dark:text-green-400',
      bg:     'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-100 dark:border-green-800',
      icon:   'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    },
    {
      label:  'Im Einsatz',
      wert:   anzahlImEinsatz,
      farbe:  'text-blue-600 dark:text-blue-400',
      bg:     'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-100 dark:border-blue-800',
      icon:   'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
    },
    {
      label:  'Krank',
      wert:   anzahlKrank,
      farbe:  'text-red-600 dark:text-red-400',
      bg:     'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-100 dark:border-red-800',
      icon:   'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    },
    {
      label:  'Urlaub',
      wert:   anzahlUrlaub,
      farbe:  'text-orange-600 dark:text-orange-400',
      bg:     'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-100 dark:border-orange-800',
      icon:   'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Seitenkopf ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mitarbeiterplanung</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Team-Übersicht und Krankmeldungen verwalten.
        </p>
      </div>

      {/* ── Erfolgsmeldung ── */}
      {erfolg && (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl px-4 py-3">
          <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">{erfolg}</p>
        </div>
      )}

      {/* ── KPI-Karten ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {KPIS.map(k => (
          <div key={k.label}
            className={`rounded-2xl border ${k.border} ${k.bg} px-4 py-3.5 flex items-center justify-between`}>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
              {laden ? (
                <div className="h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mt-0.5" />
              ) : (
                <p className={`text-2xl font-bold mt-0.5 ${k.farbe}`}>{k.wert}</p>
              )}
            </div>
            <Svg d={k.icon} cls={`w-5 h-5 ${k.farbe} opacity-50`} />
          </div>
        ))}
      </div>

      {/* ── Team-Liste ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Team-Übersicht</span>
          {!laden && (
            <span className="text-xs text-gray-400">{mitarbeiter.length} Mitarbeiter</span>
          )}
        </div>

        {/* Ladezustand */}
        {laden && (
          <div className="divide-y divide-gray-50 dark:divide-gray-800 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-5 sm:px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-32" />
                  <div className="h-3 bg-gray-50 dark:bg-gray-800 rounded w-20" />
                </div>
                <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full w-20" />
                <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg w-28" />
              </div>
            ))}
          </div>
        )}

        {/* Leer-Zustand */}
        {!laden && mitarbeiter.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Svg
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                cls="w-7 h-7 text-gray-300"
              />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Noch keine Mitarbeiter angelegt.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Erstelle zuerst Mitarbeiter unter &bdquo;Mitarbeiter&ldquo; im Seitenmenü.
            </p>
          </div>
        )}

        {/* Mitarbeiterliste */}
        {!laden && mitarbeiter.length > 0 && (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {mitarbeiter.map(m => {
              const istKrank = m.status === 'krank';
              return (
                <div key={m.id}
                  className="px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    istKrank
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {(m.vorname?.[0] ?? '?').toUpperCase()}{(m.nachname?.[0] ?? '').toUpperCase()}
                  </div>

                  {/* Name + Position */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      istKrank ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {m.vorname} {m.nachname}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{m.position || '—'}</p>
                  </div>

                  {/* Status-Badge */}
                  <StatusPill status={m.status} />

                  {/* Krank-melden-Button */}
                  <button
                    onClick={() => setKrankmeldungFuer(m)}
                    disabled={istKrank}
                    title={istKrank ? 'Bereits als krank gemeldet' : 'Krankmeldung erfassen'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                      istKrank
                        ? 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border border-gray-100 dark:border-gray-700 cursor-not-allowed'
                        : 'border border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30'
                    }`}
                  >
                    <Svg
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      cls="w-3.5 h-3.5"
                    />
                    {istKrank ? 'Bereits krank' : 'Krank melden'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Hinweis ── */}
      {!laden && mitarbeiter.length > 0 && (
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3">
          <Svg
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            cls="w-4 h-4 text-blue-400 mt-0.5 shrink-0"
          />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Klicke auf &bdquo;Krank melden&ldquo;, um einen Mitarbeiter als krank zu erfassen
            und betroffene Einsätze direkt mit einem Ersatz-Techniker neu zu besetzen.
          </p>
        </div>
      )}

      {/* ── Krankmeldungs-Modal ── */}
      {krankmeldungFuer && (
        <KrankmeldungModal
          mitarbeiter={krankmeldungFuer}
          companyId={companyId}
          alleMitarbeiter={mitarbeiter}
          onClose={() => setKrankmeldungFuer(null)}
          onSuccess={handleKrankmeldungErfolgreich}
        />
      )}
    </div>
  );
}
