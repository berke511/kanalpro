'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Wrench, CheckCircle, Plus } from 'lucide-react';
import supabase from '@/lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({ kunden: 0, offen: 0, abgeschlossen: 0 });
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ count: kunden }, { count: offen }, { count: abgeschlossen }] = await Promise.all([
        supabase.from('kunden').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'offen'),
        supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'abgeschlossen'),
      ]);
      setStats({ kunden: kunden ?? 0, offen: offen ?? 0, abgeschlossen: abgeschlossen ?? 0 });
      setLaden(false);
    }
    load();
  }, []);

  const kpiCards = [
    { label: 'Kunden gesamt',   value: stats.kunden,        href: '/dashboard/kunden',    Icon: Users,       color: 'bg-blue-50 text-blue-600'    },
    { label: 'Offene AuftrÃ¤ge', value: stats.offen,         href: '/dashboard/auftraege', Icon: Wrench,      color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Abgeschlossen',   value: stats.abgeschlossen, href: '/dashboard/auftraege', Icon: CheckCircle, color: 'bg-green-50 text-green-600'  },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Ãbersicht</h1>
        <p className="text-sm text-gray-500 mt-0.5">Willkommen bei KanalPro</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-10">
        {kpiCards.map(c => (
          <Link
            key={c.label}
            href={c.href}
            className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-xl"
          >
            <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${c.color} mb-4`}>
                <c.Icon size={20} aria-hidden="true" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{laden ? 'â' : c.value}</div>
              <div className="text-xs font-medium text-gray-500">{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Schnellzugriff</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/kunden/neu"
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" />
            Neuer Kunde
          </Link>
          <Link
            href="/dashboard/auftraege/neu"
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" />
            Neuer Auftrag
          </Link>
        </div>
      </div>
    </div>
  );
}
