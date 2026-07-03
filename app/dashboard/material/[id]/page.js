'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import TabNav from '@/components/ui/TabNav';

const TABS = [
  { id: 'uebersicht', label: 'Übersicht' },
  { id: 'stammdaten', label: 'Stammdaten' },
  { id: 'bestand', label: 'Bestand' },
  { id: 'lagerort', label: 'Lagerort' },
  { id: 'historie', label: 'Historie' },
];

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('de-DE');
}

function Icon({ d, className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  back: 'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18',
  box: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
};

function InfoCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-5">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon d={ICONS.box} className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FelderGrid({ felder }) {
  if (!felder.length) {
    return <p className="text-sm text-gray-400">Keine Daten vorhanden.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
      {felder.map(f => (
        <div key={f.label}>
          <p className="text-xs text-gray-400">{f.label}</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function MaterialDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('uebersicht');
  const [companyId, setCompanyId] = useState(null);
  const [bewegungen, setBewegungen] = useState([]);
  const [buchForm, setBuchForm] = useState({ typ: 'eingang', menge: '', bemerkung: '' });
  const [buchFehler, setBuchFehler] = useState('');
  const [buchLaden, setBuchLaden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: member } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!member) { setError('Kein Unternehmen gefunden.'); setLoading(false); return; }

    setCompanyId(member.company_id);

    const { data, error: fetchError } = await supabase
      .from('materialien')
      .select('*')
      .eq('id', id)
      .eq('company_id', member.company_id)
      .single();

    if (fetchError || !data) {
      setError('Material nicht gefunden.');
    } else {
      setMaterial(data);
      const { data: bew } = await supabase
        .from('material_bewegungen')
        .select('*')
        .eq('material_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      setBewegungen(bew || []);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function buchung(e) {
    e.preventDefault();
    setBuchFehler('');
    const menge = Number(buchForm.menge);
    if (!menge || menge <= 0) { setBuchFehler('Bitte eine gültige Menge eingeben.'); return; }

    const aktuellerBestand = Number(material.bestand_aktuell);
    if (buchForm.typ === 'ausgang' && menge > aktuellerBestand) {
      setBuchFehler('Nicht genügend Bestand vorhanden.'); return;
    }

    setBuchLaden(true);
    const neuerBestand = buchForm.typ === 'eingang'
      ? aktuellerBestand + menge
      : aktuellerBestand - menge;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('material_bewegungen').insert({
      company_id: companyId,
      material_id: id,
      typ: buchForm.typ,
      menge,
      bemerkung: buchForm.bemerkung || null,
      created_by: user?.id,
    });

    await supabase.from('materialien')
      .update({ bestand_aktuell: neuerBestand })
      .eq('id', id);

    const { data: mat } = await supabase.from('materialien').select('*').eq('id', id).single();
    setMaterial(mat);
    const { data: bew } = await supabase.from('material_bewegungen').select('*').eq('material_id', id).order('created_at', { ascending: false }).limit(10);
    setBewegungen(bew || []);
    setBuchForm({ typ: 'eingang', menge: '', bemerkung: '' });
    setBuchLaden(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-sm text-red-500">{error ?? 'Material nicht gefunden.'}</p>
      </div>
    );
  }

  const uebersichtFelder = [
    material.name ? { label: 'Name', value: material.name } : null,
    material.typ ? { label: 'Typ', value: material.typ } : null,
    material.einheit ? { label: 'Einheit', value: material.einheit } : null,
    material.hersteller ? { label: 'Hersteller', value: material.hersteller } : null,
    material.lagerort ? { label: 'Lagerort', value: material.lagerort } : null,
    material.bestand_aktuell != null ? { label: 'Bestand aktuell', value: String(material.bestand_aktuell) } : null,
    material.mindestbestand != null ? { label: 'Mindestbestand', value: String(material.mindestbestand) } : null,
    material.ablaufdatum ? { label: 'Ablaufdatum', value: fmtDate(material.ablaufdatum) } : null,
    material.zustand ? { label: 'Zustand', value: material.zustand } : null,
    material.notiz ? { label: 'Notiz', value: material.notiz } : null,
  ].filter(Boolean);

  const stammdatenFelder = [
    { label: 'Name', value: material.name ?? '—' },
    { label: 'Typ', value: material.typ ?? '—' },
    { label: 'Einheit', value: material.einheit ?? '—' },
    { label: 'Hersteller', value: material.hersteller ?? '—' },
    { label: 'Lagerort', value: material.lagerort ?? '—' },
    { label: 'Bestand', value: material.bestand_aktuell != null ? String(material.bestand_aktuell) : '—' },
    { label: 'Mindestbestand', value: material.mindestbestand != null ? String(material.mindestbestand) : '—' },
    { label: 'Ablaufdatum', value: fmtDate(material.ablaufdatum) ?? '—' },
    { label: 'Zustand', value: material.zustand ?? '—' },
    { label: 'Notiz', value: material.notiz ?? '—' },
  ];

  return (
    <div className="max-w-4xl mx-auto">

      <div className="flex flex-wrap items-start justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/material')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <Icon d={ICONS.back} className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Icon d={ICONS.box} className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{material.name}</h1>
            {material.typ && <p className="text-sm text-gray-500">{material.typ}</p>}
          </div>
        </div>
      </div>

      <TabNav
        id="material-tabs"
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        label="Materialnavigation"
        className="mb-6"
      />

      {activeTab === 'uebersicht' && (
        <div className="space-y-6">
          <InfoCard title="Material-Zusammenfassung">
            <FelderGrid felder={uebersichtFelder} />
          </InfoCard>
        </div>
      )}

      {activeTab === 'stammdaten' && (
        <div className="space-y-6">
          <InfoCard title="Stammdaten">
            <FelderGrid felder={stammdatenFelder} />
          </InfoCard>
        </div>
      )}

      {activeTab === 'bestand' && (
        <div className="space-y-6">
          <InfoCard title="Bestand">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="text-xs text-gray-400">Bestand aktuell</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {material.bestand_aktuell != null
                    ? String(material.bestand_aktuell) + (material.einheit ? ' ' + material.einheit : '')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Mindestbestand</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {material.mindestbestand != null
                    ? String(material.mindestbestand) + (material.einheit ? ' ' + material.einheit : '')
                    : '—'}
                </p>
              </div>
            </div>
          </InfoCard>

          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="font-semibold text-gray-700 mb-4">Bestandsbewegung</h3>
            <form onSubmit={buchung} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Typ</label>
                <select value={buchForm.typ} onChange={e => setBuchForm(p => ({ ...p, typ: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="eingang">Wareneingang</option>
                  <option value="ausgang">Materialentnahme</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Menge</label>
                <input type="number" min="0.01" step="0.01" value={buchForm.menge}
                  onChange={e => setBuchForm(p => ({ ...p, menge: e.target.value }))}
                  placeholder="z.B. 5" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Bemerkung (optional)</label>
                <input type="text" value={buchForm.bemerkung}
                  onChange={e => setBuchForm(p => ({ ...p, bemerkung: e.target.value }))}
                  placeholder="z.B. Lieferung von Müller GmbH"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              {buchFehler && <p className="text-sm text-red-600">{buchFehler}</p>}
              <button type="submit" disabled={buchLaden}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                {buchLaden ? 'Wird gebucht…' : 'Buchen'}
              </button>
            </form>
          </div>

          {bewegungen.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Letzte Bewegungen</h3>
              <ul className="space-y-2">
                {bewegungen.map(b => (
                  <li key={b.id} className="flex items-start justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{b.typ === 'eingang' ? '🟢' : '🔴'}</span>
                      <div>
                        <p className="font-medium text-gray-800">{b.typ === 'eingang' ? '+' : '-'}{b.menge} {material?.einheit || ''}</p>
                        {b.bemerkung && <p className="text-xs text-gray-500">{b.bemerkung}</p>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap ml-3">
                      {new Date(b.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'lagerort' && (
        <div className="space-y-6">
          <InfoCard title="Lagerort">
            <div>
              <p className="text-xs text-gray-400">Lagerort</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">
                {material.lagerort ?? '—'}
              </p>
            </div>
          </InfoCard>
        </div>
      )}

      {activeTab === 'historie' && (
        <div className="space-y-6">
          <InfoCard title="Historie">
            <p className="text-sm text-gray-400">
              Für dieses Material existiert noch keine Historie.
            </p>
          </InfoCard>
        </div>
      )}

    </div>
  );
}
