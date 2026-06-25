'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

function brutto(r) {
  const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
  return netto * (1 + (r.steuersatz ?? 0) / 100);
}
function fmt(n) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE');
}
function isOverdue(r) {
  if (!r.faellig_am || r.status === 'bezahlt') return false;
  return new Date(r.faellig_am) < new Date();
}

const statusCls = {
  entwurf:  'bg-gray-100 text-gray-600',
  gesendet: 'bg-blue-50 text-blue-700',
  bezahlt:  'bg-green-50 text-green-700',
  mahnung:  'bg-orange-50 text-orange-600',
};

export default function Zahlungseingaenge() {
  const [rechnungen, setRechnungen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [bezahltDatum, setBezahltDatum] = useState('');
  const [tab, setTab] = useState('offen');

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('rechnungen')
      .select('*, kunden(name, email)')
      .eq('user_id', user.id)
      .order('erstellt_am', { ascending: false });
    setRechnungen(data ?? []);
    setLaden(false);
  }

  useEffect(() => { load(); }, []);

  async function handleBezahlt(r) {
    const datum = bezahltDatum || new Date().toISOString().slice(0, 10);
    await supabase
      .from('rechnungen')
      .update({ status: 'bezahlt', bezahlt_am: datum })
      .eq('id', r.id);
    setMarkingId(null);
    setBezahltDatum('');
    load();
  }

  const offene   = rechnungen.filter(r => r.status !== 'bezahlt');
  const bezahlte = rechnungen.filter(r => r.status === 'bezahlt');

  const gesamtBrutto = rechnungen.reduce((s, r) => s + brutto(r), 0);
  const bezahltBrutto = bezahlte.reduce((s, r) => s + brutto(r), 0);
  const offenBrutto   = offene.reduce((s, r) => s + brutto(r), 0);

  const list = tab === 'offen' ? offene : bezahlte;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Zahlungseingänge</h1>
          <p className="text-sm text-gray-500 mt-0.5">Offene und eingegangene Zahlungen im Überblick</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/rechnungen"
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            ← Rechnungen
          </Link>
          <Link href="/dashboard/rechnungen/pdf-export"
            className="px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
            PDF Export →
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Gesamt (Brutto)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(gesamtBrutto)}</p>
          <p className="text-xs text-gray-400 mt-1">{rechnungen.length} Rechnungen</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-600 uppercase tracking-wide font-medium">Eingegangen</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{fmt(bezahltBrutto)}</p>
          <p className="text-xs text-gray-400 mt-1">{bezahlte.length} bezahlt</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <p className="text-xs text-orange-600 uppercase tracking-wide font-medium">Ausstehend</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{fmt(offenBrutto)}</p>
          <p className="text-xs text-gray-400 mt-1">{offene.length} offen</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['offen', `Offen (${offene.length})`], ['bezahlt', `Bezahlt (${bezahlte.length})`]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {laden ? (
          <div className="p-8 text-center text-gray-400 text-sm">Lädt…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {tab === 'offen' ? 'Keine offenen Rechnungen.' : 'Noch keine bezahlten Rechnungen.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nr.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Kunde</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Fällig</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Betrag</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {tab === 'bezahlt' ? 'Bezahlt am' : 'Aktion'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map(r => {
                  const b = brutto(r);
                  const overdue = isOverdue(r);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{r.rechnungsnummer ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.kunden?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">{fmtDate(r.datum)}</td>
                      <td className={`px-4 py-3 hidden md:table-cell whitespace-nowrap ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {fmtDate(r.faellig_am)}
                        {overdue && <span className="ml-1 text-xs">(überfällig)</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{fmt(b)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tab === 'bezahlt' ? (
                          <span className="text-green-600 text-sm font-medium">{fmtDate(r.bezahlt_am)}</span>
                        ) : markingId === r.id ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <input
                              type="date"
                              value={bezahltDatum}
                              onChange={e => setBezahltDatum(e.target.value)}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                            />
                            <button
                              onClick={() => handleBezahlt(r)}
                              className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                            >
                              ✓ Bestätigen
                            </button>
                            <button
                              onClick={() => { setMarkingId(null); setBezahltDatum(''); }}
                              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200"
                            >
                              Abbrechen
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setMarkingId(r.id);
                              setBezahltDatum(new Date().toISOString().slice(0, 10));
                            }}
                            className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition"
                          >
                            Als bezahlt markieren
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
