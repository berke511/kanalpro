'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

const STUNDEN = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const STATUS_CONFIG = {
  offen: { label: 'Offen', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  abgeschlossen: { label: 'Abgeschlossen', cls: 'bg-green-100 text-green-700 border-green-200' },
};

const PRIORITAET_DOT = {
  notfall: 'bg-red-500',
  hoch: 'bg-orange-500',
  normal: 'bg-blue-400',
  niedrig: 'bg-gray-400',
};

function CalendarIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function PencilIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
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

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function Tagesplanung() {
  const [modalOffen, setModalOffen] = useState(false);
  const [einsaetze, setEinsaetze] = useState([]);
  const [laden, setLaden] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [gewaehlterTag, setGewaehlterTag] = useState(new Date().toISOString().split('T')[0]);

  // Neu-Modal-State
  const [offeneAuftraege, setOffeneAuftraege] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [modalLaden, setModalLaden] = useState(false);
  const [ausgewaehlterAuftrag, setAusgewaehlterAuftrag] = useState('');
  const [einsatzUhrzeit, setEinsatzUhrzeit] = useState('');
  const [einsatzDauer, setEinsatzDauer] = useState('');
  const [ausgewaehlterTechniker, setAusgewaehlterTechniker] = useState('');
  const [speichernLaeuft, setSpeichernLaeuft] = useState(false);
  const [modalFehler, setModalFehler] = useState('');

  // Edit-Modal-State
  const [editModalOffen, setEditModalOffen] = useState(false);
  const [editEinsatz, setEditEinsatz] = useState(null);
  const [editUhrzeit, setEditUhrzeit] = useState('');
  const [editDauer, setEditDauer] = useState('');
  const [editTechniker, setEditTechniker] = useState('');
  const [editSpeichernLaeuft, setEditSpeichernLaeuft] = useState(false);
  const [editFehler, setEditFehler] = useState('');
  const [editMitarbeiter, setEditMitarbeiter] = useState([]);
  const [editMitarbeiterLaden, setEditMitarbeiterLaden] = useState(false);

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

  // Einsaetze laden
  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLaden(true);
      const { data } = await supabase
        .from('auftraege')
        .select('id, titel, status, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, mitarbeiter:techniker_id(vorname, nachname), kunden:kunde_id(name, firmenname)')
        .eq('company_id', companyId)
        .eq('datum', gewaehlterTag)
        .order('uhrzeit', { ascending: true, nullsFirst: false });
      setEinsaetze(data ?? []);
      setLaden(false);
    };
    load();
  }, [companyId, gewaehlterTag]);

  // Neu-Modal oeffnen + Daten laden
  async function modalOeffnen() {
    setModalOffen(true);
    setAusgewaehlterAuftrag('');
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

  // Edit-Modal oeffnen + Techniker-Liste laden
  async function einsatzBearbeiten(einsatz) {
    setEditEinsatz(einsatz);
    setEditUhrzeit(einsatz.uhrzeit ? einsatz.uhrzeit.slice(0, 5) : '');
    setEditDauer(einsatz.dauer_minuten ? String(einsatz.dauer_minuten) : '');
    setEditTechniker(einsatz.techniker_id ?? '');
    setEditFehler('');
    setEditModalOffen(true);
    if (!companyId) return;
    setEditMitarbeiterLaden(true);
    const { data: members } = await supabase
      .from('company_members')
      .select('id, vorname, nachname, role')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('nachname');
    setEditMitarbeiter(members ?? []);
    setEditMitarbeiterLaden(false);
  }

  async function einsatzSpeichern() {
    if (!ausgewaehlterAuftrag) {
      setModalFehler('Bitte einen Auftrag auswaehlen.');
      return;
    }
    setSpeichernLaeuft(true);
    setModalFehler('');
    const update = {
      datum: gewaehlterTag,
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
    const { data } = await supabase
      .from('auftraege')
      .select('id, titel, status, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, mitarbeiter:techniker_id(vorname, nachname), kunden:kunde_id(name, firmenname)')
      .eq('company_id', companyId)
      .eq('datum', gewaehlterTag)
      .order('uhrzeit', { ascending: true, nullsFirst: false });
    setEinsaetze(data ?? []);
  }

  async function editEinsatzSpeichern() {
    if (!editEinsatz) return;
    setEditSpeichernLaeuft(true);
    setEditFehler('');
    const update = {
      uhrzeit: editUhrzeit || null,
      dauer_minuten: editDauer ? parseInt(editDauer) : null,
      techniker_id: editTechniker || null,
    };
    const { error } = await supabase
      .from('auftraege')
      .update(update)
      .eq('id', editEinsatz.id)
      .eq('company_id', companyId);
    if (error) {
      setEditFehler('Fehler beim Speichern: ' + error.message);
      setEditSpeichernLaeuft(false);
      return;
    }
    setEditSpeichernLaeuft(false);
    setEditModalOffen(false);
    const { data } = await supabase
      .from('auftraege')
      .select('id, titel, status, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, mitarbeiter:techniker_id(vorname, nachname), kunden:kunde_id(name, firmenname)')
      .eq('company_id', companyId)
      .eq('datum', gewaehlterTag)
      .order('uhrzeit', { ascending: true, nullsFirst: false });
    setEinsaetze(data ?? []);
  }

  const datumText = new Date(gewaehlterTag + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const byStunde = {};
  for (const e of einsaetze) {
    if (e.uhrzeit) {
      const h = parseInt(e.uhrzeit.split(':')[0], 10);
      (byStunde[h] = byStunde[h] ?? []).push(e);
    }
  }
  const ohneUhrzeit = einsaetze.filter(e => !e.uhrzeit);

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tagesplanung</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plane und verwalte alle Einsätze für den gewählten Tag.
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

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Tagesansicht</span>
          <span className="text-xs text-gray-400">
            {laden ? 'Lädt…' : `${einsaetze.length} Einsatz${einsaetze.length !== 1 ? 'ätze' : ''}`}
          </span>
        </div>

        {laden ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-400">Wird geladen…</p>
          </div>
        ) : einsaetze.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Keine Einsätze für diesen Tag geplant.</p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf &ldquo;Einsatz planen&rdquo;, um den ersten Einsatz hinzuzufügen.
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
          <div className="px-6 py-4">
            {ohneUhrzeit.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Ohne Uhrzeit</p>
                <div className="space-y-2">
                  {ohneUhrzeit.map(e => {
                    const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.offen;
                    const tech = e.mitarbeiter ? `${e.mitarbeiter.vorname} ${e.mitarbeiter.nachname}` : null;
                    return (
                      <div
                        key={e.id}
                        onClick={() => einsatzBearbeiten(e)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm cursor-pointer hover:opacity-80 transition ${cfg.cls}`}
                      >
                        {e.prioritaet && <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITAET_DOT[e.prioritaet] ?? 'bg-gray-400'}`} />}
                        <span className="font-medium flex-1 truncate">{e.titel}</span>
                        {tech && <span className="text-xs opacity-75">&#128119; {tech}</span>}
                        {e.dauer_minuten && <span className="text-xs opacity-75 shrink-0">{e.dauer_minuten} Min.</span>}
                        <PencilIcon className="w-3 h-3 opacity-50 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Zeitraster</p>
            <div className="space-y-px">
              {STUNDEN.map((h) => {
                const stundenEinsaetze = byStunde[h] ?? [];
                return (
                  <div key={h} className="flex items-start gap-4 group">
                    <span className="text-xs text-gray-300 w-10 shrink-0 text-right py-2.5">
                      {String(h).padStart(2, '0')}:00
                    </span>
                    <div className="flex-1 min-h-10 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition p-1 space-y-1">
                      {stundenEinsaetze.map(e => {
                        const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.offen;
                        const tech = e.mitarbeiter ? `${e.mitarbeiter.vorname} ${e.mitarbeiter.nachname}` : null;
                        return (
                          <div
                            key={e.id}
                            onClick={() => einsatzBearbeiten(e)}
                            className={`flex items-center gap-2 px-2 py-1 rounded border text-xs cursor-pointer hover:opacity-80 transition ${cfg.cls}`}
                          >
                            {e.prioritaet && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITAET_DOT[e.prioritaet] ?? 'bg-gray-400'}`} />}
                            <span className="font-medium shrink-0">{e.uhrzeit?.slice(0, 5)}</span>
                            <span className="flex-1 truncate font-medium">{e.titel}</span>
                            {tech && <span className="opacity-75 shrink-0">&#128119; {tech}</span>}
                            {e.dauer_minuten && <span className="opacity-75 shrink-0">{e.dauer_minuten} Min.</span>}
                            <PencilIcon className="w-3 h-3 opacity-40 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Einsatz planen</h2>
                <p className="text-xs text-gray-400 mt-0.5">{datumText}</p>
              </div>
            </div>
            {modalLaden ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Wird geladen…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Auftrag <span className="text-red-400">*</span>
                  </label>
                  {offeneAuftraege.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Keine offenen Aufträge vorhanden.</p>
                  ) : (
                    <select
                      value={ausgewaehlterAuftrag}
                      onChange={e => setAusgewaehlterAuftrag(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">&ndash; Auftrag wählen &ndash;</option>
                      {offeneAuftraege.map(a => {
                        const kunde = a.kunden ? (a.kunden.firmenname || a.kunden.name) : null;
                        return (
                          <option key={a.id} value={a.id}>
                            {a.titel}{kunde ? ` – ${kunde}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Datum</label>
                  <div className="px-3 py-2.5 border border-gray-100 rounded-xl text-sm text-gray-600 bg-gray-50">{datumText}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Uhrzeit</label>
                    <input type="time" value={einsatzUhrzeit} onChange={e => setEinsatzUhrzeit(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dauer (Min.)</label>
                    <input type="number" min="0" step="15" value={einsatzDauer} onChange={e => setEinsatzDauer(e.target.value)}
                      placeholder="z.B. 90"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Techniker zuweisen</label>
                  {mitarbeiter.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Keine aktiven Mitarbeiter vorhanden.</p>
                  ) : (
                    <select value={ausgewaehlterTechniker} onChange={e => setAusgewaehlterTechniker(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">&ndash; Kein Techniker &ndash;</option>
                      {mitarbeiter.map(m => (
                        <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>
                      ))}
                    </select>
                  )}
                </div>
                {modalFehler && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{modalFehler}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setModalOffen(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
                    Abbrechen
                  </button>
                  <button onClick={einsatzSpeichern} disabled={speichernLaeuft || !ausgewaehlterAuftrag}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                    {speichernLaeuft ? 'Wird gespeichert…' : 'Einsatz planen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editModalOffen && editEinsatz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                <PencilIcon className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 truncate">{editEinsatz.titel}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{datumText}</p>
              </div>
            </div>
            {editMitarbeiterLaden ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Wird geladen…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Auftrag</label>
                  <div className="px-3 py-2.5 border border-gray-100 rounded-xl text-sm text-gray-600 bg-gray-50 truncate">{editEinsatz.titel}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Datum</label>
                  <div className="px-3 py-2.5 border border-gray-100 rounded-xl text-sm text-gray-600 bg-gray-50">{datumText}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Uhrzeit</label>
                    <input type="time" value={editUhrzeit} onChange={e => setEditUhrzeit(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dauer (Min.)</label>
                    <input type="number" min="0" step="15" value={editDauer} onChange={e => setEditDauer(e.target.value)}
                      placeholder="z.B. 90"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Techniker</label>
                  {editMitarbeiter.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Keine aktiven Mitarbeiter vorhanden.</p>
                  ) : (
                    <select value={editTechniker} onChange={e => setEditTechniker(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                      <option value="">&ndash; Kein Techniker &ndash;</option>
                      {editMitarbeiter.map(m => (
                        <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>
                      ))}
                    </select>
                  )}
                </div>
                {editFehler && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{editFehler}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditModalOffen(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
                    Abbrechen
                  </button>
                  <button onClick={editEinsatzSpeichern} disabled={editSpeichernLaeuft}
                    className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">
                    {editSpeichernLaeuft ? 'Wird gespeichert…' : 'Änderungen speichern'}
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
