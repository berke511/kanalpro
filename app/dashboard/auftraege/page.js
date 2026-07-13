'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, ChevronRight, Plus } from 'lucide-react';
import supabase from '@/lib/supabase';
import { StatusBadge, EmptyState } from '@/components/ui/KanalProUI';

const statusConfig = {
  offen:          { label: 'Offen'         },
  in_bearbeitung: { label: 'In Bearbeitung'},
  abgeschlossen:  { label: 'Abgeschlossen' },
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">AuftrÃ¤ge</h1>
          <p className="text-sm text-gray-500 mt-0.5">{auftraege.length} AuftrÃ¤ge gesamt</p>
        </div>
        <Link
          href="/dashboard/auftraege/neu"
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden="true" />
          Neuer Auftrag
        </Link>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['alle', 'offen', 'in_bearbeitung', 'abgeschlossen'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'alle' ? 'Alle' : statusConfig[s].label}
          </button>
        ))}
      </div>

      {laden ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-1/4" />
                <div className="h-4 bg-gray-100 rounded w-1/6" />
                <div className="h-5 bg-gray-100 rounded-full w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Keine AuftrÃ¤ge"
          description={filter === 'alle' ? 'Lege deinen ersten Auftrag an.' : `Keine AuftrÃ¤ge mit Status â${statusConfig[filter]?.label ?? filter}".`}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-10">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Titel</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Datum</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gefiltert.map(a => (
                <tr
                  key={a.id}
                  onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                  className="group cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900">{a.titel}</td>
                  <td className="px-5 py-3.5 text-gray-500">{a.kunden?.name ?? 'â'}</td>
                  <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">
                    {a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : 'â'}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-3.5 text-gray-300 group-hover:text-gray-500 transition-colors">
                    <ChevronRight size={16} aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
