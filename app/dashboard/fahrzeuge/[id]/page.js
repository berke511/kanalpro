'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const TABS = [
  { id: 'fahrzeugdaten', label: 'Fahrzeugdaten' },
  { id: 'tuev_uvv',      label: 'TÜV & UVV' },
];

const TYP_OPTIONS = [
  { value: '',               label: '— Bitte wählen —' },
  { value: 'pkw',            label: 'PKW' },
  { value: 'lkw',            label: 'LKW' },
  { value: 'transporter',    label: 'Transporter' },
  { value: 'kleintransporter', label: 'Kleintransporter' },
  { value: 'anhänger',       label: 'Anhänger' },
  { value: 'sonstiges',      label: 'Sonstiges' },
];

const KRAFTSTOFF_OPTIONS = [
  { value: '',         label: '— Bitte wählen —' },
  { value: 'benzin',   label: 'Benzin' },
  { value: 'diesel',   label: 'Diesel' },
  { value: 'elektro',  label: 'Elektro' },
  { value: 'hybrid',   label: 'Hybrid' },
  { value: 'erdgas',   label: 'Erdgas (CNG)' },
  { value: 'sonstiges',label: 'Sonstiges' },
];

const ZUSTAND_OPTIONS = [
  { value: 'aktiv',          label: 'Aktiv' },
  { value: 'wartung',        label: 'In Wartung' },
  { value: 'reserviert',     label: 'Reserviert' },
  { value: 'ausser_betrieb', label: 'Außer Betrieb' },
];

const ZUSTAND_COLORS = {
  aktiv:         'bg-emerald-50 text-emerald-700',
  wartung:       'bg-amber-50 text-amber-700',
  reserviert:    'bg-blue-50 text-blue-700',
  ausser_betrieb:'bg-red-50 text-red-600',
};

const ART_LABELS = {
  tuev:      'TÜV',
  hu:        'HU (Hauptuntersuchung)',
  uvv:       'UVV-Prüfung',
  sonstiges: 'Sonstige Prüfung',
};

const ERGEBNIS_OPTIONS = [
  { value: '',               label: '— Ergebnis wählen —' },
  { value: 'bestanden',      label: 'Bestanden' },
  { value: 'mit_maengeln',   label: 'Bestanden mit Mängeln' },
  { value: 'nicht_bestanden',label: 'Nicht bestanden' },
];

const ERGEBNIS_COLORS = {
  bestanden:       'bg-emerald-50 text-emerald-700',
  mit_maengeln:    'bg-amber-50 text-amber-700',
  nicht_bestanden: 'bg-red-50 text-red-600',
};

function datumsStatus(datum) {
  if (!datum) return null;
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const d = new Date(datum);
  const diffMs = d - heute;
  const diffTage = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffTage < 0)   return { label: 'Abgelaufen', diffTage, cls: 'text-red-600 font-medium', severity: 'danger' };
  if (diffTage <= 30) return { label: `Läuft in ${diffTage} Tagen ab`, diffTage, cls: 'text-red-500 font-medium', severity: 'danger' };
  if (diffTage <= 90) return { label: `Läuft in ${diffTage} Tagen ab`, diffTage, cls: 'text-amber-600', severity: 'warn' };
  return { label: `Gültig noch ${diffTage} Tage`, diffTage, cls: 'text-emerald-600', severity: 'ok' };
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

