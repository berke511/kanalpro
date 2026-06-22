'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';

// ── Konstanten ────────────────────────────────────────────────────────────────
const MASCHINENTYP_OPTIONS = [
  { value: 'hebebuehne',       label: 'Hebebühne' },
  { value: 'kompressor',       label: 'Kompressor' },
  { value: 'generator',        label: 'Generator / Aggregat' },
  { value: 'kran',             label: 'Kran' },
  { value: 'stapler',          label: 'Stapler / Hubwagen' },
  { value: 'schweissgeraet',   label: 'Schweißgerät' },
  { value: 'werkzeugmaschine', label: 'Werkzeugmaschine' },
  { value: 'pumpe',            label: 'Pumpe' },
  { value: 'druckluftwerkzeug',label: 'Druckluftwerkzeug' },
  { value: 'hochdruckspueler', label: 'Hochdruckspüler' },
  { value: 'fraese',           label: 'Fräse / Bohrwerk' },
  { value: 'messgeraet',       label: 'Messgerät' },
  { value: 'pruefgeraet',      label: 'Prüfgerät' },
  { value: 'kamera',           label: 'Kamera / Optik' },
  { value: 'werkzeug',         label: 'Werkzeug (Allg.)' },
  { value: 'roboter',          label: 'Roboter' },
  { value: 'sonstiges',        label: 'Sonstiges' },
];

