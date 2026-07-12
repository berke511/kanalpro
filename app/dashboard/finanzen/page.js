'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, TrendingUp, Clock, AlertTriangle,
  CheckCircle, FileSearch, Plus, Users,
  Briefcase, Calendar, DollarSign,
  Wrench, CreditCard, FileCheck, Activity
} from 'lucide-react';
import supabase from '@/lib/supabase';
import { getActivities } from '@/lib/activityEngine';
import {
  Card, KpiCard, PrimaryButton, SecondaryButton,
  EmptyState, PageHeader, PageSection,
} from '@/components/ui/KanalProUI';

function fmtEuro(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function calcBrutto(item) {
  const netto = (item.positionen ?? []).reduce(
    (s, p) => s + (p.menge ?? 0) * (p.preis ?? 0), 0
  );
  return netto * (1 + (item.steuersatz ?? 19) / 100);
}

function istUeberfaellig(r) {
  if (r.status === 'bezahlt') return false;
  const ref = r.faelligkeitsdatum ?? (r.datum
    ? new Date(new Date(r.datum).getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
    : null);
  return ref ? new Date(ref) < new Date() : false;
}

const R_BADGE = {
  entwurf:      { label: 'Entwurf',    cls: 'bg-gray-100 text-gray-600' },
  gesendet:     { label: 'Offen',      cls: 'bg-yellow-100 text-yellow-800' },
  bezahlt:      { label: 'Bezahlt',    cls: 'bg-green-100 text-green-700' },
  ueberfaellig: { label: 'Überfällig', cls: 'bg-red-100 text-red-700' },
};

const A_BADGE = {
  entwurf:    { label: 'Entwurf',    cls: 'bg-gray-100 text-gray-600' },
  gesendet:   { label: 'Gesendet',   cls: 'bg-blue-100 text-blue-700' },
  angenommen: { label: 'Angenommen', cls: 'bg-green-100 text-green-700' },
  abgelehnt:  { label: 'Abgelehnt',  cls: 'bg-red-100 text-red-600' },
};

function RechnungBadgeLocal({ r }) {
  const key = istUeberfaellig(r) ? 'ueberfaellig' : (r.status ?? 'entwurf');
  const cfg = R_BADGE[key] ?? R_BADGE.entwurf;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function FinanceCenter() {
  const [laden, setLaden]           = useState(true);
  const [activities, setActivities] = useState([]);
  const [rechnungen, setRechnungen] = useState([]);
  const [angebote, setAngebote]     = useState([]);

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
      if (!companyId) { setLaden(false); return; }

      const [{ data: rech }, { data: ang }, acts] = await Promise.all([
        supabase
          .from('rechnungen')
          .select('*, kunden(name)')
          .eq('company_id', companyId)
          .order('erstellt_am', { ascending: false })
          .limit(200),
        supabase
          .from('angebote')
          .select('*, kunden(name)')
          .eq('company_id', companyId)
          .order('erstellt_am', { ascending: false })
          .limit(100),
        getActivities(supabase, companyId, { limit: 15 }),
      ]);

      setRechnungen(rech ?? []);
      setAngebote(ang ?? []);
      setActivities(acts);
      setLaden(false);
    }
    load();
  }, []);

  const heute = new Date().toISOString().split('T')[0];
  const monatsAnfang = new Date(
    new Date().getFullYear(), new Date().getMonth(), 1
  ).toISOString().split('T')[0];

  const rechnungenHeute    = rechnungen.filter(r => (r.erstellt_am ?? '').startsWith(heute)).length;
  const offenListe         = rechnungen.filter(r => r.status === 'gesendet');
  const offeneForderungen  = offenListe.reduce((s, r) => s + calcBrutto(r), 0);
  const bezahltMonat       = rechnungen.filter(r => r.status === 'bezahlt' && (r.erstellt_am ?? '') >= monatsAnfang);
  const monatsumsatz       = bezahltMonat.reduce((s, r) => s + calcBrutto(r), 0);
  const offeneAngebote     = angebote.filter(a => a.status !== 'abgelehnt' && !a.auftrag);
  const entwuerfe          = rechnungen.filter(r => r.status === 'entwurf');
  const bezahlt            = rechnungen.filter(r => r.status === 'bezahlt');
  const ueberfaelligListe  = rechnungen.filter(r => istUeberfaellig(r));
  const arbeitsliste       = rechnungen
    .filter(r => r.status === 'gesendet' || istUeberfaellig(r))
    .slice(0, 20);

  return (
    <div className="space-y-6 pb-32 md:pb-8">

      {/* BEREICH 1: FINANCE HEADER */}
      <div>
        <PageHeader
          title="Finance Center"
          subtitle="Finanz- & Buchhaltungszentrale"
          action={
            <Link href="/dashboard/rechnungen/neu">
              <PrimaryButton>
                <span className="flex items-center gap-1.5">
                  <Plus size={14} />
                  Neue Rechnung
                </span>
              </PrimaryButton>
            </Link>
          }
        />
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { label: 'Heute erstellt',     value: laden ? null : String(rechnungenHeute) },
            { label: 'Offene Forderungen', value: laden ? null : fmtEuro(offeneForderungen) },
            { label: 'Monatsumsatz',       value: laden ? null : fmtEuro(monatsumsatz) },
            { label: 'Offene Angebote',    value: laden ? null : String(offeneAngebote.length) },
            { label: 'Ø Zahlungsdauer', value: '–' },
          ].map(kpi => (
            <div key={kpi.label} className="text-center">
              {kpi.value === null
                ? <div className="h-7 w-16 mx-auto bg-blue-500/40 rounded animate-pulse mb-1" />
                : <p className="text-xl font-bold text-white leading-tight">{kpi.value}</p>
              }
              <p className="text-xs text-blue-200 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* BEREICH 2: KPI CARDS */}
      <PageSection title="Rechnungs-KPIs">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard label="Entwürfe (bereit)"   value={entwuerfe.length}           icon={FileText}      color="gray"    loading={laden} />
          <KpiCard label="Offen (gesendet)"         value={offenListe.length}          icon={Clock}         color="yellow"  loading={laden} />
          <KpiCard label="Bezahlt"                  value={bezahlt.length}             icon={CheckCircle}   color="green"   loading={laden} />
          <KpiCard label="Mahnrelevant"             value={ueberfaelligListe.length}   icon={AlertTriangle} color="red"     loading={laden} />
          <KpiCard label="Monatsumsatz"             value={fmtEuro(monatsumsatz)}      icon={TrendingUp}    color="emerald" loading={laden} />
          <KpiCard label="Offene Forderungen"       value={fmtEuro(offeneForderungen)} icon={DollarSign}    color="orange"  loading={laden} />
        </div>
      </PageSection>

      {/* BEREICH 3: ARBEITSLISTE */}
      <PageSection title="Arbeitsliste – Offene & Überfällige Rechnungen">
        {laden ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : arbeitsliste.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Alles erledigt"
            description="Keine offenen oder überfälligen Rechnungen vorhanden."
          />
        ) : (
          <div className="space-y-2">
            {arbeitsliste.map(r => {
              const overdue = istUeberfaellig(r);
              const faelligkeit = r.faelligkeitsdatum ?? (r.datum
                ? new Date(new Date(r.datum).getTime() + 30 * 24 * 60 * 60 * 1000)
                    .toISOString().split('T')[0]
                : null);
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-gray-900">
                          {r.rechnungsnummer ?? '–'}
                        </span>
                        <RechnungBadgeLocal r={r} />
                        {overdue && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                            <AlertTriangle size={11} />
                            Überfällig
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{r.kunden?.name ?? '–'}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-base font-bold text-gray-900">
                          {fmtEuro(calcBrutto(r))}
                        </span>
                        {faelligkeit && (
                          <span className={`text-xs ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                            Fällig: {new Date(faelligkeit).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/dashboard/rechnungen/${r.id}`}>
                      <SecondaryButton className="shrink-0 text-xs">
                        Öffnen
                      </SecondaryButton>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageSection>

      {/* BEREICH 4: ANGEBOTE */}
      <PageSection title="Offene Angebote">
        {laden ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : offeneAngebote.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="Keine offenen Angebote"
            description="Alle Angebote wurden bearbeitet oder es gibt noch keine."
          />
        ) : (
          <div className="space-y-2">
            {offeneAngebote.slice(0, 20).map(a => {
              const bruttoA = calcBrutto(a);
              const tage = a.erstellt_am
                ? Math.floor((Date.now() - new Date(a.erstellt_am).getTime()) / 86400000)
                : null;
              const cfg = A_BADGE[a.status] ?? A_BADGE.entwurf;
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-gray-900">
                          {a.angebotsnummer ?? '–'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                        {tage !== null && tage > 14 && (
                          <span className="text-xs font-medium text-amber-500">
                            {tage} Tage alt
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{a.kunden?.name ?? '–'}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-base font-bold text-gray-900">{fmtEuro(bruttoA)}</span>
                        {tage !== null && (
                          <span className="text-xs text-gray-400">
                            Erstellt vor {tage} {tage === 1 ? 'Tag' : 'Tagen'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/dashboard/angebote/${a.id}`}>
                      <SecondaryButton className="shrink-0 text-xs">
                        Öffnen
                      </SecondaryButton>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageSection>

      {/* BEREICH 5: ZAHLUNGS-TIMELINE */}
        <PageSection title="Letzte Aktivitäten">
          {laden ? (
            <div className="space-y-1.5">
              {[1,2,3,4,5].map(i => <div key={i} className="h-11 rounded-lg bg-gray-100 animate-pulse" />)}
            </div>
          ) : activities.length === 0 ? (
            <EmptyState icon={Calendar} title="Keine Aktivitäten" description="Noch keine Aktivitäten vorhanden." />
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
              {activities.map(a => {
                const ICONS = { Wrench, CreditCard, FileCheck, Activity };
                const IconComp = ICONS[a.icon] ?? Activity;
                return (
                  <Link key={a.id} href={a.link} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition">
                    <IconComp size={14} className={a.color} />
                    <span className="flex-1 text-sm text-gray-700 truncate">{a.title}</span>
                    {a.description && <span className="text-xs text-gray-400 truncate hidden md:block max-w-xs">{a.description}</span>}
                    <span className="text-xs text-gray-300 shrink-0">{new Date(a.timestamp).toLocaleDateString('de-DE')}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </PageSection>
        {/* BEREICH 6: SCHNELLAKTIONEN */}
      <PageSection title="Schnellaktionen">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Neue Rechnung', href: '/dashboard/rechnungen/neu', Icon: FileText,   primary: true  },
            { label: 'Neues Angebot', href: '/dashboard/angebote/neu',   Icon: FileSearch, primary: false },
            { label: 'Kundenliste',   href: '/dashboard/kunden',         Icon: Users,      primary: false },
            { label: 'Alle Aufträge', href: '/dashboard/auftraege', Icon: Briefcase,  primary: false },
          ].map(({ label, href, Icon, primary }) => (
            <Link key={label} href={href}>
              <div className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition cursor-pointer text-center ${
                primary
                  ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
                <Icon size={18} />
                <span className="text-xs font-semibold">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </PageSection>

    </div>
  );
}
