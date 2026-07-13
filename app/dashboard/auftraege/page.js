'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import supabase from '@/lib/supabase';
import {
  PageHeader, FilterBar, FilterButton, StatusBadge, EmptyState,
} from '@/components/ui/KanalProUI';

const STATUS_LABELS = {
  offen:          'Offen',
  in_bearbeitung: 'In Bearbeitung',
  abgeschlossen:  'Abgeschlossen',
};

export default function Auftraege() {
  const router = useRouter();
  const [auftraege, setAuftraege] = useState([]);
  const [filter, setFilter]       = useState('alle');
  const [laden, setLaden]         = useState(true);

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
    <div className="space-y-6">
      <PageHeader
        title="Aufträge"
        subtitle={`${auftraege.length} Aufträge gesamt`}
        action={
          <Link href="/dashboard/auftraege/neu">
            <button type="button" className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm min-h-[44px]">
              + Neuer Auftrag
            </button>
          </Link>
        }
      />

      <FilterBar>
        {['alle', 'offen', 'in_bearbeitung', 'abgeschlossen'].map(s => (
          <FilterButton
            key={s}
            label={s === 'alle' ? 'Alle' : STATUS_LABELS[s]}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </FilterBar>

      {laden ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Keine Aufträge"
          description="Lege deinen ersten Auftrag an."
        />
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="md:hidden space-y-2">
            {gefiltert.map(a => (
              <div
                key={a.id}
                onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                className="bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition min-h-[72px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate text-sm">{a.titel}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{a.kunden?.name ?? '–'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Titel</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Datum</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {gefiltert.map(a => (
                    <tr key={a.id}
                      onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                      className="hover:bg-blue-50 transition cursor-pointer"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{a.titel}</td>
                      <td className="px-5 py-3 text-gray-500">{a.kunden?.name ?? '–'}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-5 py-3 text-gray-400 text-right">→</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
