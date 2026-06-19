'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const TABS = [
  { id: 'fahrzeugdaten',  label: 'Fahrzeugdaten' },
  { id: 'tuev_uvv',       label: 'TÃV & UVV' },
  { id: 'wartungen',      label: 'Wartungen' },
  { id: 'kilometerstand', label: 'Kilometerstand' },
];

const TYP_OPTIONS = [
  { value: '', label: 'â Bitte wÃ¤hlen â' },
  { value: 'pkw', label: 'PKW' },
  { value: 'lkw', label: 'LKW' },
  { value: 'transporter', label: 'Transporter' },
  { value: 'kleintransporter', label: 'Kleintransporter' },
  { value: 'anhÃ¤nger', label: 'AnhÃ¤nger' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

const KRAFTSTOFF_OPTIONS = [
  { value: '', label: 'â Bitte wÃ¤hlen â' },
  { value: 'benzin', label: 'Benzin' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'elektro', label: 'Elektro' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'erdgas', label: 'Erdgas (CNG)' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

const ZUSTAND_OPTIONS = [
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'wartung', label: 'In Wartung' },
  { value: 'reserviert', label: 'Reserviert' },
  { value: 'ausser_betrieb', label: 'AuÃer Betrieb' },
];

const ZUSTAND_COLORS = {
  aktiv: 'bg-emerald-50 text-emerald-700',
  wartung: 'bg-amber-50 text-amber-700',
  reserviert: 'bg-blue-50 text-blue-700',
  ausser_betrieb: 'bg-red-50 text-red-600',
};

const ART_LABELS = {
  tuev: 'TÃV',
  hu: 'HU (Hauptuntersuchung)',
  uvv: 'UVV-PrÃ¼fung',
  sonstiges: 'Sonstige PrÃ¼fung',
};

const ERGEBNIS_OPTIONS = [
  { value: '', label: 'â Ergebnis wÃ¤hlen â' },
  { value: 'bestanden', label: 'Bestanden' },
  { value: 'mit_maengeln', label: 'Bestanden mit MÃ¤ngeln' },
  { value: 'nicht_bestanden', label: 'Nicht bestanden' },
];

const ERGEBNIS_COLORS = {
  bestanden: 'bg-emerald-50 text-emerald-700',
  mit_maengeln: 'bg-amber-50 text-amber-700',
  nicht_bestanden: 'bg-red-50 text-red-600',
};

const WARTUNG_ART_OPTIONS = [
  { value: 'oelwechsel', label: 'Ãlwechsel' },
  { value: 'oelfilter', label: 'Ãlfilter' },
  { value: 'luftfilter', label: 'Luftfilter' },
  { value: 'kraftstofffilter', label: 'Kraftstofffilter' },
  { value: 'bremsen', label: 'Bremsen / BremsbelÃ¤ge' },
  { value: 'reifen', label: 'Reifen / Reifenwechsel' },
  { value: 'batterie', label: 'Batterie' },
  { value: 'zahnriemen', label: 'Zahnriemen / Steuerkette' },
  { value: 'klimaanlage', label: 'Klimaanlage' },
  { value: 'inspektion', label: 'Hauptinspektion' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

const ZWECK_OPTIONS = [
  { value: 'dienstfahrt', label: 'Dienstfahrt', cls: 'bg-blue-50 text-blue-700' },
  { value: 'privatfahrt', label: 'Privatfahrt', cls: 'bg-purple-50 text-purple-700' },
  { value: 'tankfahrt', label: 'Tankfahrt', cls: 'bg-emerald-50 text-emerald-700' },
  { value: 'sonstiges', label: 'Sonstiges', cls: 'bg-gray-50 text-gray-500' },
];

function newFahrt() {
  return {
    rowId: Math.random().toString(36).slice(2),
    datum: '',
    km_start: '',
    km_ende: '',
    fahrer: '',
    zweck: 'dienstfahrt',
  };
}

function datumsStatus(datum) {
  if (!datum) return null;
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const d = new Date(datum);
  const diffTage = Math.ceil((d - heute) / (1000 * 60 * 60 * 24));
  if (diffTage < 0) return { label: 'ÃberfÃ¤llig', diffTage, cls: 'text-red-600 font-medium', severity: 'danger' };
  if (diffTage <= 30) return { label: `In ${diffTage} Tagen fÃ¤llig`, diffTage, cls: 'text-red-500 font-medium', severity: 'danger' };
  if (diffTage <= 90) return { label: `In ${diffTage} Tagen fÃ¤llig`, diffTage, cls: 'text-amber-600', severity: 'warn' };
  return { label: `In ${diffTage} Tagen fÃ¤llig`, diffTage, cls: 'text-emerald-600', severity: 'ok' };
}

function pruefDatumsStatus(datum) {
  if (!datum) return null;
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const d = new Date(datum);
  const diffTage = Math.ceil((d - heute) / (1000 * 60 * 60 * 24));
  if (diffTage < 0) return { label: 'Abgelaufen', diffTage, cls: 'text-red-600 font-medium', severity: 'danger' };
  if (diffTage <= 30) return { label: `LÃ¤uft in ${diffTage} Tagen ab`, diffTage, cls: 'text-red-500 font-medium', severity: 'danger' };
  if (diffTage <= 90) return { label: `LÃ¤uft in ${diffTage} Tagen ab`, diffTage, cls: 'text-amber-600', severity: 'warn' };
  return { label: `GÃ¸ltig noch ${diffTage} Tage`, diffTage, cls: 'text-emerald-600', severity: 'ok' };
}

function kmStatus(naechsteKm, aktuellerKm) {
  if (!naechsteKm || !aktuellerKm) return null;
  const diff = naechsteKm - aktuellerKm;
  if (diff <= 0) return { label: `ÃberfÃ¤llig (${Math.abs(diff).toLocaleString('de-DE')} km Ã¼berschritten)`, cls: 'text-red-600 font-medium', severity: 'danger' };
  if (diff <= 1000) return { label: `Noch ${diff.toLocaleString('de-DE')} km`, cls: 'text-red-500 font-medium', severity: 'danger' };
  if (diff <= 3000) return { label: `Noch ${diff.toLocaleString('de-DE')} km`, cls: 'text-amber-600', severity: 'warn' };
  return { label: `Noch ${diff.toLocaleString('de-DE')} km`, cls: 'text-emerald-600', severity: 'ok' };
}

function formatDate(d) {
  if (!d) return 'â';
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMonthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(key) {
  const [year, month] = key.split('-');
  const names = ['Januar', 'Februar', 'MÃ¤rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${names[parseInt(month) - 1]} ${year}`;
}

function currentMonthValue() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function LabelInput({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const cellInputCls = 'w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const WarnIcon = ({ cls }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 shrink-0 ${cls}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-300">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export default function FahrzeugDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState('fahrzeugdaten');
  const [fahrzeug, setFahrzeug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [companyId, setCompanyId] = useState(null);

  // Fahrzeugdaten
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ kennzeichen: '', marke: '', modell: '', typ: '', baujahr: '', farbe: '', kraftstoff: '', km_stand: '', tuev_bis: '', hu_bis: '', uvv_bis: '', versicherung: '', zustand: 'aktiv', notizen: '' });

  // TÃV & UVV
  const [pruefungen, setPruefungen] = useState([]);
  const [pruefLaden, setPruefLaden] = useState(false);
  const [pruefNeuShown, setPruefNeuShown] = useState(false);
  const [pruefNeuSaving, setPruefNeuSaving] = useState(false);
  const [pruefNeuError, setPruefNeuError] = useState('');
  const [deletingPruefId, setDeletingPruefId] = useState(null);
  const [pruefForm, setPruefForm] = useState({ art: 'tuev', pruef_datum: '', gueltig_bis: '', pruefstelle: '', ergebnis: '', notiz: '' });
  const [fristenSaving, setFristenSaving] = useState(false);
  const [fristenSuccess, setFristenSuccess] = useState(false);
  const [fristenError, setFristenError] = useState('');
  const [fristenForm, setFristenForm] = useState({ tuev_bis: '', hu_bis: '', uvv_bis: '' });

  // Wartungen
  const [wartungen, setWartungen] = useState([]);
  const [wartLaden, setWartLaden] = useState(false);
  const [wartNeuShown, setWartNeuShown] = useState(false);
  const [wartNeuSaving, setWartNeuSaving] = useState(false);
  const [wartNeuError, setWartNeuError] = useState('');
  const [deletingWartId, setDeletingWartId] = useState(null);
  const [wartForm, setWartForm] = useState({ art: 'inspektion', datum: '', km_stand: '', naechste_datum: '', naechste_km: '', werkstatt: '', kosten: '', notiz: '' });
  const [naechsteWart, setNaechsteWart] = useState({ datum: '', km: '' });
  const [naechsteWartSaving, setNaechsteWartSaving] = useState(false);
  const [naechsteWartSuccess, setNaechsteWartSuccess] = useState(false);
  const [naechsteWartError, setNaechsteWartError] = useState('');

  // Kilometerstand
  const [kmHistorie, setKmHistorie] = useState([]);
  const [kmFahrten, setKmFahrten] = useState([newFahrt()]);
  const heute = new Date();
  const [kmMonat, setKmMonat] = useState(String(heute.getMonth() + 1).padStart(2, '0'));
  const [kmJahr, setKmJahr] = useState(String(heute.getFullYear()));
  const [kmLaden, setKmLaden] = useState(false);
  const [kmSpeichern, setKmSpeichern] = useState(false);
  const [kmFehler, setKmFehler] = useState('');
  const [kmErfolgMsg, setKmErfolgMsg] = useState('');
  const [kmDetailMonat, setKmDetailMonat] = useState(null);
  const [detailMonat, setDetailMonat] = useState(null); // 'YYYY-MM'
  const [eingabeMonat, setEingabeMonat] = useState(currentMonthValue);
  const [eingabeZeilen, setEingabeZeilen] = useState(() => [newZeile()]);
  const [eingabeSaving, setEingabeSaving] = useState(false);
  const [eingabeError, setEingabeError] = useState('');
  const [deletingKmId, setDeletingKmId] = useState(null);
  const [aktKmSaving, setAktKmSaving] = useState(false);
  const [aktKmSuccess, setAktKmSuccess] = useState(false);
  const [aktKmWert, setAktKmWert] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
    if (member) setCompanyId(member.company_id);
    const { data, error } = await supabase.from('fahrzeuge').select('*').eq('id', id).single();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setFahrzeug(data);
    setForm({ kennzeichen: data.kennzeichen ?? '', marke: data.marke ?? '', modell: data.modell ?? '', typ: data.typ ?? '', baujahr: data.baujahr != null ? String(data.baujahr) : '', farbe: data.farbe ?? '', kraftstoff: data.kraftstoff ?? '', km_stand: data.km_stand != null ? String(data.km_stand) : '', tuev_bis: data.tuev_bis ?? '', hu_bis: data.hu_bis ?? '', uvv_bis: data.uvv_bis ?? '', versicherung: data.versicherung ?? '', zustand: data.zustand ?? 'aktiv', notizen: data.notizen ?? '' });
    setFristenForm({ tuev_bis: data.tuev_bis ?? '', hu_bis: data.hu_bis ?? '', uvv_bis: data.uvv_bis ?? '' });
    setNaechsteWart({ datum: data.naechste_wartung_datum ?? '', km: data.naechste_wartung_km != null ? String(data.naechste_wartung_km) : '' });
    setAktKmWert(data.km_stand != null ? String(data.km_stand) : '');
    setLoading(false);
  }, [id, router]);

  const loadPruefungen = useCallback(async () => {
    setPruefLaden(true);
    const { data } = await supabase.from('fahrzeug_pruefungen').select('*').eq('fahrzeug_id', id).order('pruef_datum', { ascending: false });
    setPruefungen(data ?? []);
    setPruefLaden(false);
  }, [id]);

  const loadWartungen = useCallback(async () => {
    setWartLaden(true);
    const { data } = await supabase.from('fahrzeug_wartungen').select('*').eq('fahrzeug_id', id).order('datum', { ascending: false });
    setWartungen(data ?? []);
    setWartLaden(false);
  }, [id]);

  const loadKmHistorie = useCallback(async () => {
    setKmLaden(true);
    const { data } = await supabase.from('fahrzeug_km_monatlich').select('*').eq('fahrzeug_id', id).order('monat', { ascending: false });
    setKmHistorie(data ?? []);
    setKmLaden(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === 'tuev_uvv') loadPruefungen(); }, [activeTab, loadPruefungen]);
  useEffect(() => { if (activeTab === 'wartungen') loadWartungen(); }, [activeTab, loadWartungen]);
  useEffect(() => { if (activeTab === 'kilometerstand') loadKmHistorie(); }, [activeTab, loadKmHistorie]);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  // Fahrzeugdaten
  async function handleSave(e) {
    e.preventDefault(); setSaveError(''); setSaveSuccess(false);
    if (!form.kennzeichen.trim()) { setSaveError('Kennzeichen ist Pflichtfeld.'); return; }
    setSaving(true);
    const { error } = await supabase.from('fahrzeuge').update({ kennzeichen: form.kennzeichen.trim().toUpperCase(), marke: form.marke.trim() || null, modell: form.modell.trim() || null, typ: form.typ || null, baujahr: form.baujahr ? parseInt(form.baujahr) : null, farbe: form.farbe.trim() || null, kraftstoff: form.kraftstoff || null, km_stand: form.km_stand ? parseInt(form.km_stand) : null, tuev_bis: form.tuev_bis || null, hu_bis: form.hu_bis || null, uvv_bis: form.uvv_bis || null, versicherung: form.versicherung.trim() || null, zustand: form.zustand, notizen: form.notizen.trim() || null, updated_at: new Date().toISOString() }).eq('id', id);
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaveSuccess(true);
    setFahrzeug(prev => ({ ...prev, kennzeichen: form.kennzeichen.trim().toUpperCase(), marke: form.marke.trim() || null, modell: form.modell.trim() || null, zustand: form.zustand, km_stand: form.km_stand ? parseInt(form.km_stand) : null }));
    setAktKmWert(form.km_stand);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from('fahrzeuge').delete().eq('id', id);
    router.push('/dashboard/fahrzeuge');
  }

  // Fristen
  async function handleFristenSave(e) {
    e.preventDefault(); setFristenError(''); setFristenSuccess(false); setFristenSaving(true);
    const { error } = await supabase.from('fahrzeuge').update({ tuev_bis: fristenForm.tuev_bis || null, hu_bis: fristenForm.hu_bis || null, uvv_bis: fristenForm.uvv_bis || null, updated_at: new Date().toISOString() }).eq('id', id);
    setFristenSaving(false);
    if (error) { setFristenError(error.message); return; }
    setFristenSuccess(true);
    setFahrzeug(prev => ({ ...prev, tuev_bis: fristenForm.tuev_bis || null, hu_bis: fristenForm.hu_bis || null, uvv_bis: fristenForm.uvv_bis || null }));
    setForm(f => ({ ...f, tuev_bis: fristenForm.tuev_bis, hu_bis: fristenForm.hu_bis, uvv_bis: fristenForm.uvv_bis }));
    setTimeout(() => setFristenSuccess(false), 3000);
  }

  // PrÃ¼feintrag
  async function handlePruefNeu(e) {
    e.preventDefault(); setPruefNeuError('');
    if (!pruefForm.pruef_datum) { setPruefNeuError('PrÃ¼fdatum ist Pflichtfeld.'); return; }
    setPruefNeuSaving(true);
    const { error } = await supabase.from('fahrzeug_pruefungen').insert({ fahrzeug_id: id, company_id: companyId, art: pruefForm.art, pruef_datum: pruefForm.pruef_datum, gueltig_bis: pruefForm.gueltig_bis || null, pruefstelle: pruefForm.pruefstelle.trim() || null, ergebnis: pruefForm.ergebnis || null, notiz: pruefForm.notiz.trim() || null });
    if (!error && pruefForm.gueltig_bis) {
      const uf = pruefForm.art === 'tuev' ? 'tuev_bis' : pruefForm.art === 'hu' ? 'hu_bis' : pruefForm.art === 'uvv' ? 'uvv_bis' : null;
      if (uf) { await supabase.from('fahrzeuge').update({ [uf]: pruefForm.gueltig_bis, updated_at: new Date().toISOString() }).eq('id', id); setFristenForm(f => ({ ...f, [uf]: pruefForm.gueltig_bis })); setForm(f => ({ ...f, [uf]: pruefForm.gueltig_bis })); setFahrzeug(prev => ({ ...prev, [uf]: pruefForm.gueltig_bis })); }
    }
    setPruefNeuSaving(false);
    if (error) { setPruefNeuError(error.message); return; }
    setPruefNeuShown(false); setPruefForm({ art: 'tuev', pruef_datum: '', gueltig_bis: '', pruefstelle: '', ergebnis: '', notiz: '' }); loadPruefungen();
  }

  async function handlePruefDelete(pruefId) { setDeletingPruefId(pruefId); await supabase.from('fahrzeug_pruefungen').delete().eq('id', pruefId); setDeletingPruefId(null); loadPruefungen(); }

  // NÃ¤chste Wartung
  async function handleNaechsteWartSave(e) {
    e.preventDefault(); setNaechsteWartError(''); setNaechsteWartSuccess(false); setNaechsteWartSaving(true);
    const { error } = await supabase.from('fahrzeuge').update({ naechste_wartung_datum: naechsteWart.datum || null, naechste_wartung_km: naechsteWart.km ? parseInt(naechsteWart.km) : null, updated_at: new Date().toISOString() }).eq('id', id);
    setNaechsteWartSaving(false);
    if (error) { setNaechsteWartError(error.message); return; }
    setNaechsteWartSuccess(true); setFahrzeug(prev => ({ ...prev, naechste_wartung_datum: naechsteWart.datum || null, naechste_wartung_km: naechsteWart.km ? parseInt(naechsteWart.km) : null }));
    setTimeout(() => setNaechsteWartSuccess(false), 3000);
  }

  // Wartung
  async function handleWartNeu(e) {
    e.preventDefault(); setWartNeuError('');
    if (!wartForm.datum) { setWartNeuError('Datum ist Pflichtfeld.'); return; }
    setWartNeuSaving(true);
    const { error } = await supabase.from('fahrzeug_wartungen').insert({ fahrzeug_id: id, company_id: companyId, art: wartForm.art, datum: wartForm.datum, km_stand: wartForm.km_stand ? parseInt(wartForm.km_stand) : null, naechste_datum: wartForm.naechste_datum || null, naechste_km: wartForm.naechste_km ? parseInt(wartForm.naechste_km) : null, werkstatt: wartForm.werkstatt.trim() || null, kosten: wartForm.kosten ? parseFloat(wartForm.kosten.replace(',', '.')) : null, notiz: wartForm.notiz.trim() || null });
    if (!error && (wartForm.naechste_datum || wartForm.naechste_km)) {
      const upd = {};
      if (wartForm.naechste_datum) upd.naechste_wartung_datum = wartForm.naechste_datum;
      if (wartForm.naechste_km) upd.naechste_wartung_km = parseInt(wartForm.naechste_km);
      upd.updated_at = new Date().toISOString();
      await supabase.from('fahrzeuge').update(upd).eq('id', id);
      setNaechsteWart(prev => ({ datum: wartForm.naechste_datum || prev.datum, km: wartForm.naechste_km || prev.km }));
      setFahrzeug(prev => ({ ...prev, ...upd }));
    }
    setWartNeuSaving(false);
    if (error) { setWartNeuError(error.message); return; }
    setWartNeuShown(false); setWartForm({ art: 'inspektion', datum: '', km_stand: '', naechste_datum: '', naechste_km: '', werkstatt: '', kosten: '', notiz: '' }); loadWartungen();
  }

  async function handleWartDelete(wartId) { setDeletingWartId(wartId); await supabase.from('fahrzeug_wartungen').delete().eq('id', wartId); setDeletingWartId(null); loadWartungen(); }

  // Aktuellen km-Stand aktualisieren
  async function handleAktKmSave(e) {
    e.preventDefault(); setAktKmSaving(true);
    const km = parseInt(aktKmWert);
    if (!aktKmWert || isNaN(km)) { setAktKmSaving(false); return; }
    await supabase.from('fahrzeuge').update({ km_stand: km, updated_at: new Date().toISOString() }).eq('id', id);
    setFahrzeug(prev => ({ ...prev, km_stand: km }));
    setForm(f => ({ ...f, km_stand: String(km) }));
    setAktKmSaving(false); setAktKmSuccess(true);
    setTimeout(() => setAktKmSuccess(false), 2500);
  }

  // Fahrtenbuch: Monat speichern (Sammel-Eingabe)
  async function handleEingabeSave() {
    setEingabeError('');
    const valid = eingabeZeilen.filter(z => z.datum && z.km_stand);
    if (valid.length === 0) { setEingabeError('Mindestens eine Fahrt mit Datum und km-Ende ist Pflichtfeld.'); return; }
    setEingabeSaving(true);
    const rows = valid.map(z => ({
      fahrzeug_id: id,
      company_id: companyId,
      datum: z.datum,
      km_start: z.km_start ? parseInt(z.km_start) : null,
      km_stand: parseInt(z.km_stand),
      fahrer_name: z.fahrer_name.trim() || null,
      zweck: z.zweck,
      notiz: z.notiz.trim() || null,
    }));
    const { error } = await supabase.from('fahrzeug_km_eintraege').insert(rows);
    if (error) { setEingabeError(error.message); setEingabeSaving(false); return; }
    // Auto-update fahrzeuge.km_stand wenn nÃ¶tig
    const maxKm = Math.max(...rows.map(r => r.km_stand));
    if (fahrzeug && (fahrzeug.km_stand == null || maxKm > fahrzeug.km_stand)) {
      await supabase.from('fahrzeuge').update({ km_stand: maxKm, updated_at: new Date().toISOString() }).eq('id', id);
      setFahrzeug(prev => ({ ...prev, km_stand: maxKm }));
      setAktKmWert(String(maxKm));
    }
    setEingabeSaving(false);
    setEingabeZeilen([newZeile()]);
    await loadKmEintraege();
    setKmAnsicht('overview');
  }

  // Einzelnen km-Eintrag lÃ¶schen
  async function handleKmDelete(kmId) {
    setDeletingKmId(kmId);
    await supabase.from('fahrzeug_km_eintraege').delete().eq('id', kmId);
    setDeletingKmId(null);
    loadKmEintraege();
  }

  // CSV Export
  function handleExport(monatKey) {
    const source = monatKey
      ? kmEintraege.filter(e => formatMonthKey(e.datum) === monatKey)
      : [...kmEintraege];
    const sorted = source.sort((a, b) => new Date(a.datum) - new Date(b.datum) || (a.km_start ?? 0) - (b.km_start ?? 0));
    const rows = [['Datum', 'km-Start', 'km-Ende', 'Gefahrene km', 'Fahrer', 'Zweck', 'Notiz']];
    sorted.forEach(e => {
      const tripKm = (e.km_start != null && e.km_stand != null) ? e.km_stand - e.km_start : '';
      rows.push([formatDate(e.datum), e.km_start ?? '', e.km_stand ?? '', tripKm, e.fahrer_name ?? '', ZWECK_OPTIONS.find(z => z.value === e.zweck)?.label ?? e.zweck, e.notiz ?? '']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['ï»¿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fahrtenbuch_${fahrzeug?.kennzeichen ?? id}${monatKey ? '_' + monatKey : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Monats-Statistiken berechnen
  const kmStats = useMemo(() => {
    const monate = {};
    kmEintraege.forEach(e => {
      const key = formatMonthKey(e.datum);
      if (!monate[key]) monate[key] = { km: 0, fahrten: 0, dienst: 0, privat: 0, tank: 0, sonstiges: 0, eintraege: [] };
      const m = monate[key];
      const tripKm = (e.km_start != null && e.km_stand != null) ? e.km_stand - e.km_start : null;
      m.fahrten++;
      m.eintraege.push({ ...e, tripKm });
      if (tripKm != null && tripKm > 0) {
        m.km += tripKm;
        if (e.zweck === 'dienstfahrt') m.dienst += tripKm;
        else if (e.zweck === 'privatfahrt') m.privat += tripKm;
        else if (e.zweck === 'tankfahrt') m.tank += tripKm;
        else m.sonstiges += tripKm;
      }
    });
    const gesamtKm = Object.values(monate).reduce((s, m) => s + m.km, 0);
    return { monate, gesamtKm, gesamtFahrten: kmEintraege.length };
  }, [kmEintraege]);

  // Zeilen-Helfer fÃ¼r Eingabe
  function updateZeile(rowId, field, value) {
    setEingabeZeilen(prev => prev.map(z => z.rowId === rowId ? { ...z, [field]: value } : z));
  }
  function removeZeile(rowId) {
    setEingabeZeilen(prev => prev.length > 1 ? prev.filter(z => z.rowId !== rowId) : prev);
  }
  function addZeile() {
    setEingabeZeilen(prev => [...prev, newZeile()]);
  }

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-gray-400 text-sm">LÃ¤dtâ¦</p></div>;
  if (notFound) return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-500">Fahrzeug nicht gefunden.</p>
      <Link href="/dashboard/fahrzeuge" className="text-sm text-blue-600 hover:underline mt-2 inline-block">â ZurÃ¼ck zur Liste</Link>
    </div>
  );

  const title = fahrzeug ? [fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(' ') : '';
  const zustandCls = ZUSTAND_COLORS[form.zustand] ?? 'bg-gray-50 text-gray-500';
  const warnungen = [{ label: 'TÃV', datum: fristenForm.tuev_bis }, { label: 'HU', datum: fristenForm.hu_bis }, { label: 'UVV', datum: fristenForm.uvv_bis }].map(w => ({ ...w, status: pruefDatumsStatus(w.datum) })).filter(w => w.datum && w.status && w.status.severity !== 'ok');
  const naechste = [{ label: 'TÃV', datum: fristenForm.tuev_bis }, { label: 'HU', datum: fristenForm.hu_bis }, { label: 'UVV', datum: fristenForm.uvv_bis }].filter(w => w.datum).sort((a, b) => new Date(a.datum) - new Date(b.datum))[0];
  const aktKm = fahrzeug?.km_stand;
  const wartDatumStatus = datumsStatus(naechsteWart.datum);
  const wartKmStatus = kmStatus(naechsteWart.km ? parseInt(naechsteWart.km) : null, aktKm);
  const wartWarnCount = [wartDatumStatus, wartKmStatus].filter(s => s && (s.severity === 'danger' || s.severity === 'warn')).length;

  // Eingabe-Summen live berechnen
  const eingabeTotalKm = eingabeZeilen.reduce((s, z) => {
    const km = (z.km_start && z.km_stand) ? parseInt(z.km_stand) - parseInt(z.km_start) : 0;
    return s + (km > 0 ? km : 0);
  }, 0);
  const eingabeValidRows = eingabeZeilen.filter(z => z.datum && z.km_stand).length;

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
        <Link href="/dashboard/fahrzeuge" className="hover:text-gray-600 transition">Fahrzeuge</Link>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        <span className="text-gray-600 font-medium">{fahrzeug?.kennzeichen}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{fahrzeug?.kennzeichen}</h1>
          {title && <p className="text-sm text-gray-400 mt-0.5">{title}</p>}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full mt-1 ${zustandCls}`}>{ZUSTAND_OPTIONS.find(o => o.value === form.zustand)?.label ?? form.zustand}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit flex-wrap">
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
            {tab.id === 'tuev_uvv' && warnungen.length > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-red-500 text-white rounded-full">{warnungen.length}</span>}
            {tab.id === 'wartungen' && wartWarnCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-amber-500 text-white rounded-full">{wartWarnCount}</span>}
          </button>
        ))}
      </div>

      {/* ââ FAHRZEUGDATEN ââ */}
      {activeTab === 'fahrzeugdaten' && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Fahrzeugidentifikation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <LabelInput label="Kennzeichen" required><input type="text" required value={form.kennzeichen} onChange={set('kennzeichen')} placeholder="z. B. M-AB 1234" className={inputCls + ' uppercase'} /></LabelInput>
              <LabelInput label="Marke"><input type="text" value={form.marke} onChange={set('marke')} placeholder="z. B. Mercedes-Benz" className={inputCls} /></LabelInput>
              <LabelInput label="Modell"><input type="text" value={form.modell} onChange={set('modell')} placeholder="z. B. Sprinter" className={inputCls} /></LabelInput>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <LabelInput label="Fahrzeugtyp"><select value={form.typ} onChange={set('typ')} className={inputCls}>{TYP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelInput>
              <LabelInput label="Baujahr"><input type="number" value={form.baujahr} onChange={set('baujahr')} placeholder="z. B. 2020" min="1900" max={new Date().getFullYear() + 1} className={inputCls} /></LabelInput>
              <LabelInput label="Farbe"><input type="text" value={form.farbe} onChange={set('farbe')} placeholder="z. B. WeiÃ" className={inputCls} /></LabelInput>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Technische Daten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabelInput label="Kraftstoff"><select value={form.kraftstoff} onChange={set('kraftstoff')} className={inputCls}>{KRAFTSTOFF_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelInput>
              <LabelInput label="Kilometerstand"><div className="relative"><input type="number" value={form.km_stand} onChange={set('km_stand')} placeholder="z. B. 45000" min="0" className={inputCls + ' pr-10'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div></LabelInput>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">PrÃ¼ffristen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><LabelInput label="TÃV bis"><input type="date" value={form.tuev_bis} onChange={set('tuev_bis')} className={inputCls} /></LabelInput>{form.tuev_bis && (() => { const s = pruefDatumsStatus(form.tuev_bis); return s && s.severity !== 'ok' ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
              <div><LabelInput label="HU bis"><input type="date" value={form.hu_bis} onChange={set('hu_bis')} className={inputCls} /></LabelInput>{form.hu_bis && (() => { const s = pruefDatumsStatus(form.hu_bis); return s && s.severity !== 'ok' ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
              <div><LabelInput label="UVV bis"><input type="date" value={form.uvv_bis} onChange={set('uvv_bis')} className={inputCls} /></LabelInput>{form.uvv_bis && (() => { const s = pruefDatumsStatus(form.uvv_bis); return s && s.severity !== 'ok' ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Status & Versicherung</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabelInput label="Zustand"><select value={form.zustand} onChange={set('zustand')} className={inputCls}>{ZUSTAND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelInput>
              <LabelInput label="Versicherung / Versicherungsnummer"><input type="text" value={form.versicherung} onChange={set('versicherung')} placeholder="z. B. ADAC / 123456789" className={inputCls} /></LabelInput>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Notizen</h2>
            <textarea value={form.notizen} onChange={set('notizen')} rows={4} placeholder="Interne Notizen zum Fahrzeugâ¦" className={inputCls + ' resize-none'} />
          </div>
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          {saveSuccess && <p className="text-xs text-emerald-600">Gespeichert â</p>}
          <div className="flex items-center justify-between">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{saving ? 'Speichertâ¦' : 'Speichern'}</button>
            <div>{!confirmDelete ? <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-sm text-red-500 rounded-xl hover:bg-red-50 transition">Fahrzeug lÃ¶schen</button> : <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Wirklich lÃ¶schen?</span><button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition">{deleting ? 'LÃ¶schtâ¦' : 'Ja, lÃ¶schen'}</button><button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div>}</div>
          </div>
        </form>
      )}

      {/* ââ TÃV & UVV ââ */}
      {activeTab === 'tuev_uvv' && (
        <div className="space-y-5">
          {warnungen.length > 0 && <div className="space-y-2">{warnungen.map(w => <div key={w.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${w.status.severity === 'danger' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}><WarnIcon cls={w.status.severity === 'danger' ? 'text-red-500' : 'text-amber-500'} /><span className={w.status.severity === 'danger' ? 'text-red-700' : 'text-amber-700'}><strong>{w.label}</strong> â {w.status.label}{w.datum ? ` (${formatDate(w.datum)})` : ''}</span></div>)}</div>}
          {naechste && <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-medium text-gray-400 mb-1">NÃ¤chste fÃ¤llige PrÃ¸fung</p><div className="flex items-baseline gap-2"><span className="text-lg font-bold text-gray-900">{naechste.label}</span><span className="text-sm text-gray-500">{formatDate(naechste.datum)}</span>{(() => { const s = pruefDatumsStatus(naechste.datum); return s ? <span className={`text-xs ${s.cls}`}>{s.label}</span> : null; })()}</div></div>}
          <form onSubmit={handleFristenSave} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Aktuelle PrÃ¼ffristen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><LabelInput label="TÃV gÃ¼ltig bis"><input type="date" value={fristenForm.tuev_bis} onChange={e => setFristenForm(f => ({ ...f, tuev_bis: e.target.value }))} className={inputCls} /></LabelInput>{fristenForm.tuev_bis && (() => { const s = pruefDatumsStatus(fristenForm.tuev_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
              <div><LabelInput label="HU gÃ¼ltig bis"><input type="date" value={fristenForm.hu_bis} onChange={e => setFristenForm(f => ({ ...f, hu_bis: e.target.value }))} className={inputCls} /></LabelInput>{fristenForm.hu_bis && (() => { const s = pruefDatumsStatus(fristenForm.hu_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
              <div><LabelInput label="UVV gÃ¼ltig bis"><input type="date" value={fristenForm.uvv_bis} onChange={e => setFristenForm(f => ({ ...f, uvv_bis: e.target.value }))} className={inputCls} /></LabelInput>{fristenForm.uvv_bis && (() => { const s = pruefDatumsStatus(fristenForm.uvv_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
            </div>
            {fristenError && <p className="text-xs text-red-500">{fristenError}</p>}
            {fristenSuccess && <p className="text-xs text-emerald-600">Fristen gespeichert â</p>}
            <button type="submit" disabled={fristenSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{fristenSaving ? 'Speichertâ¦' : 'Fristen speichern'}</button>
          </form>
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-700">PrÃ¼fhistorie</h2><button type="button" onClick={() => setPruefNeuShown(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition"><PlusIcon /> Eintrag hinzufÃ¼gen</button></div>
          {pruefNeuShown && <form onSubmit={handlePruefNeu} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4"><h3 className="text-xs font-semibold text-gray-600">Neuen PrÃ¸feintrag erfassen</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LabelInput label="PrÃ¼fungsart"><select value={pruefForm.art} onChange={e => setPruefForm(f => ({ ...f, art: e.target.value }))} className={inputCls}><option value="tuev">TÃV</option><option value="hu">HU (Hauptuntersuchung)</option><option value="uvv">UVV-PrÃ¼fung</option><option value="sonstiges">Sonstige</option></select></LabelInput><LabelInput label="PrÃ¼fdatum" required><input type="date" required value={pruefForm.pruef_datum} onChange={e => setPruefForm(f => ({ ...f, pruef_datum: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="GÃ¼ltig bis (nÃ¤chste PrÃ¸fung)"><input type="date" value={pruefForm.gueltig_bis} onChange={e => setPruefForm(f => ({ ...f, gueltig_bis: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="PrÃ¼fstelle / Werkstatt"><input type="text" value={pruefForm.pruefstelle} onChange={e => setPruefForm(f => ({ ...f, pruefstelle: e.target.value }))} placeholder="z. B. TÃV MÃ¼nchen" className={inputCls} /></LabelInput></div><LabelInput label="Ergebnis"><select value={pruefForm.ergebnis} onChange={e => setPruefForm(f => ({ ...f, ergebnis: e.target.value }))} className={inputCls}>{ERGEBNIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelInput><LabelInput label="Notiz"><textarea value={pruefForm.notiz} onChange={e => setPruefForm(f => ({ ...f, notiz: e.target.value }))} rows={2} placeholder="Optionale Anmerkungenâ¦" className={inputCls + ' resize-none'} /></LabelInput>{pruefNeuError && <p className="text-xs text-red-500">{pruefNeuError}</p>}<div className="flex gap-2"><button type="submit" disabled={pruefNeuSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{pruefNeuSaving ? 'Speichertâ¦' : 'Eintrag speichern'}</button><button type="button" onClick={() => setPruefNeuShown(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div></form>}
          {pruefLaden ? <p className="text-sm text-gray-400 py-4 text-center">LÃ¤dtâ¦</p> : pruefungen.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center"><p className="text-sm text-gray-400">Noch keine PrÃ¼feintrÃ¤ge erfasst.</p></div> : <div className="space-y-2">{pruefungen.map(p => { const s = p.gueltig_bis ? pruefDatumsStatus(p.gueltig_bis) : null; return <div key={p.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-gray-900">{ART_LABELS[p.art] ?? p.art}</span><span className="text-xs text-gray-400">{formatDate(p.pruef_datum)}</span>{p.ergebnis && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ERGEBNIS_COLORS[p.ergebnis] ?? 'bg-gray-50 text-gray-500'}`}>{ERGEBNIS_OPTIONS.find(o => o.value === p.ergebnis)?.label ?? p.ergebnis}</span>}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">{p.pruefstelle && <span className="text-xs text-gray-400">{p.pruefstelle}</span>}{p.gueltig_bis && <span className="text-xs text-gray-400">GÃ¼ltig bis {formatDate(p.gueltig_bis)}{s && s.severity !== 'ok' && <span className={`ml-1 ${s.cls}`}>({s.label})</span>}</span>}</div>{p.notiz && <p className="text-xs text-gray-400 mt-1 italic">{p.notiz}</p>}</div><button type="button" onClick={() => handlePruefDelete(p.id)} disabled={deletingPruefId === p.id} className="text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5 disabled:opacity-40"><TrashIcon /></button></div></div>; })}</div>}
        </div>
      )}

      {/* ââ WARTUNGEN ââ */}
      {activeTab === 'wartungen' && (
        <div className="space-y-5">
          {(wartDatumStatus && (wartDatumStatus.severity === 'danger' || wartDatumStatus.severity === 'warn')) && <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${wartDatumStatus.severity === 'danger' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}><WarnIcon cls={wartDatumStatus.severity === 'danger' ? 'text-red-500' : 'text-amber-500'} /><span className={wartDatumStatus.severity === 'danger' ? 'text-red-700' : 'text-amber-700'}><strong>Wartung nach Datum</strong> â {wartDatumStatus.label} ({formatDate(naechsteWart.datum)})</span></div>}
          {(wartKmStatus && (wartKmStatus.severity === 'danger' || wartKmStatus.severity === 'warn')) && <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${wartKmStatus.severity === 'danger' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}><WarnIcon cls={wartKmStatus.severity === 'danger' ? 'text-red-500' : 'text-amber-500'} /><span className={wartKmStatus.severity === 'danger' ? 'text-red-700' : 'text-amber-700'}><strong>Wartung nach Kilometerstand</strong> â {wartKmStatus.label} (fÃ¤llig bei {parseInt(naechsteWart.km).toLocaleString('de-DE')} km)</span></div>}
          {(naechsteWart.datum || naechsteWart.km) && <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-medium text-gray-400 mb-2">NÃ¤chste fÃ¤llige Wartung</p><div className="flex flex-wrap gap-6">{naechsteWart.datum && <div><p className="text-xs text-gray-400">Nach Datum</p><p className="text-base font-bold text-gray-900">{formatDate(naechsteWart.datum)}</p>{(() => { const s = datumsStatus(naechsteWart.datum); return s ? <p className={`text-xs ${s.cls}`}>{s.label}</p> : null; })()}</div>}{naechsteWart.km && <div><p className="text-xs text-gray-400">Nach Kilometerstand</p><p className="text-base font-bold text-gray-900">{parseInt(naechsteWart.km).toLocaleString('de-DE')} km</p>{aktKm && (() => { const s = kmStatus(parseInt(naechsteWart.km), aktKm); return s ? <p className={`text-xs ${s.cls}`}>{s.label}</p> : null; })()}</div>}</div></div>}
          <form onSubmit={handleNaechsteWartSave} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">NÃ¤chste Wartung festlegen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabelInput label="Datum der nÃ¤chsten Wartung"><input type="date" value={naechsteWart.datum} onChange={e => setNaechsteWart(f => ({ ...f, datum: e.target.value }))} className={inputCls} /></LabelInput>
              <LabelInput label="Kilometerstand bei nÃ¤chster Wartung"><div className="relative"><input type="number" value={naechsteWart.km} onChange={e => setNaechsteWart(f => ({ ...f, km: e.target.value }))} placeholder="z. B. 60000" min="0" className={inputCls + ' pr-10'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div></LabelInput>
            </div>
            {naechsteWartError && <p className="text-xs text-red-500">{naechsteWartError}</p>}
            {naechsteWartSuccess && <p className="text-xs text-emerald-600">Gespeichert â</p>}
            <button type="submit" disabled={naechsteWartSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{naechsteWartSaving ? 'Speichertâ¦' : 'Speichern'}</button>
          </form>
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-700">Wartungshistorie</h2><button type="button" onClick={() => setWartNeuShown(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition"><PlusIcon /> Wartung erfassen</button></div>
          {wartNeuShown && <form onSubmit={handleWartNeu} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4"><h3 className="text-xs font-semibold text-gray-600">Wartungseintrag erfassen</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LabelInput label="Art der Wartung"><select value={wartForm.art} onChange={e => setWartForm(f => ({ ...f, art: e.target.value }))} className={inputCls}>{WARTUNG_ART_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelInput><LabelInput label="Datum" required><input type="date" required value={wartForm.datum} onChange={e => setWartForm(f => ({ ...f, datum: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Kilometerstand bei Wartung"><div className="relative"><input type="number" value={wartForm.km_stand} onChange={e => setWartForm(f => ({ ...f, km_stand: e.target.value }))} placeholder="z. B. 45000" min="0" className={inputCls + ' pr-10'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div></LabelInput><LabelInput label="Werkstatt"><input type="text" value={wartForm.werkstatt} onChange={e => setWartForm(f => ({ ...f, werkstatt: e.target.value }))} placeholder="z. B. Autohaus MÃ¼ller" className={inputCls} /></LabelInput><LabelInput label="Kosten (â¬)"><div className="relative"><input type="text" value={wartForm.kosten} onChange={e => setWartForm(f => ({ ...f, kosten: e.target.value }))} placeholder="z. B. 180,00" className={inputCls + ' pr-6'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">â¬</span></div></LabelInput><div /></div><div className="border-t border-gray-100 pt-3"><p className="text-xs font-medium text-gray-500 mb-3">NÃ¤chste Wartung fÃ¤llig (optional)</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LabelInput label="Datum nÃ¤chste Wartung"><input type="date" value={wartForm.naechste_datum} onChange={e => setWartForm(f => ({ ...f, naechste_datum: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Km nÃ¤chste Wartung"><div className="relative"><input type="number" value={wartForm.naechste_km} onChange={e => setWartForm(f => ({ ...f, naechste_km: e.target.value }))} placeholder="z. B. 60000" min="0" className={inputCls + ' pr-10'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div></LabelInput></div></div><LabelInput label="Notiz"><textarea value={wartForm.notiz} onChange={e => setWartForm(f => ({ ...f, notiz: e.target.value }))} rows={2} placeholder="Optionale Anmerkungenâ¦" className={inputCls + ' resize-none'} /></LabelInput>{wartNeuError && <p className="text-xs text-red-500">{wartNeuError}</p>}<div className="flex gap-2"><button type="submit" disabled={wartNeuSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{wartNeuSaving ? 'Speichertâ¦' : 'Wartung speichern'}</button><button type="button" onClick={() => setWartNeuShown(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div></form>}
          {wartLaden ? <p className="text-sm text-gray-400 py-4 text-center">LÃ¤dtâ¦</p> : wartungen.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center"><p className="text-sm text-gray-400">Noch keine WartungseintrÃ¤ge vorhanden.</p></div> : <div className="space-y-2">{wartungen.map(w => { const artLabel = WARTUNG_ART_OPTIONS.find(o => o.value === w.art)?.label ?? w.art; return <div key={w.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-gray-900">{artLabel}</span><span className="text-xs text-gray-400">{formatDate(w.datum)}</span>{w.km_stand != null && <span className="text-xs text-gray-400">{w.km_stand.toLocaleString('de-DE')} km</span>}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">{w.werkstatt && <span className="text-xs text-gray-400">{w.werkstatt}</span>}{w.kosten != null && <span className="text-xs text-gray-500 font-medium">{parseFloat(w.kosten).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>}{w.naechste_datum && <span className="text-xs text-gray-400">NÃ¤chste: {formatDate(w.naechste_datum)}</span>}{w.naechste_km != null && <span className="text-xs text-gray-400">NÃ¤chste: {w.naechste_km.toLocaleString('de-DE')} km</span>}</div>{w.notiz && <p className="text-xs text-gray-400 mt-1 italic">{w.notiz}</p>}</div><button type="button" onClick={() => handleWartDelete(w.id)} disabled={deletingWartId === w.id} className="text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5 disabled:opacity-40"><TrashIcon /></button></div></div>; })}</div>}
        </div>
      )}

      {/* ââ KILOMETERSTAND ââ */}
      {activeTab === 'kilometerstand' && (
        <div className="space-y-6">

          {/* Monat wählen */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Fahrtenbuch erfassen</h3>
            <p className="text-sm text-gray-500 mb-4">Wähle den Monat, für den das physische Fahrtenbuch digital eingetragen wird.</p>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monat</label>
                <select value={kmMonat} onChange={e => setKmMonat(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                    <option key={m} value={m}>{['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][parseInt(m)-1]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jahr</label>
                <select value={kmJahr} onChange={e => setKmJahr(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[2023,2024,2025,2026,2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
              <div className="text-sm text-gray-500 pb-1">
                {kmHistorie.find(h => h.monat === kmJahr + '-' + kmMonat)
                  ? <span className="text-amber-600 font-medium">⚠ Für diesen Monat existiert bereits ein Eintrag</span>
                  : <span className="text-emerald-600">Neuer Monat</span>}
              </div>
            </div>
          </div>
          {/* Fahrten eingeben */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Fahrten des Monats</h3>
              <span className="text-sm text-gray-500">{kmFahrten.length} Eintrag{kmFahrten.length !== 1 ? 'einträge' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2">Datum</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2">km-Start</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2">km-Ende</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2">Fahrer</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2">Zweck</th>
                    <th className="text-right text-xs font-medium text-gray-500 pb-2 pr-2">km</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {kmFahrten.map((f, idx) => {
                    const diff = f.km_start && f.km_ende ? parseInt(f.km_ende) - parseInt(f.km_start) : null;
                    return (
                      <tr key={f.rowId} className="hover:bg-gray-50">
                        <td className="py-1.5 pr-2">
                          <input type="date" value={f.datum} onChange={e => setKmFahrten(prev => prev.map((r,i) => i===idx ? {...r, datum: e.target.value} : r))} className="border border-gray-200 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input type="number" placeholder="km" value={f.km_start} onChange={e => setKmFahrten(prev => prev.map((r,i) => i===idx ? {...r, km_start: e.target.value} : r))} className="border border-gray-200 rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input type="number" placeholder="km" value={f.km_ende} onChange={e => setKmFahrten(prev => prev.map((r,i) => i===idx ? {...r, km_ende: e.target.value} : r))} className="border border-gray-200 rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input type="text" placeholder="Name" value={f.fahrer} onChange={e => setKmFahrten(prev => prev.map((r,i) => i===idx ? {...r, fahrer: e.target.value} : r))} className="border border-gray-200 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <select value={f.zweck} onChange={e => setKmFahrten(prev => prev.map((r,i) => i===idx ? {...r, zweck: e.target.value} : r))} className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                            <option value="dienstfahrt">Dienstfahrt</option>
                            <option value="kundentermin">Kundentermin</option>
                            <option value="materialtransport">Materialtransport</option>
                            <option value="sonstiges">Sonstiges</option>
                          </select>
                        </td>
                        <td className="py-1.5 pr-2 text-right font-mono text-xs text-gray-700">
                          {diff !== null && !isNaN(diff) && diff >= 0 ? diff.toLocaleString('de-DE') + ' km' : '—'}
                        </td>
                        <td className="py-1.5">
                          <button onClick={() => setKmFahrten(prev => prev.filter((_,i) => i !== idx))} disabled={kmFahrten.length <= 1} className="text-red-400 hover:text-red-600 disabled:opacity-20 text-xs px-1">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={() => setKmFahrten(prev => [...prev, newFahrt()])} className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Zeile hinzufügen</button>
          </div>
          {/* Gesamt + Speichern */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Gesamt-km diesen Monat</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kmFahrten.reduce((sum, f) => {
                    const d = f.km_start && f.km_ende ? parseInt(f.km_ende) - parseInt(f.km_start) : 0;
                    return sum + (isNaN(d) || d < 0 ? 0 : d);
                  }, 0).toLocaleString('de-DE')} km
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {kmFehler && <p className="text-sm text-red-600">{kmFehler}</p>}
                {kmErfolgMsg && <p className="text-sm text-emerald-600">{kmErfolgMsg}</p>}
                <button
                  onClick={async () => {
                    setKmFehler('');
                    setKmErfolgMsg('');
                    const monatKey = kmJahr + '-' + kmMonat;
                    const gueltigeFahrten = kmFahrten.filter(f => f.datum && f.km_start && f.km_ende);
                    if (gueltigeFahrten.length === 0) { setKmFehler('Bitte mindestens eine vollständige Fahrt eingeben.'); return; }
                    const gesamtKm = gueltigeFahrten.reduce((sum, f) => {
                      const d = parseInt(f.km_ende) - parseInt(f.km_start);
                      return sum + (isNaN(d) || d < 0 ? 0 : d);
                    }, 0);
                    const maxKmEnde = Math.max(...gueltigeFahrten.map(f => parseInt(f.km_ende) || 0));
                    setKmSpeichern(true);
                    const { error } = await supabase.from('fahrzeug_km_monatlich').upsert({ fahrzeug_id: id, monat: monatKey, eintraege: gueltigeFahrten, gesamt_km: gesamtKm }, { onConflict: 'fahrzeug_id,monat' });
                    if (!error && maxKmEnde > 0) await supabase.from('fahrzeuge').update({ km_stand: maxKmEnde }).eq('id', id);
                    setKmSpeichern(false);
                    if (error) { setKmFehler('Fehler beim Speichern: ' + error.message); }
                    else {
                      setKmErfolgMsg('Fahrtenbuch für ' + ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][parseInt(kmMonat)-1] + ' ' + kmJahr + ' gespeichert.');
                      setKmFahrten([newFahrt()]);
                      loadKmHistorie();
                    }
                  }}
                  disabled={kmSpeichern}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors"
                >
                  {kmSpeichern ? 'Wird gespeichert…' : 'Monat speichern'}
                </button>
              </div>
            </div>
          </div>
          {/* Gespeicherte Monate */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Gespeicherte Fahrtenbücher</h3>
            {kmLaden ? (
              <p className="text-sm text-gray-400">Wird geladen…</p>
            ) : kmHistorie.length === 0 ? (
              <p className="text-sm text-gray-400">Noch keine Fahrtenbücher gespeichert.</p>
            ) : (
              <div className="space-y-3">
                {kmHistorie.map(h => {
                  const [y, m] = h.monat.split('-');
                  const monatName = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][parseInt(m)-1];
                  return (
                    <div key={h.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-gray-900">{monatName} {y}</span>
                          <span className="ml-3 text-sm text-gray-500">{h.gesamt_km?.toLocaleString('de-DE')} km · {(h.eintraege || []).length} Fahrten</span>
                        </div>
                        <button
                          onClick={() => setKmDetailMonat(kmDetailMonat === h.id ? null : h.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {kmDetailMonat === h.id ? 'Schließen' : 'Details'}
                        </button>
                      </div>
                      {kmDetailMonat === h.id && (
                        <table className="w-full text-xs mt-2 border-t border-gray-100 pt-2">
                          <thead>
                            <tr className="text-gray-400 text-left">
                              <th className="pb-1 pr-3">Datum</th>
                              <th className="pb-1 pr-3">km-Start</th>
                              <th className="pb-1 pr-3">km-Ende</th>
                              <th className="pb-1 pr-3">Fahrer</th>
                              <th className="pb-1 pr-3">Zweck</th>
                              <th className="pb-1 text-right">km</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(h.eintraege || []).map((f, fi) => {
                              const diff = f.km_start && f.km_ende ? parseInt(f.km_ende) - parseInt(f.km_start) : null;
                              return (
                                <tr key={fi} className="border-t border-gray-50">
                                  <td className="py-0.5 pr-3">{f.datum}</td>
                                  <td className="py-0.5 pr-3">{f.km_start}</td>
                                  <td className="py-0.5 pr-3">{f.km_ende}</td>
                                  <td className="py-0.5 pr-3">{f.fahrer}</td>
                                  <td className="py-0.5 pr-3">{f.zweck}</td>
                                  <td className="py-0.5 text-right font-mono">{diff !== null && !isNaN(diff) ? diff : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}}
    </div>
  );
}
