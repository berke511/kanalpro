'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const ZUSTAND_COLORS = {
  aktiv:         'bg-emerald-50 text-emerald-700',
  wartung:       'bg-amber-50 text-amber-700',
  reserviert:    'bg-blue-50 text-blue-700',
  ausser_betrieb:'bg-red-50 text-red-600',
};

const ZUSTAND_LABELS = {
  aktiv:         'Aktiv',
  wartung:       'Wartung',
  reserviert:    'Reserviert',
  ausser_betrieb:'Außer Betrieb',
};

const TYP_LABELS = {
  pkw:              'PKW',
  lkw:              'LKW',
  transporter:      'Transporter',
  kleintransporter: 'Kleintransporter',
  anhänger:         'Anhänger',
  sonstiges:        'Sonstiges',
};

export default function FahrzeugePage() {
  const router = useRouter();
  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [neuShown, setNeuShown] = useState(false);
  const [neuForm, setNeuForm] = useState({ kennzeichen: '', marke: '', modell: '', typ: 'transporter', zustand: 'aktiv' });
  const [neuSaving, setNeuSaving] = useState(false);
  const [neuError, setNeuError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;
      setCompanyId(member.company_id);

      const { data } = await supabase
        .from('fahrzeuge')
        .select('*')
        .eq('company_id', member.company_id)
        .order('kennzeichen');

      setFahrzeuge(data ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleNeu(e) {
    e.preventDefault();
    setNeuError('');
    if (!neuForm.kennzeichen.trim()) { setNeuError('Kennzeichen ist Pflichtfeld.'); return; }
    setNeuSaving(true);
    const { data: newRow, error } = await supabase
      .from('fahrzeuge')
      .insert({
        company_id:   companyId,
        kennzeichen:  neuForm.kennzeichen.trim().toUpperCase(),
        marke:        neuForm.marke.trim() || null,
        modell:       neuForm.modell.trim() || null,
        typ:          neuForm.typ || null,
        zustand:      neuForm.zustand,
      })
      .select()
      .single();
    setNeuSaving(false);
    if (error) { setNeuError(error.message); return; }
    router.push(`/dashboard/fahrzeuge/${newRow.id}`);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-gray-400 text-sm">Lädt…</p>
    </div>
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fahrzeuge</h1>
          <p className="text-sm text-gray-400 mt-0.5">{fahrzeuge.length} Fahrzeug{fahrzeuge.length !== 1 ? 'e' : ''}</p>
        </div>
        <button
          type="button"
          onClick={() => setNeuShown(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Neues Fahrzeug
        </button>
      </div>

      {/* Neu-Formular */}
      {neuShown && (
        <form onSubmit={handleNeu} className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Neues Fahrzeug anlegen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kennzeichen <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={neuForm.kennzeichen}
                onChange={e => setNeuForm(f => ({ ...f, kennzeichen: e.target.value }))}
                placeholder="z. B. M-AB 1234"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marke</label>
              <input
                type="text"
                value={neuForm.marke}
                onChange={e => setNeuForm(f => ({ ...f, marke: e.target.value }))}
                placeholder="z. B. Mercedes-Benz"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modell</label>
              <input
                type="text"
                value={neuForm.modell}
                onChange={e => setNeuForm(f => ({ ...f, modell: e.target.value }))}
                placeholder="z. B. Sprinter"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {neuError && <p className="text-xs text-red-500">{neuError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={neuSaving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {neuSaving ? 'Speichert…' : 'Anlegen'}
            </button>
            <button
              type="button"
              onClick={() => setNeuShown(false)}
              className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      {fahrzeuge.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">Noch keine Fahrzeuge</p>
          <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto">Erfasse dein erstes Fahrzeug und verwalte Wartungen, TÜV-Termine und Kilometerstand zentral.</p>
          <button
            onClick={() => setNeuShown(true)}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Erstes Fahrzeug anlegen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {fahrzeuge.map(f => (
            <Link
              key={f.id}
              href={`/dashboard/fahrzeuge/${f.id}`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:border-blue-100 hover:bg-blue-50/30 transition group"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm tracking-wide">{f.kennzeichen}</span>
                  {f.typ && (
                    <span className="text-xs text-gray-400">{TYP_LABELS[f.typ] ?? f.typ}</span>
                  )}
                </div>
                {(f.marke || f.modell) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[f.marke, f.modell].filter(Boolean).join(' ')}
                    {f.baujahr ? ` · ${f.baujahr}` : ''}
                  </p>
                )}
              </div>
              {/* Status */}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${ZUSTAND_COLORS[f.zustand] ?? 'bg-gray-50 text-gray-500'}`}>
                {ZUSTAND_LABELS[f.zustand] ?? f.zustand}
              </span>
              {/* Chevron */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