export default function FahrzeugDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState('fahrzeugdaten');
  const [fahrzeug, setFahrzeug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [companyId, setCompanyId] = useState(null);

  // --- Fahrzeugdaten state ---
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    kennzeichen:  '',
    marke:        '',
    modell:       '',
    typ:          '',
    baujahr:      '',
    farbe:        '',
    kraftstoff:   '',
    km_stand:     '',
    tuev_bis:     '',
    hu_bis:       '',
    uvv_bis:      '',
    versicherung: '',
    zustand:      'aktiv',
    notizen:      '',
  });

  // --- TÜV & UVV state ---
  const [pruefungen, setPruefungen] = useState([]);
  const [pruefLaden, setPruefLaden] = useState(false);
  const [pruefNeuShown, setPruefNeuShown] = useState(false);
  const [pruefNeuSaving, setPruefNeuSaving] = useState(false);
  const [pruefNeuError, setPruefNeuError] = useState('');
  const [deletingPruefId, setDeletingPruefId] = useState(null);
  const [pruefForm, setPruefForm] = useState({
    art:        'tuev',
    pruef_datum:'',
    gueltig_bis:'',
    pruefstelle:'',
    ergebnis:   '',
    notiz:      '',
  });

  const [fristenSaving, setFristenSaving] = useState(false);
  const [fristenSuccess, setFristenSuccess] = useState(false);
  const [fristenError, setFristenError] = useState('');
  const [fristenForm, setFristenForm] = useState({ tuev_bis: '', hu_bis: '', uvv_bis: '' });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: member } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (member) setCompanyId(member.company_id);

    const { data, error } = await supabase
      .from('fahrzeuge')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) { setNotFound(true); setLoading(false); return; }

    setFahrzeug(data);
    setForm({
      kennzeichen:  data.kennzeichen ?? '',
      marke:        data.marke ?? '',
      modell:       data.modell ?? '',
      typ:          data.typ ?? '',
      baujahr:      data.baujahr != null ? String(data.baujahr) : '',
      farbe:        data.farbe ?? '',
      kraftstoff:   data.kraftstoff ?? '',
      km_stand:     data.km_stand != null ? String(data.km_stand) : '',
      tuev_bis:     data.tuev_bis ?? '',
      hu_bis:       data.hu_bis ?? '',
      uvv_bis:      data.uvv_bis ?? '',
      versicherung: data.versicherung ?? '',
      zustand:      data.zustand ?? 'aktiv',
      notizen:      data.notizen ?? '',
    });
    setFristenForm({
      tuev_bis: data.tuev_bis ?? '',
      hu_bis:   data.hu_bis ?? '',
      uvv_bis:  data.uvv_bis ?? '',
    });
    setLoading(false);
  }, [id, router]);

  const loadPruefungen = useCallback(async () => {
    setPruefLaden(true);
    const { data } = await supabase
      .from('fahrzeug_pruefungen')
      .select('*')
      .eq('fahrzeug_id', id)
      .order('pruef_datum', { ascending: false });
    setPruefungen(data ?? []);
    setPruefLaden(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === 'tuev_uvv') loadPruefungen();
  }, [activeTab, loadPruefungen]);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  // --- Fahrzeugdaten speichern ---
  async function handleSave(e) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(false);
    if (!form.kennzeichen.trim()) { setSaveError('Kennzeichen ist Pflichtfeld.'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('fahrzeuge')
      .update({
        kennzeichen:  form.kennzeichen.trim().toUpperCase(),
        marke:        form.marke.trim() || null,
        modell:       form.modell.trim() || null,
        typ:          form.typ || null,
        baujahr:      form.baujahr ? parseInt(form.baujahr) : null,
        farbe:        form.farbe.trim() || null,
        kraftstoff:   form.kraftstoff || null,
        km_stand:     form.km_stand ? parseInt(form.km_stand) : null,
        tuev_bis:     form.tuev_bis || null,
        hu_bis:       form.hu_bis || null,
        uvv_bis:      form.uvv_bis || null,
        versicherung: form.versicherung.trim() || null,
        zustand:      form.zustand,
        notizen:      form.notizen.trim() || null,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', id);
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaveSuccess(true);
    setFahrzeug(prev => ({ ...prev, kennzeichen: form.kennzeichen.trim().toUpperCase(), marke: form.marke.trim() || null, modell: form.modell.trim() || null, zustand: form.zustand }));
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from('fahrzeuge').delete().eq('id', id);
    router.push('/dashboard/fahrzeuge');
  }

  // --- Fristen-Schnellspeichern (TÜV & UVV Tab) ---
  async function handleFristenSave(e) {
    e.preventDefault();
    setFristenError('');
    setFristenSuccess(false);
    setFristenSaving(true);
    const { error } = await supabase
      .from('fahrzeuge')
      .update({
        tuev_bis:   fristenForm.tuev_bis || null,
        hu_bis:     fristenForm.hu_bis || null,
        uvv_bis:    fristenForm.uvv_bis || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    setFristenSaving(false);
    if (error) { setFristenError(error.message); return; }
    setFristenSuccess(true);
    setFahrzeug(prev => ({ ...prev, tuev_bis: fristenForm.tuev_bis || null, hu_bis: fristenForm.hu_bis || null, uvv_bis: fristenForm.uvv_bis || null }));
    // also sync main form
    setForm(f => ({ ...f, tuev_bis: fristenForm.tuev_bis, hu_bis: fristenForm.hu_bis, uvv_bis: fristenForm.uvv_bis }));
    setTimeout(() => setFristenSuccess(false), 3000);
  }

  // --- Neuen Prüfeintrag hinzufügen ---
  async function handlePruefNeu(e) {
    e.preventDefault();
    setPruefNeuError('');
    if (!pruefForm.pruef_datum) { setPruefNeuError('Prüfdatum ist Pflichtfeld.'); return; }
    setPruefNeuSaving(true);

    // If gueltig_bis set → also update fahrzeuge.tuev_bis / hu_bis / uvv_bis
    const { error } = await supabase
      .from('fahrzeug_pruefungen')
      .insert({
        fahrzeug_id: id,
        company_id:  companyId,
        art:         pruefForm.art,
        pruef_datum: pruefForm.pruef_datum,
        gueltig_bis: pruefForm.gueltig_bis || null,
        pruefstelle: pruefForm.pruefstelle.trim() || null,
        ergebnis:    pruefForm.ergebnis || null,
        notiz:       pruefForm.notiz.trim() || null,
      });

    if (!error && pruefForm.gueltig_bis) {
      const updateField = pruefForm.art === 'tuev' ? 'tuev_bis' : pruefForm.art === 'hu' ? 'hu_bis' : pruefForm.art === 'uvv' ? 'uvv_bis' : null;
      if (updateField) {
        await supabase.from('fahrzeuge').update({ [updateField]: pruefForm.gueltig_bis, updated_at: new Date().toISOString() }).eq('id', id);
        setFristenForm(f => ({ ...f, [updateField]: pruefForm.gueltig_bis }));
        setForm(f => ({ ...f, [updateField]: pruefForm.gueltig_bis }));
        setFahrzeug(prev => ({ ...prev, [updateField]: pruefForm.gueltig_bis }));
      }
    }

    setPruefNeuSaving(false);
    if (error) { setPruefNeuError(error.message); return; }
    setPruefNeuShown(false);
    setPruefForm({ art: 'tuev', pruef_datum: '', gueltig_bis: '', pruefstelle: '', ergebnis: '', notiz: '' });
    loadPruefungen();
  }

  async function handlePruefDelete(pruefId) {
    setDeletingPruefId(pruefId);
    await supabase.from('fahrzeug_pruefungen').delete().eq('id', pruefId);
    setDeletingPruefId(null);
    loadPruefungen();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-gray-400 text-sm">Lädt…</p>
    </div>
  );

  if (notFound) return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-500">Fahrzeug nicht gefunden.</p>
      <Link href="/dashboard/fahrzeuge" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Zurück zur Liste</Link>
    </div>
  );

  const title = fahrzeug ? [fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(' ') : '';
  const zustandCls = ZUSTAND_COLORS[form.zustand] ?? 'bg-gray-50 text-gray-500';

  // Warnungen berechnen
  const warnungen = [
    { label: 'TÜV', datum: fristenForm.tuev_bis },
    { label: 'HU',  datum: fristenForm.hu_bis },
    { label: 'UVV', datum: fristenForm.uvv_bis },
  ].map(w => ({ ...w, status: datumsStatus(w.datum) }))
   .filter(w => w.datum && w.status && w.status.severity !== 'ok');

  // Nächste fällige Prüfung
  const naechste = [
    { label: 'TÜV', datum: fristenForm.tuev_bis },
    { label: 'HU',  datum: fristenForm.hu_bis },
    { label: 'UVV', datum: fristenForm.uvv_bis },
  ].filter(w => w.datum)
   .sort((a, b) => new Date(a.datum) - new Date(b.datum))[0];

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
        <Link href="/dashboard/fahrzeuge" className="hover:text-gray-600 transition">Fahrzeuge</Link>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-600 font-medium">{fahrzeug?.kennzeichen}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{fahrzeug?.kennzeichen}</h1>
          {title && <p className="text-sm text-gray-400 mt-0.5">{title}</p>}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full mt-1 ${zustandCls}`}>
          {ZUSTAND_OPTIONS.find(o => o.value === form.zustand)?.label ?? form.zustand}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'tuev_uvv' && warnungen.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-red-500 text-white rounded-full">{warnungen.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── FAHRZEUGDATEN TAB ── */}
      {activeTab === 'fahrzeugdaten' && (
        <form onSubmit={handleSave} className="space-y-6">

          {/* Fahrzeugidentifikation */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Fahrzeugidentifikation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <LabelInput label="Kennzeichen" required>
                <input type="text" required value={form.kennzeichen} onChange={set('kennzeichen')} placeholder="z. B. M-AB 1234" className={inputCls + ' uppercase'} />
              </LabelInput>
              <LabelInput label="Marke">
                <input type="text" value={form.marke} onChange={set('marke')} placeholder="z. B. Mercedes-Benz" className={inputCls} />
              </LabelInput>
              <LabelInput label="Modell">
                <input type="text" value={form.modell} onChange={set('modell')} placeholder="z. B. Sprinter" className={inputCls} />
              </LabelInput>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <LabelInput label="Fahrzeugtyp">
                <select value={form.typ} onChange={set('typ')} className={inputCls}>
                  {TYP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </LabelInput>
              <LabelInput label="Baujahr">
                <input type="number" value={form.baujahr} onChange={set('baujahr')} placeholder="z. B. 2020" min="1900" max={new Date().getFullYear() + 1} className={inputCls} />
              </LabelInput>
              <LabelInput label="Farbe">
                <input type="text" value={form.farbe} onChange={set('farbe')} placeholder="z. B. Weiß" className={inputCls} />
              </LabelInput>
            </div>
          </div>

          {/* Technische Daten */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Technische Daten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabelInput label="Kraftstoff">
                <select value={form.kraftstoff} onChange={set('kraftstoff')} className={inputCls}>
                  {KRAFTSTOFF_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </LabelInput>
              <LabelInput label="Kilometerstand">
                <div className="relative">
                  <input type="number" value={form.km_stand} onChange={set('km_stand')} placeholder="z. B. 45000" min="0" className={inputCls + ' pr-10'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span>
                </div>
              </LabelInput>
            </div>
          </div>

          {/* Prüffristen */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Prüffristen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <LabelInput label="TÜV bis">
                  <input type="date" value={form.tuev_bis} onChange={set('tuev_bis')} className={inputCls} />
                </LabelInput>
                {form.tuev_bis && (() => { const s = datumsStatus(form.tuev_bis); return s && s.severity !== 'ok' ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}
              </div>
              <div>
                <LabelInput label="HU bis">
                  <input type="date" value={form.hu_bis} onChange={set('hu_bis')} className={inputCls} />
                </LabelInput>
                {form.hu_bis && (() => { const s = datumsStatus(form.hu_bis); return s && s.severity !== 'ok' ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}
              </div>
              <div>
                <LabelInput label="UVV bis">
                  <input type="date" value={form.uvv_bis} onChange={set('uvv_bis')} className={inputCls} />
                </LabelInput>
                {form.uvv_bis && (() => { const s = datumsStatus(form.uvv_bis); return s && s.severity !== 'ok' ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}
              </div>
            </div>
          </div>

          {/* Status & Versicherung */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Status & Versicherung</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabelInput label="Zustand">
                <select value={form.zustand} onChange={set('zustand')} className={inputCls}>
                  {ZUSTAND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </LabelInput>
              <LabelInput label="Versicherung / Versicherungsnummer">
                <input type="text" value={form.versicherung} onChange={set('versicherung')} placeholder="z. B. ADAC / 123456789" className={inputCls} />
              </LabelInput>
            </div>
          </div>

          {/* Notizen */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Notizen</h2>
            <textarea value={form.notizen} onChange={set('notizen')} rows={4} placeholder="Interne Notizen zum Fahrzeug…" className={inputCls + ' resize-none'} />
          </div>

          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          {saveSuccess && <p className="text-xs text-emerald-600">Gespeichert ✓</p>}

          <div className="flex items-center justify-between">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
            <div>
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-sm text-red-500 rounded-xl hover:bg-red-50 transition">
                  Fahrzeug löschen
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Wirklich löschen?</span>
                  <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition">
                    {deleting ? 'Löscht…' : 'Ja, löschen'}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* ── TÜV & UVV TAB ── */}
      {activeTab === 'tuev_uvv' && (
        <div className="space-y-5">

          {/* Warnbanner */}
          {warnungen.length > 0 && (
            <div className="space-y-2">
              {warnungen.map(w => (
                <div key={w.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${w.status.severity === 'danger' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 shrink-0 ${w.status.severity === 'danger' ? 'text-red-500' : 'text-amber-500'}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span className={w.status.severity === 'danger' ? 'text-red-700' : 'text-amber-700'}>
                    <strong>{w.label}</strong> — {w.status.label}{w.datum ? ` (${formatDate(w.datum)})` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Nächste fällige Prüfung */}
          {naechste && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-400 mb-1">Nächste fällige Prüfung</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900">{naechste.label}</span>
                <span className="text-sm text-gray-500">{formatDate(naechste.datum)}</span>
                {(() => {
                  const s = datumsStatus(naechste.datum);
                  return s ? <span className={`text-xs ${s.cls}`}>{s.label}</span> : null;
                })()}
              </div>
            </div>
          )}

          {/* Fristen bearbeiten */}
          <form onSubmit={handleFristenSave} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Aktuelle Prüffristen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <LabelInput label="TÜV gültig bis">
                  <input type="date" value={fristenForm.tuev_bis} onChange={e => setFristenForm(f => ({ ...f, tuev_bis: e.target.value }))} className={inputCls} />
                </LabelInput>
                {fristenForm.tuev_bis && (() => { const s = datumsStatus(fristenForm.tuev_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}
              </div>
              <div>
                <LabelInput label="HU gültig bis">
                  <input type="date" value={fristenForm.hu_bis} onChange={e => setFristenForm(f => ({ ...f, hu_bis: e.target.value }))} className={inputCls} />
                </LabelInput>
                {fristenForm.hu_bis && (() => { const s = datumsStatus(fristenForm.hu_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}
              </div>
              <div>
                <LabelInput label="UVV gültig bis">
                  <input type="date" value={fristenForm.uvv_bis} onChange={e => setFristenForm(f => ({ ...f, uvv_bis: e.target.value }))} className={inputCls} />
                </LabelInput>
                {fristenForm.uvv_bis && (() => { const s = datumsStatus(fristenForm.uvv_bis); return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null; })()}
              </div>
            </div>
            {fristenError && <p className="text-xs text-red-500">{fristenError}</p>}
            {fristenSuccess && <p className="text-xs text-emerald-600">Fristen gespeichert ✓</p>}
            <button type="submit" disabled={fristenSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
              {fristenSaving ? 'Speichert…' : 'Fristen speichern'}
            </button>
          </form>

          {/* Prüfhistorie Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Prüfhistorie</h2>
            <button
              type="button"
              onClick={() => setPruefNeuShown(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Eintrag hinzufügen
            </button>
          </div>

          {/* Neuer Prüfeintrag Formular */}
          {pruefNeuShown && (
            <form onSubmit={handlePruefNeu} className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-gray-600">Neuen Prøfeintrag erfassen</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput label="Prüfungsart">
                  <select value={pruefForm.art} onChange={e => setPruefForm(f => ({ ...f, art: e.target.value }))} className={inputCls}>
                    <option value="tuev">TÜV</option>
                    <option value="hu">HU (Hauptuntersuchung)</option>
                    <option value="uvv">UVV-Prüfung</option>
                    <option value="sonstiges">Sonstige</option>
                  </select>
                </LabelInput>
                <LabelInput label="Prüfdatum" required>
                  <input type="date" required value={pruefForm.pruef_datum} onChange={e => setPruefForm(f => ({ ...f, pruef_datum: e.target.value }))} className={inputCls} />
                </LabelInput>
                <LabelInput label="Gültig bis (nächste Prüfung)">
                  <input type="date" value={pruefForm.gueltig_bis} onChange={e => setPruefForm(f => ({ ...f, gueltig_bis: e.target.value }))} className={inputCls} />
                </LabelInput>
                <LabelInput label="Prüfstelle / Werkstatt">
                  <input type="text" value={pruefForm.pruefstelle} onChange={e => setPruefForm(f => ({ ...f, pruefstelle: e.target.value }))} placeholder="z. B. TÜV München" className={inputCls} />
                </LabelInput>
              </div>
              <LabelInput label="Ergebnis">
                <select value={pruefForm.ergebnis} onChange={e => setPruefForm(f => ({ ...f, ergebnis: e.target.value }))} className={inputCls}>
                  {ERGEBNIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </LabelInput>
              <LabelInput label="Notiz">
                <textarea value={pruefForm.notiz} onChange={e => setPruefForm(f => ({ ...f, notiz: e.target.value }))} rows={2} placeholder="Optionale Anmerkungen…" className={inputCls + ' resize-none'} />
              </LabelInput>
              {pruefNeuError && <p className="text-xs text-red-500">{pruefNeuError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={pruefNeuSaving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                  {pruefNeuSaving ? 'Speichert…' : 'Eintrag speichern'}
                </button>
                <button type="button" onClick={() => setPruefNeuShown(false)} className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition">
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {/* Prüfhistorie Liste */}
          {pruefLaden ? (
            <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p>
          ) : pruefungen.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-400">Noch keine Prüfeinträge erfasst.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pruefungen.map(p => {
                const s = p.gueltig_bis ? datumsStatus(p.gueltig_bis) : null;
                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{ART_LABELS[p.art] ?? p.art}</span>
                          <span className="text-xs text-gray-400">{formatDate(p.pruef_datum)}</span>
                          {p.ergebnis && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ERGEBNIS_COLORS[p.ergebnis] ?? 'bg-gray-50 text-gray-500'}`}>
                              {ERGEBNIS_OPTIONS.find(o => o.value === p.ergebnis)?.label ?? p.ergebnis}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                          {p.pruefstelle && <span className="text-xs text-gray-400">{p.pruefstelle}</span>}
                          {p.gueltig_bis && (
                            <span className="text-xs text-gray-400">
                              Gültig bis {formatDate(p.gueltig_bis)}
                              {s && s.severity !== 'ok' && <span className={`ml-1 ${s.cls}`}>({s.label})</span>}
                            </span>
                          )}
                        </div>
                        {p.notiz && <p className="text-xs text-gray-400 mt-1 italic">{p.notiz}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePruefDelete(p.id)}
                        disabled={deletingPruefId === p.id}
                        className="text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5 disabled:opacity-40"
                        title="Löschen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
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
