'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, ClipboardList, ChevronRight } from 'lucide-react';
import supabase from '@/lib/supabase';

const statusConfig = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-50 text-blue-700 border border-blue-200'    },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-50 text-green-700 border border-green-200'  },
};

const filterItems = [
  { key: 'alle',          label: 'Alle'           },
  { key: 'offen',         label: 'Offen'          },
  { key: 'in_bearbeitung',label: 'In Bearbeitung' },
  { key: 'abgeschlossen', label: 'Abgeschlossen'  },
];

export default function Auftraege() {
  const router = useRouter();
  const [auftraege, setAuftraege] = useState([]);
  const [filter, setFilter] = useState('alle');
  const [laden, setLaden] = useState(true);
  const [suche, setSuche] = useState('');

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

  const gefiltert = auftraege
    .filter(a => filter === 'alle' || a.status === filter)
    .filter(a => {
      if (!suche) return true;
      const q = suche.toLowerCase();
      return a.titel?.toLowerCase().includes(q) || a.kunden?.name?.toLowerCase().includes(q);
    });

  return (
    <div>
      {/* A) Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Aufträge</h1>
          <p className="text-sm text-gray-500 mt-0.5">{auftraege.length} Aufträge</p>
        </div>
        <Link
          href="/dashboard/auftraege/neu"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Neuer Auftrag
        </Link>
      </div>

      {/* B) Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Suchen..."
            value={suche}
            onChange={e => setSuche(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        {filterItems.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* F) Loading Skeleton */}
      {laden && (
        <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                {['Titel', 'Kunde', 'Datum', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map(i => (
                <tr key={i} className="border-b border-gray-50 last:border-0 h-[52px]">
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-40" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-24" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* E) Empty State */}
      {!laden && gefiltert.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <ClipboardList className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-base font-medium text-gray-900 mb-2">Keine Aufträge</p>
          <p className="text-sm text-gray-500 mb-6">Lege deinen ersten Auftrag an.</p>
          <Link
            href="/dashboard/auftraege/neu"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Ersten Auftrag anlegen
          </Link>
        </div>
      )}

      {/* C) Desktop Table + D) Mobile Cards */}
      {!laden && gefiltert.length > 0 && (
        <>
          {/* C) Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Titel</th>
                  <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Kunde</th>
                  <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Datum</th>
                  <th className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {gefiltert.map(a => {
                  const cfg = statusConfig[a.status] ?? statusConfig.offen;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{a.titel}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{a.kunden?.name ?? '–'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <ChevronRight size={16} className="text-gray-400 inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* D) Mobile Cards */}
          <div className="md:hidden space-y-3">
            {gefiltert.map(a => {
              const cfg = statusConfig[a.status] ?? statusConfig.offen;
              return (
                <div
                  key={a.id}
                  onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                  className="rounded-xl border border-gray-100 shadow-sm p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{a.titel}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls} ml-2 shrink-0`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                    {a.kunden?.name && <span>{a.kunden.name}</span>}
                    {a.datum && <span>{new Date(a.datum).toLocaleDateString('de-DE')}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
