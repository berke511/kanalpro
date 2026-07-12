'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wrench, CheckCircle, FileText, CreditCard, FileCheck, User, AlertTriangle, Activity } from 'lucide-react';
import supabase from '@/lib/supabase';
import { getActivities } from '@/lib/activityEngine';

const LUCIDE = { Wrench, CheckCircle, FileText, CreditCard, FileCheck, User, AlertTriangle, Activity };

function ActivityIcon({ name, className }) {
  const Icon = LUCIDE[name] ?? LUCIDE.Activity;
  return <Icon size={14} className={className} />;
}

export default function Dashboard() {
  const [stats, setStats]           = useState({ kunden: 0, offen: 0, abgeschlossen: 0 });
  const [activities, setActivities] = useState([]);
  const [laden, setLaden]           = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      const companyId = member?.company_id;

      const [{ count: kunden }, { count: offen }, { count: abgeschlossen }, acts] = await Promise.all([
        supabase.from('kunden').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'offen'),
        supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'abgeschlossen'),
        companyId ? getActivities(supabase, companyId, { limit: 10 }) : Promise.resolve([]),
      ]);

      setStats({ kunden: kunden ?? 0, offen: offen ?? 0, abgeschlossen: abgeschlossen ?? 0 });
      setActivities(acts);
      setLaden(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Übersicht</h1>
        <p className="text-gray-500 mt-1">Willkommen bei KanalPro</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {[
          { label: 'Kunden gesamt',    value: stats.kunden,        href: '/dashboard/kunden',    icon: '👥', color: 'bg-blue-50 text-blue-700' },
          { label: 'Offene Aufträge',  value: stats.offen,         href: '/dashboard/auftraege', icon: '🔧', color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Abgeschlossen',    value: stats.abgeschlossen, href: '/dashboard/auftraege', icon: '✅', color: 'bg-green-50 text-green-700' },
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
      {activities.length > 0 && (
        <div className="mt-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Letzte Aktivitäten</h2>
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
            {activities.map(a => (
              <Link key={a.id} href={a.link} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition">
                <ActivityIcon name={a.icon} className={a.color} />
                <span className="flex-1 text-sm text-gray-700 min-w-0 truncate">{a.title}</span>
                {a.description && (
                  <span className="text-xs text-gray-400 truncate hidden md:block max-w-xs">{a.description}</span>
                )}
                <span className="text-xs text-gray-300 shrink-0">
                  {new Date(a.timestamp).toLocaleDateString('de-DE')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
