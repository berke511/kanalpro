'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const statusConfig = {
  entwurf:  { label: 'Entwurf',  cls: 'bg-gray-100 text-gray-600'  },
  gesendet: { label: 'Gesendet', cls: 'bg-blue-50 text-blue-700'   },
  bezahlt:  { label: 'Bezahlt',  cls: 'bg-green-50 text-green-700' },
};

export default function Rechnungen() {
  const [rechnungen, setRechnungen] = useState([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('rechnungen').select('*, kunden(name)')
        .eq('user_id', user.id).order('erstellt_am', { ascending: false });
      setRechnungen(data ?? []);
      setLaden(false);
    }
    load();
  }, []);

  function brutto(r) {
    const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + r.steuersatz / 100);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
          <p className="text-gray-500 mt-1">{rechnungen.length} Rechnungen gesamt</p>
        </div>
        <Link href="/dashboard/rechnungen/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">+ Neue Rechnung</Link>
      </div>
      {laden ? <p className="text-gray-400">Wird geladen...</p> : rechnungen.length === 0 ? (
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
      )}
    </div>
  );
}