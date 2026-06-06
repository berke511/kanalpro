'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  return (
    <div>
      <div className="mb-8"><h1 className="text-2xl font-bold text-gray-900">Uebersicht</h1><p className="text-gray-500 mt-1">Willkommen bei KanalPro</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {[{label:'Kunden',value:stats.kunden,href:'/dashboard/kunden'},{label:'Offene Auftraege',value:stats.offen,href:'/dashboard/auftraege'},{label:'Abgeschlossen',value:stats.abgeschlossen,href:'/dashboard/auftraege'}].map(c=>(
          <Link key={c.label} href={c.href}><div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition"><div className="text-3xl font-bold text-gray-900 mb-1">{laden?'–':c.value}</div><div className="text-sm text-gray-500">{c.label}</div></div></Link>
        ))}
      </div>
      <div className="flex gap-3">
        <Link href="/dashboard/kunden/neu" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm">+ Neuer Kunde</Link>
        <Link href="/dashboard/auftraege/neu" className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium text-sm">+ Neuer Auftrag</Link>
      </div>
    </div>
  );
}
