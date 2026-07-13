'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { useWorkspaceSync } from '@/hooks/useWorkspaceSync';

export default function Dashboard() {
const [stats, setStats] = useState({ kunden: 0, offen: 0, abgeschlossen: 0 });
const [laden, setLaden] = useState(true);

const fetchData = useCallback(async () => {
const { data: { user } } = await supabase.auth.getUser();
if (!user) return;
const [{ count: kunden }, { count: offen }, { count: abgeschlossen }] = await Promise.all([
supabase.from('kunden').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'offen'),
supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'abgeschlossen'),
]);
setStats({ kunden: kunden ?? 0, offen: offen ?? 0, abgeschlossen: abgeschlossen ?? 0 });
setLaden(false);
}, []);

useEffect(() => {
fetchData();
}, [fetchData]);

// OS-003-A: Live Sync — refetch on any company event via central provider
useWorkspaceSync('executive-center', fetchData);

return (
<div>
<div className="mb-8">
<h1 className="text-2xl font-bold text-gray-900">Übersicht</h1>
<p className="text-gray-500 mt-1">Willkommen bei KanalPro</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
{[
{ label: 'Kunden gesamt', value: stats.kunden, href: '/dashboard/kunden', icon: '👥', color: 'bg-blue-50 text-blue-700' },
{ label: 'Offene Aufträge', value: stats.offen, href: '/dashboard/auftraege', icon: '🔧', color: 'bg-yellow-50 text-yellow-700' },
{ label: 'Abgeschlossen', value: stats.abgeschlossen, href: '/dashboard/auftraege', icon: '✅', color: 'bg-green-50 text-green-700' },
].map(c => (
<Link key={c.label} href={c.href}>
<div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition cursor-pointer">
<div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${c.color} text-xl mb-4`}>{c.icon}</div>
<div className="text-3xl font-bold text-gray-900 mb-1">{laden ? '–' : c.value}</div>
<div className="text-sm text-gray-500">{c.label}</div>
</div>
</Link>
))}
</div>
<div>
<h2 className="text-base font-semibold text-gray-700 mb-4">Schnellzugriff</h2>
<div className="flex flex-wrap gap-3">
<Link href="/dashboard/kunden/neu" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">+ Neuer Kunde</Link>
<Link href="/dashboard/auftraege/neu" className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm">+ Neuer Auftrag</Link>
</div>
</div>
</div>
);
}
