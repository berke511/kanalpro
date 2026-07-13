'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Wrench, CheckCircle, Plus, FileText, Phone } from 'lucide-react';
import supabase from '@/lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({ kunden: 0, offen: 0, abgeschlossen: 0 });
  const [laden, setLaden] = useState(true);
  const [userInitial, setUserInitial] = useState('K');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (user.email) setUserInitial(user.email[0].toUpperCase());
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

  const heute = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const kpiKarten = [
    {
      label: 'Kunden gesamt',
      value: laden ? '–' : stats.kunden,
      href: '/dashboard/kunden',
      Icon: Users,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Offene Aufträge',
      value: laden ? '–' : stats.offen,
      href: '/dashboard/auftraege',
      Icon: Wrench,
      iconBg: 'bg-yellow-50 text-yellow-600',
    },
    {
      label: 'Abgeschlossen',
      value: laden ? '–' : stats.abgeschlossen,
      href: '/dashboard/auftraege',
      Icon: CheckCircle,
      iconBg: 'bg-green-50 text-green-600',
    },
  ];

  const schnellaktionen = [
    { label: 'Neuer Kunde', href: '/dashboard/kunden/neu', Icon: Users },
    { label: 'Neuer Auftrag', href: '/dashboard/auftraege/neu', Icon: Plus },
    { label: 'Rechnung', href: '/dashboard/rechnungen/neu', Icon: FileText },
    { label: 'Kontakte', href: '/dashboard/kunden', Icon: Phone },
  ];

  const aktivitaeten = [
    { text: 'System gestartet — alle Dienste aktiv', zeit: 'Heute', typ: 'green' },
    { text: 'Daten werden nach Anmeldung geladen', zeit: 'Gerade', typ: 'blue' },
  ];

  const systemstatus = [
    { name: 'Datenbank', online: true },
    { name: 'Echtzeit', online: true },
    { name: 'API', online: true },
  ];

  return (
    <div className="space-y-6">

      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-100 p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-1">{heute}</p>
          <h1 className="text-2xl font-bold text-gray-900">Guten Tag</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ihre Tagesübersicht auf einen Blick</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 select-none">
          {userInitial}
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: KPIs + Aktivitaeten */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPI Grid */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Kennzahlen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {kpiKarten.map(kpi => (
                <Link key={kpi.label} href={kpi.href} className="block">
                  <div className="rounded-xl border border-gray-100 shadow-sm bg-white p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className={`inline-flex items-center justify-center p-2.5 rounded-lg mb-4 ${kpi.iconBg}`}>
                      <kpi.Icon size={18} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{kpi.value}</div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">{kpi.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Aktivitaeten-Feed */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Letzte Aktivitäten</h2>
            <div className="rounded-lg border border-gray-100 bg-white divide-y divide-gray-50">
              {aktivitaeten.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${a.typ === 'green' ? 'bg-green-400' : 'bg-blue-400'}`} />
                  <span className="text-sm text-gray-700 truncate flex-1">{a.text}</span>
                  <span className="text-xs text-gray-400 shrink-0">{a.zeit}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">

          {/* Zusammenfassung */}
          <div className="rounded-xl border border-gray-100 shadow-sm bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Zusammenfassung</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Kunden gesamt</span>
                <span className="font-semibold text-gray-900">{laden ? '–' : stats.kunden}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Offene Aufträge</span>
                <span className="font-semibold text-yellow-600">{laden ? '–' : stats.offen}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Abgeschlossen</span>
                <span className="font-semibold text-green-600">{laden ? '–' : stats.abgeschlossen}</span>
              </div>
            </div>
          </div>

          {/* Schnellaktionen */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Schnellaktionen</h2>
            <div className="grid grid-cols-2 gap-2">
              {schnellaktionen.map(a => (
                <Link key={a.label} href={a.href} className="block">
                  <div className="rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-gray-50 transition-all duration-150 p-3 flex flex-col items-center gap-2 cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
                      <a.Icon size={16} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{a.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Systemstatus */}
          <div className="rounded-lg border border-gray-100 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Systemstatus</h2>
            <div className="space-y-2.5">
              {systemstatus.map(s => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{s.name}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${s.online ? 'text-green-600' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.online ? 'bg-green-400' : 'bg-red-400'}`} />
                    {s.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