const ZUSTAND_CONFIG = {
  aktiv:          { label: 'Aktiv',         bg: 'bg-green-100',  text: 'text-green-700' },
  in_einsatz:     { label: 'Im Einsatz',    bg: 'bg-blue-100',   text: 'text-blue-700' },
  wartung:        { label: 'In Wartung',    bg: 'bg-yellow-100', text: 'text-yellow-700' },
  defekt:         { label: 'Defekt',        bg: 'bg-red-100',    text: 'text-red-700' },
  ausser_betrieb: { label: 'Außer Betrieb', bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const TABS = [
  { id: 'geraeteverwaltung',    label: 'Geräteverwaltung' },
  { id: 'wartungen_pruefungen', label: 'Wartungen & Prüfungen' },
  { id: 'standort',             label: 'Standort & Verfügbarkeit' },
  { id: 'historie',             label: 'Historie' },
];

const MASCHINEN_FELD_LABELS = {
  name: 'Name', typ: 'Typ', hersteller: 'Hersteller', modell: 'Modell',
  seriennummer: 'Seriennummer', inventarnummer: 'Inventarnummer', baujahr: 'Baujahr',
  kaufdatum: 'Kaufdatum', anschaffungswert: 'Anschaffungswert', lagerort: 'Lagerort',
  zustand: 'Zustand', naechste_pruefung_datum: 'Nächste Prüfung', notiz: 'Notiz',
};

const VERFUEGBARKEIT_CONFIG = {
  verfuegbar:    { label: 'Verfügbar',     bg: 'bg-green-100',  text: 'text-green-700' },
  im_einsatz:    { label: 'Im Einsatz',    bg: 'bg-blue-100',   text: 'text-blue-700' },
  in_wartung:    { label: 'In Wartung',    bg: 'bg-yellow-100', text: 'text-yellow-700' },
  ausser_betrieb:{ label: 'Außer Betrieb', bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const EMPTY_STANDORT = {
  standort: '', verfuegbarkeitsstatus: 'verfuegbar', zugewiesen_an: '',
  einsatzgebiet: '', naechste_verfuegbarkeit: '', notizen: '',
};

const PRUEFUNG_ART_OPTIONS = [
  // ── Elektrische Betriebsmittel ──────────────────────────────────────────────
  { value: 'uvv',                     label: 'UVV-Prüfung (DGUV V1)' },
  { value: 'dguv_v3_ortsveraenderl',  label: 'DGUV V3 – Elektrische Betriebsmittel (ortsveränderlich)' },
  { value: 'dguv_v4_ortsfest',        label: 'DGUV V4 – Ortsfeste elektrische Anlagen' },
  { value: 'vde_0701_0702',           label: 'VDE 0701/0702 – Wiederholungsprüfung nach Reparatur' },
  // ── Hebezeuge / Krane ───────────────────────────────────────────────────────
  { value: 'dguv_v52_krane',          label: 'DGUV V52 – Krane' },
  { value: 'dguv_v54_winden',         label: 'DGUV V54 – Winden, Hub- und Zuggeräte' },
  { value: 'betrsichv_hebebuehne',    label: 'BetrSichV – Hebebøhne / Arbeitsbøhne' },
  { value: 'lastaufnahmemittel',      label: 'Lastaufnahmemittel-Prüfung (DGUV V54)' },
  // ── Druckgeräte / Hydraulik ─────────────────────────────────────────────────
  { value: 'druckgeraet_betrsichv',   label: 'Druckgeräteprøfung (BetrSichV / DGRL 2014/68/EU)' },
  { value: 'druckbehaelter_zuev',     label: 'Druckbehälter – ZÜS-Prüfung (§ 15 BetrSichV)' },
  { value: 'druckpruefung_leitung',   label: 'Druckprøfung Leitung / Hydraulik' },
  // ── Flurförderzeuge ─────────────────────────────────────────────────────────
  { value: 'dguv_v68_fahrzeuge',      label: 'DGUV V68/V70 – Flurförderzeuge / Stapler' },
  // ── Rohr- und Kanaltechnik ──────────────────────────────────────────────────
  { value: 'kanalinspektion_tv',      label: 'Kanalinspektion (DIN EN 13508-2 / TV-Inspektion)' },
  { value: 'dichtheitspruefung',      label: 'Dichtheitsprüfung (DIN EN 1610 / § 60 WHG)' },
  { value: 'abscheider_din4040',      label: 'Abscheiderprüfung Fett (DIN 4040-100)' },
  { value: 'abscheider_lfa_din1999',  label: 'Leichtflüssigkeitsabscheider (DIN 1999-100)' },
  { value: 'eigenüuerwachung_ekvo',   label: 'Eigenøberwachung Abwasser (EKVO / SøwVO Abw)' },
  { value: 'schlauchliner_din11296',  label: 'Schlauchliner-Abnahme (DIN EN ISO 11296-4)' },
  { value: 'kurzliner_abnahme',       label: 'Kurzliner-Abnahme (DIN EN 13566)' },
  { value: 'druckrohrleitung_trbs',   label: 'Druckrohrleitung Abwasser (TRBS 1201 / DGRL)' },
  // ── Allgemein / BetrSichV ───────────────────────────────────────────────────
  { value: 'betrsichv_arbeitsmittel', label: 'Arbeitsmittelprüfung (§ 3 BetrSichV)' },
  { value: 'zuev_pruefung',           label: 'ZÜS-Prüfung – Zugelassene Überwachungsstelle' },
  { value: 'sachverstaendiger',       label: 'Sachverständigenprøfung (extern)' },
  { value: 'wiederkehrend',           label: 'Wiederkehrende Prüfung (allgemein)' },
  { value: 'interne_pruefung',        label: 'Interne Sicherheitsprüfung' },
  { value: 'sonstiges',               label: 'Sonstige' },
];

const PRUEFUNG_ERGEBNIS_CONFIG = {
  bestanden:       { label: 'Bestanden',       bg: 'bg-green-100',  text: 'text-green-700' },
  mit_maengeln:    { label: 'Mit Mängeln',     bg: 'bg-yellow-100', text: 'text-yellow-700' },
  nicht_bestanden: { label: 'Nicht bestanden', bg: 'bg-red-100',    text: 'text-red-700' },
};

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ d, className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  back:  'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18',
  tool:  'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z',
  save:  'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z',
  trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  check: 'M4.5 12.75l6 6 9-13.5',
  plus:  'M12 4.5v15m7.5-7.5h-15',
  clip:  'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
  wrench:'M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z',
};

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
function ZustandBadge({ zustand }) {
  const cfg = ZUSTAND_CONFIG[zustand] ?? { label: zustand, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function ErgebnisBadge({ ergebnis }) {
  const cfg = PRUEFUNG_ERGEBNIS_CONFIG[ergebnis] ?? { label: ergebnis, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function LabelInput({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function inputCls(extra = '') {
  return `w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${extra}`;
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('de-DE');
}

function fmtCurrency(v) {
  if (v == null) return null;
  return Number(v).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function MaschinenDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [maschine, setMaschine]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('geraeteverwaltung');
  const [companyId, setCompanyId]   = useState(null);
  const [userId, setUserId]         = useState(null);
  const [userName, setUserName]     = useState('');

  // Geräteverwaltung
  const [editing, setEditing]       = useState(false);
  const [form, setForm]             = useState({});
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Prüfungen
  const [pruefungen, setPruefungen]         = useState([]);
  const [pruefungView, setPruefungView]     = useState('list');
  const [pruefungForm, setPruefungForm]     = useState({});
  const [savingPruefung, setSavingPruefung] = useState(false);
  const [delPruefungId, setDelPruefungId]   = useState(null);

  // Wartungen
  const [wartungen, setWartungen]           = useState([]);
  const [wartungView, setWartungView]       = useState('list');
  const [wartungForm, setWartungForm]       = useState({});
  const [savingWartung, setSavingWartung]   = useState(false);
  const [delWartungId, setDelWartungId]     = useState(null);

  // Standort & Verføgbarkeit
  const [standort, setStandort]             = useState(null);

  const [standortLaden, setStandortLaden]   = useState(false);
  const [standortForm, setStandortForm]     = useState({ ...EMPTY_STANDORT });
  const [standortEditing, setStandortEditing] = useState(false);
  const [savingStandort, setSavingStandort] = useState(false);
  const [standortError, setStandortError]   = useState('');
  const [standortSaved, setStandortSaved]   = useState(false);

  // Historie
  const [historieEintraege, setHistorieEintraege] = useState([]);
  const [historieLaden, setHistorieLaden]         = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      setUserName(user.user_metadata?.full_name || user.email || user.id);
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      if (member) setCompanyId(member.company_id);
    }
    const { data } = await supabase.from('maschinen').select('*').eq('id', id).single();
    setMaschine(data);
    setLoading(false);
  }, [id]);

  const loadPruefungen = useCallback(async () => {
    const { data } = await supabase
      .from('maschinen_pruefungen')
      .select('*')
      .eq('maschine_id', id)
      .order('datum', { ascending: false });
    setPruefungen(data ?? []);
  }, [id]);

  const loadStandort = useCallback(async () => {
    setStandortLaden(true);
    const { data } = await supabase.from('maschinen_standort').select('*').eq('maschine_id', id).maybeSingle();
    if (data) {
      setStandort(data);
      setStandortForm({
        standort: data.standort ?? '',
        verfuegbarkeitsstatus: data.verfuegbarkeitsstatus ?? 'verfuegbar',
        zugewiesen_an: data.zugewiesen_an ?? '',
        einsatzgebiet: data.einsatzgebiet ?? '',
        naechste_verfuegbarkeit: data.naechste_verfuegbarkeit ?? '',
        notizen: data.notizen ?? '',
      });
      setStandortEditing(false);
    } else {
      setStandort(null);
      setStandortForm({ ...EMPTY_STANDORT });
      setStandortEditing(true);
    }
    setStandortLaden(false);
  }, [id]);

  const loadWartungen = useCallback(async () => {
    const { data } = await supabase
      .from('maschinen_wartungen')
      .select('*')
      .eq('maschine_id', id)
      .order('datum', { ascending: false });
    setWartungen(data ?? []);
  }, [id]);

  const loadHistorie = useCallback(async () => {
    setHistorieLaden(true);
    const { data } = await supabase.from('maschinen_historie').select('*').eq('maschine_id', id).order('zeitpunkt', { ascending: false }).limit(200);
    setHistorieEintraege(data ?? []);
    setHistorieLaden(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === 'wartungen_pruefungen') {
      loadPruefungen();
      loadWartungen();
    }
  }, [activeTab, loadPruefungen, loadWartungen]);

  useEffect(() => { if (activeTab === 'standort') loadStandort(); }, [activeTab, loadStandort]);
  useEffect(() => { if (activeTab === 'historie') loadHistorie(); }, [activeTab, loadHistorie]);

  // ── Geräteverwaltung ──────────────────────────────────────────────────────
  function startEdit() {
    setForm({
      name:              maschine.name              ?? '',
      typ:               maschine.typ               ?? 'sonstiges',
      hersteller:        maschine.hersteller         ?? '',
      modell:            maschine.modell             ?? '',
      seriennummer:      maschine.seriennummer       ?? '',
      inventarnummer:    maschine.inventarnummer     ?? '',
      baujahr:           maschine.baujahr            ?? '',
      kaufdatum:         maschine.kaufdatum          ?? '',
      anschaffungswert:  maschine.anschaffungswert   ?? '',
      lagerort:          maschine.lagerort           ?? '',
      zustand:           maschine.zustand            ?? 'aktiv',
      naechste_pruefung_datum: maschine.naechste_pruefung_datum ?? '',
      notiz:             maschine.notiz              ?? '',
    });
    setEditing(true);
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    // Detect changed fields for Änderungsprotokoll
    const neuWerte = {
      name:             form.name.trim(),
      typ:              form.typ,
      hersteller:       form.hersteller.trim()    || null,
      modell:           form.modell.trim()         || null,
      seriennummer:     form.seriennummer.trim()   || null,
      inventarnummer:   form.inventarnummer.trim() || null,
      baujahr:          form.baujahr               || null,
      kaufdatum:        form.kaufdatum              || null,
      anschaffungswert: form.anschaffungswert !== '' ? parseFloat(form.anschaffungswert) : null,
      lagerort:         form.lagerort.trim()       || null,
      zustand:          form.zustand,
      naechste_pruefung_datum: form.naechste_pruefung_datum || null,
      notiz:            form.notiz.trim()          || null,
    };
    const changedFields = Object.keys(MASCHINEN_FELD_LABELS).reduce((acc, key) => {
      const alt = maschine?.[key] ?? null;
      const neu = neuWerte[key] ?? null;
      if (String(alt ?? '') !== String(neu ?? '')) acc.push({ feld: MASCHINEN_FELD_LABELS[key], alt: alt ?? '', neu: neu ?? '' });
      return acc;
    }, []);

    await supabase.from('maschinen').update(neuWerte).eq('id', id);

    // Write history entry
    if (changedFields.length > 0 && companyId) {
      await supabase.from('maschinen_historie').insert({ maschine_id: id, company_id: companyId, benutzer_id: userId || null, benutzer_name: userName || null, aktion: 'Änderung', felder: changedFields });
      if (activeTab === 'historie') loadHistorie();
    }

    await load();
    setEditing(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from('maschinen').delete().eq('id', id);
    router.push('/dashboard/maschinen');
  }

  // ── Prüfungen ─────────────────────────────────────────────────────────────
  function startAddPruefung() {
    setPruefungForm({ art: 'uvv', datum: '', pruefer: '', naechstes_datum: '', ergebnis: 'bestanden', kosten: '', notiz: '' });
    setPruefungView('add');
  }

  async function savePruefung(e) {
    e.preventDefault();
    setSavingPruefung(true);
    await supabase.from('maschinen_pruefungen').insert({
      maschine_id:     id,
      art:             pruefungForm.art,
      datum:           pruefungForm.datum,
      pruefer:         pruefungForm.pruefer         || null,
      naechstes_datum: pruefungForm.naechstes_datum || null,
      ergebnis:        pruefungForm.ergebnis,
      kosten:          pruefungForm.kosten ? parseFloat(pruefungForm.kosten) : null,
      notiz:           pruefungForm.notiz           || null,
    });
    if (pruefungForm.naechstes_datum) {
      await supabase.from('maschinen').update({ naechste_pruefung_datum: pruefungForm.naechstes_datum }).eq('id', id);
      await load();
    }
    await loadPruefungen();
    setPruefungView('list');
    setSavingPruefung(false);
  }

  async function deletePruefung(pId) {
    await supabase.from('maschinen_pruefungen').delete().eq('id', pId);
    setDelPruefungId(null);
    await loadPruefungen();
  }

  // ── Wartungen ─────────────────────────────────────────────────────────────
  function startAddWartung() {
    setWartungForm({ art: '', datum: '', betriebsstunden: '', naechste_datum: '', naechste_stunden: '', werkstatt: '', kosten: '', notiz: '' });
    setWartungView('add');
  }

  async function saveWartung(e) {
    e.preventDefault();
    setSavingWartung(true);
    await supabase.from('maschinen_wartungen').insert({
      maschine_id:      id,
      art:              wartungForm.art              || null,
      datum:            wartungForm.datum,
      betriebsstunden:  wartungForm.betriebsstunden  ? parseFloat(wartungForm.betriebsstunden)  : null,
      naechste_datum:   wartungForm.naechste_datum   || null,
      naechste_stunden: wartungForm.naechste_stunden ? parseFloat(wartungForm.naechste_stunden) : null,
      werkstatt:        wartungForm.werkstatt        || null,
      kosten:           wartungForm.kosten           ? parseFloat(wartungForm.kosten)           : null,
      notiz:            wartungForm.notiz            || null,
    });
    await loadWartungen();
    setWartungView('list');
    setSavingWartung(false);
  }

  async function deleteWartung(wId) {
    await supabase.from('maschinen_wartungen').delete().eq('id', wId);
    setDelWartungId(null);
    await loadWartungen();
  }

  async function handleStandortSave(e) {
    e.preventDefault();
    setSavingStandort(true); setStandortError('');
    const payload = {
      maschine_id: id, company_id: companyId,
      standort: standortForm.standort.trim() || null,
      verfuegbarkeitsstatus: standortForm.verfuegbarkeitsstatus,
      zugewiesen_an: standortForm.zugewiesen_an.trim() || null,
      einsatzgebiet: standortForm.einsatzgebiet.trim() || null,
      naechste_verfuegbarkeit: standortForm.naechste_verfuegbarkeit || null,
      notizen: standortForm.notizen.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('maschinen_standort')
      .upsert(payload, { onConflict: 'maschine_id' })
      .select().single();
    setSavingStandort(false);
    if (error) { setStandortError(error.message); return; }
    setStandort(data);
    setStandortEditing(false);
    setStandortSaved(true);
    setTimeout(() => setStandortSaved(false), 3000);
  }

  if (loading) return <div className="p-8 text-gray-400">Lade…</div>;
  if (!maschine) return <div className="p-8 text-gray-400">Maschine nicht gefunden.</div>;

  const typLabel = MASCHINENTYP_OPTIONS.find(o => o.value === maschine.typ)?.label ?? maschine.typ;

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/maschinen')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
            <Icon d={ICONS.back} className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Icon d={ICONS.tool} className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{maschine.name}</h1>
            <p className="text-sm text-gray-500">{typLabel}</p>
          </div>
          <ZustandBadge zustand={maschine.zustand} />
        </div>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Icon d={ICONS.check} className="w-4 h-4" />Gespeichert
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Geräteverwaltung ─────────────────────────────────────────── */}
      {activeTab === 'geraeteverwaltung' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          {!editing ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Stammdaten</h2>
                <button onClick={startEdit}
                  className="px-4 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition">
                  Bearbeiten
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <Field label="Bezeichnung"      value={maschine.name} />
                <Field label="Typ"              value={typLabel} />
                <Field label="Hersteller"       value={maschine.hersteller} />
                <Field label="Modell"           value={maschine.modell} />
                <Field label="Seriennummer"     value={maschine.seriennummer} />
                <Field label="Inventarnummer"   value={maschine.inventarnummer} />
                <Field label="Baujahr"          value={maschine.baujahr} />
                <Field label="Kaufdatum"        value={fmtDate(maschine.kaufdatum)} />
                <Field label="Anschaffungswert" value={fmtCurrency(maschine.anschaffungswert)} />
                <Field label="Standort / Lagerort" value={maschine.lagerort} />
                <Field label="Zustand"          value={ZUSTAND_CONFIG[maschine.zustand]?.label ?? maschine.zustand} />
                <Field label="Nächste Prüfung"  value={fmtDate(maschine.naechste_pruefung_datum)}
                  warn={!!maschine.naechste_pruefung_datum && (new Date(maschine.naechste_pruefung_datum) - new Date()) / 86400000 <= 30} />
                <Field label="Betriebsstunden"
                  value={maschine.betriebsstunden_aktuell > 0
                    ? `${Number(maschine.betriebsstunden_aktuell).toLocaleString('de-DE')} Bst.`
                    : null} />
              </div>
              {maschine.notiz && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Notiz</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{maschine.notiz}</p>
                </div>
              )}
              <div className="mt-8 pt-5 border-t border-gray-100">
                {!confirmDel ? (
                  <button onClick={() => setConfirmDel(true)}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition">
                    <Icon d={ICONS.trash} className="w-4 h-4" />Maschine löschen
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">Wirklich löschen?</span>
                    <button onClick={handleDelete} disabled={deleting}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition">
                      {deleting ? 'Lösche…' : 'Ja, löschen'}
                    </button>
                    <button onClick={() => setConfirmDel(false)}
                      className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Stammdaten bearbeiten</h2>
              </div>
              <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelInput label="Bezeichnung" required>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputCls()} />
                </LabelInput>
                <LabelInput label="Typ">
                  <select value={form.typ} onChange={e => setForm(f => ({ ...f, typ: e.target.value }))} className={inputCls()}>
                    {MASCHINENTYP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </LabelInput>
                <LabelInput label="Hersteller">
                  <input type="text" value={form.hersteller} onChange={e => setForm(f => ({ ...f, hersteller: e.target.value }))} placeholder="z.B. Atlas Copco" className={inputCls()} />
                </LabelInput>
                <LabelInput label="Modell">
                  <input type="text" value={form.modell} onChange={e => setForm(f => ({ ...f, modell: e.target.value }))} placeholder="z.B. GA 11" className={inputCls()} />
                </LabelInput>
                <LabelInput label="Seriennummer">
                  <input type="text" value={form.seriennummer} onChange={e => setForm(f => ({ ...f, seriennummer: e.target.value }))} className={inputCls()} />
                </LabelInput>
                <LabelInput label="Inventarnummer">
                  <input type="text" value={form.inventarnummer} onChange={e => setForm(f => ({ ...f, inventarnummer: e.target.value }))} className={inputCls()} />
                </LabelInput>
                <LabelInput label="Baujahr">
                  <input type="number" value={form.baujahr} onChange={e => setForm(f => ({ ...f, baujahr: e.target.value }))} min="1900" max="2099" placeholder="z.B. 2018" className={inputCls()} />
                </LabelInput>
                <LabelInput label="Kaufdatum">
                  <input type="date" value={form.kaufdatum} onChange={e => setForm(f => ({ ...f, kaufdatum: e.target.value }))} className={inputCls()} />
                </LabelInput>
                <LabelInput label="Anschaffungswert (€)">
                  <input type="number" value={form.anschaffungswert} onChange={e => setForm(f => ({ ...f, anschaffungswert: e.target.value }))} min="0" step="0.01" placeholder="0.00" className={inputCls()} />
                </LabelInput>
                <LabelInput label="Standort / Lagerort">
                  <input type="text" value={form.lagerort} onChange={e => setForm(f => ({ ...f, lagerort: e.target.value }))} placeholder="z.B. Halle 2, Baustelle A" className={inputCls()} />
                </LabelInput>
                <LabelInput label="Zustand">
                  <select value={form.zustand} onChange={e => setForm(f => ({ ...f, zustand: e.target.value }))} className={inputCls()}>
                    {Object.entries(ZUSTAND_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </LabelInput>
                <LabelInput label="Nächste Prüfung">
                  <input type="date" value={form.naechste_pruefung_datum} onChange={e => setForm(f => ({ ...f, naechste_pruefung_datum: e.target.value }))} className={inputCls()} />
                </LabelInput>
                <div className="col-span-2">
                  <LabelInput label="Notiz / Bemerkung">
                    <textarea value={form.notiz} onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))} rows={3} placeholder="Interne Hinweise zur Maschine…" className={inputCls('resize-none')} />
                  </LabelInput>
                </div>
                <div className="col-span-2 flex gap-3 pt-2">
                  <button type="submit" disabled={saving || !form.name.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                    <Icon d={ICONS.save} className="w-4 h-4" />{saving ? 'Speichern…' : 'Speichern'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">
                    Abbrechen
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Wartungen & Prüfungen ───────────────────────────────────── */}
      {activeTab === 'wartungen_pruefungen' && (
        <div className="space-y-6">

          {/* Prøfungen-Karte */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Icon d={ICONS.clip} className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-900">Prüfungen & UVV</h2>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{pruefungen.length}</span>
              </div>
              {pruefungView === 'list' && (
                <button onClick={startAddPruefung}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition">
                  <Icon d={ICONS.plus} className="w-3.5 h-3.5" />Hinzufügen
                </button>
              )}
            </div>

            {pruefungView === 'list' ? (
              pruefungen.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-400">Noch keine Prüfungen eingetragen.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pruefungen.map(p => (
                    <div key={p.id} className="px-6 py-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {PRUEFUNG_ART_OPTIONS.find(o => o.value === p.art)?.label ?? p.art}
                          </span>
                          <ErgebnisBadge ergebnis={p.ergebnis} />
                        </div>
                        <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                          <span>Datum: {fmtDate(p.datum)}</span>
                          {p.pruefer && <span>Prüfer: {p.pruefer}</span>}
                          {p.naechstes_datum && <span>Nächste: {fmtDate(p.naechstes_datum)}</span>}
                          {p.kosten != null && <span>Kosten: {fmtCurrency(p.kosten)}</span>}
                        </div>
                        {p.notiz && <p className="text-xs text-gray-400 mt-1 truncate">{p.notiz}</p>}
                      </div>
                      <div className="shrink-0">
                        {delPruefungId === p.id ? (
                          <div className="flex items-center gap-2 text-xs">
                            <button onClick={() => deletePruefung(p.id)} className="text-red-600 hover:text-red-800 font-medium">Löschen</button>
                            <button onClick={() => setDelPruefungId(null)} className="text-gray-400 hover:text-gray-600">Abbrechen</button>
                          </div>
                        ) : (
                          <button onClick={() => setDelPruefungId(p.id)} className="text-gray-300 hover:text-red-400 transition">
                            <Icon d={ICONS.trash} className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <form onSubmit={savePruefung} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelInput label="Art" required>
                  <select value={pruefungForm.art} onChange={e => setPruefungForm(f => ({ ...f, art: e.target.value }))} className={inputCls()}>
                    {PRUEFUNG_ART_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </LabelInput>
                <LabelInput label="Ergebnis" required>
                  <select value={pruefungForm.ergebnis} onChange={e => setPruefungForm(f => ({ ...f, ergebnis: e.target.value }))} className={inputCls()}>
                    {Object.entries(PRUEFUNG_ERGEBNIS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </LabelInput>
                <LabelInput label="Datum" required>
                  <input type="date" value={pruefungForm.datum} onChange={e => setPruefungForm(f => ({ ...f, datum: e.target.value }))} required className={inputCls()} />
                </LabelInput>
                <LabelInput label="Prüfer">
                  <input type="text" value={pruefungForm.pruefer} onChange={e => setPruefungForm(f => ({ ...f, pruefer: e.target.value }))} placeholder="Name des Prüfers / der Stelle" className={inputCls()} />
                </LabelInput>
                <LabelInput label="Nächste Prüfung am">
                  <input type="date" value={pruefungForm.naechstes_datum} onChange={e => setPruefungForm(f => ({ ...f, naechstes_datum: e.target.value }))} className={inputCls()} />
                </LabelInput>
                <LabelInput label="Kosten (€)">
                  <input type="number" value={pruefungForm.kosten} onChange={e => setPruefungForm(f => ({ ...f, kosten: e.target.value }))} min="0" step="0.01" placeholder="0.00" className={inputCls()} />
                </LabelInput>
                <div className="col-span-2">
                  <LabelInput label="Notiz">
                    <textarea value={pruefungForm.notiz} onChange={e => setPruefungForm(f => ({ ...f, notiz: e.target.value }))} rows={2} className={inputCls('resize-none')} />
                  </LabelInput>
                </div>
                <div className="col-span-2 flex gap-3 pt-1">
                  <button type="submit" disabled={savingPruefung || !pruefungForm.datum}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                    <Icon d={ICONS.save} className="w-4 h-4" />{savingPruefung ? 'Speichern…' : 'Speichern'}
                  </button>
                  <button type="button" onClick={() => setPruefungView('list')}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">
                    Abbrechen
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Wartungen-Karte */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Icon d={ICONS.wrench} className="w-4 h-4 text-orange-500" />
                <h2 className="text-sm font-semibold text-gray-900">Wartungen</h2>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{wartungen.length}</span>
              </div>
              {wartungView === 'list' && (
                <button onClick={startAddWartung}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition">
                  <Icon d={ICONS.plus} className="w-3.5 h-3.5" />Hinzufügen
                </button>
              )}
            </div>

            {wartungView === 'list' ? (
              wartungen.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-400">Noch keine Wartungen eingetragen.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {wartungen.map(w => (
                    <div key={w.id} className="px-6 py-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">{w.art || 'Wartung'}</p>
                        <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                          <span>Datum: {fmtDate(w.datum)}</span>
                          {w.betriebsstunden != null && <span>bei {Number(w.betriebsstunden).toLocaleString('de-DE')} Bst.</span>}
                          {w.werkstatt && <span>von: {w.werkstatt}</span>}
                          {w.kosten != null && <span>Kosten: {fmtCurrency(w.kosten)}</span>}
                          {w.naechste_datum && <span>Nächste: {fmtDate(w.naechste_datum)}</span>}
                          {w.naechste_stunden != null && <span>bei {Number(w.naechste_stunden).toLocaleString('de-DE')} Bst.</span>}
                        </div>
                        {w.notiz && <p className="text-xs text-gray-400 mt-1 truncate">{w.notiz}</p>}
                      </div>
                      <div className="shrink-0">
                        {delWartungId === w.id ? (
                          <div className="flex items-center gap-2 text-xs">
                            <button onClick={() => deleteWartung(w.id)} className="text-red-600 hover:text-red-800 font-medium">Löschen</button>
                            <button onClick={() => setDelWartungId(null)} className="text-gray-400 hover:text-gray-600">Abbrechen</button>
                          </div>
                        ) : (
                          <button onClick={() => setDelWartungId(w.id)} className="text-gray-300 hover:text-red-400 transition">
                            <Icon d={ICONS.trash} className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <form onSubmit={saveWartung} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <LabelInput label="Art / Beschreibung">
                    <input type="text" value={wartungForm.art} onChange={e => setWartungForm(f => ({ ...f, art: e.target.value }))} placeholder="z.B. Ölwechsel, Filterwechsel, Inspektion…" className={inputCls()} />
                  </LabelInput>
                </div>
                <LabelInput label="Datum" required>
                  <input type="date" value={wartungForm.datum} onChange={e => setWartungForm(f => ({ ...f, datum: e.target.value }))} required className={inputCls()} />
                </LabelInput>
                <LabelInput label="Betriebsstunden bei Wartung">
                  <input type="number" value={wartungForm.betriebsstunden} onChange={e => setWartungForm(f => ({ ...f, betriebsstunden: e.target.value }))} min="0" step="0.1" placeholder="0.0" className={inputCls()} />
                </LabelInput>
                <LabelInput label="Nächste Wartung am">
                  <input type="date" value={wartungForm.naechste_datum} onChange={e => setWartungForm(f => ({ ...f, naechste_datum: e.target.value }))} className={inputCls()} />
                </LabelInput>
                <LabelInput label="Nächste Wartung bei Bst.">
                  <input type="number" value={wartungForm.naechste_stunden} onChange={e => setWartungForm(f => ({ ...f, naechste_stunden: e.target.value }))} min="0" step="0.1" placeholder="0.0" className={inputCls()} />
                </LabelInput>
                <LabelInput label="Werkstatt / Durchgeføhrt von">
                  <input type="text" value={wartungForm.werkstatt} onChange={e => setWartungForm(f => ({ ...f, werkstatt: e.target.value }))} placeholder="z.B. Intern, Werkstatt Müller" className={inputCls()} />
                </LabelInput>
                <LabelInput label="Kosten (€)">
                  <input type="number" value={wartungForm.kosten} onChange={e => setWartungForm(f => ({ ...f, kosten: e.target.value }))} min="0" step="0.01" placeholder="0.00" className={inputCls()} />
                </LabelInput>
                <div className="col-span-2">
                  <LabelInput label="Notiz">
                    <textarea value={wartungForm.notiz} onChange={e => setWartungForm(f => ({ ...f, notiz: e.target.value }))} rows={2} className={inputCls('resize-none')} />
                  </LabelInput>
                </div>
                <div className="col-span-2 flex gap-3 pt-1">
                  <button type="submit" disabled={savingWartung || !wartungForm.datum}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                    <Icon d={ICONS.save} className="w-4 h-4" />{savingWartung ? 'Speichern…' : 'Speichern'}
                  </button>
                  <button type="button" onClick={() => setWartungView('list')}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">
                    Abbrechen
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      )}

      {/* ── Tab: Standort & Verfügbarkeit ──────────────────────────────────── */}
      {activeTab === 'standort' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Standort & Verfügbarkeit</h2>
              <p className="text-xs text-gray-500 mt-0.5">Aktueller Standort und Einsatzstatus dieser Maschine</p>
            </div>
            {!standortEditing && standort && (
              <div className="flex items-center gap-2">
                {standortSaved && <span className="text-sm text-green-600 font-medium">Gespeichert</span>}
                <button type="button" onClick={() => setStandortEditing(true)}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition">
                  Bearbeiten
                </button>
              </div>
            )}
          </div>

          {standortLaden ? (
            <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p>
          ) : standortEditing ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <form onSubmit={handleStandortSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LabelInput label="Aktueller Standort / Depot">
                    <input className={inputCls()} value={standortForm.standort}
                      onChange={e => setStandortForm(f => ({ ...f, standort: e.target.value }))}
                      placeholder="z. B. Lager Köln, Baustelle A4" />
                  </LabelInput>
                  <LabelInput label="Verføgbarkeitsstatus">
                    <select className={inputCls()} value={standortForm.verfuegbarkeitsstatus}
                      onChange={e => setStandortForm(f => ({ ...f, verfuegbarkeitsstatus: e.target.value }))}>
                      {Object.entries(VERFUEGBARKEIT_CONFIG).map(([v, c]) => (
                        <option key={v} value={v}>{c.label}</option>
                      ))}
                    </select>
                  </LabelInput>
                  <LabelInput label="Zugewiesen an (Mitarbeiter / Team)">
                    <input className={inputCls()} value={standortForm.zugewiesen_an}
                      onChange={e => setStandortForm(f => ({ ...f, zugewiesen_an: e.target.value }))}
                      placeholder="z. B. Max Mustermann, Team Nord" />
                  </LabelInput>
                  <LabelInput label="Einsatzgebiet">
                    <input className={inputCls()} value={standortForm.einsatzgebiet}
                      onChange={e => setStandortForm(f => ({ ...f, einsatzgebiet: e.target.value }))}
                      placeholder="z. B. Region Köln, NRW" />
                  </LabelInput>
                  {standortForm.verfuegbarkeitsstatus !== 'verfuegbar' && (
                    <LabelInput label="Nächste Verføgbarkeit">
                      <input type="date" className={inputCls()} value={standortForm.naechste_verfuegbarkeit}
                        onChange={e => setStandortForm(f => ({ ...f, naechste_verfuegbarkeit: e.target.value }))} />
                    </LabelInput>
                  )}
                </div>
                <LabelInput label="Notizen">
                  <textarea rows={2} className={inputCls('resize-none')} value={standortForm.notizen}
                    onChange={e => setStandortForm(f => ({ ...f, notizen: e.target.value }))} />
                </LabelInput>
                {standortError && <p className="text-sm text-red-500">{standortError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={savingStandort}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                    <Icon d={ICONS.save} className="w-4 h-4" />{savingStandort ? 'Speichern…' : 'Speichern'}
                  </button>
                  {standort && (
                    <button type="button" onClick={() => setStandortEditing(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">
                      Abbrechen
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : standort ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              {standortSaved && (
                <div className="mb-4 px-3 py-2 bg-green-50 text-green-700 text-sm rounded-xl">Änderungen gespeichert.</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Verfügbarkeitsstatus</p>
                  {(() => {
                    const cfg = VERFUEGBARKEIT_CONFIG[standort.verfuegbarkeitsstatus] ?? VERFUEGBARKEIT_CONFIG.verfuegbar;
                    return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
                  })()}
                </div>
                {standort.standort && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Standort / Depot</p>
                    <p className="text-gray-900 font-medium">{standort.standort}</p>
                  </div>
                )}
                {standort.zugewiesen_an && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Zugewiesen an</p>
                    <p className="text-gray-900 font-medium">{standort.zugewiesen_an}</p>
                  </div>
                )}
                {standort.einsatzgebiet && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Einsatzgebiet</p>
                    <p className="text-gray-900 font-medium">{standort.einsatzgebiet}</p>
                  </div>
                )}
                {standort.naechste_verfuegbarkeit && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Nächste Verfügbarkeit</p>
                    <p className="text-gray-900 font-medium">
                      {new Date(standort.naechste_verfuegbarkeit).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                )}
                {standort.notizen && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Notizen</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{standort.notizen}</p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-300">
                    Zuletzt aktualisiert: {new Date(standort.updated_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── HISTORIE ── */}
      {activeTab === 'historie' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Änderungsprotokoll</h2>
            <p className="text-xs text-gray-400 mt-0.5">Alle Änderungen an den Maschinendaten</p>
          </div>
          {historieLaden ? (
            <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p>
          ) : historieEintraege.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Noch keine Änderungen protokolliert</p>
              <p className="text-xs text-gray-400 mt-1">Änderungen an den Maschinendaten werden hier aufgezeichnet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historieEintraege.map(eintrag => (
                <div key={eintrag.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{eintrag.aktion}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(eintrag.zeitpunkt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {eintrag.benutzer_name && <span className="text-xs text-gray-400">· {eintrag.benutzer_name}</span>}
                  </div>
                  <div className="space-y-1.5">
                    {(eintrag.felder ?? []).map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="font-medium text-gray-600 shrink-0 w-32">{f.feld}</span>
                        <span className="text-gray-400 shrink-0">von</span>
                        <span className="text-red-500 line-through truncate max-w-xs">{f.alt !== '' && f.alt != null ? String(f.alt) : <span className="italic text-gray-300">leer</span>}</span>
                        <span className="text-gray-400 shrink-0">zu</span>
                        <span className="text-emerald-600 font-medium truncate max-w-xs">{f.neu !== '' && f.neu != null ? String(f.neu) : <span className="italic text-gray-300 font-normal">leer</span>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Feld-Anzeige ──────────────────────────────────────────────────────────────
function Field({ label, value, warn = false }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${warn ? 'text-red-600' : 'text-gray-800'}`}>
        {value ?? <span className="text-gray-300 font-normal">—</span>}
      </p>
    </div>
  );
}
