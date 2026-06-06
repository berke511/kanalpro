'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
export default function Kunden() {
  const [kunden, setKunden] = useState([]);
  const [suche, setSuche] = useState('');
  const [laden, setLaden] = useState(true);
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('kunden').select('*').eq('user_id', user.id).order('erstellt_am', { ascending: false });
      setKunden(data ?? []);
      setLaden(false);
    }
    load();
  }, []);
  const gefiltert = kunden.filter(k => `${k.name} ${k.firma} ${k.telefon} ${k.email}`.toLowerCase().includes(suche.toLowerCase()));
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Kunden</h1><p className="text-gray-500 mt-1">{kunden.length} Kunden</p></div>
        <Link href="/dashboard/kunden/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm">+ Neuer Kunde</Link>
      </div>
      <input type="text" placeholder="Suche..." value={suche} onChange={e=>setSuche(e.target.value)} className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      {laden ? <p className="text-gray-400">Laden...</p> : gefiltert.length === 0 ? <p className="text-gray-400 text-center py-16">Keine Kunden</p> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="text-left px-5 py-3 font-medium text-gray-500">Name</th><th className="text-left px-5 py-3 font-medium text-gray-500">Firma</th><th className="text-left px-5 py-3 font-medium text-gray-500">Telefon</th></tr></thead>
            <tbody className="divide-y divide-gray-50">{gefiltert.map(k=>(<tr key={k.id} className="hover:bg-gray-50"><td className="px-5 py-3 font-medium">{k.name}</td><td className="px-5 py-3 text-gray-500">{k.firma||'–'}</td><td className="px-5 py-3 text-gray-500">{k.telefon||'–'}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
