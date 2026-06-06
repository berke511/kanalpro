'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function NeuerAuftrag() {
  const router = useRouter();
  const [kunden, setKunden] = useState([]);
  const [form, setForm] = useState({ titel: '', beschreibung: '', kunde_id: '', status: 'offen', datum: '', adresse: '', notizen: '' });
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('kunden').select('id, name').eq('user_id', user.id).order('name');
      setKunden(data ?? []);
    }
    load();
  }, []);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault(); setFehler(''); setLaden(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('auftraege').insert({ ...form, kunde_id: form.kunde_id || null, datum: form.datum || null, user_id: user.id });
    if (error) { setFehler('Fehler beim Speichern. Bitte erneut versuchen.'); } else { router.push('/dashboard/auftraege'); }
    setLaden(false);
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/auftraege" className="text-gray-400 hover:text-gray-600 text-sm">← Zurück</Link>
        <h1 className="text-2xl font-bold text-gray-900">Neuer Auftrag</h1>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label><input type="text" name="titel" required value={form.titel} onChange={handleChange} placeholder="z. B. Rohrverstopfung Keller" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
            <select name="kunde_id" value={form.kunde_id} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— Kein Kunde zugewiesen —</option>
              {kunden.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white">
                <option value="offen">Offen</option><option value="in_bearbeitung">In Bearbeitung</option><option value="abgeschlossen">Abgeschlossen</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Datum</label><input type="date" name="datum" value={form.datum} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Adresse (Einsatzort)</label><input type="text" name="adresse" value={form.adresse} onChange={handleChange} placeholder="Musterstraße 1, 40000 Düsseldorf" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label><textarea name="beschreibung" value={form.beschreibung} onChange={handleChange} rows={3} placeholder="Was muss gemacht werden?" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label><textarea name="notizen" value={form.notizen} onChange={handleChange} rows={2} placeholder="Interne Notizen..." className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={laden} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 text-sm">{laden ? 'Wird gespeichert...' : 'Auftrag speichern'}</button>
            <Link href="/dashboard/auftraege" className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm">Abbrechen</Link>
          </div>
        </form>
      </div>
    </div>
  );
}