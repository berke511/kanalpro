'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus, getPlan } from '@/lib/subscription';

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
  const [planInfo, setPlanInfo] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const abo = await checkAndDowngrade(supabase, user.id);
      const sub = getSubscriptionStatus(abo);
      const plan = getPlan(sub.plan);
      const limit = plan.limits.auftraege;
      const { data } = await supabase.from('auftraege').select('*, kunden(name)').eq('user_id', user.id).order('erstellt_am', { ascending: false });
      setAuftraege(data ?? []);
      const count = (data ?? []).length;
      const isLimited = limit != null && limit !== Infinity;
      const atLimit = isLimited && count >= limit;
      const nearLimit = isLimited && !atLimit && count >= Math.floor(limit * 0.8);
      setPlanInfo({ planId: sub.plan, limit, count, atLimit, nearLimit });
      setLaden(false);
    }
    load();
  }, []);

  const gefiltert = filter === 'alle' ? auftraege : auftraege.filter(a => a.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aufträge</h1>
          <p className="text-gray-500 mt-1">{auftraege.length} Aufträge gesamt</p>
        </div>
        {planInfo?.atLimit ? (
          <Link href="/dashboard/billing"
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm flex items-center gap-1.5 border border-red-100">
            Limit erreicht
          </Link>
        ) : (
          <Link href="/dashboard/auftraege/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">+ Neuer Auftrag</Link>
        )}
      </div>

      {planInfo?.atLimit && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <span>Limit erreicht: {planInfo.count}/{planInfo.limit} Aufträge (Starter-Plan)</span>
          <Link href="/dashboard/billing" className="ml-4 font-semibold underline shrink-0">Upgrade →</Link>
        </div>
      )}
      {planInfo?.nearLimit && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
          <span>{planInfo.count}/{planInfo.limit} Aufträge genutzt — bald voll</span>
          <Link href="/dashboard/billing" className="ml-4 font-semibold underline shrink-0">Upgrade →</Link>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {['alle','offen','in_bearbeitung','abgeschlossen'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter===s?'bg-blue-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s==='alle'?'Alle':statusConfig[s].label}
          </button>
        ))}
      </div>

      {laden ? <p className="text-gray-400">Wird geladen...</p> : gefiltert.length===0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="w-10 h-10 mx-auto mb-3 text-gray-200"><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1} stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' d='M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z' /></svg></div>
          <p className="font-medium">Keine Aufträge</p>
          <p className="text-sm mt-1">Lege deinen ersten Auftrag an.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
              {gefiltert.map(a => {
                const cfg = statusConfig[a.status] ?? statusConfig.offen;
                return (
                  <tr key={a.id} onClick={() => router.push("/dashboard/auftraege/" + a.id)}
                    className="hover:bg-blue-50 transition cursor-pointer">
                    <td className="px-5 py-3 font-medium text-gray-900">{a.titel}</td>
                    <td className="px-5 py-3 text-gray-500">{a.kunden?.name ?? '–'}</td>
                    <td className="px-5 py-3 text-gray-500">{a.datum?new Date(a.datum).toLocaleDateString('de-DE'):'–'}</td>
                    <td className="px-5 py-3"><span className={"px-2 py-1 rounded-md text-xs font-medium " + cfg.cls}>{cfg.label}</span></td>
                    <td className="px-5 py-3 text-gray-400 text-right">→</td>
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
