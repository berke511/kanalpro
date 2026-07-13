'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const statusConfig = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-50 text-yellow-700' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-50 text-blue-700'    },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-50 text-green-700'  },
};

export default function Auftraege() {
  const router = useRouter();
  const [auftraege, setAuftraege] = useState([]);
  const [filter, setFilter] = useState('alle');
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('auftraege')
        .select('*, kunden(name)')
        .eq('user_id', user.id)
        .order('erstellt_am', { ascending: false });
      setAuftraege(data ?? []);
      setLaden(false);
    }
    load();
  }, []);

  const gefiltert = filter === 'alle' ? auftraege : auftraege.filter(a => a.status === filter);

  return (
    <div className="max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Aufträge</h1>
          <p className="text-sm text-gray-500 mt-1">{auftraege.length} Aufträge gesamt</p>
        </div>
        <Link href="/dashboard/auftraege/neu"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
          + Neuer Auftrag
        </Link>
      </div>

      {/* Filter Bar — Pill Style */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {['alle', 'offen', 'in_bearbeitung', 'abgeschlossen'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
              filter === s
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s === 'alle' ? 'Alle' : statusConfig[s].label}
          </button>
        ))}
      </div>

      {laden ? (
        <p className="text-gray-400 text-sm">Wird geladen...</p>
      ) : gefiltert.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">Keine Aufträge</p>
          <p className="text-sm mt-1">Lege deinen ersten Auftrag an.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm z-10">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Titel</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Datum</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gefiltert.map(a => {
                const cfg = statusConfig[a.status] ?? statusConfig.offen;
                return (
                  <tr key={a.id}
                    onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                    className="group hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{a.titel}</td>
                    <td className="px-5 py-3.5 text-gray-500">{a.kunden?.name ?? '–'}</td>
                    <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">
                      {a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + cfg.cls}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Link href={'/dashboard/auftraege/' + a.id}
                          className="text-xs px-2.5 py-1 rounded-lg text-gray-600 hover:bg-gray-100 transition">
                          Öffnen
                        </Link>
                      </div>
                    </td>
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
