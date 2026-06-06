'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
const statusConfig = { offen:{label:'Offen',cls:'bg-yellow-50 text-yellow-700'}, in_bearbeitung:{label:'In Bearbeitung',cls:'bg-blue-50 text-blue-700'}, abgeschlossen:{label:'Abgeschlossen',cls:'bg-green-50 text-green-700'} };
export default function Auftraege() {
  const [auftraege, setAuftraege] = useState([]);
  const [filter, setFilter] = useState('alle');
  const [laden, setLaden] = useState(true);
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('auftraege').select('*, kunden(name)').eq('user_id', user.id).order('erstellt_am', { ascending: false });
      setAuftraege(data ?? []); setLaden(false);
    }
    load();
  }, []);
  const gefiltert = filter === 'alle' ? auftraege : auftraege.filter(a => a.status === filter);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Auftraege</h1><p className="text-gray-500 mt-1">{auftraege.length} gesamt</p></div>
        <Link href="/dashboard/auftraege/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Neuer Auftrag</Link>
      </div>
      <div className="flex gap-2 mb-5">{['alle','offen','in_bearbeitung','abgeschlossen'].map(s=>(<button key={s} onClick={()=>setFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter===s?'bg-blue-600 text-white':'bg-white border border-gray-200 text-gray-600'}`}>{s==='alle'?'Alle':statusConfig[s].label}</button>))}</div>
      {laden?<p className="text-gray-400">Laden...</p>:gefiltert.length===0?<p className="text-gray-400 text-center py-16">Keine Auftraege</p>:(
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="text-left px-5 py-3 font-medium text-gray-500">Titel</th><th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th><th className="text-left px-5 py-3 font-medium text-gray-500">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-50">{gefiltert.map(a=>{const cfg=statusConfig[a.status]??statusConfig.offen;return(<tr key={a.id} className="hover:bg-gray-50"><td className="px-5 py-3 font-medium">{a.titel}</td><td className="px-5 py-3 text-gray-500">{a.kunden?.name??'–'}</td><td className="px-5 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>{cfg.label}</span></td></tr>);})}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
