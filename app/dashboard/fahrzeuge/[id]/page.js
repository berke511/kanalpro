'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const TABS = [
  { id: 'fahrzeugdaten', label: 'Fahrzeugdaten' },
  { id: 'tuev_uvv',      label: 'TÜV & UVV' },
  { id: 'wartungen',     label: 'Wartungen' },
  { id: 'kilometerstand',label: 'Kilometerstand' },
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

function datumsStatus(datum) {
  if (!datum) return null;
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const d = new Date(datum);
  const diffMs = d - heute;
  const diffTage = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffTage < 0) return { label: 'Überfällig', diffTage, cls: 'text-red-600 font-medium', severity: 'danger' };
  if (diffTage <= 30) return { label: `In ${diffTage} Tagen fällig`, diffTage, cls: 'text-red-500 font-medium', severity: 'danger' };
  if (diffTage <= 90) return { label: `In ${diffTage} Tagen fällig`, diffTage, cls: 'text-amber-600', severity: 'warn' };
  return { label: `In ${diffTage} Tagen fällig`, diffTage, cls: 'text-emerald-600', severity: 'ok' };
}

function pruefDatumsStatus(datum) {
  if (!datum) return null;
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const d = new Date(datum);
  const diffMs = d - heute;
  const diffTage = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffTage < 0) return { label: 'Abgelaufen', diffTage, cls: 'text-red-600 font-medium', severity: 'danger' };
  if (diffTage <= 30) return { label: `Läuft in ${diffTage} Tagen ab`, diffTage, cls: 'text-red-500 font-medium', severity: 'danger' };
  if (diffTage <= 90) return { label: `Läuft in ${diffTage} Tagen ab`, diffTage, cls: 'text-amber-600', severity: 'warn' };
  return { label: `Gøltig noch ${diffTage} Tage`, diffTage, cls: 'text-emerald-600', severity: 'ok' };
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
  const names = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${names[parseInt(month) - 1]} ${year}`;
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
  const [kmNeuShown, setKmNeuShown] = useState(false);
  const [kmNeuSaving, setKmNeuSaving] = useState(false);
  const [kmNeuError, setKmNeuError] = useState('');
  const [deletingKmId, setDeletingKmId] = useState(null);
  const [kmForm, setKmForm] = useState({ datum: '', km_stand: '', fahrer_name: '', zweck: 'dienstfahrt', liter: '', kosten: '', notiz: '' });
  const [kmAnsicht, setKmAnsicht] = useState('liste'); // 'liste' | 'statistik'
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

  const loadKmEintraege = useCallback(async () => {
    setKmLaden(true);
    const { data } = await supabase.from('fahrzeug_km_eintraege').select('*').eq('fahrzeug_id', id).order('datum', { ascending: false }).order('km_stand', { ascending: false });
    setKmEintraege(data ?? []);
    setKmLaden(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === 'tuev_uvv') loadPruefungen(); }, [activeTab, loadPruefungen]);
  useEffect(() => { if (activeTab === 'wartungen') loadWartungen(); }, [activeTab, loadWartungen]);
  useEffect(() => { if (activeTab === 'kilometerstand') loadKmEintraege(); }, [activeTab, loadKmEintraege]);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  // Fahrzeugdaten speichern
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

  // Prüfeintrag
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

  // Nächste Wartung
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

  // km-Eintrag hinzufügen
  async function handleKmNeu(e) {
    e.preventDefault(); setKmNeuError('');
    if (!kmForm.datum) { setKmNeuError('Datum ist Pflichtfeld.'); return; }
    if (!kmForm.km_stand) { setKmNeuError('Kilometerstand ist Pflichtfeld.'); return; }
    setKmNeuSaving(true);
    const km = parseInt(kmForm.km_stand);
    const { error } = await supabase.from('fahrzeug_km_eintraege').insert({ fahrzeug_id: id, company_id: companyId, datum: kmForm.datum, km_stand: km, fahrer_name: kmForm.fahrer_name.trim() || null, zweck: kmForm.zweck, liter: (kmForm.zweck === 'tankfahrt' && kmForm.liter) ? parseFloat(kmForm.liter.replace(',', '.')) : null, kosten: (kmForm.zweck === 'tankfahrt' && kmForm.kosten) ? parseFloat(kmForm.kosten.replace(',', '.')) : null, notiz: kmForm.notiz.trim() || null });
    // Auto-update km_stand wenn neuer Eintrag größer als aktueller
    if (!error && fahrzeug && (fahrzeug.km_stand == null || km > fahrzeug.km_stand)) {
      await supabase.from('fahrzeuge').update({ km_stand: km, updated_at: new Date().toISOString() }).eq('id', id);
      setFahrzeug(prev => ({ ...prev, km_stand: km }));
      setForm(f => ({ ...f, km_stand: String(km) }));
      setAktKmWert(String(km));
    }
    setKmNeuSaving(false);
    if (error) { setKmNeuError(error.message); return; }
    setKmNeuShown(false); setKmForm({ datum: '', km_stand: '', fahrer_name: '', zweck: 'dienstfahrt', liter: '', kosten: '', notiz: '' }); loadKmEintraege();
  }

  async function handleKmDelete(kmId) { setDeletingKmId(kmId); await supabase.from('fahrzeug_km_eintraege').delete().eq('id', kmId); setDeletingKmId(null); loadKmEintraege(); }

  // CSV Export
  function handleExport() {
    const sorted = [...kmEintraege].sort((a, b) => new Date(a.datum) - new Date(b.datum) || a.km_stand - b.km_stand);
    const rows = [['Datum', 'km-Stand', 'Tages-km', 'Fahrer', 'Zweck', 'Liter', 'Kosten (EUR)', 'Notiz']];
    sorted.forEach((e, i) => {
      const prev = sorted[i - 1];
      const tagesKm = prev ? e.km_stand - prev.km_stand : '';
      rows.push([formatDate(e.datum), e.km_stand, tagesKm, e.fahrer_name ?? '', ZWECK_OPTIONS.find(z => z.value === e.zweck)?.label ?? e.zweck, e.liter ?? '', e.kosten ?? '', e.notiz ?? '']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `km_${fahrzeug?.kennzeichen ?? id}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Statistik berechnen
  const kmStats = useMemo(() => {
    if (kmEintraege.length === 0) return null;
    const sorted = [...kmEintraege].sort((a, b) => new Date(a.datum) - new Date(b.datum) || a.km_stand - b.km_stand);

    // Tageskilometer
    const withDiff = sorted.map((e, i) => ({ ...e, tagesKm: i > 0 ? e.km_stand - sorted[i - 1].km_stand : null }));

    // Monatsgruppen
    const monate = {};
    withDiff.forEach(e => {
      const key = formatMonthKey(e.datum);
      if (!monate[key]) monate[key] = { gesamt: 0, dienst: 0, privat: 0, tank: 0, sonstiges: 0, liter: 0, tankKm: 0, eintraege: 0 };
      const m = monate[key];
      m.eintraege++;
      if (e.tagesKm != null && e.tagesKm > 0) {
        m.gesamt += e.tagesKm;
        if (e.zweck === 'dienstfahrt') m.dienst += e.tagesKm;
        else if (e.zweck === 'privatfahrt') m.privat += e.tagesKm;
        else if (e.zweck === 'tankfahrt') { m.tank += e.tagesKm; m.tankKm += e.tagesKm; }
        else m.sonstiges += e.tagesKm;
      }
      if (e.zweck === 'tankfahrt' && e.liter) m.liter += parseFloat(e.liter);
    });

    // Gesamtverbrauch
    const gesamtLiter = withDiff.filter(e => e.zweck === 'tankfahrt' && e.liter).reduce((s, e) => s + parseFloat(e.liter), 0);
    const gesamtKm = sorted.length > 1 ? sorted[sorted.length - 1].km_stand - sorted[0].km_stand : 0;
    const verbrauch = gesamtKm > 0 && gesamtLiter > 0 ? (gesamtLiter / gesamtKm * 100) : null;

    return { withDiff, monate, verbrauch, gesamtLiter, gesamtKm };
  }, [kmEintraege]);

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-gray-400 text-sm">Lädt…</p></div>;
  if (notFound) return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-500">Fahrzeug nicht gefunden.</p>
      <Link href="/dashboard/fahrzeuge" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Zurück zur Liste</Link>
    </div>
  );

  const title = fahrzeug ? [fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(' ') : '';
  const zustandCls = ZUSTAND_COLORS[form.zustand] ?? 'bg-gray-50 text-gray-500';
  const warnungen = [{ label: 'TÜV', datum: fristenForm.tuev_bis }, { label: 'HU', datum: fristenForm.hu_bis }, { label: 'UVV', datum: fristenForm.uvv_bis }].map(w => ({ ...w, status: pruefDatumsStatus(w.datum) })).filter(w => w.datum && w.status && w.status.severity !== 'ok');
  const naechste = [{ label: 'TÜV', datum: fristenForm.tuev_bis }, { label: 'HU', datum: fristenForm.hu_bis }, { label: 'UVV', datum: fristenForm.uvv_bis }].filter(w => w.datum).sort((a, b) => new Date(a.datum) - new Date(b.datum))[0];
  const aktKm = fahrzeug?.km_stand;
  const wartDatumStatus = datumsStatus(naechsteWart.datum);
  const wartKmStatus = kmStatus(naechsteWart.km ? parseInt(naechsteWart.km) : null, aktKm);
  const wartWarnCount = [wartDatumStatus, wartKmStatus].filter(s => s && (s.severity === 'danger' || s.severity === 'warn')).length;

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
            <h2 className="text-sm font-semibold text-gray-700">Aktuelle Prüffristen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><LabelInput label="TÜV gültig bis"><input type="date" value={fristenForm.tuev_bis} onChange={e => setFristenForm(f => ({ ...f, tuev_bis: e.target.value }))} className={inputCls} /></LabelInput>{fristenForm.tuev_bis && (() => { const s = pruefDatumsStatus(fristenForm.tuev_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
              <div><LabelInput label="HU gültig bis"><input type="date" value={fristenForm.hu_bis} onChange={e => setFristenForm(f => ({ ...f, hu_bis: e.target.value }))} className={inputCls} /></LabelInput>{fristenForm.hu_bis && (() => { const s = pruefDatumsStatus(fristenForm.hu_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
              <div><LabelInput label="UVV gültig bis"><input type="date" value={fristenForm.uvv_bis} onChange={e => setFristenForm(f => ({ ...f, uvv_bis: e.target.value }))} className={inputCls} /></LabelInput>{fristenForm.uvv_bis && (() => { const s = pruefDatumsStatus(fristenForm.uvv_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}</div>
            </div>
            {fristenError && <p className="text-xs text-red-500">{fristenError}</p>}
            {fristenSuccess && <p className="text-xs text-emerald-600">Fristen gespeichert ✓</p>}
            <button type="submit" disabled={fristenSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{fristenSaving ? 'Speichert…' : 'Fristen speichern'}</button>
          </form>
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-700">Prüfhistorie</h2><button type="button" onClick={() => setPruefNeuShown(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition"><PlusIcon /> Eintrag hinzufügen</button></div>
          {pruefNeuShown && <form onSubmit={handlePruefNeu} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4"><h3 className="text-xs font-semibold text-gray-600">Neuen Prüfeintrag erfassen</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LabelInput label="Prüfungsart"><select value={pruefForm.art} onChange={e => setPruefForm(f => ({ ...f, art: e.target.value }))} className={inputCls}><option value="tuev">TÜV</option><option value="hu">HU (Hauptuntersuchung)</option><option value="uvv">UVV-Prüfung</option><option value="sonstiges">Sonstige</option></select></LabelInput><LabelInput label="Prüfdatum" required><input type="date" required value={pruefForm.pruef_datum} onChange={e => setPruefForm(f => ({ ...f, pruef_datum: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Gøltig bis (nächste Prüfung)"><input type="date" value={pruefForm.gueltig_bis} onChange={e => setPruefForm(f => ({ ...f, gueltig_bis: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Prøfstelle / Werkstatt"><input type="text" value={pruefForm.pruefstelle} onChange={e => setPruefForm(f => ({ ...f, pruefstelle: e.target.value }))} placeholder="z. B. TÜV München" className={inputCls} /></LabelInput></div><LabelInput label="Ergebnis"><select value={pruefForm.ergebnis} onChange={e => setPruefForm(f => ({ ...f, ergebnis: e.target.value }))} className={inputCls}>{ERGEBNIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelInput><LabelInput label="Notiz"><textarea value={pruefForm.notiz} onChange={e => setPruefForm(f => ({ ...f, notiz: e.target.value }))} rows={2} placeholder="Optionale Anmerkungen…" className={inputCls + ' resize-none'} /></LabelInput>{pruefNeuError && <p className="text-xs text-red-500">{pruefNeuError}</p>}<div className="flex gap-2"><button type="submit" disabled={pruefNeuSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{pruefNeuSaving ? 'Speichert…' : 'Eintrag speichern'}</button><button type="button" onClick={() => setPruefNeuShown(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div></form>}
          {pruefLaden ? <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p> : pruefungen.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center"><p className="text-sm text-gray-400">Noch keine Prøfeinträge erfasst.</p></div> : <div className="space-y-2">{pruefungen.map(p => { const s = p.gueltig_bis ? pruefDatumsStatus(p.gueltig_bis) : null; return <div key={p.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-gray-900">{ART_LABELS[p.art] ?? p.art}</span><span className="text-xs text-gray-400">{formatDate(p.pruef_datum)}</span>{p.ergebnis && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ERGEBNIS_COLORS[p.ergebnis] ?? 'bg-gray-50 text-gray-500'}`}>{ERGEBNIS_OPTIONS.find(o => o.value === p.ergebnis)?.label ?? p.ergebnis}</span>}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">{p.pruefstelle && <span className="text-xs text-gray-400">{p.pruefstelle}</span>}{p.gueltig_bis && <span className="text-xs text-gray-400">Gültig bis {formatDate(p.gueltig_bis)}{s && s.severity !== 'ok' && <span className={`ml-1 ${s.cls}`}>({s.label})</span>}</span>}</div>{p.notiz && <p className="text-xs text-gray-400 mt-1 italic">{p.notiz}</p>}</div><button type="button" onClick={() => handlePruefDelete(p.id)} disabled={deletingPruefId === p.id} className="text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5 disabled:opacity-40" title="Löschen"><TrashIcon /></button></div></div>; })}</div>}
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
          {wartNeuShown && <form onSubmit={handleWartNeu} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4"><h3 className="text-xs font-semibold text-gray-600">Wartungseintrag erfassen</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LabelInput label="Art der Wartung"><select value={wartForm.art} onChange={e => setWartForm(f => ({ ...f, art: e.target.value }))} className={inputCls}>{WARTUNG_ART_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelInput><LabelInput label="Datum" required><input type="date" required value={wartForm.datum} onChange={e => setWartForm(f => ({ ...f, datum: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Kilometerstand bei Wartung"><div className="relative"><input type="number" value={wartForm.km_stand} onChange={e => setWartForm(f => ({ ...f, km_stand: e.target.value }))} placeholder="z. B. 45000" min="0" className={inputCls + ' pr-10'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div></LabelInput><LabelInput label="Werkstatt"><input type="text" value={wartForm.werkstatt} onChange={e => setWartForm(f => ({ ...f, werkstatt: e.target.value }))} placeholder="z. B. Autohaus Müller" className={inputCls} /></LabelInput><LabelInput label="Kosten (€)"><div className="relative"><input type="text" value={wartForm.kosten} onChange={e => setWartForm(f => ({ ...f, kosten: e.target.value }))} placeholder="z. B. 180,00" className={inputCls + ' pr-6'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span></div></LabelInput><div /></div><div className="border-t border-gray-100 pt-3"><p className="text-xs font-medium text-gray-500 mb-3">Nächste Wartung fällig (optional — überschreibt aktuelle Einstellung)</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LabelInput label="Datum nächste Wartung"><input type="date" value={wartForm.naechste_datum} onChange={e => setWartForm(f => ({ ...f, naechste_datum: e.target.value }))} className={inputCls} /></LabelInput><LabelInput label="Km nächste Wartung"><div className="relative"><input type="number" value={wartForm.naechste_km} onChange={e => setWartForm(f => ({ ...f, naechste_km: e.target.value }))} placeholder="z. B. 60000" min="0" className={inputCls + ' pr-10'} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span></div></LabelInput></div></div><LabelInput label="Notiz"><textarea value={wartForm.notiz} onChange={e => setWartForm(f => ({ ...f, notiz: e.target.value }))} rows={2} placeholder="Optionale Anmerkungen…" className={inputCls + ' resize-none'} /></LabelInput>{wartNeuError && <p className="text-xs text-red-500">{wartNeuError}</p>}<div className="flex gap-2"><button type="submit" disabled={wartNeuSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{wartNeuSaving ? 'Speichert…' : 'Wartung speichern'}</button><button type="button" onClick={() => setWartNeuShown(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button></div></form>}
          {wartLaden ? <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p> : wartungen.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center"><p className="text-sm text-gray-400">Noch keine Wartungseinträge vorhanden.</p><p className="text-xs text-gray-300 mt-1">Erfasse die erste Wartung øber den Button oben.</p></div> : <div className="space-y-2">{wartungen.map(w => { const artLabel = WARTUNG_ART_OPTIONS.find(o => o.value === w.art)?.label ?? w.art; return <div key={w.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-gray-900">{artLabel}</span><span className="text-xs text-gray-400">{formatDate(w.datum)}</span>{w.km_stand != null && <span className="text-xs text-gray-400">{w.km_stand.toLocaleString('de-DE')} km</span>}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">{w.werkstatt && <span className="text-xs text-gray-400">{w.werkstatt}</span>}{w.kosten != null && <span className="text-xs text-gray-500 font-medium">{parseFloat(w.kosten).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>}{w.naechste_datum && <span className="text-xs text-gray-400">Nächste: {formatDate(w.naechste_datum)}</span>}{w.naechste_km != null && <span className="text-xs text-gray-400">Nächste: {w.naechste_km.toLocaleString('de-DE')} km</span>}</div>{w.notiz && <p className="text-xs text-gray-400 mt-1 italic">{w.notiz}</p>}</div><button type="button" onClick={() => handleWartDelete(w.id)} disabled={deletingWartId === w.id} className="text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5 disabled:opacity-40" title="Löschen"><TrashIcon /></button></div></div>; })}</div>}
        </div>
      )}

      {/* ── KILOMETERSTAND ── */}
      {activeTab === 'kilometerstand' && (
        <div className="space-y-5">

          {/* Aktueller km-Stand */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-xs font-medium text-gray-400 mb-1">Aktueller Kilometerstand</p>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-3xl font-bold text-gray-900">{fahrzeug?.km_stand != null ? fahrzeug.km_stand.toLocaleString('de-DE') : '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">km</p>
              </div>
              <form onSubmit={handleAktKmSave} className="flex items-center gap-2 mb-0.5">
                <div className="relative">
                  <input type="number" value={aktKmWert} onChange={e => setAktKmWert(e.target.value)} min="0" placeholder="Neuer km-Stand" className="w-44 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span>
                </div>
                <button type="submit" disabled={aktKmSaving} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">{aktKmSaving ? '…' : 'Aktualisieren'}</button>
                {aktKmSuccess && <span className="text-xs text-emerald-600">✓</span>}
              </form>
            </div>
          </div>

          {/* Statistik-Karten wenn Daten vorhanden */}
          {kmStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Gesamte km</p>
                <p className="text-lg font-bold text-gray-900">{kmStats.gesamtKm.toLocaleString('de-DE')}</p>
                <p className="text-xs text-gray-400">km (erfasst)</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Einträge</p>
                <p className="text-lg font-bold text-gray-900">{kmEintraege.length}</p>
                <p className="text-xs text-gray-400">Fahrten</p>
              </div>
              {kmStats.verbrauch && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Ø Verbrauch</p>
                  <p className="text-lg font-bold text-gray-900">{kmStats.verbrauch.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">L/100 km</p>
                </div>
              )}
              {kmStats.gesamtLiter > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Getankt</p>
                  <p className="text-lg font-bold text-gray-900">{kmStats.gesamtLiter.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">Liter gesamt</p>
                </div>
              )}
            </div>
          )}

          {/* Ansicht-Umschalter + Eintrag hinzufügen */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              <button type="button" onClick={() => setKmAnsicht('liste')} className={`px-3 py-1 text-xs font-medium rounded-lg transition ${kmAnsicht === 'liste' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Fahrtenbuch</button>
              <button type="button" onClick={() => setKmAnsicht('statistik')} className={`px-3 py-1 text-xs font-medium rounded-lg transition ${kmAnsicht === 'statistik' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Monatsübersicht</button>
            </div>
            <div className="flex gap-2">
              {kmEintraege.length > 0 && (
                <button type="button" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-50 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  CSV Export
                </button>
              )}
              <button type="button" onClick={() => setKmNeuShown(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition">
                <PlusIcon /> Eintrag hinzufügen
              </button>
            </div>
          </div>

          {/* Neuer km-Eintrag */}
          {kmNeuShown && (
            <form onSubmit={handleKmNeu} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-gray-600">Fahrteneintrag erfassen</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput label="Datum" required>
                  <input type="date" required value={kmForm.datum} onChange={e => setKmForm(f => ({ ...f, datum: e.target.value }))} className={inputCls} />
                </LabelInput>
                <LabelInput label="km-Stand" required>
                  <div className="relative">
                    <input type="number" required value={kmForm.km_stand} onChange={e => setKmForm(f => ({ ...f, km_stand: e.target.value }))} placeholder="z. B. 45230" min="0" className={inputCls + ' pr-10'} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span>
                  </div>
                </LabelInput>
                <LabelInput label="Fahrer">
                  <input type="text" value={kmForm.fahrer_name} onChange={e => setKmForm(f => ({ ...f, fahrer_name: e.target.value }))} placeholder="Name des Fahrers" className={inputCls} />
                </LabelInput>
                <LabelInput label="Zweck">
                  <select value={kmForm.zweck} onChange={e => setKmForm(f => ({ ...f, zweck: e.target.value }))} className={inputCls}>
                    {ZWECK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </LabelInput>
                {kmForm.zweck === 'tankfahrt' && <>
                  <LabelInput label="Liter getankt">
                    <div className="relative">
                      <input type="text" value={kmForm.liter} onChange={e => setKmForm(f => ({ ...f, liter: e.target.value }))} placeholder="z. B. 45,5" className={inputCls + ' pr-6'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">L</span>
                    </div>
                  </LabelInput>
                  <LabelInput label="Kosten (€)">
                    <div className="relative">
                      <input type="text" value={kmForm.kosten} onChange={e => setKmForm(f => ({ ...f, kosten: e.target.value }))} placeholder="z. B. 72,50" className={inputCls + ' pr-6'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                    </div>
                  </LabelInput>
                </>}
              </div>
              <LabelInput label="Notiz">
                <input type="text" value={kmForm.notiz} onChange={e => setKmForm(f => ({ ...f, notiz: e.target.value }))} placeholder="Optionale Anmerkung…" className={inputCls} />
              </LabelInput>
              {kmNeuError && <p className="text-xs text-red-500">{kmNeuError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={kmNeuSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">{kmNeuSaving ? 'Speichert…' : 'Eintrag speichern'}</button>
                <button type="button" onClick={() => setKmNeuShown(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">Abbrechen</button>
              </div>
            </form>
          )}

          {/* Fahrtenbuch Liste */}
          {kmAnsicht === 'liste' && (
            kmLaden ? <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p> :
            kmEintraege.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <p className="text-sm text-gray-400">Noch keine km-Einträge vorhanden.</p>
                <p className="text-xs text-gray-300 mt-1">Erfasse die erste Fahrt øber den Button oben.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const sorted = [...kmEintraege].sort((a, b) => new Date(b.datum) - new Date(a.datum) || b.km_stand - a.km_stand);
                  const allSorted = [...kmEintraege].sort((a, b) => new Date(a.datum) - new Date(b.datum) || a.km_stand - b.km_stand);
                  return sorted.map(e => {
                    const idx = allSorted.findIndex(x => x.id === e.id);
                    const prev = allSorted[idx - 1];
                    const tagesKm = prev ? e.km_stand - prev.km_stand : null;
                    const zweckOpt = ZWECK_OPTIONS.find(z => z.value === e.zweck);
                    return (
                      <div key={e.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-900">{e.km_stand.toLocaleString('de-DE')} km</span>
                              {tagesKm != null && tagesKm >= 0 && <span className="text-xs font-medium text-blue-600">+{tagesKm.toLocaleString('de-DE')} km</span>}
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${zweckOpt?.cls ?? 'bg-gray-50 text-gray-500'}`}>{zweckOpt?.label ?? e.zweck}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                              <span className="text-xs text-gray-400">{formatDate(e.datum)}</span>
                              {e.fahrer_name && <span className="text-xs text-gray-400">{e.fahrer_name}</span>}
                              {e.zweck === 'tankfahrt' && e.liter && <span className="text-xs text-emerald-600">{parseFloat(e.liter).toFixed(1)} L</span>}
                              {e.zweck === 'tankfahrt' && e.kosten && <span className="text-xs text-gray-500">{parseFloat(e.kosten).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>}
                            </div>
                            {e.notiz && <p className="text-xs text-gray-400 mt-1 italic">{e.notiz}</p>}
                          </div>
                          <button type="button" onClick={() => handleKmDelete(e.id)} disabled={deletingKmId === e.id} className="text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5 disabled:opacity-40" title="Löschen"><TrashIcon /></button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )
          )}

          {/* Monatsøbersicht */}
          {kmAnsicht === 'statistik' && (
            kmLaden ? <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p> :
            !kmStats || Object.keys(kmStats.monate).length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center"><p className="text-sm text-gray-400">Noch keine Daten für Monatsøbersicht.</p></div>
            ) : (
              <div className="space-y-3">
                {Object.entries(kmStats.monate).sort(([a], [b]) => b.localeCompare(a)).map(([key, m]) => (
                  <div key={key} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">{formatMonthLabel(key)}</h3>
                      <span className="text-sm font-bold text-blue-600">{m.gesamt.toLocaleString('de-DE')} km</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {m.dienst > 0 && <div className="bg-blue-50 rounded-xl p-3"><p className="text-xs text-blue-600 font-medium">Dienst</p><p className="text-sm font-bold text-blue-800">{m.dienst.toLocaleString('de-DE')} km</p></div>}
                      {m.privat > 0 && <div className="bg-purple-50 rounded-xl p-3"><p className="text-xs text-purple-600 font-medium">Privat</p><p className="text-sm font-bold text-purple-800">{m.privat.toLocaleString('de-DE')} km</p></div>}
                      {m.tank > 0 && <div className="bg-emerald-50 rounded-xl p-3"><p className="text-xs text-emerald-600 font-medium">Tank</p><p className="text-sm font-bold text-emerald-800">{m.tank.toLocaleString('de-DE')} km</p></div>}
                      {m.sonstiges > 0 && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 font-medium">Sonstiges</p><p className="text-sm font-bold text-gray-700">{m.sonstiges.toLocaleString('de-DE')} km</p></div>}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="text-xs text-gray-400">{m.eintraege} Einträge</span>
                      {m.liter > 0 && <span className="text-xs text-emerald-600">{m.liter.toFixed(1)} L getankt</span>}
                      {m.liter > 0 && m.gesamt > 0 && <span className="text-xs text-gray-500">Ø {(m.liter / m.gesamt * 100).toFixed(1)} L/100 km</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
