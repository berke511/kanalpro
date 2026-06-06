'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

const felder = [
  { section: 'Firmendaten', items: [
    { name: 'firmenname', label: 'Firmenname *',   placeholder: 'Mustermann Rohrreinigung GmbH' },
    { name: 'adresse',    label: 'Adresse',         placeholder: 'Musterstraße 1, 40000 Düsseldorf' },
    { name: 'telefon',    label: 'Telefon',         placeholder: '0211 123456' },
    { name: 'email',      label: 'E-Mail',          placeholder: 'info@mustermann-rohrreinigung.de' },
  ]},
  { section: 'Steuerdaten', items: [
    { name: 'steuernummer', label: 'Steuernummer',  placeholder: '123/456/78901' },
    { name: 'ust_id',       label: 'USt-IdNr.',     placeholder: 'DE123456789' },
  ]},
  { section: 'Bankverbindung (für Rechnungen)', items: [
    { name: 'iban', label: 'IBAN', placeholder: 'DE00 0000 0000 0000 0000 00' },
    { name: 'bic',  label: 'BIC',  placeholder: 'DEUTDEDB' },
    { name: 'bank', label: 'Bank', placeholder: 'Deutsche Bank' },
  ]},
];

export default function Einstellungen() {
  const [form, setForm] = useState({
    firmenname: '', adresse: '', telefon: '', email: '',
    steuernummer: '', ust_id: '', iban: '', bic: '', bank: '',
  });
  const [laden, setLaden] = useState(true);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('einstellungen').select('*').eq('user_id', user.id).single();
      if (data) setForm(data);
      setLaden(false);
    }
    load();
  }, []);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); setGespeichert(false); }

  async function handleSubmit(e) {
    e.preventDefault(); setFehler(''); setGespeichert(false);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('einstellungen').upsert({ ...form, user_id: user.id }, { onConflict: 'user_id' });
    if (error) { setFehler('Fehler beim Speichern.'); }
    else { setGespeichert(true); setTimeout(() => setGespeichert(false), 3000); }
  }

  if (laden) return <p className="text-gray-400">Wird geladen...</p>;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-500 mt-1">Firmendaten für Rechnungen und die App</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
        {gespeichert && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg font-medium">✅ Erfolgreich gespeichert!</div>}

        {felder.map(section => (
          <div key={section.section} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-blue-600">{section.section}</h2>
            {section.items.map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input
                  type="text" name={f.name} value={form[f.name] || ''} onChange={handleChange}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        ))}

        <div className="pb-8">
          <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm">
            Einstellungen speichern
          </button>
          <p className="text-xs text-gray-400 mt-3">Diese Daten erscheinen auf deinen Rechnungs-PDFs.</p>
        </div>
      </form>
    </div>
  );
}