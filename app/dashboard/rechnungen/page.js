'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import PlanGate from '@/components/PlanGate';

const statusConfig = {
  entwurf:  { label: 'Entwurf',  cls: 'bg-gray-100 text-gray-600'  },
  gesendet: { label: 'Gesendet', cls: 'bg-blue-50 text-blue-700'   },
  bezahlt:  { label: 'Bezahlt',  cls: 'bg-green-50 text-green-700' },
};

const firmaFelder = [
  { section: 'Firmendaten', items: [
    { name: 'firmenname',   label: 'Firmenname',    placeholder: 'Mustermann Rohrreinigung GmbH' },
    { name: 'adresse',      label: 'Adresse',       placeholder: 'Musterstraße 1, 40000 Düsseldorf' },
    { name: 'telefon',      label: 'Telefon',       placeholder: '0211 123456' },
    { name: 'email',        label: 'E-Mail',        placeholder: 'info@musterfirma.de' },
  ]},
  { section: 'Steuerdaten', items: [
    { name: 'steuernummer', label: 'Steuernummer',  placeholder: '123/456/78901' },
    { name: 'ust_id',       label: 'USt-IdNr.',     placeholder: 'DE123456789' },
  ]},
  { section: 'Bankverbindung', items: [
    { name: 'iban', label: 'IBAN', placeholder: 'DE00 0000 0000 0000 0000 00' },
    { name: 'bic',  label: 'BIC',  placeholder: 'DEUTDEDB' },
    { name: 'bank', label: 'Bank', placeholder: 'Deutsche Bank' },
  ]},
];

export default function Rechnungen() {
  const [tab, setTab] = useState('liste');
  const [rechnungen, setRechnungen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [firma, setFirma] = useState({ firmenname:'', adresse:'', telefon:'', email:'', steuernummer:'', ust_id:'', iban:'', bic:'', bank:'' });
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: rech }, { data: einst }] = await Promise.all([
        supabase.from('rechnungen').select('*, kunden(name)').eq('user_id', user.id).order('erstellt_am', { ascending: false }),
        supabase.from('einstellungen').select('*').eq('user_id', user.id).single(),
      ]);
      setRechnungen(rech ?? []);
      if (einst) setFirma(einst);
      setLaden(false);
    }
    load();
  }, []);

  function brutto(r) {
    const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + r.steuersatz / 100);
  }

  async function handleFirmaSpeichern(e) {
    e.preventDefault(); setFehler(''); setGespeichert(false);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('einstellungen').upsert({ ...firma, user_id: user.id }, { onConflict: 'user_id' });
    if (error) { setFehler('Fehler beim Speichern.'); }
    else { setGespeichert(true); setTimeout(() => setGespeichert(false), 3000); }
  }

  return (
    <PlanGate feature="rechnungen">
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
        {tab === 'liste' && (
          <Link href="/dashboard/rechnungen/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">+ Neue Rechnung</Link>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {[{ key: 'liste', label: '📋 Rechnungen' }, { key: 'firmendaten', label: '🏢 Firmendaten' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'liste' && (
        laden ? <p className="text-gray-400">Wird geladen...</p> : rechnungen.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🧾</div>
            <p className="font-medium">Noch keine Rechnungen</p>
            <p className="text-sm mt-1">Erstelle deine erste Rechnung.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Nummer</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Datum</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Betrag (brutto)</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rechnungen.map(r => {
                  const cfg = statusConfig[r.status] ?? statusConfig.entwurf;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 font-mono font-medium text-gray-900">{r.rechnungsnummer}</td>
                      <td className="px-5 py-3 text-gray-500">{r.kunden?.name ?? '–'}</td>
                      <td className="px-5 py-3 text-gray-500">{r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '–'}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{brutto(r).toFixed(2).replace('.', ',')} €</td>
                      <td className="px-5 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>{cfg.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'firmendaten' && (
        <form onSubmit={handleFirmaSpeichern} className="space-y-5 max-w-xl">
          {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
          {gespeichert && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg font-medium">Erfolgreich gespeichert!</div>}
          {firmaFelder.map(section => (
            <div key={section.section} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-blue-600">{section.section}</h2>
              {section.items.map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type="text" value={firma[f.name] || ''} onChange={e => setFirma({ ...firma, [f.name]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          ))}
          <div className="pb-8">
            <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm">Firmendaten speichern</button>
            <p className="text-xs text-gray-400 mt-3">Diese Daten erscheinen automatisch auf deinen Rechnungs-PDFs.</p>
          </div>
        </form>
      )}
    </div>
    </PlanGate>
  );
}