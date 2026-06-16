'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const TABS = [
  { id: 'stammdaten', label: 'Stammdaten' },
];

const FELDER = [
  { section: 'Basis', fields: [
    { name: 'vorname',  label: 'Vorname',      type: 'text',  required: true },
    { name: 'nachname', label: 'Nachname',      type: 'text',  required: true },
    { name: 'email',    label: 'E-Mail',        type: 'email', required: false },
    { name: 'telefon',  label: 'Telefon',       type: 'tel',   required: false },
  ]},
  { section: 'Persönlich', fields: [
    { name: 'geburtsdatum', label: 'Geburtsdatum', type: 'date', required: false },
    { name: 'strasse',      label: 'Straße',        type: 'text', required: false },
    { name: 'plz',          label: 'PLZ',           type: 'text', required: false },
    { name: 'ort',          label: 'Ort',           type: 'text', required: false },
  ]},
  { section: 'Beschäftigung', fields: [
    { name: 'eintrittsdatum', label: 'Eintrittsdatum',   type: 'date',   required: false },
    { name: 'position',       label: 'Position / Rolle', type: 'text',   required: false },
    { name: 'stundenlohn',    label: 'Stundenlohn (€)',  type: 'number', required: false },
  ]},
];

export default function MitarbeiterProfilPage() {
  const router = useRouter();
  const { id } = useParams();
  const [tab, setTab] = useState('stammdaten');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error: dbError } = await supabase
        .from('mitarbeiter')
        .select('*')
        .eq('id', id)
        .single();

      if (dbError || !data) { router.push('/dashboard/mitarbeiter'); return; }

      setForm({
        vorname:         data.vorname ?? '',
        nachname:        data.nachname ?? '',
        email:           data.email ?? '',
        telefon:         data.telefon ?? '',
        geburtsdatum:    data.geburtsdatum ?? '',
        strasse:         data.strasse ?? '',
        plz:             data.plz ?? '',
        ort:             data.ort ?? '',
        eintrittsdatum:  data.eintrittsdatum ?? '',
        position:        data.position ?? '',
        stundenlohn:     data.stundenlohn != null ? String(data.stundenlohn) : '',
        notizen:         data.notizen ?? '',
      });
      setLoading(false);
    }
    load();
  }, [id, router]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!form.vorname.trim() || !form.nachname.trim()) {
      setError('Vor- und Nachname sind Pflichtfelder.');
      return;
    }
    setSaving(true);

    const payload = {
      vorname:        form.vorname.trim(),
      nachname:       form.nachname.trim(),
      email:          form.email.trim(),
      telefon:        form.telefon.trim(),
      geburtsdatum:   form.geburtsdatum || null,
      strasse:        form.strasse.trim(),
      plz:            form.plz.trim(),
      ort:            form.ort.trim(),
      eintrittsdatum: form.eintrittsdatum || null,
      position:       form.position.trim(),
      stundenlohn:    form.stundenlohn ? parseFloat(form.stundenlohn) : null,
      notizen:        form.notizen.trim(),
    };

    const { error: dbError } = await supabase
      .from('mitarbeiter')
      .update(payload)
      .eq('id', id);

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleDelete() {
    if (!confirm('Mitarbeiter wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    setDeleting(true);
    await supabase.from('mitarbeiter').delete().eq('id', id);
    router.push('/dashboard/mitarbeiter');
  }

  if (loading || !form) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-gray-400 text-sm">Lädt…</p>
    </div>
  );

  const fullName = `${form.vorname} ${form.nachname}`.trim() || 'Unbekannt';

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/mitarbeiter" className="text-gray-400 hover:text-gray-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {(form.vorname?.[0] ?? '?').toUpperCase()}{(form.nachname?.[0] ?? '').toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
            {form.position && <p className="text-sm text-gray-400">{form.position}</p>}
          </div>
        </div>
      </div>

      {/* Tab-Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Stammdaten */}
      {tab === 'stammdaten' && (
        <form onSubmit={handleSave} className="space-y-6">
          {FELDER.map(({ section, fields }) => (
            <div key={section} className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">{section}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(({ name, label, type, required }) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    <input
                      type={type}
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      step={type === 'number' ? '0.01' : undefined}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Notizen</h2>
            <textarea
              name="notizen"
              value={form.notizen}
              onChange={handleChange}
              rows={4}
              placeholder="Interne Notizen…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? 'Speichert…' : 'Speichern'}
              </button>
              {saved && (
                <span className="text-sm text-green-600 font-medium">Gespeichert</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-600 transition"
            >
              {deleting ? 'Löscht…' : 'Mitarbeiter löschen'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
