'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, Users, Truck, Wrench, FileText, AlertTriangle,
  Plus, Clock, CheckCircle, Bell, Activity, Calendar,
  CreditCard, FileCheck, User, ClipboardList, ChevronRight,
  Euro, Package,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import { getNotifications } from '@/lib/notificationEngine';
import { getActivities } from '@/lib/activityEngine';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import KpiCard from '@/components/ui/v2/KpiCard';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import EmptyState from '@/components/ui/v2/EmptyState';
import { SkeletonKpiGrid, SkeletonCard } from '@/components/ui/v2/Skeleton';
import ErrorState from '@/components/ui/v2/ErrorState';

// ─── Lucide-Icon-Map (string → Komponente) ─────────────────────────────────
var ICON_COMPONENTS = {
  Wrench,
  CheckCircle,
  FileText,
  CreditCard,
  FileCheck,
  User,
  AlertTriangle,
  ClipboardList,
  Activity,
};

// ─── Status-Konfiguration ──────────────────────────────────────────────────
var AUFTRAG_BADGE = {
  offen:          'warning',
  geplant:        'primary',
  in_bearbeitung: 'info',
  abgeschlossen:  'success',
};
var AUFTRAG_LABEL = {
  offen:          'Offen',
  geplant:        'Geplant',
  in_bearbeitung: 'In Bearbeitung',
  abgeschlossen:  'Abgeschlossen',
};
var NOTIF_BADGE = {
  critical: 'danger',
  warning:  'warning',
  info:     'info',
  success:  'success',
};

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────
function gruss(stunde) {
  if (stunde < 12) return 'Guten Morgen';
  if (stunde < 17) return 'Guten Tag';
  return 'Guten Abend';
}

