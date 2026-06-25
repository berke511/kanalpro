'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function Firmendaten() {
  const [firma, setFirma] = useState({ firmaname: '', strasse: '', plz: '', ort: '' });
  const [laden, setLaden] = useState(true);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('einstellungen')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setFirma({ firmaname: data.firmaname || '', strasse: data.strasse || '', plz: data.plz || '', ort: data.ort || '' });
      setLaden(false);
    }
    load();
  }, []);

  async function handleSpeichern(e) {
    e.preventDefault();
    setFehler('');
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('einstellungen')
      .upsert({ user_id: user.id, ...firma }, { onConflict: 'user_id' });
    if (error) { setFehler(error.message); return; }
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 3000);
  }

  if (laden) return <div className="p-8 text-center text-gray-400 text-sm">Lädt…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Firmendaten</h1>
          <p className="text-sm text-gray-500 mt-0.5">Name und Adresse deiner Firma</p>
        </div>
        <Link href="/dashboard/einstellungen" className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          ← Einstellungen
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <form onSubmit={handleSpeichern} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname</label>
            <input
              type="text"
              value={firma.firmaname}
              onChange={e => setFirma(f => ({ ...f, firmaname: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Muster GmbH"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Straße & Hausnummer</label>
            <input
              type="text"
              value={firma.strasse}
              onChange={e => setFirma(f => ({ ...f, strasse: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Musterstraße 1"
            />
          </div>
          <div className="flex gap-3">
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
              <input
                type="text"
                value={firma.plz}
                onChange={e => setFirma(f => ({ ...f, plz: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="12345"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
              <input
                type="text"
                value={firma.ort}
                onChange={e => setFirma(f => ({ ...f, ort: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Musterstadt"
              />
            </div>
          </div>
          {fehler && <p className="text-sm text-red-600">{fehler}</p>}
          {gespeichert && <p className="text-sm text-green-600 font-medium">Gespeichert!</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Speichern
          </button>
        </form>
      </div>
    </div>
  );
}
