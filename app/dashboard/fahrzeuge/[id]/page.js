'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const TABS = [
  { id: 'fahrzeugdaten',    label: 'Fahrzeugdaten' },
  { id: 'tuev_uvv',         label: 'TÜV & UVV' },
  { id: 'wartungen',        label: 'Wartungen' },
  { id: 'kilometerstand',   label: 'Kilometerstand' },
  { id: 'versicherung',     label: 'Versicherung' },
];


const TYP_OPTIONS = [
  { value: '', label: '— Bitte wählen —' },
  { value: 'pkw', label: 'PKW' },
  { value: 'lkw', label: 'LKW' },
  { value: 'transporter', label: 'Transporter' },
  { value: 'kleintransporter', label: 'Kleintransporter' },
  { value: 'anhänger', label: 'Anhänger' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

const KRAFTSTOFF_OPTIONS = [
  { value: '', label: '— Bitte wählen —' },
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
  { value: 'ausser_betrieb', label: 'Außer Betrieb' },
];

const ZUSTAND_COLORS = {
  aktiv: 'bg-emerald-50 text-emerald-700',
  wartung: 'bg-amber-50 text-amber-700',
  reserviert: 'bg-blue-50 text-blue-700',
  ausser_betrieb: 'bg-red-50 text-red-600',
};

const ART_LABELS = {
  tuev: 'TÜV',
  hu: 'HU (Hauptuntersuchung)',
  uvv: 'UVV-Prüfung',
  sonstiges: 'Sonstige Prüfung',
};

const ERGEBNIS_OPTIONS = [
  { value: '', label: '— Ergebnis wählen —' },
  { value: 'bestanden', label: 'Bestanden' },
  { value: 'mit_maengeln', label: 'Bestanden mit Mängeln' },
  { value: 'nicht_bestanden', label: 'Nicht bestanden' },
];

const ERGEBNIS_COLORS = {
  bestanden: 'bg-emerald-50 text-emerald-700',
  mit_maengeln: 'bg-amber-50 text-amber-700',
  nicht_bestanden: 'bg-red-50 text-red-600',
};

const WARTUNG_ART_OPTIONS = [
  { value: 'oelwechsel', label: 'Ölwechsel' },
  { value: 'oelfilter', label: 'Ölfilter' },
  { value: 'luftfilter', label: 'Luftfilter' },
  { value: 'kraftstofffilter', label: 'Kraftstofffilter' },
  { value: 'bremsen', label: 'Bremsen / Bremsbeläge' },
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

const VERS_ART_OPTIONS = [
  { value: 'haftpflicht', label: 'Haftpflicht' },
  { value: 'teilkasko', label: 'Teilkasko' },
  { value: 'vollkasko', label: 'Vollkasko' },
  { value: 'haftpflicht_teilkasko', label: 'Haftpflicht + Teilkasko' },
  { value: 'haftpflicht_vollkasko', label: 'Haftpflicht + Vollkasko' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

function newZeile() {
  return { rowId: Math.random().toString(36).slice(2), datum: '', km_start: '', km_stand: '', fahrer_name: '', zweck: 'dienstfahrt', notiz: '' };
}

function datumsStatus(datum) {
  if (!datum) return null;
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const d = new Date(datum);
  const diffTage = Math.ceil((d - heute) / (1000 * 60 * 60 * 24));
  if (diffTage < 0) return { label: 'Überfällig', diffTage, cls: 'text-red-600 font-medium', severity: 'danger' };
  if (diffTage <= 30) return { label: `In ${diffTage} Tagen fällig`, diffTage, cls: 'text-red-500 font-medium', severity: 'danger' };
  if (diffTage <= 90) return { label: `In ${diffTage} Tagen fällig`, diffTage, cls: 'text-amber-600', severity: 'warn' };
  return { label: `In ${diffTage} Tagen fällig`, diffTage, cls: 'text-emerald-600', severity: 'ok' };
}

function pruefDatumsStatus(datum) {
  if (!datum) return null;
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const d = new Date(datum);
  const diffTage = Math.ceil((d - heute) / (1000 * 60 * 60 * 24));
  if (diffTage < 0) return { label: 'Abgelaufen', diffTage, cls: 'text-red-600 font-medium', severity: 'danger' };
  if (diffTage <= 30) return { label: `Läuft in ${diffTage} Tagen ab`, diffTage, cls: 'text-red-500 font-medium', severity: 'danger' };
  if (diffTage <= 90) return { label: `Läuft in ${diffTage} Tagen ab`, diffTage, cls: 'text-amber-600', severity: 'warn' };
  return { label: `Gültig noch ${diffTage} Tage`, diffTage, cls: 'text-emerald-600', severity: 'ok' };
}

function kmStatus(naechsteKm, aktuellerKm) {
  if (!naechsteKm || !aktuellerKm) return null;
  const diff = naechsteKm - aktuellerKm;
  if (diff <= 0) return { label: `Überfällig (${Math.abs(diff).toLocaleString('de-DE')} km überschritten)`, cls: 'text-red-600 font-medium', severity: 'danger' };
  if (diff <= 1000) return { label: `Noch ${diff.toLocaleString('de-DE')} km`, cls: 'text-red-500 font-medium', severity: 'danger' };
  if (diff <= 3000) return { label: `Noch ${diff.toLocaleString('de-DE')} km`, cls: 'text-amber-600', severity: 'warn' };
  return { label: `Noch ${diff.toLocaleString('de-DE')} km`, cls: 'text-emerald-600', severity: 'ok' };
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMonthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(key) {
  const [year, month] = key.split('-');
  const names = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${names[parseInt(month) - 1]} ${year}`;
}

function currentMonthValue() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function formatEuro(val) {
  if (val == null) return null;
  return parseFloat(val).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
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

  // TÜV & UVV
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
  const [kmEintraege, setKmEintraege] = useState([]);
  const [kmLaden, setKmLaden] = useState(false);
  const [kmAnsicht, setKmAnsicht] = useState('overview');
  const [detailMonat, setDetailMonat] = useState(null);
  const [eingabeMonat, setEingabeMonat] = useState(currentMonthValue);
  const [eingabeZeilen, setEingabeZeilen] = useState(() => [newZeile()]);
  const [eingabeSaving, setEingabeSaving] = useState(false);
  const [eingabeError, setEingabeError] = useState('');
  const [deletingKmId, setDeletingKmId] = useState(null);
  const [aktKmSaving, setAktKmSaving] = useState(false);
  const [aktKmSuccess, setAktKmSuccess] = useState(false);
  const [aktKmWert, setAktKmWert] = useState('');


  // Versicherung
  const [versicherungen, setVersicherungen] = useState([]);
  const [versLaden, setVersLaden] = useState(false);
  const [versNeuShown, setVersNeuShown] = useState(false);
  const [versNeuSaving, setVersNeuSaving] = useState(false);
  const [versNeuError, setVersNeuError] = useState('');
  const [deletingVersId, setDeletingVersId] = useState(null);
  const [confirmDeleteVersId, setConfirmDeleteVersId] = useState(null);
  const [versForm, setVersForm] = useState({ gesellschaft: '', art: 'haftpflicht', policennummer: '', beginn_datum: '', ablauf_datum: '', jahrespraemie: '', selbstbeteiligung: '', ansprechpartner: '', telefon: '', notiz: '' });

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

  const loadKmEintraege = useCallback(async () => {
    setKmLaden(true);
    const { data } = await supabase.from('fahrzeug_km_eintraege').select('*').eq('fahrzeug_id', id).order('datum', { ascending: true }).order('km_start', { ascending: true });
    setKmEintraege(data ?? []);
    setKmLaden(false);
  }, [id]);


  const loadVersicherungen = useCallback(async () => {
    setVersLaden(true);
    const { data } = await supabase.from('fahrzeug_versicherungen').select('*').eq('fahrzeug_id', id).order('ablauf_datum', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    setVersicherungen(data ?? []);
    setVersLaden(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === 'tuev_uvv') loadPruefungen(); }, [activeTab, loadPruefungen]);
  useEffect(() => { if (activeTab === 'wartungen') loadWartungen(); }, [activeTab, loadWartungen]);
  useEffect(() => { if (activeTab === 'kilometerstand') loadKmEintraege(); }, [activeTab, loadKmEintraege]);
  useEffect(() => { if (activeTab === 'versicherung') loadVersicherungen(); }, [activeTab, loadVersicherungen]);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

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

  async function handlePruefNeu(e) {
    e.preventDefault(); setPruefNeuError('');
    if (!pruefForm.pruef_datum) { setPruefNeuError('Prüfdatum ist Pflichtfeld.'); return; }
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

  async function handleNaechsteWartSave(e) {
    e.preventDefault(); setNaechsteWartError(''); setNaechsteWartSuccess(false); setNaechsteWartSaving(true);
    const { error } = await supabase.from('fahrzeuge').update({ naechste_wartung_datum: naechsteWart.datum || null, naechste_wartung_km: naechsteWart.km ? parseInt(naechsteWart.km) : null, updated_at: new Date().toISOString() }).eq('id', id);
    setNaechsteWartSaving(false);
    if (error) { setNaechsteWartError(error.message); return; }
    setNaechsteWartSuccess(true); setFahrzeug(prev => ({ ...prev, naechste_wartung_datum: naechsteWart.datum || null, naechste_wartung_km: naechsteWart.km ? parseInt(naechsteWart.km) : null }));
    setTimeout(() => setNaechsteWartSuccess(false), 3000);
  }

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

  async function handleEingabeSave() {
    setEingabeError('');
    const valid = eingabeZeilen.filter(z => z.datum && z.km_stand);
    if (valid.length === 0) { setEingabeError('Mindestens eine Fahrt mit Datum und km-Ende ist Pflichtfeld.'); return; }
    setEingabeSaving(true);
    const rows = valid.map(z => ({ fahrzeug_id: id, company_id: companyId, datum: z.datum, km_start: z.km_start ? parseInt(z.km_start) : null, km_stand: parseInt(z.km_stand), fahrer_name: z.fahrer_name.trim() || null, zweck: z.zweck, notiz: z.notiz.trim() || null }));
    const { error } = await supabase.from('fahrzeug_km_eintraege').insert(rows);
    if (error) { setEingabeError(error.message); setEingabeSaving(false); return; }
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

  async function handleKmDelete(kmId) { setDeletingKmId(kmId); await supabase.from('fahrzeug_km_eintraege').delete().eq('id', kmId); setDeletingKmId(null); loadKmEintraege(); }

  function handleExport(monatKey) {
    const source = monatKey ? kmEintraege.filter(e => formatMonthKey(e.datum) === monatKey) : [...kmEintraege];
    const sorted = source.sort((a, b) => new Date(a.datum) - new Date(b.datum) || (a.km_start ?? 0) - (b.km_start ?? 0));
    const rows = [['Datum', 'km-Start', 'km-Ende', 'Gefahrene km', 'Fahrer', 'Zweck', 'Notiz']];
    sorted.forEach(e => { const tripKm = (e.km_start != null && e.km_stand != null) ? e.km_stand - e.km_start : ''; rows.push([formatDate(e.datum), e.km_start ?? '', e.km_stand ?? '', tripKm, e.fahrer_name ?? '', ZWECK_OPTIONS.find(z => z.value === e.zweck)?.label ?? e.zweck, e.notiz ?? '']); });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `fahrtenbuch_${fahrzeug?.kennzeichen ?? id}${monatKey ? '_' + monatKey : ''}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  async function handleVersNeu(e) {
    e.preventDefault(); setVersNeuError('');
    if (!versForm.gesellschaft.trim()) { setVersNeuError('Versicherungsgesellschaft ist Pflichtfeld.'); return; }
    setVersNeuSaving(true);
    const ablauf = versForm.ablauf_datum || null;
    const { error } = await supabase.from('fahrzeug_versicherungen').insert({ fahrzeug_id: id, company_id: companyId, gesellschaft: versForm.gesellschaft.trim(), art: versForm.art, policennummer: versForm.policennummer.trim() || null, beginn_datum: versForm.beginn_datum || null, ablauf_datum: ablauf, jahrespraemie: versForm.jahrespraemie ? parseFloat(versForm.jahrespraemie.replace(',', '.')) : null, selbstbeteiligung: versForm.selbstbeteiligung ? parseFloat(versForm.selbstbeteiligung.replace(',', '.')) : null, ansprechpartner: versForm.ansprechpartner.trim() || null, telefon: versForm.telefon.trim() || null, notiz: versForm.notiz.trim() || null });
    if (!error && ablauf) {
      await supabase.from('fahrzeuge').update({ versicherungs_ablauf: ablauf, updated_at: new Date().toISOString() }).eq('id', id);
      setFahrzeug(prev => ({ ...prev, versicherungs_ablauf: ablauf }));
    }
    setVersNeuSaving(false);
    if (error) { setVersNeuError(error.message); return; }
    setVersNeuShown(false);
    setVersForm({ gesellschaft: '', art: 'haftpflicht', policennummer: '', beginn_datum: '', ablauf_datum: '', jahrespraemie: '', selbstbeteiligung: '', ansprechpartner: '', telefon: '', notiz: '' });
    loadVersicherungen();
  }

  async function handleVersDelete(versId) {
    setDeletingVersId(versId);
    await supabase.from('fahrzeug_versicherungen').delete().eq('id', versId);
    setDeletingVersId(null);
    setConfirmDeleteVersId(null);
    loadVersicherungen();
  }

  function updateZeile(rowId, field, value) { setEingabeZeilen(prev => prev.map(z => z.rowId === rowId ? { ...z, [field]: value } : z)); }
  function removeZeile(rowId) { setEingabeZeilen(prev => prev.length > 1 ? prev.filter(z => z.rowId !== rowId) : prev); }
  function addZeile() { setEingabeZeilen(prev => [...prev, newZeile()]); }

  const kmStats = useMemo(() => {
    const monate = {};
    kmEintraege.forEach(e => {
      const key = formatMonthKey(e.datum);
      if (!monate[key]) monate[key] = { km: 0, fahrten: 0, dienst: 0, privat: 0, tank: 0, sonstiges: 0, eintraege: [] };
      const m = monate[key];
      const tripKm = (e.km_start != null && e.km_stand != null) ? e.km_stand - e.km_start : null;
      m.fahrten++; m.eintraege.push({ ...e, tripKm });
      if (tripKm != null && tripKm > 0) {
        m.km += tripKm;
        if (e.zweck === 'dienstfahrt') m.dienst += tripKm;
        else if (e.zweck === 'privatfahrt') m.privat += tripKm;
        else if (e.zweck === 'tankfahrt') m.tank += tripKm;
        else m.sonstiges += tripKm;
      }
    });
    return { monate, gesamtKm: Object.values(monate).reduce((s, m) => s + m.km, 0), gesamtFahrten: kmEintraege.length };
  }, [kmEintraege]);

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-gray-400 text-sm">Lädt…</p></div>;
  if (notFound) return <div className="max-w-2xl"><p className="text-sm text-gray-500">Fahrzeug nicht gefunden.</p><Link href="/dashboard/fahrzeuge" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Zurück zur Liste</Link></div>;

  const title = fahrzeug ? [fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(' ') : '';
  const zustandCls = ZUSTAND_COLORS[form.zustand] ?? 'bg-gray-50 text-gray-500';
  const warnungen = [{ label: 'TÜV', datum: fristenForm.tuev_bis }, { label: 'HU', datum: fristenForm.hu_bis }, { label: 'UVV', datum: fristenForm.uvv_bis }].map(w => ({ ...w, status: pruefDatumsStatus(w.datum) })).filter(w => w.datum && w.status && w.status.severity !== 'ok');
  const naechste = [{ label: 'TÜV', datum: fristenForm.tuev_bis }, { label: 'HU', datum: fristenForm.hu_bis }, { label: 'UVV', datum: fristenForm.uvv_bis }].filter(w => w.datum).sort((a, b) => new Date(a.datum) - new Date(b.datum))[0];
  const aktKm = fahrzeug?.km_stand;
  const wartDatumStatus = datumsStatus(naechsteWart.datum);
  const wartKmStatus = kmStatus(naechsteWart.km ? parseInt(naechsteWart.km) : null, aktKm);
  const wartWarnCount = [wartDatumStatus, wartKmStatus].filter(s => s && (s.severity === 'danger' || s.severity === 'warn')).length;
  const aktuelleVers = versicherungen[0] ?? null;
  const versAblaufStatus = aktuelleVers?.ablauf_datum ? pruefDatumsStatus(aktuelleVers.ablauf_datum) : (fahrzeug?.versicherungs_ablauf ? pruefDatumsStatus(fahrzeug.versicherungs_ablauf) : null);
  const versWarn = versAblaufStatus && (versAblaufStatus.severity === 'danger' || versAblaufStatus.severity === 'warn');
  const eingabeTotalKm = eingabeZeilen.reduce((s, z) => { const km = (z.km_start && z.km_stand) ? parseInt(z.km_stand) - parseInt(z.km_start) : 0; return s + Math.max(0, km); }, 0);
  const eingabeValidRows = eingabeZeilen.filter(z => z.datum && z.km_stand).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
        <Link href="/dashboard/fahrzeuge" className="hover:text-gray-600 transition">Fahrzeuge</Link>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        <span className="text-gray-600 font-medium">{fahrzeug?.kennzeichen}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{fahrzeug?.kennzeichen}</h1>
          {title && <p className="text-sm text-gray-400 mt-0.5">{title}</p>}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full mt-1 ${zustandCls}`}>{ZUSTAND_OPTIONS.find(o => o.value === form.zustand)?.label ?? form.zustand}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
            {tab.id === 'tuev_uvv' && warnungen.length > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-red-500 text-white rounded-full">{warnungen.length}</span>}
            {tab.id === 'wartungen' && wartWarnCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-amber-500 text-white rounded-full">{wartWarnCount}</span>}
            {tab.id === 'versicherung' && versWarn && <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-red-500 text-white rounded-full">!</span>}
          </button>
        ))}
      </div>

      {/* ── FAHRZEUGDATEN ── */}
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
              <LabelInput label="Farbe"><input type="text" value={form.farbe} onChange={set('farbe')} placeholder="z. B. Weiß" className={inputCls} /></LabelInput>
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
            <h2 className="text-sm font-semibold text-gray-700">Prüffristen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><LabelInput label="TÜV bis"><input type="date" value={form.tuev_bis} onChange={set('tuev_bis')} className={inputCls} /></LabelInput>{form.tuev_bis && (() => { const s = pruefDatumsStatus(form.tuev_bis); return s && s.severity !== 'ok' ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
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
            <textarea value={form.notizen} onChange={set('notizen')} rows={4} placeholder="Interne Notizen zum Fahrzeug…" className={inputCls + ' resize-none'} />
          </div>
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          {saveSuccess && <p className="text-xs text-emerald-600">Gespeichert ✓</p>}
          <div className="flex items-center justify-between">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{saving ? 'Speichert…' : 'Speichern'}</button>
            <div>{!confirmDelete ? <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-sm text-red-500 rounded-xl hover:bg-red-50 transition">Fahrzeug löschen</button> : <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Wirklich löschen?</span><button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition">{deleting ? 'Löscht…' : 'Ja, löschen'}</button><button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div>}</div>
          </div>
        </form>
      )}

      {/* ── TÜV & UVV ── */}
      {activeTab === 'tuev_uvv' && (
        <div className="space-y-5">
          {warnungen.length > 0 && <div className="space-y-2">{warnungen.map(w => <div key={w.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${w.status.severity === 'danger' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}><WarnIcon cls={w.status.severity === 'danger' ? 'text-red-500' : 'text-amber-500'} /><span className={w.status.severity === 'danger' ? 'text-red-700' : 'text-amber-700'}><strong>{w.label}</strong> — {w.status.label}{w.datum ? ` (${formatDate(w.datum)})` : ''}</span></div>)}</div>}
          {naechste && <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-medium text-gray-400 mb-1">Nächste fällige Prüfung</p><div className="flex items-baseline gap-2"><span className="text-lg font-bold text-gray-900">{naechste.label}</span><span className="text-sm text-gray-500">{formatDate(naechste.datum)}</span>{(() => { const s = pruefDatumsStatus(naechste.datum); return s ? <span className={`text-xs ${s.cls}`}>{s.label}</span> : null; })()}</div></div>}
          <form onSubmit={handleFristenSave} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Aktuelle Prøffristen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><LabelInput label="TÜV gültig bis"><input type="date" value={fristenForm.tuev_bis} onChange={e => setFristenForm(f => ({ ...f, tuev_bis: e.target.value }))} className={inputCls} /></LabelInput>{fristenForm.tuev_bis && (() => { const s = pruefDatumsStatus(fristenForm.tuev_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
              <div><LabelInput label="HU gültig bis"><input type="date" value={fristenForm.hu_bis} onChange={e => setFristenForm(f => ({ ...f, hu_bis: e.target.value }))} className={inputCls} /></LabelInput>{fristenForm.hu_bis && (() => { const s = pruefDatumsStatus(fristenForm.hu_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
              <div><LabelInput label="UVV gültig bis"><input type="date" value={fristenForm.uvv_bis} onChange={e => setFristenForm(f => ({ ...f, uvv_bis: e.target.value }))} className={inputCls} /></LabelInput>{fristenForm.uvv_bis && (() => { const s = pruefDatumsStatus(fristenForm.uvv_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
            </div>
            {fristenError && <p className="text-xs text-red-500">{fristenError}</p>}
            {fristenSuccess && <p className="text-xs text-emerald-600">Fristen gespeichert ✓</p>}
            <button type="submit" disabled={fristenSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{fristenSaving ? 'Speichert…' : 'Fristen speichern'}</button>
          </form>
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-700">Prøfhistorie</h2><button type="button" onClick={() => setPruefNeuShown(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition"><PlusIcon /> Eintrag hinzuføgen</button></div>
          {pruefNeuShown && <form onSubmit={handlePruefNeu} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4"><h3 className="text-xs font-semibold text-gray-600">Neuen Prüfeintrag erfassen</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LabelInput label="Prüfungsart"><select value={pruefForm.art} onChange={e => setPruefForm(f => ({ ...f, art: e.target.value }))} className={inputCls}><option value="tuev">TÜV</option><option value="hu">HU (Hauptuntersuchung)</option><option value="uvv">UVV-Prüfung</option><option value="sonstiges">Sonstige</option></select></LabelInput><LabelInput label="Prüfdatum" required><input type="date" required value={pruefForm.pruef_datum} onChange={e => setPruefForm(f => ({ ...f, pruef_datum: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Gültig bis"><input type="date" value={pruefForm.gueltig_bis} onChange={e => setPruefForm(f => ({ ...f, gueltig_bis: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Prøfstelle / Werkstatt"><input type="text" value={pruefForm.pruefstelle} onChange={e => setPruefForm(f => ({ ...f, pruefstelle: e.target.value }))} placeholder="z. B. TÜV München" className={inputCls} /></LabelInput></div><LabelInput label="Ergebnis"><select value={pruefForm.ergebnis} onChange={e => setPruefForm(f => ({ ...f, ergebnis: e.target.value }))} className={inputCls}>{ERGEBNIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelInput><LabelInput label="Notiz"><textarea value={pruefForm.notiz} onChange={e => setPruefForm(f => ({ ...f, notiz: e.target.value }))} rows={2} placeholder="Optionale Anmerkungen…" className={inputCls + ' resize-none'} /></LabelInput>{pruefNeuError && <p className="text-xs text-red-500">{pruefNeuError}</p>}<div className="flex gap-2"><button type="submit" disabled={pruefNeuSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{pruefNeuSaving ? 'Speichert…' : 'Eintrag speichern'}</button><button type="button" onClick={() => setPruefNeuShown(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div></form>}
          {pruefLaden ? <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p> : pruefungen.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center"><p className="text-sm text-gray-400">Noch keine Prøfeinträge erfasst.</p></div> : <div className="space-y-2">{pruefungen.map(p => { const s = p.gueltig_bis ? pruefDatumsStatus(p.gueltig_bis) : null; return <div key={p.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-gray-900">{ART_LABELS[p.art] ?? p.art}</span><span className="text-xs text-gray-400">{formatDate(p.pruef_datum)}</span>{p.ergebnis && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ERGEBNIS_COLORS[p.ergebnis] ?? 'bg-gray-50 text-gray-500'}`}>{ERGEBNIS_OPTIONS.find(o => o.value === p.ergebnis)?.label ?? p.ergebnis}</span>}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">{p.pruefstelle && <span className="text-xs text-gray-400">{p.pruefstelle}</span>}{p.gueltig_bis && <span className="text-xs text-gray-400">Gültig bis {formatDate(p.gueltig_bis)}{s && s.severity !== 'ok' && <span className={`ml-1 ${s.cls}`}>({s.label})</span>}</span>}</div>{p.notiz && <p className="text-xs text-gray-400 mt-1 italic">{p.notiz}</p>}</div><button type="button" onClick={() => handlePruefDelete(p.id)} disabled={deletingPruefId === p.id} className="text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5 disabled:opacity-40"><TrashIcon /></button></div></div>; })}</div>}
        </div>
      )}

      {/* ── WARTUNGEN ── */}
      {activeTab === 'wartungen' && (
        <div className="space-y-5">
          {(wartDatumStatus && (wartDatumStatus.severity === 'danger' || wartDatumStatus.severity === 'warn')) && <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${wartDatumStatus.severity === 'danger' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}><WarnIcon cls={wartDatumStatus.severity === 'danger' ? 'text-red-500' : 'text-amber-500'} /><span className={wartDatumStatus.severity === 'danger' ? 'text-red-700' : 'text-amber-700'}><strong>Wartung nach Datum</strong> — {wartDatumStatus.label} ({formatDate(naechsteWart.datum)})</span></div>}
          {(wartKmStatus && (wartKmStatus.severity === 'danger' || wartKmStatus.severity === 'warn')) && <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${wartKmStatus.severity === 'danger' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}><WarnIcon cls={wartKmStatus.severity === 'danger' ? 'text-red-500' : 'text-amber-500'} /><span className={wartKmStatus.severity === 'danger' ? 'text-red-700' : 'text-amber-700'}><strong>Wartung nach Kilometerstand</strong> — {wartKmStatus.label} (fällig bei {parseInt(naechsteWart.km).toLocaleString('de-DE')} km)</span></div>}
          {(naechsteWart.datum || naechsteWart.km) && <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs font-medium text-gray-400 mb-2">Nächste fällige Wartung</p><div className="flex flex-wrap gap-6">{naechsteWart.datum && <div><p className="text-xs text-gray-400">Nach Datum</p><p className="text-base font-bold text-gray-900">{formatDate(naechsteWart.datum)}</p>{(() => { const s = datumsStatus(naechsteWart.datum); return s ? <p className={`text-xs ${s.cls}`}>{s.label}</p> : null; })()}</div>}{naechsteWart.km && <div><p className="text-xs text-gray-400">Nach Kilometerstand</p><p className="text-base font-bold text-gray-900">{parseInt(naechsteWart.km).toLocaleString('de-DE')} km</p>{aktKm && (() => { const s = kmStatus(parseInt(naechsteWart.km), aktKm); return s ? <p className={`text-xs ${s.cls}`}>{s.label}</p> : null; })()}</div>}</div></div>}
          <form onSubmit={handleNaechsteWartSave} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Nächste Wartung festlegen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabelInput label="Datum der nächsten Wartung"><input type="date" value={naechsteWart.datum} onChange={e => setNaechsteWart(f => ({ ...f, datum: e.target.value }))} className={inputCls} /></LabelInput>
              <LabelInput label="Kilometerstand bei nächster Wartung"><div className="relative"><input type="number" value={naechsteWart.km} onChange={e => setNaechsteWart(f => ({ ...f, km: e.target.value }))} placeholder="z. B. 60000" min="0" className={inputCls + ' pr-10'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div></LabelInput>
            </div>
            {naechsteWartError && <p className="text-xs text-red-500">{naechsteWartError}</p>}
            {naechsteWartSuccess && <p className="text-xs text-emerald-600">Gespeichert ✓</p>}
            <button type="submit" disabled={naechsteWartSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{naechsteWartSaving ? 'Speichert…' : 'Speichern'}</button>
          </form>
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-700">Wartungshistorie</h2><button type="button" onClick={() => setWartNeuShown(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition"><PlusIcon /> Wartung erfassen</button></div>
          {wartNeuShown && <form onSubmit={handleWartNeu} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4"><h3 className="text-xs font-semibold text-gray-600">Wartungseintrag erfassen</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LabelInput label="Art der Wartung"><select value={wartForm.art} onChange={e => setWartForm(f => ({ ...f, art: e.target.value }))} className={inputCls}>{WARTUNG_ART_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelInput><LabelInput label="Datum" required><input type="date" required value={wartForm.datum} onChange={e => setWartForm(f => ({ ...f, datum: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Kilometerstand bei Wartung"><div className="relative"><input type="number" value={wartForm.km_stand} onChange={e => setWartForm(f => ({ ...f, km_stand: e.target.value }))} placeholder="z. B. 45000" min="0" className={inputCls + ' pr-10'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div></LabelInput><LabelInput label="Werkstatt"><input type="text" value={wartForm.werkstatt} onChange={e => setWartForm(f => ({ ...f, werkstatt: e.target.value }))} placeholder="z. B. Autohaus Müller" className={inputCls} /></LabelInput><LabelInput label="Kosten (€)"><div className="relative"><input type="text" value={wartForm.kosten} onChange={e => setWartForm(f => ({ ...f, kosten: e.target.value }))} placeholder="z. B. 180,00" className={inputCls + ' pr-6'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span></div></LabelInput><div /></div><div className="border-t border-gray-100 pt-3"><p className="text-xs font-medium text-gray-500 mb-3">Nächste Wartung fällig (optional)</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LabelInput label="Datum nächste Wartung"><input type="date" value={wartForm.naechste_datum} onChange={e => setWartForm(f => ({ ...f, naechste_datum: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Km nächste Wartung"><div className="relative"><input type="number" value={wartForm.naechste_km} onChange={e => setWartForm(f => ({ ...f, naechste_km: e.target.value }))} placeholder="z. B. 60000" min="0" className={inputCls + ' pr-10'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div></LabelInput></div></div><LabelInput label="Notiz"><textarea value={wartForm.notiz} onChange={e => setWartForm(f => ({ ...f, notiz: e.target.value }))} rows={2} placeholder="Optionale Anmerkungen…" className={inputCls + ' resize-none'} /></LabelInput>{wartNeuError && <p className="text-xs text-red-500">{wartNeuError}</p>}<div className="flex gap-2"><button type="submit" disabled={wartNeuSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{wartNeuSaving ? 'Speichert…' : 'Wartung speichern'}</button><button type="button" onClick={() => setWartNeuShown(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div></form>}
          {wartLaden ? <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p> : wartungen.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center"><p className="text-sm text-gray-400">Noch keine Wartungseinträge vorhanden.</p></div> : <div className="space-y-2">{wartungen.map(w => { const artLabel = WARTUNG_ART_OPTIONS.find(o => o.value === w.art)?.label ?? w.art; return <div key={w.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-gray-900">{artLabel}</span><span className="text-xs text-gray-400">{formatDate(w.datum)}</span>{w.km_stand != null && <span className="text-xs text-gray-400">{w.km_stand.toLocaleString('de-DE')} km</span>}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">{w.werkstatt && <span className="text-xs text-gray-400">{w.werkstatt}</span>}{w.kosten != null && <span className="text-xs text-gray-500 font-medium">{parseFloat(w.kosten).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>}{w.naechste_datum && <span className="text-xs text-gray-400">Nächste: {formatDate(w.naechste_datum)}</span>}{w.naechste_km != null && <span className="text-xs text-gray-400">Nächste: {w.naechste_km.toLocaleString('de-DE')} km</span>}</div>{w.notiz && <p className="text-xs text-gray-400 mt-1 italic">{w.notiz}</p>}</div><button type="button" onClick={() => handleWartDelete(w.id)} disabled={deletingWartId === w.id} className="text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5 disabled:opacity-40"><TrashIcon /></button></div></div>; })}</div>}
        </div>
      )}

      {/* ── KILOMETERSTAND ── */}
      {activeTab === 'kilometerstand' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-400 mb-1">Aktueller Kilometerstand</p>
            <div className="flex items-end gap-4 flex-wrap">
              <div><p className="text-3xl font-bold text-gray-900">{fahrzeug?.km_stand != null ? fahrzeug.km_stand.toLocaleString('de-DE') : '—'}</p><p className="text-xs text-gray-400 mt-0.5">km</p></div>
              <form onSubmit={handleAktKmSave} className="flex items-center gap-2 mb-0.5">
                <div className="relative"><input type="number" value={aktKmWert} onChange={e => setAktKmWert(e.target.value)} min="0" placeholder="Neuer km-Stand" className="w-44 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div>
                <button type="submit" disabled={aktKmSaving} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">{aktKmSaving ? '…' : 'Aktualisieren'}</button>
                {aktKmSuccess && <span className="text-xs text-emerald-600">✓</span>}
              </form>
            </div>
          </div>

          {kmAnsicht === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><h2 className="text-sm font-semibold text-gray-700">Monatliche Fahrtenbücher</h2>{kmEintraege.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{Object.keys(kmStats.monate).length} Monate · {kmStats.gesamtFahrten} Fahrten gesamt</p>}</div>
                <button type="button" onClick={() => { setEingabeMonat(currentMonthValue()); setEingabeZeilen([newZeile()]); setEingabeError(''); setKmAnsicht('eingabe'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition"><PlusIcon /> Monat erfassen</button>
              </div>
              {kmLaden ? <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p> : Object.keys(kmStats.monate).length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg></div><p className="text-sm font-medium text-gray-500">Noch kein Fahrtenbuch erfasst</p></div>
              ) : (
                <div className="space-y-2">{Object.entries(kmStats.monate).sort(([a], [b]) => b.localeCompare(a)).map(([key, m]) => (
                  <button key={key} type="button" onClick={() => { setDetailMonat(key); setKmAnsicht('detail'); }} className="w-full bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:border-blue-100 hover:bg-blue-50/20 transition text-left group">
                    <div className="flex items-center justify-between"><div className="flex-1 min-w-0"><div className="flex items-center gap-3"><span className="text-sm font-semibold text-gray-900">{formatMonthLabel(key)}</span><span className="text-xs text-gray-400">{m.fahrten} Fahrt{m.fahrten !== 1 ? 'en' : ''}</span></div><div className="flex flex-wrap gap-3 mt-1.5">{m.dienst > 0 && <span className="text-xs text-blue-600">{m.dienst.toLocaleString('de-DE')} km Dienst</span>}{m.privat > 0 && <span className="text-xs text-purple-600">{m.privat.toLocaleString('de-DE')} km Privat</span>}{m.tank > 0 && <span className="text-xs text-emerald-600">{m.tank.toLocaleString('de-DE')} km Tank</span>}</div></div><div className="flex items-center gap-3 ml-4"><div className="text-right"><p className="text-lg font-bold text-blue-600">{m.km.toLocaleString('de-DE')}</p><p className="text-xs text-gray-400">km gesamt</p></div><ChevronRight /></div></div>
                  </button>
                ))}</div>
              )}
            </div>
          )}

          {kmAnsicht === 'eingabe' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3"><button type="button" onClick={() => setKmAnsicht('overview')} className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>Übersicht</button><h2 className="text-sm font-semibold text-gray-7" onClick={() => removeZeile(z.rowId)} disabled={eingabeZeilen.length === 1} className="text-gray-300 hover:text-red-400 transition disabled:opacity-20 flex items-center justify-center"><TrashIcon /></button>
                        </div>
                      ); })}
                    </div>
                    <button type="button" onClick={addZeile} className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition px-1"><PlusIcon /> Zeile hinzufügen</button>
                  </div>
                </div>
                {eingabeTotalKm > 0 && <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-6"><div><p className="text-xs text-gray-400">Gesamt km</p><p className="text-lg font-bold text-blue-600">{eingabeTotalKm.toLocaleString('de-DE')} km</p></div></div>}
              </div>
              {eingabeError && <p className="text-xs text-red-500">{eingabeError}</p>}
              <div className="flex gap-2"><button type="button" onClick={handleEingabeSave} disabled={eingabeSaving} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{eingabeSaving ? 'Speichert…' : `Fahrtenbuch speichern (${eingabeValidRows} Fahrt${eingabeValidRows !== 1 ? 'en' : ''})`}</button><button type="button" onClick={() => setKmAnsicht('overview')} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div>
            </div>
          )}

          {kmAnsicht === 'detail' && detailMonat && (() => {
            const m = kmStats.monate[detailMonat];
            if (!m) return null;
            const sorted = [...m.eintraege].sort((a, b) => new Date(a.datum) - new Date(b.datum) || (a.km_start ?? 0) - (b.km_start ?? 0));
            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3"><button type="button" onClick={() => setKmAnsicht('overview')} className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>Übersicht</button><h2 className="text-sm font-semibold text-gray-900">{formatMonthLabel(detailMonat)}</h2></div>
                  <div className="flex gap-2"><button type="button" onClick={() => handleExport(detailMonat)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-50 transition"><DownloadIcon /> CSV</button><button type="button" onClick={() => { setEingabeMonat(detailMonat); setEingabeZeilen([newZeile()]); setEingabeError(''); setKmAnsicht('eingabe'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-whit" onClick={() => removeZeile(z.rowId)} disabled={eingabeZeilen.length === 1} className="text-gray-300 hover:text-red-400 transition disabled:opacity-20 flex items-center justify-center"><TrashIcon /></button>
                        </div>
                      ); })}
                    </div>
                    <button type="button" onClick={addZeile} className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition px-1"><PlusIcon /> Zeile hinzufügen</button>
                  </div>
                </div>
                {eingabeTotalKm > 0 && <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-6"><div><p className="text-xs text-gray-400">Gesamt km</p><p className="text-lg font-bold text-blue-600">{eingabeTotalKm.toLocaleString('de-DE')} km</p></div></div>}
              </div>
              {eingabeError && <p className="text-xs text-red-500">{eingabeError}</p>}
              <div className="flex gap-2"><button type="button" onClick={handleEingabeSave} disabled={eingabeSaving} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{eingabeSaving ? 'Speichert…' : `Fahrtenbuch speichern (${eingabeValidRows} Fahrt${eingabeValidRows !== 1 ? 'en' : ''})`}</button><button type="button" onClick={() => setKmAnsicht('overview')} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div>
            </div>
          )}

          {kmAnsicht === 'detail' && detailMonat && (() => {
            const m = kmStats.monate[detailMonat];
            if (!m) return null;
            const sorted = [...m.eintraege].sort((a, b) => new Date(a.datum) - new Date(b.datum) || (a.km_start ?? 0) - (b.km_start ?? 0));
            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3"><button type="button" onClick={() => setKmAnsicht('overview')} className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>Übersicht</button><h2 className="text-sm font-semibold text-gray-900">{formatMonthLabel(detailMonat)}</h2></div>
                  <div className="flex gap-2"><button type="button" onClick={() => handleExport(detailMonat)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-50 transition"><DownloadIcon /> CSV</button><button type="button" onClick={() => { setEingabeMonat(detailMonat); setEingabeZeilen([newZeile()]); setEingabeError(''); setKmAnsicht('eingabe'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition"><PlusIcon /> Fahrten ergänzen</button></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><div className="bg-blue-50 rounded-xl p-4 text-center"><p className="text-xs text-blue-600 font-medium">Gesamt km</p><p className="text-xl font-bold text-blue-800">{m.km.toLocaleString('de-DE')}</p></div><div className="bg-white rounded-xl border border-gray-100 p-4 text-center"><p className="text-xs text-gray-400">Fahrten</p><p className="text-xl font-bold text-gray-900">{m.fahrten}</p></div>{m.dienst > 0 && <div className="bg-white rounded-xl border border-gray-100 p-4 text-center"><p className="text-xs text-gray-400">Dienstfahrten</p><p className="text-lg font-bold text-blue-600">{m.dienst.toLocaleString('de-DE')} km</p></div>}{m.privat > 0 && <div className="bg-white rounded-xl border border-gray-100 p-4 text-center"><p className="text-xs text-gray-400">Privatfahrten</p><p className="text-lg font-bold text-purple-600">{m.privat.toLocaleString('de-DE')} km</p></div>}</div>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[500px]"><thead><tr className="border-b border-gray-100"><th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Datum</th><th className="text-right text-xs font-medium text-gray-400 px-3 py-3">km-Start</th><th className="text-right text-xs font-medium text-gray-400 px-3 py-3">km-Ende</th><th className="text-right text-xs font-medium text-gray-400 px-3 py-3">km</th><th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Fahrer</th><th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Zweck</th><th className="px-3 py-3"></th></tr></thead><tbody className="divide-y divide-gray-50">{sorted.map(e => { const zweckOpt = ZWECK_OPTIONS.find(z => z.value === e.zweck); return (<tr key={e.id} className="hover:bg-gray-50/50 transition"><td className="px-5 py-3 text-sm text-gray-700">{formatDate(e.datum)}</td><td className="px-3 py-3 text-sm text-right text-gray-500">{e.km_start != null ? e.km_start.toLocaleString('de-DE') : '—'}</td><td className="px-3 py-3 text-sm text-right text-gray-700 font-medium">{e.km_stand != null ? e.km_stand.toLocaleString('de-DE') : '—'}</td><td className="px-3 py-3 text-sm text-right font-semibold text-blue-600">{e.tripKm != null && e.tripKm >= 0 ? e.tripKm.toLocaleString('de-DE') : '—'}</td><td className="px-3 py-3 text-sm text-gray-500">{e.fahrer_name ?? '—'}</td><td className="px-3 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${zweckOpt?.cls ?? 'bg-gray-50 text-gray-500'}`}>{zweckOpt?.label ?? e.zweck}</span></td><td className="px-3 py-3"><button type="button" onClick={() => handleKmDelete(e.id)} disabled={deletingKmId === e.id} className="text-gray-300 hover:text-red-400 transition disabled:opacity-40"><TrashIcon /></button></td></tr>); })}</tbody><tfoot><tr className="border-t border-gray-100 bg-gray-50/50"><td colSpan={3} className="px-5 py-3 text-xs font-medium text-gray-500">Gesamt</td><td className="px-3 py-3 text-sm font-bold text-blue-700 text-right">{m.km.toLocaleString('de-DE')} km</td><td colSpan={3}></td></tr></tfoot></table></div></div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── VERSICHERUNG ── */}
      {activeTab === 'versicherung' && (
        <div className="space-y-5">

          {/* Ablauf-Warnung */}
          {versAblaufStatus && (versAblaufStatus.severity === 'danger' || versAblaufStatus.severity === 'warn') && aktuelleVers && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${versAblaufStatus.severity === 'danger' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
              <WarnIcon cls={versAblaufStatus.severity === 'danger' ? 'text-red-500' : 'text-amber-500'} />
              <span className={versAblaufStatus.severity === 'danger' ? 'text-red-700' : 'text-amber-700'}>
                <strong>Versicherung läuft ab</strong> — {versAblaufStatus.label} ({formatDate(aktuelleVers.ablauf_datum)})
              </span>
            </div>
          )}

          {/* Aktuelle Versicherung — prominente Karte */}
          {!versLaden && aktuelleVers && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-400">Aktuelle Versicherung</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Aktuell</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{aktuelleVers.gesellschaft}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{VERS_ART_OPTIONS.find(o => o.value === aktuelleVers.art)?.label ?? aktuelleVers.art}</p>
                </div>
                {aktuelleVers.jahrespraemie && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Jahresprämie</p>
                    <p className="text-xl font-bold text-gray-900">{formatEuro(aktuelleVers.jahrespraemie)}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {aktuelleVers.policennummer && (
                  <div><p className="text-xs text-gray-400">Policennummer</p><p className="text-sm font-medium text-gray-700">{aktuelleVers.policennummer}</p></div>
                )}
                {aktuelleVers.beginn_datum && (
                  <div><p className="text-xs text-gray-400">Versicherungsbeginn</p><p className="text-sm font-medium text-gray-700">{formatDate(aktuelleVers.beginn_datum)}</p></div>
                )}
                {aktuelleVers.ablauf_datum && (
                  <div>
                    <p className="text-xs text-gray-400">Ablaufdatum</p>
                    <p className={`text-sm font-medium ${versAblaufStatus && versAblaufStatus.severity !== 'ok' ? versAblaufStatus.cls : 'text-gray-700'}`}>
                      {formatDate(aktuelleVers.ablauf_datum)}
                      {versAblaufStatus && versAblaufStatus.severity !== 'ok' && <span className="block text-xs">{versAblaufStatus.label}</span>}
                    </p>
                  </div>
                )}
                {aktuelleVers.selbstbeteiligung && (
                  <div><p className="text-xs text-gray-400">Selbstbeteiligung</p><p className="text-sm font-medium text-gray-700">{formatEuro(aktuelleVers.selbstbeteiligung)}</p></div>
                )}
                {aktuelleVers.ansprechpartner && (
                  <div><p className="text-xs text-gray-400">Ansprechpartner</p><p className="text-sm font-medium text-gray-700">{aktuelleVers.ansprechpartner}</p></div>
                )}
                {aktuelleVers.telefon && (
                  <div><p className="text-xs text-gray-400">Telefon</p><a href={`tel:${aktuelleVers.telefon}`} className="text-sm font-medium text-blue-600 hover:underline">{aktuelleVers.telefon}</a></div>
                )}
              </div>
              {aktuelleVers.notiz && (
                <p className="text-sm text-gray-500 mt-4 italic border-t border-gray-100 pt-3">{aktuelleVers.notiz}</p>
              )}
            </div>
          )}

          {/* Header + Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Versicherungshistorie</h2>
            <button type="button" onClick={() => setVersNeuShown(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition">
              <PlusIcon /> Versicherung hinzufügen
            </button>
          </div>

          {/* Neu-Formular */}
          {versNeuShown && (
            <form onSubmit={handleVersNeu} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-gray-600">Versicherung erfassen</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput label="Versicherungsgesellschaft" required>
                  <input type="text" required value={versForm.gesellschaft} onChange={e => setVersForm(f => ({ ...f, gesellschaft: e.target.value }))} placeholder="z. B. ADAC, Allianz, HUK-Coburg…" className={inputCls} />
                </LabelInput>
                <LabelInput label="Versicherungsart">
                  <select value={versForm.art} onChange={e => setVersForm(f => ({ ...f, art: e.target.value }))} className={inputCls}>
                    {VERS_ART_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </LabelInput>
                <LabelInput label="Policennummer / Versicherungsnummer">
                  <input type="text" value={versForm.policennummer} onChange={e => setVersForm(f => ({ ...f, policennummer: e.target.value }))} placeholder="z. B. DE123456789" className={inputCls} />
                </LabelInput>
                <div />
                <LabelInput label="Versicherungsbeginn">
                  <input type="date" value={versForm.beginn_datum} onChange={e => setVersForm(f => ({ ...f, beginn_datum: e.target.value }))} className={inputCls} />
                </LabelInput>
                <LabelInput label="Ablaufdatum">
                  <input type="date" value={versForm.ablauf_datum} onChange={e => setVersForm(f => ({ ...f, ablauf_datum: e.target.value }))} className={inputCls} />
                </LabelInput>
                <LabelInput label="Jahresprämie (€)">
                  <div className="relative">
                    <input type="text" value={versForm.jahrespraemie} onChange={e => setVersForm(f => ({ ...f, jahrespraemie: e.target.value }))} placeholder="z. B. 1.200,00" className={inputCls + ' pr-6'} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                  </div>
                </LabelInput>
                <LabelInput label="Selbstbeteiligung (€)">
                  <div className="relative">
                    <input type="text" value={versForm.selbstbeteiligung} onChange={e => setVersForm(f => ({ ...f, selbstbeteiligung: e.target.value }))} placeholder="z. B. 500,00" className={inputCls + ' pr-6'} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                  </div>
                </LabelInput>
                <LabelInput label="Ansprechpartner">
                  <input type="text" value={versForm.ansprechpartner} onChange={e => setVersForm(f => ({ ...f, ansprechpartner: e.target.value }))} placeholder="Name des Ansprechpartners" className={inputCls} />
                </LabelInput>
                <LabelInput label="Telefon">
                  <input type="tel" value={versForm.telefon} onChange={e => setVersForm(f => ({ ...f, telefon: e.target.value }))} placeholder="z. B. 089 12345678" className={inputCls} />
                </LabelInput>
              </div>
              <LabelInput label="Notizen">
                <textarea value={versForm.notiz} onChange={e => setVersForm(f => ({ ...f, notiz: e.target.value }))} rows={2} placeholder="Besondere Konditionen, Schadenfreiheitsrabatt, etc." className={inputCls + ' resize-none'} />
              </LabelInput>
              {versNeuError && <p className="text-xs text-red-500">{versNeuError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={versNeuSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{versNeuSaving ? 'Speichert…' : 'Versicherung speichern'}</button>
                <button type="button" onClick={() => setVersNeuShown(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button>
              </div>
            </form>
          )}

          {/* History-Liste */}
          {versLaden ? (
            <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p>
          ) : versicherungen.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Noch keine Versicherung erfasst</p>
              <p className="text-xs text-gray-400 mt-1">Füge die aktuelle Versicherung über den Button oben hinzu.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versicherungen.map((v, i) => {
                const ablaufS = v.ablauf_datum ? pruefDatumsStatus(v.ablauf_datum) : null;
                const artLabel = VERS_ART_OPTIONS.find(o => o.value === v.art)?.label ?? v.art;
                const isConfirmDel = confirmDeleteVersId === v.id;
                return (
                  <div key={v.id} className={`bg-white rounded-2xl border px-5 py-4 ${i === 0 ? 'border-blue-100' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{v.gesellschaft}</span>
                          <span className="text-xs text-gray-400">{artLabel}</span>
                          {i === 0 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Aktuell</span>}
                          {i > 0 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">Archiv</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                          {v.policennummer && <span className="text-xs text-gray-400">Police: {v.policennummer}</span>}
                          {v.beginn_datum && <span className="text-xs text-gray-400">Von: {formatDate(v.beginn_datum)}</span>}
                          {v.ablauf_datum && (
                            <span className={`text-xs ${ablaufS && ablaufS.severity !== 'ok' ? ablaufS.cls : 'text-gray-400'}`}>
                              Bis: {formatDate(v.ablauf_datum)}{ablaufS && ablaufS.severity !== 'ok' ? ` (${ablaufS.label})` : ''}
                            </span>
                          )}
                          {v.jahrespraemie && <span className="text-xs text-gray-500 font-medium">{formatEuro(v.jahrespraemie)}/Jahr</span>}
                          {v.selbstbeteiligung && <span className="text-xs text-gray-400">SB: {formatEuro(v.selbstbeteiligung)}</span>}
                          {v.ansprechpartner && <span className="text-xs text-gray-400">{v.ansprechpartner}{v.telefon ? ` · ${v.telefon}` : ''}</span>}
                        </div>
                        {v.notiz && <p className="text-xs text-gray-400 mt-1 italic">{v.notiz}</p>}
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {isConfirmDel ? (
                          <>
                            <button type="button" onClick={() => handleVersDelete(v.id)} disabled={deletingVersId === v.id} className="px-2.5 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition">{deletingVersId === v.id ? '…' : 'Löschen'}</button>
                            <button type="button" onClick={() => setConfirmDeleteVersId(null)} className="px-2.5 py-1 text-xs text-gray-500 rounded-lg hover:bg-gray-100 transition">Abbruch</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setConfirmDeleteVersId(v.id)} className="text-gray-300 hover:text-red-400 transition mt-0.5"><TrashIcon /></button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
