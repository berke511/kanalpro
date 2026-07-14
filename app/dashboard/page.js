'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Wrench, CheckCircle } from 'lucide-react';
import supabase from '@/lib/supabase';
import { KpiCard, PageHeader, PageSection } from '@/components/ui/KanalProUI';

export default function Dashboard() {
  const [stats, setStats] = useState({ kunden: 0, offen: 0, abgeschlossen: 0 });
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      const companyId = memberData?.company_id;
      const [{ count: kunden }, { count: offen }, { count: abgeschlossen }] = await Promise.all([
        supabase.from('kunden').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'offen'),
        supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'abgeschlossen'),
      ]);
      setStats({ kunden: kunden ?? 0, offen: offen ?? 0, abgeschlossen: abgeschlossen ?? 0 });
      setLaden(false);
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Übersicht" subtitle="Willkommen bei KanalPro" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <Link href="/dashboard/kunden">
          <KpiCard label="Kunden gesamt" value={stats.kunden} icon={Users} color="blue" loading={laden} />
        </Link>
        <Link href="/dashboard/auftraege">
          <KpiCard label="Offene Aufträge" value={stats.offen} icon={Wrench} color="yellow" loading={laden} />
        </Link>
        <Link href="/dashboard/auftraege">
          <KpiCard label="Abgeschlossen" value={stats.abgeschlossen} icon={CheckCircle} color="green" loading={laden} />
        </Link>
      </div>
      <PageSection title="Schnellzugriff">
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/kunden/neu" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">+ Neuer Kunde</Link>
          <Link href="/dashboard/auftraege/neu" className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm">+ Neuer Auftrag</Link>
        </div>
      </PageSection>
    </div>
  );
}
