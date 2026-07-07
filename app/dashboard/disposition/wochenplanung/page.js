'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WOCHENTAGE_LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const STATUS_CONFIG = {
  offen: { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_bearbeitung: { cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  abgeschlossen: { cls: 'bg-green-100 text-green-700 border-green-200' },
};

function getWochenstart(datum) {
  const d = new Date(datum);
  const tag = d.getDay();
  const diff = (tag === 0 ? -6 : 1 - tag);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDatum(datum) {
  return datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function toDateStr(datum) {
  return [
    datum.getFullYear(),
    String(datum.getMonth() + 1).padStart(2, '0'),
    String(datum.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatKW(datum) {
  const start = getWochenstart(datum);
  const jan1 = new Date(start.getFullYear(), 0, 1);
  const kw = Math.ceil(((start - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return kw;
}

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

function ChevronIcon({ direction, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d={direction === 'left' ? 'M15.75 19.5L8.25 12l7.5-7.5' : 'M8.25 4.5l7.5 7.5-7.5 7.5'} />
    </svg>
  );
}

export default function Wochenplanung() {
  const [modalOffen, setModalOffen] = useState(false);
  const [basisDatum, setBasisDatum] = useState(new Date());
  const [companyId, setCompanyId] = useState(null);
  const [einsaetze, setEinsaetze] = useState([]);
  const [laden, setLaden] = useState(false);

  // Modal-State
  const [offeneAuftraege, setOffeneAuftraege] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [modalLaden, setModalLaden] = useState(false);
  const [ausgewaehlterAuftrag, setAusgewaehlterAuftrag] = useState('');
  const [einsatzDatum, setEinsatzDatum] = useState('');
  const [einsatzUhrzeit, setEinsatzUhrzeit] = useState('');
  const [einsatzDauer, setEinsatzDauer] = useState('');
  const [ausgewaehlterTechniker, setAusgewaehlterTechniker] = useState('');
  const [speichernLaeuft, setSpeichernLaeuft] = useState(false);
  const [modalFehler, setModalFehler] = useState('');

  const heute = new Date();
  const wochenstart = getWochenstart(basisDatum);
  const kw = formatKW(basisDatum);

  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(wochenstart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const wochenDatumStrs = tage.map(toDateStr);

  const istAktuelleWoche =
    getWochenstart(heute).getTime() === wochenstart.getTime();

  function vorige() {
    const d = new Date(basisDatum);
    d.setDate(d.getDate() - 7);
    setBasisDatum(d);
  }
  function naechste() {
    const d = new Date(basisDatum);
    d.setDate(d.getDate() + 7);
    setBasisDatum(d);
  }

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

  // EinsÃ¤tze fÃ¼r Woche laden
  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLaden(true);
      const { data } = await supabase
        .from('auftraege')
        .select('id, titel, status, datum, uhrzeit, dauer_minuten, prioritaet, mitarbeiter:techniker_id(vorname, nachname)')
        .eq('company_id', companyId)
        .gte('datum', wochenDatumStrs[0])
        .lte('datum', wochenDatumStrs[6])
        .order('uhrzeit', { ascending: true, nullsFirst: false });
      setEinsaetze(data ?? []);
      setLaden(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, wochenstart.getTime()]);

  // EinsÃ¤tze nach Tag gruppieren
  const byTag = {};
  for (const e of einsaetze) {
    const key = e.datum?.slice(0, 10);
    if (key) (byTag[key] = byTag[key] ?? []).push(e);
  }

  const gesamtEinsaetze = einsaetze.length;

  // Modal Ã¶ffnen + Daten laden
  async function modalOeffnen() {
    setModalOffen(true);
    setAusgewaehlterAuftrag('');
    setEinsatzDatum(toDateStr(heute));
    setEinsatzUhrzeit('');
    setEinsatzDauer('');
    setAusgewaehlterTechniker('');
    setModalFehler('');
    if (!companyId) return;
    setModalLaden(true);
    const [{ data: auftraege }, { data: members }] = await Promise.all([
      supabase
        .from('auftraege')
        .select('id, titel, status, kunden:kunde_id(name, firmenname)')
        .eq('company_id', companyId)
        .not('status', 'eq', 'abgeschlossen')
        .order('titel'),
      supabase
        .from('company_members')
        .select('id, vorname, nachname, role')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('nachname'),
    ]);
    setOffeneAuftraege(auftraege ?? []);
    setMitarbeiter(members ?? []);
    setModalLaden(false);
  }

  async function einsatzSpeichern() {
    if (!ausgewaehlterAuftrag) {
      setModalFehler('Bitte einen Auftrag auswÃ¤hlen.');
      return;
    }
    if (!einsatzDatum) {
      setModalFehler('Bitte ein Datum wÃ¤hlen.');
      return;
    }
    setSpeichernLaeuft(true);
    setModalFehler('');
    const update = {
      datum: einsatzDatum,
      ...(einsatzUhrzeit ? { uhrzeit: einsatzUhrzeit } : {}),
      ...(einsatzDauer ? { dauer_minuten: parseInt(einsatzDauer) } : {}),
      ...(ausgewaehlterTechniker ? { techniker_id: ausgewaehlterTechniker } : {}),
    };
    const { error } = await supabase
      .from('auftraege')
      .update(update)
      .eq('id', ausgewaehlterAuftrag)
      .eq('company_id', companyId);
    if (error) {
      setModalFehler('Fehler beim Speichern: ' + error.message);
      setSpeichernLaeuft(false);
      return;
    }
    setSpeichernLaeuft(false);
    setModalOffen(false);
    // Woche neu laden
    const { data } = await supabase
      .from('auftraege')
      .select('id, titel, status, datum, uhrzeit, dauer_minuten, prioritaet, mitarbeiter:techniker_id(vorname, nachname)')
      .eq('company_id', companyId)
      .gte('datum', wochenDatumStrs[0])
      .lte('datum', wochenDatumStrs[6])
      .order('uhrzeit', { ascending: true, nullsFirst: false });
    setEinsaetze(data ?? []);
  }

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Wochenplanung</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plane und verwalte alle EinsÃ¤tze der aktuellen Woche.
          </p>
        </div>
        <button
          onClick={modalOeffnen}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Einsatz planen
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={vorige}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-500"
        >
          <ChevronIcon direction="left" className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            KW {kw} â {formatDatum(tage[0])} bis {formatDatum(tage[6])}.{tage[6].getFullYear()}
          </span>
          {!istAktuelleWoche && (
            <button
              onClick={() => setBasisDatum(new Date())}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Heute
            </button>
          )}
        </div>
        <button
          onClick={naechste}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-500"
        >
          <ChevronIcon direction="right" className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {tage.map((tag, i) => {
            const istHeute = tag.toDateString() === heute.toDateString();
            const istWE = i >= 5;
            const tagEinsaetze = byTag[toDateStr(tag)] ?? [];
            return (
              <div key={i} className={`py-3 text-center ${istWE ? 'bg-gray-50/60' : ''}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${istWE ? 'text-gray-400' : 'text-gray-500'}`}>
                  {WOCHENTAGE[i]}
                </p>
                <div className={`mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold leading-none ${istHeute ? 'bg-blue-600 text-white' : istWE ? 'text-gray-400' : 'text-gray-700'}`}>
                  {tag.getDate()}
                </div>
                {tagEinsaetze.length > 0 && (
                  <p className="mt-1 text-xs text-blue-600 font-medium">{tagEinsaetze.length}</p>
                )}
              </div>
            );
          })}
        </div>

        {laden ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-400">Wird geladenâ¦</p>
          </div>
        ) : gesamtEinsaetze === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              Keine EinsÃ¤tze fÃ¼r diese Woche geplant.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf âEinsatz planen", um den ersten Einsatz hinzuzufÃ¼gen.
            </p>
            <button
              onClick={modalOeffnen}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Einsatz planen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-48">
            {tage.map((tag, i) => {
              const tagEinsaetze = byTag[toDateStr(tag)] ?? [];
              const istWE = i >= 5;
              return (
                <div key={i} className={`p-2 ${istWE ? 'bg-amber-50/20' : 'bg-white'}`}>
                  {tagEinsaetze.map(e => {
                    const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.offen;
                    const tech = e.mitarbeiter ? `${e.mitarbeiter.vorname} ${e.mitarbeiter.nachname}` : null;
                    return (
                      <div key={e.id} className={`text-xs px-1.5 py-1 rounded border mb-1 truncate ${cfg.cls}`}>
                        {e.uhrzeit && <span className="font-medium mr-1">{e.uhrzeit.slice(0, 5)}</span>}
                        <span className="font-medium">{e.titel}</span>
                        {tech && <span className="block opacity-75 truncate">&#128119; {tech}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {tage.map((tag, i) => {
          const istHeute = tag.toDateString() === heute.toDateString();
          const istWE = i >= 5;
          const tagEinsaetze = byTag[toDateStr(tag)] ?? [];
          return (
            <div key={i} className={`rounded-xl border px-2 py-2 text-center ${istHeute ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white'}`}>
              <p className={`text-xs font-medium ${istWE ? 'text-gray-400' : istHeute ? 'text-blue-700' : 'text-gray-500'}`}>
                {WOCHENTAGE_LANG[i].slice(0, 2)}
              </p>
              <p className={`text-xs mt-0.5 ${tagEinsaetze.length > 0 ? (istHeute ? 'text-blue-600' : 'text-gray-600') : (istHeute ? 'text-blue-300' : 'text-gray-300')}`}>
                {tagEinsaetze.length}
              </p>
            </div>
          );
        })}
      </div>

      {/* ââ Einsatz-Planungs-Modal ââ */}
      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Einsatz planen</h2>
                <p className="text-xs text-gray-400 mt-0.5">KW {kw}</p>
              </div>
            </div>

            {modalLaden ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Wird geladenâ¦</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Auftrag auswÃ¤hlen */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Auftrag <span className="text-red-400">*</span>
                  </label>
                  {offeneAuftraege.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Keine offenen AuftrÃ¤ge vorhanden.</p>
                  ) : (
                    <select
                      value={ausgewaehlterAuftrag}
                      onChange={e => setAusgewaehlterAuftrag(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">â Auftrag wÃ¤hlen â</option>
                      {offeneAuftraege.map(a => {
                        const kunde = a.kunden ? (a.kunden.firmenname || a.kunden.name) : null;
                        return (
                          <option key={a.id} value={a.id}>
                            {a.titel}{kunde ? ` â ${kunde}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Datum */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Datum <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={einsatzDatum}
                    min={wochenDatumStrs[0]}
                    max={wochenDatumStrs[6]}
                    onChange={e => setEinsatzDatum(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Uhrzeit + Dauer */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Uhrzeit
                    </label>
                    <input
                      type="time"
                      value={einsatzUhrzeit}
                      onChange={e => setEinsatzUhrzeit(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Dauer (Min.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      value={einsatzDauer}
                      onChange={e => setEinsatzDauer(e.target.value)}
                      placeholder="z.B. 90"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Techniker */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Techniker zuweisen
                  </label>
                  {mitarbeiter.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Keine aktiven Mitarbeiter vorhanden.</p>
                  ) : (
                    <select
                      value={ausgewaehlterTechniker}
                      onChange={e => setAusgewaehlterTechniker(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">â Kein Techniker â</option>
                      {mitarbeiter.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.vorname} {m.nachname}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Fehlermeldung */}
                {modalFehler && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {modalFehler}
                  </p>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setModalOffen(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={einsatzSpeichern}
                    disabled={speichernLaeuft || !ausgewaehlterAuftrag}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {speichernLaeuft ? 'Wird gespeichertâ¦' : 'Einsatz planen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
