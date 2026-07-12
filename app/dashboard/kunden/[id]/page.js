'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Phone, Mail, MapPin, Calendar, Clock, ArrowLeft, Plus, FileText, ClipboardList, Receipt } from 'lucide-react';
import {
  PageHeader, PageSection, Card, KpiCard, StatusBadge, PrioritaetBadge, RechnungBadge,
  PrimaryButton, SecondaryButton, GhostButton, EmptyState, SuccessBadge, WarningBadge
} from '@/components/ui/KanalProUI';
import { getCustomerActivities } from '@/lib/activityEngine';


const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '–';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
  return `vor ${Math.floor(days / 30)} Monaten`;
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '–';
const formatCurrency = (n) => n != null ? `${Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €` : '–';

const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
const getAvatarColor = (name) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-indigo-500'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
};

export default function KundenWorkspace() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kunde, setKunde] = useState(null);
  const [auftraege, setAuftraege] = useState([]);
  const [rechnungen, setRechnungen] = useState([]);
  const [angebote, setAngebote] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [stats, setStats] = useState({ aktiveAuftraege: 0, offeneAngebote: 0, offeneRechnungen: 0, gesamtumsatz: '–', letzterEinsatz: '–' });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      if (!member) return;
      const companyId = member.company_id;

      const [k, a, r, an] = await Promise.all([
        supabase.from('kunden').select('*').eq('id', id).single(),
        supabase.from('auftraege').select('*').eq('kunde_id', id).eq('company_id', companyId).order('created_at', { ascending: false }).limit(10),
        supabase.from('rechnungen').select('*').eq('kunden_id', id).eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
        supabase.from('angebote').select('*').eq('kunden_id', id).eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
      ]);

      if (k.data) setKunde(k.data);
      const auftragData = a.data || [];
      const rechnungData = r.data || [];
      const angebotData = an.data || [];
      setAuftraege(auftragData);
      setRechnungen(rechnungData);
      setAngebote(angebotData);

      const acts = await getCustomerActivities(supabase, id, companyId);
      const tl = acts.map(a => ({
        type: a.type, date: a.timestamp, title: a.title,
        status: a.status, link: a.link,
        color: a.type === 'auftrag_abgeschlossen' || a.type === 'rechnung_bezahlt' || a.type === 'angebot_angenommen' ? 'green'
          : a.type.startsWith('auftrag') ? 'blue'
          : a.type.startsWith('angebot') ? 'orange' : 'gray',
      }));
      setTimeline(tl.slice(0, 10));

      const gesamtumsatz = rechnungData.filter(r => r.status === 'bezahlt').reduce((s, r) => s + Number(r.gesamtbetrag || r.betrag || 0), 0);
      const letzterAuftrag = auftragData[0]?.created_at;
      setStats({
        aktiveAuftraege: auftragData.filter(a => a.status === 'in_bearbeitung').length,
        offeneAngebote: angebotData.filter(a => a.status === 'offen' || a.status === 'entwurf').length,
        offeneRechnungen: rechnungData.filter(r => r.status === 'gesendet' || r.status === 'entwurf').length,
        gesamtumsatz: formatCurrency(gesamtumsatz),
        letzterEinsatz: letzterAuftrag ? formatRelativeTime(letzterAuftrag) : '–',
      });
      setLoading(false);
    };
    load();
  }, [id]);

  const dotColor = { green: 'bg-green-500', blue: 'bg-blue-500', gray: 'bg-gray-400', orange: 'bg-orange-500' };

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
      </div>
      <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />)}</div>
    </div>
  );

  if (!kunde) return (
    <div className="p-6">
      <EmptyState title="Kunde nicht gefunden" description="Dieser Kunde existiert nicht oder wurde gelöscht." />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center gap-3">
          <GhostButton onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
          </GhostButton>
        </div>
        <PageHeader title={kunde.name || 'Unbekannter Kunde'} subtitle="Kundenakte" />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Aktive Aufträge" value={stats.aktiveAuftraege} />
          <KpiCard label="Offene Angebote" value={stats.offeneAngebote} />
          <KpiCard label="Offene Rechnungen" value={stats.offeneRechnungen} />
          <KpiCard label="Gesamtumsatz" value={stats.gesamtumsatz} />
          <KpiCard label="Letzter Einsatz" value={stats.letzterEinsatz} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 space-y-4">
            <Card>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 ${getAvatarColor(kunde.name)} rounded-full flex items-center justify-center text-white text-xl font-bold`}>
                    {getInitials(kunde.name)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{kunde.name}</h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${kunde.aktiv === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {kunde.aktiv === false ? 'Inaktiv' : 'Aktiv'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  {kunde.telefon && (
                    <a href={`tel:${kunde.telefon}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                      <Phone className="w-4 h-4 shrink-0" /> {kunde.telefon}
                    </a>
                  )}
                  {kunde.email && (
                    <a href={`mailto:${kunde.email}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                      <Mail className="w-4 h-4 shrink-0" /> {kunde.email}
                    </a>
                  )}
                  {kunde.adresse && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" /> {kunde.adresse}
                    </div>
                  )}
                  {kunde.created_at && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4 shrink-0" /> Kunde seit {formatDate(kunde.created_at)}
                    </div>
                  )}
                  {auftraege[0]?.created_at && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4 shrink-0" /> Letzte Aktivität {formatRelativeTime(auftraege[0].created_at)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  {kunde.telefon && (
                    <a href={`tel:${kunde.telefon}`}>
                      <PrimaryButton className="w-full justify-center"><Phone className="w-4 h-4 mr-2" /> Anrufen</PrimaryButton>
                    </a>
                  )}
                  {kunde.email && (
                    <a href={`mailto:${kunde.email}`}>
                      <SecondaryButton className="w-full justify-center"><Mail className="w-4 h-4 mr-2" /> E-Mail</SecondaryButton>
                    </a>
                  )}
                  <SecondaryButton className="w-full justify-center" onClick={() => router.push(`/dashboard/auftraege/erstellen?kundeId=${id}`)}>
                    <Plus className="w-4 h-4 mr-2" /> Neuer Auftrag
                  </SecondaryButton>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">

            <Card>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Aktivitäten</h3>
                {timeline.length === 0 ? (
                  <EmptyState title="Keine Aktivitäten" description="Noch keine Aufträge, Rechnungen oder Angebote." />
                ) : (
                  <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-2 space-y-0">
                    {timeline.map((ev, i) => (
                      <div key={i} className="flex gap-3 relative pl-6 pb-4">
                        <div className={`absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${dotColor[ev.color] || 'bg-gray-400'}`} />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatRelativeTime(ev.date)}</p>
                            </div>
                            {ev.status && <StatusBadge status={ev.status} />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aufträge ({auftraege.length})</h3>
                  <GhostButton onClick={() => router.push(`/dashboard/auftraege?kundeId=${id}`)}>Alle anzeigen</GhostButton>
                </div>
                {auftraege.length === 0 ? (
                  <EmptyState title="Keine Aufträge" description="Noch kein Auftrag für diesen Kunden." />
                ) : (
                  <div className="space-y-2">
                    {auftraege.slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.titel || a.beschreibung || 'Auftrag'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(a.datum || a.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <StatusBadge status={a.status} />
                          <GhostButton onClick={() => router.push(`/dashboard/auftraege/${a.id}`)}>Öffnen</GhostButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Angebote ({angebote.length})</h3>
                  <GhostButton onClick={() => router.push(`/dashboard/angebote`)}>Alle anzeigen</GhostButton>
                </div>
                {angebote.length === 0 ? (
                  <EmptyState title="Keine Angebote" description="Noch kein Angebot für diesen Kunden." />
                ) : (
                  <div className="space-y-2">
                    {angebote.slice(0, 3).map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.angebotsnummer || `Angebot #${a.id?.substring(0,8)}`}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(a.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <StatusBadge status={a.status} />
                          <GhostButton onClick={() => router.push(`/dashboard/angebote/${a.id}`)}>Öffnen</GhostButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rechnungen ({rechnungen.length})</h3>
                  <GhostButton onClick={() => router.push(`/dashboard/rechnungen`)}>Alle anzeigen</GhostButton>
                </div>
                {rechnungen.length === 0 ? (
                  <EmptyState title="Keine Rechnungen" description="Noch keine Rechnung für diesen Kunden." />
                ) : (
                  <div className="space-y-2">
                    {rechnungen.slice(0, 3).map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.rechnungsnummer || `Rechnung #${r.id?.substring(0,8)}`}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(r.created_at)} · {formatCurrency(r.gesamtbetrag || r.betrag)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <RechnungBadge status={r.status} />
                          <GhostButton onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}>Öffnen</GhostButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
