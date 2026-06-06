'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function NeuerKunde() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', firma: '', telefon: '', email: '', adresse: '', notizen: '' });
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault(); setFehler(''); setLaden(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('kunden').insert({ ...form, user_id: user.id });
    if (error) { setFehler('Fehler beim Speichern. Bitte erneut versuchen.'); } else { router.push('/dashboard/kunden'); }
    setLaden(false);
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/kunden" className="text-gray-400 hover:text-gray-600 text-sm">← Zurück</Link>
        <h1 className="text-2xl font-bold text-gray-900">Neuer Kunde</h1>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
          {[
            { name: 'name',    label: 'Name *',  placeholder: 'Max Mustermann',              required: true  },
            { name: 'firma',   label: 'Firma',   placeholder: 'Musterfirma GmbH',            required: false },
            { name: 'telefon', label: 'Telefon', placeholder: '0211 123456',                 required: false },
            { name: 'email',   label: 'E-Mail',  placeholder: 'max@musterfirma.de',          required: false },
            { name: 'adresse', label: 'Adresse', placeholder: 'Musterstraße 1, 40000 Düsseldorf', required: false },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type="text" name={f.name} required={f.required} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea name="notizen" value={form.notizen} onChange={handleChange} rows={3} placeholder="Interne Notizen zum Kunden..." className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={laden} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 text-sm">{laden ? 'Wird gespeichert...' : 'Kunde speichern'}</button>
            <Link href="/dashboard/kunden" className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm">Abbrechen</Link>
          </div>
        </form>
      </div>
    </div>
  );
}