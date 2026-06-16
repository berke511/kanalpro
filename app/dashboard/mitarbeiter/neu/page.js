'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const FELDER = [
  { section: 'Basis', fields: [
    { name: 'vorname',  label: 'Vorname',      type: 'text',   required: true },
    { name: 'nachname', label: 'Nachname',      type: 'text',   required: true },
    { name: 'email',    label: 'E-Mail',        type: 'email',  required: false },
    { name: 'telefon',  label: 'Telefon',       type: 'tel',    required: false },
  ]},
  { section: 'Persönlich', fields: [
    { name: 'geburtsdatum', label: 'Geburtsdatum', type: 'date', required: false },
    { name: 'strasse',      label: 'Straße',        type: 'text', required: false },
    { name: 'plz',          label: 'PLZ',           type: 'text', required: false },
    { name: 'ort',          label: 'Ort',           type: 'text', required: false },
  ]},
  { section: 'Beschäftigung', fields: [
    { name: 'eintrittsdatum', label: 'Eintrittsdatum', type: 'date',   required: false },
    { name: 'position',       label: 'Position / Rolle', type: 'text', required: false },
    { name: 'stundenlohn',    label: 'Stundenlohn (€)', type: 'number', required: false },
  ]},
];

export default function NeuerMitarbeiterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    vorname: '', nachname: '', email: '', telefon: '',
    geburtsdatum: '', strasse: '', plz: '', ort: '',
    eintrittsdatum: '', position: '', stundenlohn: '', notizen: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.vorname.trim() || !form.nachname.trim()) {
      setError('Vor- und Nachname sind Pflichtfelder.');
      return;
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: member } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const payload = {
      company_id:      member.company_id,
      vorname:         form.vorname.trim(),
      nachname:        form.nachname.trim(),
      email:           form.email.trim(),
      telefon:         form.telefon.trim(),
      geburtsdatum:    form.geburtsdatum || null,
      strasse:         form.strasse.trim(),
      plz:             form.plz.trim(),
      ort:             form.ort.trim(),
      eintrittsdatum:  form.eintrittsdatum || null,
      position:        form.position.trim(),
      stundenlohn:     form.stundenlohn ? parseFloat(form.stundenlohn) : null,
      notizen:         form.notizen.trim(),
    };

    const { data, error: dbError } = await supabase
      .from('mitarbeiter')
      .insert(payload)
      .select()
      .single();

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    router.push(`/dashboard/mitarbeiter/${data.id}`);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/mitarbeiter" className="text-gray-400 hover:text-gray-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neuer Mitarbeiter</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stammdaten erfassen</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
            placeholder="Interne Notizen zum Mitarbeiter…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? 'Speichert…' : 'Mitarbeiter anlegen'}
          </button>
          <Link href="/dashboard/mitarbeiter" className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
