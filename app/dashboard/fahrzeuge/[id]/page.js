'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const TABS = [
  { id: 'fahrzeugdaten', label: 'Fahrzeugdaten' },
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

function datumsStatus(datum) {
  if (!datum) return null;
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const d = new Date(datum);
  const diffMs = d - heute;
  const diffTage = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffTage < 0)   return { label: 'Abgelaufen', cls: 'text-red-600 font-medium' };
  if (diffTage <= 30) return { label: `Läuft in ${diffTage} Tagen ab`, cls: 'text-red-500 font-medium' };
  if (diffTage <= 90) return { label: `Läuft in ${diffTage} Tagen ab`, cls: 'text-amber-600' };
  return null;
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
    versicherung: '',
    zustand:      'aktiv',
    notizen:      '',
  });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

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
      versicherung: data.versicherung ?? '',
      zustand:      data.zustand ?? 'aktiv',
      notizen:      data.notizen ?? '',
    });
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

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
                <input
                  type="text"
                  required
                  value={form.kennzeichen}
                  onChange={set('kennzeichen')}
                  placeholder="z. B. M-AB 1234"
                  className={inputCls + ' uppercase'}
                />
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
                <input
                  type="number"
                  value={form.baujahr}
                  onChange={set('baujahr')}
                  placeholder="z. B. 2020"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className={inputCls}
                />
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
                  <input
                    type="number"
                    value={form.km_stand}
                    onChange={set('km_stand')}
                    placeholder="z. B. 45000"
                    min="0"
                    className={inputCls + ' pr-10'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span>
                </div>
              </LabelInput>
            </div>
          </div>

          {/* Prüffristen */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Prüffristen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <LabelInput label="TÜV bis">
                  <input type="date" value={form.tuev_bis} onChange={set('tuev_bis')} className={inputCls} />
                </LabelInput>
                {form.tuev_bis && (() => {
                  const s = datumsStatus(form.tuev_bis);
                  return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null;
                })()}
              </div>
              <div>
                <LabelInput label="HU bis">
                  <input type="date" value={form.hu_bis} onChange={set('hu_bis')} className={inputCls} />
                </LabelInput>
                {form.hu_bis && (() => {
                  const s = datumsStatus(form.hu_bis);
                  return s ? <p className={`text-xs mt-1 ${s.cls}`}>{s.label}</p> : null;
                })()}
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
            <textarea
              value={form.notizen}
              onChange={set('notizen')}
              rows={4}
              placeholder="Interne Notizen zum Fahrzeug…"
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Aktionen */}
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          {saveSuccess && <p className="text-xs text-emerald-600">Gespeichert ✓</p>}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saving ? 'Speichert…' : 'Speichern'}
            </button>

            <div>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 text-sm text-red-500 rounded-xl hover:bg-red-50 transition"
                >
                  Fahrzeug löschen
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Wirklich löschen?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    {deleting ? 'Löscht…' : 'Ja, löschen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition"
                  >
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
