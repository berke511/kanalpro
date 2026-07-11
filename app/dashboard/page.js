'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, UserPlus, FileText, Receipt, Calendar, AlertTriangle,
  Truck, ClipboardList, Users, CheckCircle, Clock, Activity,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import {
  KpiCard, StatusBadge, PrioritaetBadge, EmptyState,
  PageHeader, PageSection, PrimaryButton, SecondaryButton,
  Card, NotdienstBadge, FilterBar,
} from '@/components/ui/KanalProUI';

// ===== HELPERS =====

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std`;
  return `vor ${Math.floor(diff / 86400)} Tagen`;
}

const QUICK_ACTIONS = [
  { label: 'Neuer Auftrag',  sub: 'Auftrag anlegen',       href: '/dashboard/auftraege/neu',                icon: Plus,          color: 'bg-blue-100 text-blue-600' },
  { label: 'Neuer Kunde',    sub: 'Kundendaten erfassen',   href: '/dashboard/kunden/neu',                   icon: UserPlus,      color: 'bg-green-100 text-green-600' },
  { label: 'Neues Angebot',  sub: 'Angebot erstellen',      href: '/dashboard/angebote/neu',                 icon: FileText,      color: 'bg-purple-100 text-purple-600' },
  { label: 'Neue Rechnung',  sub: 'Rechnung ausstellen',    href: '/dashboard/rechnungen/neu',               icon: Receipt,       color: 'bg-orange-100 text-orange-600' },
  { label: 'Einsatz planen', sub: 'Disposition & Planung',  href: '/dashboard/disposition/tagesplanung',     icon: Calendar,      color: 'bg-teal-100 text-teal-600' },
  { label: 'Notdienst',      sub: 'Notdienst einrichten',   href: '/dashboard/disposition/notdienstplanung', icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
];

export default function Dashboard() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const [laden, setLaden] = useState(true);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    auftraegeHeute: 0,
    auftraegeOffen: 0,
    auftraegeAbgeschlossen: 0,
    rechnungenOffen: 0,
  });
  const [fokusKarten, setFokusKarten] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [heutigeAuftraege, setHeutigeAuftraege] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Nutzername aus company_members (graceful fallback)
      try {
        const { data: member } = await supabase
          .from('company_members')
          .select('full_name, vorname')
          .eq('user_id', user.id)
          .single();
        if (member) {
          setUserName(member.vorname || member.full_name?.split(' ')[0] || '');
        }
      } catch (_) {}

      // Parallele Hauptqueries
      const [
        { count: auftraegeHeuteCount },
        { count: auftraegeOffenCount },
        { count: auftraegeAbgCount },
        { count: rechnungenOffenCount },
        { data: heuteAuftraege },
        { data: neuesteAuftraege },
        { data: neuesteRechnungen },
        { data: neuesteKunden },
      ] = await Promise.all([
        supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('datum', today),
        supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'offen'),
        supabase.from('auftraege').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'abgeschlossen'),
        supabase.from('rechnungen').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'offen'),
        supabase.from('auftraege').select('id, datum, uhrzeit, kundenname, techniker, status, prioritaet').eq('user_id', user.id).eq('datum', today).order('uhrzeit', { ascending: true }),
        supabase.from('auftraege').select('id, created_at, kundenname').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('rechnungen').select('id, created_at, rechnungsnummer').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4),
        supabase.from('kunden').select('id, created_at, name').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4),
      ]);

      const rechnOffen = rechnungenOffenCount ?? 0;

      setStats({
        auftraegeHeute: auftraegeHeuteCount ?? 0,
        auftraegeOffen: auftraegeOffenCount ?? 0,
        auftraegeAbgeschlossen: auftraegeAbgCount ?? 0,
        rechnungenOffen: rechnOffen,
      });

      setHeutigeAuftraege(heuteAuftraege ?? []);

      // Fokus-Karten aufbauen
      const fokus = [];

      try {
        const { count: notdienste } = await supabase
          .from('auftraege')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('prioritaet', 'notfall')
          .eq('datum', today);
        if ((notdienste ?? 0) > 0) {
          fokus.push({ key: 'notdienst', count: notdienste, label: 'Notdienste heute', icon: AlertTriangle, color: 'red', href: '/dashboard/auftraege' });
        }
      } catch (_) {}

      try {
        const { count: ausserBetrieb } = await supabase
          .from('fahrzeuge')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'ausser_betrieb');
        if ((ausserBetrieb ?? 0) > 0) {
          fokus.push({ key: 'fahrzeug', count: ausserBetrieb, label: 'Fahrzeug außer Betrieb', icon: Truck, color: 'gray', href: '/dashboard/fahrzeuge' });
        }
      } catch (_) {}

      if (rechnOffen > 0) {
        fokus.push({ key: 'rechnungen', count: rechnOffen, label: 'Offene Rechnungen', icon: Receipt, color: 'blue', href: '/dashboard/rechnungen' });
      }

      setFokusKarten(fokus.slice(0, 5));

      // Timeline zusammenführen
      const events = [
        ...(neuesteAuftraege ?? []).map(a => ({
          id: 'a-' + a.id,
          text: 'Neuer Auftrag: ' + (a.kundenname || 'Unbekannt'),
          time: a.created_at,
          color: 'bg-blue-500',
          href: `/dashboard/auftraege/${a.id}`,
        })),
        ...(neuesteRechnungen ?? []).map(r => ({
          id: 'r-' + r.id,
          text: 'Rechnung erstellt: ' + (r.rechnungsnummer || '#' + r.id),
          time: r.created_at,
          color: 'bg-orange-500',
          href: `/dashboard/rechnungen/${r.id}`,
        })),
        ...(neuesteKunden ?? []).map(k => ({
          id: 'k-' + k.id,
          text: 'Neuer Kunde: ' + (k.name || 'Unbekannt'),
          time: k.created_at,
          color: 'bg-green-500',
          href: `/dashboard/kunden/${k.id}`,
        })),
      ];
      events.sort((a, b) => new Date(b.time) - new Date(a.time));
      setTimeline(events.slice(0, 8));

      setLaden(false);
    }
    load();
  }, [today]);

  const greeting = getGreeting();

  const subtitleParts = [];
  if (stats.auftraegeHeute > 0) subtitleParts.push(`${stats.auftraegeHeute} Einsätze heute`);
  const notdienstFokus = fokusKarten.find(f => f.key === 'notdienst');
  if (notdienstFokus) subtitleParts.push(`${notdienstFokus.count} Notdienste`);
  if (stats.rechnungenOffen > 0) subtitleParts.push(`${stats.rechnungenOffen} Rechnungen offen`);

  const gruppiertAuftraege = {
    offen:          (heutigeAuftraege ?? []).filter(a => a.status === 'offen'),
    in_bearbeitung: (heutigeAuftraege ?? []).filter(a => a.status === 'in_bearbeitung'),
    abgeschlossen:  (heutigeAuftraege ?? []).filter(a => a.status === 'abgeschlossen'),
  };

  return (
    <div className="max-w-6xl mx-auto">

      {/* SEKTION 1: HERO-BEGRÜSSUNG */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {greeting}{userName ? `, ${userName}` : ''}.
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          {subtitleParts.length > 0 ? subtitleParts.join(' • ') : 'Alles ruhig heute.'}
        </p>
        <div className="mt-4 border-t border-gray-100 dark:border-gray-800" />
      </div>

      {/* SEKTION 2: HEUTE IM FOKUS */}
      {fokusKarten.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Heute im Fokus</h2>
          <div className={`grid gap-3 ${
            fokusKarten.length === 1 ? 'grid-cols-1 max-w-xs' :
            fokusKarten.length === 2 ? 'grid-cols-2' :
            'grid-cols-2 md:grid-cols-3'
          }`}>
            {fokusKarten.map((k) => (
              <Link key={k.key} href={k.href} className="block hover:scale-[1.01] transition-transform duration-200">
                <KpiCard
                  label={k.label}
                  value={laden ? '–' : k.count}
                  icon={k.icon}
                  color={k.color}
                  loading={laden}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SEKTION 3: SCHNELLAKTIONEN */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schnellaktionen</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 cursor-pointer group hover:scale-[1.01]">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${action.color}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{action.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{action.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* SEKTION 5: KPI-BEREICH */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kennzahlen</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Aufträge heute"     value={stats.auftraegeHeute}        icon={Calendar}      color="blue"   loading={laden} />
          <KpiCard label="Offen"               value={stats.auftraegeOffen}        icon={Clock}         color="yellow" loading={laden} />
          <KpiCard label="Abgeschlossen"       value={stats.auftraegeAbgeschlossen} icon={CheckCircle}   color="green"  loading={laden} />
          <KpiCard label="Rechnungen offen"    value={stats.rechnungenOffen}        icon={Receipt}       color="orange" loading={laden} />
        </div>
      </div>

      {/* SEKTIONEN 4 + 6: TIMELINE + HEUTE-BEREICH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* SEKTION 4: LIVE-AKTIVITÄTEN */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Letzte Aktivitäten</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 min-h-[200px]">
            {laden ? (
              <div className="space-y-4 animate-pulse">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200 mt-2 shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4 mb-1" />
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Noch keine Aktivitäten"
                description="Legen Sie Ihren ersten Auftrag oder Kunden an."
              />
            ) : (
              <div className="relative pl-4 border-l-2 border-gray-100 dark:border-gray-700 space-y-4">
                {timeline.map((event) => (
                  <Link key={event.id} href={event.href}>
                    <div className="relative flex gap-3 group cursor-pointer">
                      <div className={`absolute -left-5 w-2 h-2 rounded-full mt-1.5 shrink-0 ${event.color}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{event.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(event.time)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SEKTION 6: HEUTIGE AUFTRÄGE */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Heutige Einsätze</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 min-h-[200px]">
            {laden ? (
              <div className="space-y-3 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg" />
                ))}
              </div>
            ) : heutigeAuftraege.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Keine Einsätze heute"
                description="Planen Sie Ihren ersten Einsatz für heute."
                action={() => router.push('/dashboard/auftraege/neu')}
                actionLabel="+ Auftrag anlegen"
              />
            ) : (
              <div className="space-y-1">
                {['offen', 'in_bearbeitung', 'abgeschlossen'].map((status) =>
                  gruppiertAuftraege[status].length > 0
                    ? gruppiertAuftraege[status].map((auftrag) => (
                        <Link key={auftrag.id} href={`/dashboard/auftraege/${auftrag.id}`}>
                          <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer group">
                            {auftrag.uhrzeit && (
                              <span className="text-xs font-mono text-gray-400 w-10 shrink-0">
                                {String(auftrag.uhrzeit).slice(0, 5)}
                              </span>
                            )}
                            <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
                              {auftrag.kundenname || '–'}
                            </span>
                            {auftrag.prioritaet === 'notfall' && <NotdienstBadge />}
                            <StatusBadge status={auftrag.status} />
                            <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              Öffnen →
                            </span>
                          </div>
                        </Link>
                      ))
                    : null
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
