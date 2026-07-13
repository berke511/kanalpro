'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Wrench, CheckCircle } from 'lucide-react';
import supabase from '@/lib/supabase';
import {
  PageHeader, KpiCard, PrimaryButton, SecondaryButton,
} from '@/components/ui/KanalProUI';

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
    <div className="space-y-6">
      <PageHeader title="Übersicht" subtitle="Willkommen bei KanalPro" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Link href="/dashboard/kunden" className="block">
          <KpiCard label="Kunden gesamt"   value={laden ? '–' : stats.kunden}        icon={Users}        color="blue"   loading={laden} />
        </Link>
        <Link href="/dashboard/auftraege" className="block">
          <KpiCard label="Offene Aufträge" value={laden ? '–' : stats.offen}         icon={Wrench}       color="yellow" loading={laden} />
        </Link>
        <Link href="/dashboard/auftraege" className="block">
          <KpiCard label="Abgeschlossen"   value={laden ? '–' : stats.abgeschlossen} icon={CheckCircle} color="green"  loading={laden} />
        </Link>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Schnellzugriff</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/kunden/neu">
            <PrimaryButton>+ Neuer Kunde</PrimaryButton>
          </Link>
          <Link href="/dashboard/auftraege/neu">
            <SecondaryButton>+ Neuer Auftrag</SecondaryButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
