'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Truck, AlertTriangle, Clock, Phone, MapPin,
  Plus, FileText, Receipt, ClipboardList, Navigation, User, RefreshCw
} from 'lucide-react';
import {
  Card, KpiCard, StatusBadge, PrioritaetBadge,
  PrimaryButton, GhostButton, EmptyState
} from '@/components/ui/KanalProUI';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) : '–';
const getKW = (d) => {
  const date = new Date(d);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
};
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
const getAvatarColor = (name) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-indigo-500', 'bg-teal-500'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
};

export default function OperationsCenter() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);
  const [auftraege, setAuftraege] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    einsaetzeHeute: 0, freieMonteure: 0, fahrzeugeVerfuegbar: 0,
    notdienste: 0, offeneBerichte: 0, offeneRechnungen: 0
  });

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
    if (!member) { setLoading(false); return; }
    const companyId = member.company_id;

    const [auftragRes, mitarbeiterRes, fahrzeugRes, rechnungRes, alleAuftraegeRes] = await Promise.all([
      supabase.from('auftraege')
        .select('id, titel, status, datum, uhrzeit, prioritaet, adresse, techniker_id, fahrzeug_id, mitarbeiter:techniker_id(vorname, nachname)')
        .eq('company_id', companyId)
        .eq('datum', today)
        .order('uhrzeit', { ascending: true, nullsFirst: true }),
      supabase.from('company_members')
        .select('id, vorname, nachname, telefon')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('nachname'),
      supabase.from('fahrzeuge')
        .select('id, kennzeichen, marke, zustand')
        .eq('company_id', companyId)
        .order('kennzeichen'),
      supabase.from('rechnungen')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('status', 'entwurf'),
      supabase.from('auftraege')
        .select('id, datum, status, prioritaet')
        .eq('company_id', companyId)
        .neq('status', 'abgeschlossen'),
    ]);

    const auftragData = auftragRes.data || [];
    const mitarbeiterData = mitarbeiterRes.data || [];
    const fahrzeugData = fahrzeugRes.data || [];
    const alleAuftraege = alleAuftraegeRes.data || [];

    setAuftraege(auftragData);
    setMitarbeiter(mitarbeiterData);
    setFahrzeuge(fahrzeugData);

    const notdienste = auftragData.filter(a => a.prioritaet === 'notfall').length;
    const freieMonteure = mitarbeiterData.filter(m =>
      !auftragData.some(a => a.techniker_id === m.id && a.status === 'in_bearbeitung')
    ).length;
    const fahrzeugeVerfuegbar = fahrzeugData.filter(f =>
      f.zustand !== 'wartung' && f.zustand !== 'ausser_betrieb'
    ).length;

    setStats({
      einsaetzeHeute: auftragData.length,
      freieMonteure,
      fahrzeugeVerfuegbar,
      notdienste,
      offeneBerichte: 0,
      offeneRechnungen: rechnungRes.data?.length || 0,
    });

    const newAlerts = [];
    if (notdienste > 0) newAlerts.push({ type: 'warning', msg: `${notdienste} Notdienst${notdienste > 1 ? 'e' : ''} heute` });
    const ueberfaellig = alleAuftraege.filter(a => a.datum && a.datum < today && a.status === 'offen');
    if (ueberfaellig.length > 0) newAlerts.push({ type: 'critical', msg: `${ueberfaellig.length} überfällige${ueberfaellig.length > 1 ? ' Aufträge' : 'r Auftrag'}` });
    fahrzeugData.filter(f => f.zustand === 'wartung').forEach(f =>
      newAlerts.push({ type: 'warning', msg: `${f.kennzeichen} in Werkstatt` })
    );
    setAlerts(newAlerts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const alertColor = {
    critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
    warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
  };

  const getMitarbeiterAuftraege = (mId) => auftraege.filter(a => a.techniker_id === mId);
  const getMitarbeiterStatus = (mId) => {
    const a = auftraege.find(a => a.techniker_id === mId);
    if (!a) return 'frei';
    if (a.status === 'in_bearbeitung') return 'im_einsatz';
    return 'geplant';
  };

  if (loading) return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-72 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operations Center</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDate(new Date())} · KW {getKW(new Date())}
            </p>
          </div>
          <GhostButton onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Aktualisieren
          </GhostButton>
        </div>

        {/* KPI STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <KpiCard label="Einsätze heute" value={stats.einsaetzeHeute} />
          <KpiCard label="Freie Monteure" value={stats.freieMonteure} />
          <KpiCard label="Fahrzeuge frei" value={stats.fahrzeugeVerfuegbar} />
          <KpiCard label="Notdienste" value={stats.notdienste} />
          <KpiCard label="Fehl. Berichte" value={stats.offeneBerichte} />
          <KpiCard label="Off. Rechnungen" value={stats.offeneRechnungen} />
        </div>

        {/* LIVE ALERTS */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Live Alerts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${alertColor[a.type]}`}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {a.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEAM BOARD */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Live Team Board</h2>
            <GhostButton onClick={() => router.push('/dashboard/mitarbeiter')}>Alle anzeigen</GhostButton>
          </div>
          {mitarbeiter.length === 0 ? (
            <EmptyState title="Keine Mitarbeiter" description="Noch keine aktiven Mitarbeiter angelegt." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mitarbeiter.map(m => {
                const status = getMitarbeiterStatus(m.id);
                const mAuftraege = getMitarbeiterAuftraege(m.id);
                const fullName = `${m.vorname} ${m.nachname}`;
                const statusDot = { frei: 'bg-green-500', im_einsatz: 'bg-blue-500', geplant: 'bg-orange-500' };
                const statusLabel = { frei: 'Frei', im_einsatz: 'Im Einsatz', geplant: 'Geplant' };
                const statusText = { frei: 'text-green-600 dark:text-green-400', im_einsatz: 'text-blue-600 dark:text-blue-400', geplant: 'text-orange-600 dark:text-orange-400' };
                return (
                  <Card key={m.id}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className={`w-11 h-11 ${getAvatarColor(fullName)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                            {getInitials(fullName)}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusDot[status] || 'bg-gray-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{fullName}</p>
                          <span className={`text-xs font-medium ${statusText[status]}`}>{statusLabel[status]}</span>
                        </div>
                      </div>
                      {mAuftraege.length > 0 && (
                        <div className="space-y-1">
                          {mAuftraege.slice(0, 2).map(a => (
                            <div key={a.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span className="truncate">{a.uhrzeit ? a.uhrzeit.slice(0, 5) : '–'} · {a.titel || 'Einsatz'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {m.telefon && (
                        <a href={`tel:${m.telefon}`} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                          <Phone className="w-3 h-3" />{m.telefon}
                        </a>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* OPERATIONS BOARD */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Einsätze heute ({auftraege.length})
            </h2>
            <PrimaryButton onClick={() => router.push('/dashboard/auftraege/erstellen')}>
              <Plus className="w-4 h-4 mr-1" /> Neuer Auftrag
            </PrimaryButton>
          </div>
          {auftraege.length === 0 ? (
            <EmptyState title="Keine Einsätze heute" description="Für heute sind keine Aufträge geplant." />
          ) : (
            <div className="space-y-3">
              {auftraege.map(a => {
                const fz = fahrzeuge.find(f => f.id === a.fahrzeug_id);
                const techName = a.mitarbeiter ? `${a.mitarbeiter.vorname} ${a.mitarbeiter.nachname}` : null;
                return (
                  <div
                    key={a.id}
                    onClick={() => router.push(`/dashboard/auftraege/${a.id}`)}
                    className="cursor-pointer group"
                  >
                    <Card>
                      <div className="p-4 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 transition-colors rounded-xl">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <div className="shrink-0 text-center md:w-16">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {a.uhrzeit ? a.uhrzeit.slice(0, 5) : '–'}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{a.titel || 'Einsatz'}</p>
                              <StatusBadge status={a.status} />
                              {a.prioritaet === 'notfall' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Notdienst</span>
                              )}
                              {a.prioritaet && a.prioritaet !== 'notfall' && (
                                <PrioritaetBadge prioritaet={a.prioritaet} />
                              )}
                            </div>
                            <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                              {a.adresse && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.adresse}</span>}
                              {techName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{techName}</span>}
                              {fz && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{fz.kennzeichen}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            <GhostButton onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?id=${a.id}`)}>
                              <ClipboardList className="w-4 h-4" />
                            </GhostButton>
                            <GhostButton onClick={() => router.push(`/dashboard/rechnungen/neu?auftragId=${a.id}`)}>
                              <Receipt className="w-4 h-4" />
                            </GhostButton>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FAHRZEUGE */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fahrzeugstatus</h2>
            <GhostButton onClick={() => router.push('/dashboard/fahrzeuge')}>Alle Fahrzeuge</GhostButton>
          </div>
          {fahrzeuge.length === 0 ? (
            <EmptyState title="Keine Fahrzeuge" description="Noch keine Fahrzeuge angelegt." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fahrzeuge.map(f => {
                const inEinsatz = auftraege.some(a => a.fahrzeug_id === f.id && a.status === 'in_bearbeitung');
                const inWerkstatt = f.zustand === 'wartung';
                const statusLabel = inEinsatz ? 'Im Einsatz' : inWerkstatt ? 'Werkstatt' : 'Verfügbar';
                const statusColor = inEinsatz ? 'bg-blue-500' : inWerkstatt ? 'bg-red-500' : 'bg-green-500';
                return (
                  <Card key={f.id}>
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white font-mono text-sm">{f.kennzeichen}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{f.marke || '–'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{statusLabel}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* SCHNELLAKTIONEN */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Schnellaktionen</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Neuer Auftrag', icon: ClipboardList, href: '/dashboard/auftraege/erstellen', color: 'bg-blue-500' },
              { label: 'Notdienst', icon: AlertTriangle, href: '/dashboard/auftraege/erstellen?prioritaet=notfall', color: 'bg-red-500' },
              { label: 'Neuer Kunde', icon: User, href: '/dashboard/kunden/neu', color: 'bg-green-500' },
              { label: 'Rechnung', icon: Receipt, href: '/dashboard/rechnungen/neu', color: 'bg-purple-500' },
              { label: 'Angebot', icon: FileText, href: '/dashboard/angebote/neu', color: 'bg-orange-500' },
              { label: 'Routenplanung', icon: Navigation, href: '/dashboard/disposition/routenplanung', color: 'bg-indigo-500' },
            ].map(action => {
              const Icon = action.icon;
              return (
                <div
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className="cursor-pointer group"
                >
                  <Card>
                    <div className="p-4 flex flex-col items-center gap-2 text-center group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 transition-colors rounded-xl">
                      <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{action.label}</p>
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
