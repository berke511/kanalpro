'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, AlertTriangle, CheckCircle, Clock, Users, Truck,
  FileText, Receipt, ClipboardList, Plus, ArrowRight, RefreshCw,
  Calendar, Euro, Target, Activity
} from 'lucide-react';
import {
  Card, KpiCard, StatusBadge, PrioritaetBadge, RechnungBadge,
  PrimaryButton, SecondaryButton, GhostButton, EmptyState,
  WarningCard, SuccessCard
} from '@/components/ui/KanalProUI';

const formatCurrency = (n) => n != null ? `${Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '–';
const formatRelTime = (d) => {
  if (!d) return '–';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${Math.floor(hours / 24)} Tagen`;
};
const getTageszeit = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
};

export default function ExecutiveCenter() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    einsaetzeHeute: 0, auftraegeOffen: 0, rechnungenBereit: 0,
    umsatzMonat: 0, offeneForderungen: 0, offeneAngebote: 0,
    freieMonteure: 0, fahrzeugeVerfuegbar: 0, notdienste: 0,
  });
  const [priorities, setPriorities] = useState([]);
  const [aktivitaeten, setAktivitaeten] = useState([]);
  const [ceoSummary, setCeoSummary] = useState('');

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from('company_members').select('company_id, role, vorname, nachname').eq('user_id', user.id).single();
    if (!member) return;
    const companyId = member.company_id;
    setUserName(member.vorname || user.email?.split('@')[0] || 'Chef');

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [
      auftragHeuteRes,
      auftragOffenRes,
      rechnungEntwurfRes,
      rechnungBezahltRes,
      rechnungGesendtRes,
      angebotRes,
      mitarbeiterRes,
      fahrzeugRes,
    ] = await Promise.all([
      supabase.from('auftraege').select('id,status,titel,prioritaet,notdienst,datum,kunden_id,techniker_id').eq('company_id', companyId).eq('datum', today),
      supabase.from('auftraege').select('id,status,titel,prioritaet,notdienst,datum').eq('company_id', companyId).eq('status', 'offen').order('datum', { ascending: true }).limit(10),
      supabase.from('rechnungen').select('id,status,gesamtbetrag,betrag,created_at').eq('company_id', companyId).eq('status', 'entwurf'),
      supabase.from('rechnungen').select('gesamtbetrag,betrag').eq('company_id', companyId).eq('status', 'bezahlt').gte('created_at', startOfMonth),
      supabase.from('rechnungen').select('id,status,gesamtbetrag,betrag,created_at').eq('company_id', companyId).eq('status', 'gesendet'),
      supabase.from('angebote').select('id,status,created_at').eq('company_id', companyId).eq('status', 'offen'),
      supabase.from('company_members').select('id,vorname,nachname').eq('company_id', companyId),
      supabase.from('fahrzeuge').select('id,kennzeichen,status,zustand').eq('company_id', companyId),
    ]);

    const heuteAuftraege = auftragHeuteRes.data || [];
    const offeneAuftraege = auftragOffenRes.data || [];
    const rechnungenEntwurf = rechnungEntwurfRes.data || [];
    const rechnungenGesendet = rechnungGesendtRes.data || [];
    const rechnungenBezahlt = rechnungBezahltRes.data || [];
    const offeneAngebote = angebotRes.data || [];
    const mitarbeiter = mitarbeiterRes.data || [];
    const fahrzeuge = fahrzeugRes.data || [];

    const umsatzMonat = rechnungenBezahlt.reduce((s, r) => s + Number(r.gesamtbetrag || r.betrag || 0), 0);
    const offeneForderungen = rechnungenGesendet.reduce((s, r) => s + Number(r.gesamtbetrag || r.betrag || 0), 0);
    const notdienste = heuteAuftraege.filter(a => a.notdienst || a.prioritaet === 'notfall').length;
    const freieMonteure = mitarbeiter.filter(m => !heuteAuftraege.some(a => a.techniker_id === m.id && a.status === 'in_bearbeitung')).length;
    const fahrzeugeVerfuegbar = fahrzeuge.filter(f => f.status !== 'in_werkstatt' && f.zustand !== 'in_werkstatt' && f.status !== 'außer_betrieb' && f.zustand !== 'außer_betrieb').length;

    setStats({
      einsaetzeHeute: heuteAuftraege.length,
      auftraegeOffen: offeneAuftraege.length,
      rechnungenBereit: rechnungenEntwurf.length,
      umsatzMonat,
      offeneForderungen,
      offeneAngebote: offeneAngebote.length,
      freieMonteure,
      fahrzeugeVerfuegbar,
      notdienste,
    });

    // CEO Summary
    const problems = [];
    if (notdienste > 0) problems.push(`${notdienste} Notdienst${notdienste > 1 ? 'e' : ''} aktiv`);
    const ueberfaellig = offeneAuftraege.filter(a => a.datum && new Date(a.datum) < new Date());
    if (ueberfaellig.length > 0) problems.push(`${ueberfaellig.length} überfällige${ueberfaellig.length > 1 ? ' Aufträge' : 'r Auftrag'}`);
    const problemText = problems.length > 0 ? ` ${problems.join(' und ')} benötigen Aufmerksamkeit.` : ' Alles läuft nach Plan.';
    const rechnungText = rechnungenEntwurf.length > 0 ? ` ${rechnungenEntwurf.length} Rechnung${rechnungenEntwurf.length > 1 ? 'en können' : ' kann'} erstellt werden.` : '';
    setCeoSummary(`Heute laufen ${heuteAuftraege.length} Einsätze.${problemText}${rechnungText} ${fahrzeugeVerfuegbar} von ${fahrzeuge.length} Fahrzeugen verfügbar.`);

    // Priorities (max 5)
    const prios = [];
    if (notdienste > 0) prios.push({ type: 'critical', title: `${notdienste} Notdienst${notdienste > 1 ? 'e' : ''}`, desc: 'Sofortiger Handlungsbedarf', cta: 'Zum Operations Center', href: '/dashboard/disposition' });
    if (ueberfaellig.length > 0) prios.push({ type: 'warning', title: `${ueberfaellig.length} überfällige Aufträge`, desc: 'Diese Aufträge waren für früher geplant', cta: 'Aufträge ansehen', href: '/dashboard/auftraege' });
    if (rechnungenEntwurf.length > 0) prios.push({ type: 'info', title: `${rechnungenEntwurf.length} Rechnungen bereit`, desc: `Gesamt: ${formatCurrency(rechnungenEntwurf.reduce((s, r) => s + Number(r.gesamtbetrag || r.betrag || 0), 0))}`, cta: 'Rechnungen öffnen', href: '/dashboard/rechnungen' });
    if (rechnungenGesendet.length > 3) prios.push({ type: 'warning', title: `${rechnungenGesendet.length} offene Forderungen`, desc: formatCurrency(offeneForderungen), cta: 'Rechnungen verwalten', href: '/dashboard/rechnungen' });
    if (offeneAngebote.length > 0) prios.push({ type: 'info', title: `${offeneAngebote.length} offene Angebote`, desc: 'Warten auf Rückmeldung', cta: 'Angebote ansehen', href: '/dashboard/angebote' });
    setPriorities(prios.slice(0, 5));

    // Aktivitäten-Timeline
    const events = [
      ...heuteAuftraege.map(a => ({ type: 'auftrag', date: a.datum, title: `Auftrag: ${a.titel || 'Einsatz'}`, status: a.status })),
      ...rechnungenEntwurf.map(r => ({ type: 'rechnung', date: r.created_at, title: 'Rechnung bereit zur Versendung', status: r.status })),
      ...rechnungenGesendet.slice(0, 3).map(r => ({ type: 'rechnung', date: r.created_at, title: `Rechnung gesendet: ${formatCurrency(r.gesamtbetrag || r.betrag)}`, status: r.status })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
    setAktivitaeten(events);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const prioColor = {
    critical: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10',
    warning: 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/10',
    info: 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/10',
  };
  const prioIcon = {
    critical: <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />,
    warning: <Clock className="w-4 h-4 text-orange-500 shrink-0" />,
    info: <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />,
  };

  if (loading) return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-80 animate-pulse" />
      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* GREETING */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{getTageszeit()}, {userName}.</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <GhostButton onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Aktualisieren</GhostButton>
        </div>

        {/* CEO SUMMARY */}
        {ceoSummary && (
          <Card>
            <div className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Tages-Zusammenfassung</p>
                <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed">{ceoSummary}</p>
              </div>
            </div>
          </Card>
        )}

        {/* BUSINESS HEALTH — KPI Strip */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Business Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Umsatz (Monat)" value={formatCurrency(stats.umsatzMonat)} />
            <KpiCard label="Offene Forderungen" value={formatCurrency(stats.offeneForderungen)} />
            <KpiCard label="Rechnungen bereit" value={stats.rechnungenBereit} />
            <KpiCard label="Offene Angebote" value={stats.offeneAngebote} />
            <KpiCard label="Einsätze heute" value={stats.einsaetzeHeute} />
          </div>
        </div>

        {/* OPERATIONS STATUS */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Operations Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><div className="p-4 flex items-center gap-3"><div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-green-600 dark:text-green-400" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.freieMonteure}</p><p className="text-xs text-gray-500 dark:text-gray-400">Freie Monteure</p></div></div></Card>
            <Card><div className="p-4 flex items-center gap-3"><div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0"><Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.fahrzeugeVerfuegbar}</p><p className="text-xs text-gray-500 dark:text-gray-400">Fahrzeuge frei</p></div></div></Card>
            <Card><div className="p-4 flex items-center gap-3"><div className={`w-9 h-9 ${stats.notdienste > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'} rounded-lg flex items-center justify-center shrink-0`}><AlertTriangle className={`w-5 h-5 ${stats.notdienste > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`} /></div><div><p className={`text-2xl font-bold ${stats.notdienste > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{stats.notdienste}</p><p className="text-xs text-gray-500 dark:text-gray-400">Notdienste</p></div></div></Card>
            <Card><div className="p-4 flex items-center gap-3"><div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center shrink-0"><ClipboardList className="w-5 h-5 text-orange-600 dark:text-orange-400" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.auftraegeOffen}</p><p className="text-xs text-gray-500 dark:text-gray-400">Offene Aufträge</p></div></div></Card>
          </div>
        </div>

        {/* 2-COLUMN: Priorities + Aktivitäten */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* TOP PRIORITIES */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Top Prioritäten</h2>
            {priorities.length === 0 ? (
              <Card><div className="p-8"><EmptyState title="Keine Prioritäten" description="Alles läuft nach Plan. Kein Handlungsbedarf." /></div></Card>
            ) : (
              <div className="space-y-3">
                {priorities.map((p, i) => (
                  <div key={i} className={`rounded-xl p-4 ${prioColor[p.type]}`}>
                    <div className="flex items-start gap-3">
                      {prioIcon[p.type]}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{p.desc}</p>
                      </div>
                      <GhostButton onClick={() => router.push(p.href)} className="shrink-0 text-xs">
                        {p.cta} <ArrowRight className="w-3 h-3 ml-1" />
                      </GhostButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LIVE AKTIVITÄTEN */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Live Aktivitäten</h2>
            <Card>
              <div className="p-5">
                {aktivitaeten.length === 0 ? (
                  <EmptyState title="Keine Aktivitäten" description="Noch keine Ereignisse heute." />
                ) : (
                  <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-2 space-y-0">
                    {aktivitaeten.map((e, i) => (
                      <div key={i} className="flex gap-3 relative pl-5 pb-4">
                        <div className={`absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${e.type === 'rechnung' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{e.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatRelTime(e.date)}</p>
                            {e.status && <StatusBadge status={e.status} />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* SCHNELLZUGRIFF */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Schnellzugriff</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Neuer Auftrag', icon: ClipboardList, href: '/dashboard/auftraege/erstellen', color: 'bg-blue-500' },
              { label: 'Neuer Kunde', icon: Users, href: '/dashboard/kunden/neu', color: 'bg-green-500' },
              { label: 'Angebot', icon: FileText, href: '/dashboard/angebote/neu', color: 'bg-orange-500' },
              { label: 'Rechnung', icon: Receipt, href: '/dashboard/rechnungen/neu', color: 'bg-purple-500' },
              { label: 'Disposition', icon: Calendar, href: '/dashboard/disposition', color: 'bg-indigo-500' },
              { label: 'Operations', icon: Activity, href: '/dashboard/disposition', color: 'bg-teal-500' },
            ].map(a => {
              const Icon = a.icon;
              return (
                <div key={a.label} onClick={() => router.push(a.href)} className="cursor-pointer group">
                  <Card>
                    <div className="p-4 flex flex-col items-center gap-2 text-center group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 transition-colors rounded-xl">
                      <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center`}><Icon className="w-5 h-5 text-white" /></div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{a.label}</p>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