function eur(val) {
  return Number(val || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + ' €';
}

function fmtDatum(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

function zeitAgo(iso) {
  if (!iso) return '';
  var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return 'Gerade eben';
  if (diff < 60) return 'vor ' + diff + ' Min.';
  var h = Math.floor(diff / 60);
  if (h < 24)    return 'vor ' + h + ' Std.';
  var d = Math.floor(h / 24);
  return 'vor ' + d + ' Tag' + (d === 1 ? '' : 'en');
}

function heuteStr() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function startMonatStr() {
  var n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
}

function prozent(teil, gesamt) {
  if (!gesamt) return 0;
  return Math.round((teil / gesamt) * 100);
}

// ─── Fortschrittsbalken ───────────────────────────────────────────────────
function ProgressBar({ value, color }) {
  var breite = Math.min(100, Math.max(0, value));
  var farbe  = color || 'bg-primary-600';
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div
        className={'h-2 rounded-full transition-all duration-500 ' + farbe}
        style={{ width: breite + '%' }}
      />
    </div>
  );
}

// ─── Aktivitaets-Icon ─────────────────────────────────────────────────────
function AktivitaetsIcon({ name, color }) {
  var Icon = ICON_COMPONENTS[name] || Activity;
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 flex-shrink-0">
      <Icon className={'h-4 w-4 ' + (color || 'text-gray-400')} />
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────
export default function Dashboard() {
  var router = useRouter();
  var [laden, setLaden]     = useState(true);
  var [fehler, setFehler]   = useState(null);
  var [uhrzeit, setUhrzeit] = useState('');
  var [vorname, setVorname] = useState('');
  var [daten, setDaten]     = useState(null);
  var [retryKey, setRetryKey] = useState(0);

  // Live-Uhr
  useEffect(function() {
    function tick() {
      var now = new Date();
      setUhrzeit(
        now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      );
    }
    tick();
    var id = setInterval(tick, 60000);
    return function() { clearInterval(id); };
  }, []);

  // Datenabruf
  useEffect(function() {
    var aktiv = true;
    async function lade() {
      try {
        var authRes = await supabase.auth.getUser();
        var user = authRes.data && authRes.data.user;
        if (!user) { router.replace('/login'); return; }

        var meta = user.user_metadata || {};
        setVorname(meta.vorname || meta.name || '');

        var memberRes = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        var companyId = memberRes.data && memberRes.data.company_id;
        if (!companyId) { if (aktiv) setLaden(false); return; }

        var todayIso    = heuteStr();
        var monatsStart = startMonatStr();

        var [
          einsaetzeRes,
          offeneCountRes,
          kritischeRes,
          mitarbeiterRes,
          fahrzeugeRes,
          maschinenRes,
          offeneRechnungenRes,
          umsatzRes,
          angeboteRes,
          notifs,
          acts,
        ] = await Promise.all([
          // 1 — Heutige Einsaetze
          supabase.from('auftraege')
            .select('id, titel, status, einsatzdatum, nummer, erstellt_am')
            .eq('company_id', companyId)
            .eq('einsatzdatum', todayIso)
            .order('erstellt_am', { ascending: true }),

          // 2 — Offene Auftraege (Zaehlung)
          supabase.from('auftraege')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .neq('status', 'abgeschlossen'),

          // 3 — Kritische Aufgaben (ueberfaellig + offen)
          supabase.from('auftraege')
            .select('id, titel, status, einsatzdatum, nummer')
            .eq('company_id', companyId)
            .eq('status', 'offen')
            .not('einsatzdatum', 'is', null)
            .lt('einsatzdatum', todayIso)
            .order('einsatzdatum', { ascending: true })
            .limit(10),

          // 4 — Mitarbeiter
          supabase.from('mitarbeiter')
            .select('id, status')
            .eq('company_id', companyId),

          // 5 — Fahrzeuge
          supabase.from('fahrzeuge')
            .select('id, zustand')
            .eq('company_id', companyId),

          // 6 — Maschinen
          supabase.from('maschinen')
            .select('id, zustand')
            .eq('company_id', companyId),

          // 7 — Offene Rechnungen (kein limit — vollstaendige Summe + korrekter Count)
          supabase.from('rechnungen')
            .select('id, gesamtbetrag, betrag')
            .eq('company_id', companyId)
            .in('status', ['offen', 'gesendet']),

          // 8 — Monatsumsatz (bezahlt)
          supabase.from('rechnungen')
            .select('gesamtbetrag, betrag')
            .eq('company_id', companyId)
            .eq('status', 'bezahlt')
            .gte('bezahlt_am', monatsStart),

          // 9 — Offene Angebote (kein limit — vollstaendige Summe + korrekter Count)
          supabase.from('angebote')
            .select('id, gesamtbetrag')
            .eq('company_id', companyId)
            .in('status', ['offen', 'gesendet']),

          // 10 — Benachrichtigungen
          getNotifications(supabase, companyId, { limit: 20 }),

          // 11 — Aktivitaeten
          getActivities(supabase, companyId, { limit: 8 }),
        ]);

        if (!aktiv) return;

        setDaten({
          einsaetzeHeute:    einsaetzeRes.data ?? [],
          offeneAuftraege:   offeneCountRes.count ?? 0,
          kritischeAufgaben: kritischeRes.data ?? [],
          mitarbeiterList:   mitarbeiterRes.data ?? [],
          fahrzeugeList:     fahrzeugeRes.data ?? [],
          maschinenList:     maschinenRes.data ?? [],
          offeneRechnungen:  offeneRechnungenRes.data ?? [],
          umsatzDaten:       umsatzRes.data ?? [],
          angeboteDaten:     angeboteRes.data ?? [],
          notifications:     notifs ?? [],
          activities:        acts ?? [],
        });
        setLaden(false);
      } catch (err) {
        console.error('[Dashboard] Ladefehler:', err);
        if (aktiv) {
          setFehler('Fehler beim Laden der Dashboard-Daten.');
          setLaden(false);
        }
      }
    }
    lade();
    return function() { aktiv = false; };
  }, [router, retryKey]);

  // ─── Fehler-Zustand ───────────────────────────────────────────────────
  if (fehler) {
    return (
      <Page>
        <Page.Content>
          <ErrorState
            title="Verbindungsfehler"
            message={fehler}
            onRetry={function() { setFehler(null); setLaden(true); setRetryKey(function(k) { return k + 1; }); }}
            retryLabel="Neu laden"
          />
        </Page.Content>
      </Page>
    );
  }

  // ─── Abgeleitete Werte ────────────────────────────────────────────────
  var jetzt             = new Date();
  var stunde            = jetzt.getHours();

  var mitarbeiterAktiv  = (daten?.mitarbeiterList ?? []).filter(function(m) { return m.status === 'aktiv'; }).length;
  var mitarbeiterGesamt = (daten?.mitarbeiterList ?? []).length;

  var fahrzeugeAktiv    = (daten?.fahrzeugeList ?? []).filter(function(f) { return f.zustand === 'aktiv'; }).length;
  var fahrzeugeGesamt   = (daten?.fahrzeugeList ?? []).length;

  var maschinenAktiv    = (daten?.maschinenList ?? []).filter(function(m) { return m.zustand === 'aktiv'; }).length;
  var maschinenGesamt   = (daten?.maschinenList ?? []).length;

  var umsatzMonat       = (daten?.umsatzDaten ?? []).reduce(function(s, r) {
    return s + Number(r.gesamtbetrag || r.betrag || 0);
  }, 0);

  var offeneForderungen = (daten?.offeneRechnungen ?? []).reduce(function(s, r) {
    return s + Number(r.gesamtbetrag || r.betrag || 0);
  }, 0);

  var offeneAngeboteSumme = (daten?.angeboteDaten ?? []).reduce(function(s, a) {
    return s + Number(a.gesamtbetrag || 0);
  }, 0);

  var anzahlBezahlt     = (daten?.umsatzDaten ?? []).length;
  var durchschnitt      = anzahlBezahlt > 0 ? Math.round(umsatzMonat / anzahlBezahlt) : 0;

  var kritischeMeldungen = (daten?.notifications ?? []).filter(function(n) {
    return n.priority === 'critical';
  }).length;

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <Page>
      <Page.Content>
        <div className="space-y-8">

          {/* ── 1. Begrüßungsbereich ─────────────────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-8 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-primary-200 text-sm font-medium">
                  {uhrzeit && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {uhrzeit} Uhr
                    </span>
                  )}
                </p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                  {gruss(stunde)}{vorname ? ', ' + vorname : ''}.
                </h1>
                <p className="mt-1 text-primary-200 text-sm">
                  {laden
                    ? 'Daten werden geladen…'
                    : (daten?.einsaetzeHeute?.length || 0) === 0
                      ? 'Heute sind keine Einsaetze geplant.'
                      : (daten.einsaetzeHeute.length === 1
                          ? '1 Einsatz heute geplant.'
                          : daten.einsaetzeHeute.length + ' Einsaetze heute geplant.')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={function() { router.push('/dashboard-v2/auftraege/erstellen'); }}
                >
                  <Plus className="h-4 w-4" />
                  Auftrag
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={function() { router.push('/dashboard-v2/angebote/neu'); }}
                >
                  <Plus className="h-4 w-4" />
                  Angebot
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={function() { router.push('/dashboard-v2/rechnungen/neu'); }}
                >
                  <Plus className="h-4 w-4" />
                  Rechnung
                </Button>
              </div>
            </div>
          </div>

          {/* ── 2. KPI-Leiste ─────────────────────────────────────────── */}
          <div>
            {laden ? (
              <SkeletonKpiGrid count={8} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  title="Umsatz Monat"
                  value={eur(umsatzMonat)}
                  icon={Euro}
                  iconColor="text-emerald-600"
                  iconBg="bg-emerald-50"
                  trendLabel={'aus ' + anzahlBezahlt + ' Rechnungen'}
                  onClick={function() { router.push('/dashboard-v2/finanzen'); }}
                />
                <KpiCard
                  title="Offene Auftraege"
                  value={daten?.offeneAuftraege ?? 0}
                  icon={Wrench}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-50"
                  trendLabel="nicht abgeschlossen"
                  onClick={function() { router.push('/dashboard-v2/auftraege'); }}
                />
                <KpiCard
                  title="Einsaetze heute"
                  value={daten?.einsaetzeHeute?.length ?? 0}
                  icon={Calendar}
                  iconColor="text-primary-600"
                  iconBg="bg-primary-50"
                  trendLabel={fmtDatum(heuteStr())}
                />
                <KpiCard
                  title="Mitarbeiter aktiv"
                  value={mitarbeiterAktiv}
                  unit={'/ ' + mitarbeiterGesamt}
                  icon={Users}
                  iconColor="text-violet-600"
                  iconBg="bg-violet-50"
                  trendLabel="mit Status aktiv"
                  onClick={function() { router.push('/dashboard-v2/mitarbeiter'); }}
                />
                <KpiCard
                  title="Fahrzeuge verfuegbar"
                  value={fahrzeugeAktiv}
                  unit={'/ ' + fahrzeugeGesamt}
                  icon={Truck}
                  iconColor="text-sky-600"
                  iconBg="bg-sky-50"
                  trendLabel="mit Zustand aktiv"
                  onClick={function() { router.push('/dashboard-v2/fahrzeuge'); }}
                />
                <KpiCard
                  title="Maschinen verfuegbar"
                  value={maschinenAktiv}
                  unit={'/ ' + maschinenGesamt}
                  icon={Package}
                  iconColor="text-orange-600"
                  iconBg="bg-orange-50"
                  trendLabel="mit Zustand aktiv"
                  onClick={function() { router.push('/dashboard-v2/maschinen'); }}
                />
                <KpiCard
                  title="Offene Rechnungen"
                  value={daten?.offeneRechnungen?.length ?? 0}
                  icon={FileText}
                  iconColor="text-rose-600"
                  iconBg="bg-rose-50"
                  trendLabel={eur(offeneForderungen) + ' offen'}
                  onClick={function() { router.push('/dashboard-v2/rechnungen'); }}
                />
                <KpiCard
                  title="Kritische Meldungen"
                  value={kritischeMeldungen}
                  icon={AlertTriangle}
                  iconColor={kritischeMeldungen > 0 ? 'text-rose-600' : 'text-gray-400'}
                  iconBg={kritischeMeldungen > 0 ? 'bg-rose-50' : 'bg-gray-50'}
                  trendLabel={kritischeMeldungen > 0 ? 'Sofort handeln' : 'Keine Alarme'}
                />
              </div>
            )}
          </div>

          {/* ── 3 + 4: Kritische Aufgaben & Heute im Betrieb ─────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* 3. Kritische Aufgaben */}
            {laden ? (
              <SkeletonCard lines={4} />
            ) : (
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <Card.Title>Kritische Aufgaben</Card.Title>
                    {(daten?.kritischeAufgaben?.length ?? 0) > 0 && (
                      <Badge variant="danger" dot>
                        {daten.kritischeAufgaben.length} ueberfaellig
                      </Badge>
                    )}
                  </div>
                  <Card.Description>Offene Auftraege mit abgelaufenem Einsatzdatum</Card.Description>
                </Card.Header>
                <Card.Content>
                  {(daten?.kritischeAufgaben?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={CheckCircle}
                      title="Alles im Griff"
                      description="Keine ueberfaelligen Auftraege."
                    />
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {daten.kritischeAufgaben.map(function(a) {
                        var tageDiff = Math.floor(
                          (Date.now() - new Date(a.einsatzdatum).getTime()) / 86400000
                        );
                        var istKritisch = tageDiff >= 3;
                        return (
                          <li
                            key={a.id}
                            className="flex items-start justify-between gap-3 py-3 cursor-pointer hover:bg-gray-50 px-2 rounded-lg transition-colors"
                            onClick={function() { router.push('/dashboard-v2/auftraege/' + a.id); }}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {a.nummer ? '#' + a.nummer + ' — ' : ''}{a.titel || 'Ohne Titel'}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Faellig: {fmtDatum(a.einsatzdatum)} ({tageDiff} Tag{tageDiff === 1 ? '' : 'e'} ueberfaellig)
                              </p>
                            </div>
                            <Badge variant={istKritisch ? 'danger' : 'warning'} size="xs">
                              {AUFTRAG_LABEL[a.status] || a.status}
                            </Badge>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card.Content>
              </Card>
            )}

            {/* 4. Heute im Betrieb */}
            {laden ? (
              <SkeletonCard lines={4} />
            ) : (
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <Card.Title>Heute im Betrieb</Card.Title>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={function() { router.push('/dashboard-v2/auftraege'); }}
                    >
                      Alle ansehen
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Card.Description>Geplante Einsaetze fuer heute</Card.Description>
                </Card.Header>
                <Card.Content>
                  {(daten?.einsaetzeHeute?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="Keine Einsaetze heute"
                      description="Fuer heute sind keine Auftraege eingetragen."
                      action={function() { router.push('/dashboard-v2/auftraege/erstellen'); }}
                      actionLabel="Auftrag erstellen"
                    />
                  ) : (
                    <ol className="relative border-l border-gray-200 pl-5 space-y-4">
                      {daten.einsaetzeHeute.map(function(a) {
                        return (
                          <li
                            key={a.id}
                            className="cursor-pointer relative"
                            onClick={function() { router.push('/dashboard-v2/auftraege/' + a.id); }}
                          >
                            <div className="absolute -left-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary-500" />
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors">
                                  {a.nummer ? '#' + a.nummer + ' — ' : ''}{a.titel || 'Ohne Titel'}
                                </p>
                              </div>
                              <Badge variant={AUFTRAG_BADGE[a.status] || 'default'} size="xs">
                                {AUFTRAG_LABEL[a.status] || a.status}
                              </Badge>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </Card.Content>
              </Card>
            )}
          </div>

          {/* ── 5. Unternehmensauslastung ─────────────────────────────── */}
          {laden ? (
            <SkeletonCard lines={3} />
          ) : (
            <Card>
              <Card.Header>
                <Card.Title>Unternehmensauslastung</Card.Title>
                <Card.Description>Verfuegbarkeit von Mitarbeitern, Fahrzeugen und Maschinen</Card.Description>
              </Card.Header>
              <Card.Content>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {/* Mitarbeiter */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-violet-500" />
                      <span className="text-sm font-semibold text-gray-700">Mitarbeiter</span>
                    </div>
                    <ProgressBar
                      value={prozent(mitarbeiterAktiv, mitarbeiterGesamt)}
                      color="bg-violet-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{mitarbeiterAktiv} aktiv</span>
                      <span>{prozent(mitarbeiterAktiv, mitarbeiterGesamt)}% von {mitarbeiterGesamt}</span>
                    </div>
                  </div>
                  {/* Fahrzeuge */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-sky-500" />
                      <span className="text-sm font-semibold text-gray-700">Fahrzeuge</span>
                    </div>
                    <ProgressBar
                      value={prozent(fahrzeugeAktiv, fahrzeugeGesamt)}
                      color="bg-sky-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{fahrzeugeAktiv} verfuegbar</span>
                      <span>{prozent(fahrzeugeAktiv, fahrzeugeGesamt)}% von {fahrzeugeGesamt}</span>
                    </div>
                  </div>
                  {/* Maschinen */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-semibold text-gray-700">Maschinen</span>
                    </div>
                    <ProgressBar
                      value={prozent(maschinenAktiv, maschinenGesamt)}
                      color="bg-orange-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{maschinenAktiv} verfuegbar</span>
                      <span>{prozent(maschinenAktiv, maschinenGesamt)}% von {maschinenGesamt}</span>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {/* ── 6. Finanzen ──────────────────────────────────────────── */}
          {laden ? (
            <SkeletonCard lines={4} />
          ) : (
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <div>
                    <Card.Title>Finanzen</Card.Title>
                    <Card.Description>Umsatz und offene Posten im Ueberblick</Card.Description>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={function() { router.push('/dashboard-v2/finanzen'); }}
                  >
                    Details
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card.Header>
              <Card.Content>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Monatsumsatz
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
                      {eur(umsatzMonat)}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-600">{anzahlBezahlt} Rechnung{anzahlBezahlt === 1 ? '' : 'en'}</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                      Offene Forderungen
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-rose-700">
                      {eur(offeneForderungen)}
                    </p>
                    <p className="mt-0.5 text-xs text-rose-600">
                      {daten?.offeneRechnungen?.length ?? 0} Rechnung{(daten?.offeneRechnungen?.length ?? 0) === 1 ? '' : 'en'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Offene Angebote
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-amber-700">
                      {eur(offeneAngeboteSumme)}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-600">
                      {daten?.angeboteDaten?.length ?? 0} Angebot{(daten?.angeboteDaten?.length ?? 0) === 1 ? '' : 'e'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Durchschnittswert
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-blue-700">
                      {eur(durchschnitt)}
                    </p>
                    <p className="mt-0.5 text-xs text-blue-600">pro bezahlter Rechnung</p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {/* ── 7 + 8: Aktivitaeten & Benachrichtigungen ─────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* 7. Neueste Aktivitaeten */}
            {laden ? (
              <SkeletonCard lines={5} />
            ) : (
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <Card.Title>Neueste Aktivitaeten</Card.Title>
                    <Activity className="h-4 w-4 text-gray-400" />
                  </div>
                  <Card.Description>Letzte Aktionen im System</Card.Description>
                </Card.Header>
                <Card.Content>
                  {(daten?.activities?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={Activity}
                      title="Noch keine Aktivitaeten"
                      description="Aktionen erscheinen hier sobald Daten vorhanden sind."
                    />
                  ) : (
                    <ul className="divide-y divide-gray-50 space-y-0">
                      {daten.activities.map(function(a) {
                        return (
                          <li
                            key={a.id}
                            className="flex items-start gap-3 py-3"
                          >
                            <AktivitaetsIcon name={a.icon} color={a.color} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-800">
                                {a.title}
                              </p>
                              {a.description && (
                                <p className="truncate text-xs text-gray-500">{a.description}</p>
                              )}
                            </div>
                            <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                              {zeitAgo(a.timestamp)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card.Content>
              </Card>
            )}

            {/* 8. Benachrichtigungen */}
            {laden ? (
              <SkeletonCard lines={5} />
            ) : (
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <Card.Title>Benachrichtigungen</Card.Title>
                    {kritischeMeldungen > 0 && (
                      <Badge variant="danger" size="xs" dot>
                        {kritischeMeldungen} kritisch
                      </Badge>
                    )}
                  </div>
                  <Card.Description>Systemhinweise und Warnmeldungen</Card.Description>
                </Card.Header>
                <Card.Content>
                  {(daten?.notifications?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={Bell}
                      title="Keine Benachrichtigungen"
                      description="Alle Bereiche laufen ohne Hinweise."
                    />
                  ) : (
                    <ul className="divide-y divide-gray-50">
                      {daten.notifications.slice(0, 8).map(function(n) {
                        return (
                          <li key={n.id} className="flex items-start gap-3 py-3">
                            <div className={'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ' + (n.bgColor || 'bg-gray-50')}>
                              <Bell className={'h-4 w-4 ' + (n.color || 'text-gray-400')} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-gray-800 leading-snug">
                                  {n.title}
                                </p>
                                <Badge variant={NOTIF_BADGE[n.priority] || 'default'} size="xs">
                                  {n.priority === 'critical' ? 'Kritisch'
                                    : n.priority === 'warning' ? 'Warnung'
                                    : n.priority === 'success' ? 'OK'
                                    : 'Info'}
                                </Badge>
                              </div>
                              {n.message && (
                                <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                                  {n.message}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-gray-400">{zeitAgo(n.timestamp)}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card.Content>
              </Card>
            )}
          </div>

        </div>
      </Page.Content>
    </Page>
  );
}
