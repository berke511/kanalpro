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

  const gesamt = stats.offen + stats.abgeschlossen;
  const quote = gesamt > 0 ? Math.round(stats.abgeschlossen / gesamt * 100) : 0;

  return (
    <div className="max-w-screen-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Übersicht</h1>
        <p className="text-sm text-gray-500 mt-1">Willkommen bei KanalPro</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        {/* ── Hauptspalte ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Kunden gesamt',   value: stats.kunden,        href: '/dashboard/kunden',    accent: 'text-blue-600'   },
              { label: 'Offene Aufträge', value: stats.offen,         href: '/dashboard/auftraege', accent: 'text-yellow-600' },
              { label: 'Abgeschlossen',   value: stats.abgeschlossen, href: '/dashboard/auftraege', accent: 'text-green-600'  },
            ].map(c => (
              <Link key={c.label} href={c.href}>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                  <div className={`text-3xl font-bold mb-1 ${c.accent}`}>
                    {laden ? <span className="inline-block w-8 h-8 bg-gray-100 rounded animate-pulse" /> : c.value}
                  </div>
                  <div className="text-xs font-medium text-gray-500">{c.label}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Schnellzugriff */}
          <div>
            <p className="sticky top-0 bg-white/80 backdrop-blur-sm py-3 -mx-1 px-1 z-10 text-sm font-semibold text-gray-700 mb-4">
              Schnellzugriff
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/kunden/neu"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
                + Neuer Kunde
              </Link>
              <Link href="/dashboard/auftraege/neu"
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm">
                + Neuer Auftrag
              </Link>
              <Link href="/dashboard/rechnungen/neu"
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm">
                + Neue Rechnung
              </Link>
            </div>
          </div>

        </div>

        {/* ── Rechte Sidebar ── */}
        <div className="lg:col-span-1 space-y-4">

          <p className="text-sm font-semibold text-gray-700">Zusammenfassung</p>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            {[
              { label: 'Gesamtaufträge', value: laden ? '–' : String(gesamt) },
              { label: 'Abschlussrate',  value: laden ? '–' : gesamt === 0 ? '–' : quote + ' %' },
              { label: 'Kundenstamm',    value: laden ? '–' : String(stats.kunden) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">{row.label}</span>
                <span className="text-sm font-bold text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>

          <Link href="/dashboard/finanzen"
            className="block bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-xl p-5 text-white hover:from-blue-700 hover:to-blue-900 transition-all duration-200">
            <p className="text-xs font-medium text-blue-200 mb-1">Finance Center</p>
            <p className="text-sm font-semibold">Rechnungen &amp; Angebote</p>
          </Link>

          <Link href="/dashboard/disposition"
            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <p className="text-xs font-medium text-gray-400 mb-1">Operations</p>
            <p className="text-sm font-semibold text-gray-900">Disposition &amp; Planung</p>
          </Link>

        </div>
      </div>
    </div>
  );
}
