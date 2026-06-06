'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const statusConfig = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-50 text-yellow-700' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-50 text-blue-700' },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-50 text-green-700' },
};

export default function KundeDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [auftraege, setAuftraege] = useState([]);
  const [form, setForm] = useState({ name:'', firma:'', telefon:'', email:'', adresse:'', notizen:'' });
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const [loeschenBestaetigt, setLoeschenBestaetigt] = useState(false);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: k }, { data: a }] = await Promise.all([
        supabase.from('kunden').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('auftraege').select('*').eq('kunde_id', id).order('erstellt_am', { ascending: false }),
      ]);
      if (!k) { router.push('/dashboard/kunden'); return; }
      setForm({ name: k.name||'', firma: k.firma||'', telefon: k.telefon||'', email: k.email||'', adresse: k.adresse||'', notizen: k.notizen||'' });
      setAuftraege(a ?? []);
      setLaden(false);
    }
    load();
  }, [id, router]);

  function onChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); setGespeichert(false); }

  async function handleSpeichern(e) {
    e.preventDefault(); setFehler(''); setSpeichern(true);
    const { error } = await supabase.from('kunden').update(form).eq('id', id);
    if (error) { setFehler('Fehler beim Speichern.'); } else { setGespeichert(true); setTimeout(() => setGespeichert(false), 3000); }
    setSpeichern(false);
  }

  async function handleLoeschen() {
    await supabase.from('kunden').delete().eq('id', id);
    router.push('/dashboard/kunden');
  }

  if (laden) return <p className="text-gray-400 p-8">Wird geladen...</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/kunden" className="text-gray-400 hover:text-gray-600 text-sm">← Kunden</Link>
        <h1 className="text-2xl font-bold text-gray-900">{form.name}</h1>
        {form.firma && <span className="text-sm text-gray-400">{form.firma}</span>}
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Kundendaten bearbeiten</h2>
          <form onSubmit={handleSpeichern} className="space-y-3">
            {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
            {gespeichert && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">✅ Gespeichert!</div>}
            {[
              { name:'name',    label:'Name *',  required: true  },
              { name:'firma',   label:'Firma',   required: false },
              { name:'telefon', label:'Telefon', required: false },
              { name:'email',   label:'E-Mail',  required: false },
              { name:'adresse', label:'Adresse', required: false },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type="text" name={f.name} required={f.required} value={form[f.name]} onChange={onChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea name="notizen" value={form.notizen} onChange={onChange} rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={speichern} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60 text-sm">
                {speichern ? 'Speichert...' : 'Speichern'}
              </button>
              <Link href="/dashboard/kunden" className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">Zurück</Link>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Aufträge ({auftraege.length})</h2>
            <Link href={"/dashboard/auftraege/neu"} className="text-sm text-blue-600 hover:underline font-medium">+ Neuer Auftrag</Link>
          </div>
          {auftraege.length === 0 ? (
            <p className="text-gray-400 text-sm">Noch keine Aufträge für diesen Kunden.</p>
          ) : (
            <div className="space-y-2">
              {auftraege.map(a => {
                const cfg = statusConfig[a.status] ?? statusConfig.offen;
                return (
                  <Link key={a.id} href={"/dashboard/auftraege/" + a.id}>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition border border-gray-50 cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{a.titel}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : 'Kein Datum'}</p>
                      </div>
                      <span className={"px-2 py-1 rounded-md text-xs font-medium " + cfg.cls}>{cfg.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-2">Kunde löschen</h2>
          <p className="text-sm text-gray-500 mb-4">Dieser Kunde wird dauerhaft gelöscht. Aufträge bleiben erhalten.</p>
          {!loeschenBestaetigt ? (
            <button onClick={() => setLoeschenBestaetigt(true)} className="px-5 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition text-sm">Kunde löschen</button>
          ) : (
            <div className="flex gap-3 items-center">
              <p className="text-sm font-medium text-red-600">Wirklich löschen?</p>
              <button onClick={handleLoeschen} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm">Ja, löschen</button>
              <button onClick={() => setLoeschenBestaetigt(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">Abbrechen</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}