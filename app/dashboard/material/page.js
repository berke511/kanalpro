'use client';

import { useState, useEffect } from 'react';
import { XCircle, Clock, Package, Calendar } from 'lucide-react';
import supabase from '@/lib/supabase';
import Link from 'next/link';

export default function MaterialPage() {
  const [materialien, setMaterialien] = useState([]);
  const [laden, setLaden] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [suche, setSuche] = useState('');
  const [formOffen, setFormOffen] = useState(false);
  const [form, setForm] = useState({
    name: '', typ: '', einheit: '', hersteller: '',
    lagerort: '', bestand_aktuell: '', mindestbestand: '',
    ablaufdatum: '', zustand: 'aktiv', notiz: ''
  });
  const [speichern, setSpeichern] = useState(false);

  useEffect(() => {
    ladeMaterialien();
  }, []);

  async function ladeMaterialien() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: member } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    const cid = member.company_id;
    setCompanyId(cid);

    const { data } = await supabase
      .from('materialien')
      .select('*')
      .eq('company_id', cid)
      .order('name');
    setMaterialien(data || []);
    setLaden(false);
  }

  function hatBestandWarnung(m) {
    return Number(m.bestand_aktuell) <= Number(m.mindestbestand) && Number(m.mindestbestand) > 0;
  }

  function hatAblaufWarnung(m) {
    if (!m.ablaufdatum) return false;
    const diff = (new Date(m.ablaufdatum) - new Date()) / 86400000;
    return diff <= 30 && diff >= 0;
  }

  function istAbgelaufen(m) {
    if (!m.ablaufdatum) return false;
    return new Date(m.ablaufdatum) < new Date();
  }

  const gefiltert = materialien.filter(m =>
    [m.name, m.typ, m.hersteller].some(f =>
      (f || '').toLowerCase().includes(suche.toLowerCase())
    )
  );

  async function speichernMaterial(e) {
    e.preventDefault();
    setSpeichern(true);
    await supabase.from('materialien').insert({
      ...form,
      company_id: companyId,
      bestand_aktuell: Number(form.bestand_aktuell) || 0,
      mindestbestand: Number(form.mindestbestand) || 0,
    });
    const { data } = await supabase
      .from('materialien')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    setMaterialien(data || []);
    setForm({
      name: '', typ: '', einheit: '', hersteller: '',
      lagerort: '', bestand_aktuell: '', mindestbestand: '',
      ablaufdatum: '', zustand: 'aktiv', notiz: ''
    });
    setFormOffen(false);
    setSpeichern(false);
  }

  if (laden) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-sm">Laden...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material & Lager</h1>
          <p className="text-sm text-gray-500 mt-1">{materialien.length} Materialien gesamt</p>
        </div>
        <button
          onClick={() => setFormOffen(!formOffen)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {formOffen ? '✕ Abbrechen' : '+ Material hinzufügen'}
        </button>
      </div>

      {/* Suche */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Suche nach Name, Typ oder Hersteller..."
          value={suche}
          onChange={e => setSuche(e.target.value)}
          className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Inline-Formular */}
      {formOffen && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Neues Material</h2>
          <form onSubmit={speichernMaterial} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
              <input
                value={form.typ}
                onChange={e => setForm({ ...form, typ: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Einheit</label>
              <input
                value={form.einheit}
                placeholder="z.B. Stück, Liter, kg"
                onChange={e => setForm({ ...form, einheit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hersteller</label>
              <input
                value={form.hersteller}
                onChange={e => setForm({ ...form, hersteller: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lagerort</label>
              <input
                value={form.lagerort}
                onChange={e => setForm({ ...form, lagerort: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bestand aktuell</label>
              <input
                type="number"
                min="0"
                value={form.bestand_aktuell}
                onChange={e => setForm({ ...form, bestand_aktuell: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mindestbestand</label>
              <input
                type="number"
                min="0"
                value={form.mindestbestand}
                onChange={e => setForm({ ...form, mindestbestand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ablaufdatum</label>
              <input
                type="date"
                value={form.ablaufdatum}
                onChange={e => setForm({ ...form, ablaufdatum: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zustand</label>
              <select
                value={form.zustand}
                onChange={e => setForm({ ...form, zustand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="aktiv">Aktiv</option>
                <option value="gesperrt">Gesperrt</option>
                <option value="leer">Leer</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notiz</label>
              <textarea
                value={form.notiz}
                onChange={e => setForm({ ...form, notiz: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOffen(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={speichern}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {speichern ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Card Grid */}
      {gefiltert.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">
            {suche ? `Keine Ergebnisse für "${suche}"` : 'Noch keine Materialien vorhanden.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gefiltert.map(m => {
            const bestandWarn = hatBestandWarnung(m);
            const ablaufWarn = hatAblaufWarnung(m);
            const abgelaufen = istAbgelaufen(m);
            return (
              <Link
                key={m.id}
                href={`/dashboard/material/${m.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
              >
                {/* Karten-Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{m.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[m.typ, m.einheit].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    {abgelaufen && <span title="Abgelaufen"><XCircle size={18} /></span>}
                    {!abgelaufen && ablaufWarn && <span title="Läuft bald ab"><Clock size={18} /></span>}
                    {bestandWarn && !abgelaufen && <span title="Bestand niedrig"><XCircle size={18} /></span>}
                  </div>
                </div>

                {/* Bestand */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Bestand</span>
                    <span className={`font-medium ${bestandWarn ? 'text-red-600' : 'text-gray-900'}`}>
                      {m.bestand_aktuell ?? 0}{m.einheit ? ` ${m.einheit}` : ''}
                      {Number(m.mindestbestand) > 0 && (
                        <span className="text-gray-400 font-normal"> / min. {m.mindestbestand}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Lagerort */}
                {m.lagerort && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <Package size={18} /> {m.lagerort}
                  </div>
                )}

                {/* Ablaufdatum */}
                {m.ablaufdatum && (
                  <div className={`flex items-center gap-1 text-xs mb-2 ${abgelaufen ? 'text-red-600 font-medium' : ablaufWarn ? 'text-amber-600' : 'text-gray-500'}`}>
                    <Calendar size={18} /> {new Date(m.ablaufdatum).toLocaleDateString('de-DE')}
                    {abgelaufen ? ' – Abgelaufen' : ablaufWarn ? ' – Läuft bald ab' : ''}
                  </div>
                )}

                {/* Zustand Badge */}
                <div className="mt-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.zustand === 'aktiv'
                      ? 'bg-green-100 text-green-700'
                      : m.zustand === 'gesperrt'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {m.zustand === 'aktiv' ? 'Aktiv' : m.zustand === 'gesperrt' ? 'Gesperrt' : 'Leer'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
