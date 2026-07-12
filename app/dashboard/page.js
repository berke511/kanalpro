'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  FileX,
  Receipt,
  Truck,
  Users,
  TrendingUp,
  CheckCircle,
  Zap,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import {
  KpiCard,
  SecondaryButton,
  PageSection,
  EmptyState,
} from '@/components/ui/KanalProUI';

// ============================================================
// HILFSFUNKTION: Company-ID ermitteln
// ============================================================
async function getCompanyId(userId) {
  try {
    const { data } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', userId)
      .single();
    return data?.company_id ?? null;
  } catch {
    return null;
  }
}

// ============================================================
// SMART RULES ENGINE — SX-001
// ============================================================

// Regel 1: Notdienst heute unbesetzt
async function regelNotdienstUnbesetzt(companyId, heute) {
  try {
    const { count } = await supabase
      .from('auftraege')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('notdienst', true)
      .eq('datum', heute)
      .is('techniker_id', null);
    const c = count ?? 0;
    return {
      id: 'notdienst_unbesetzt',
      priority: 'critical',
      icon: AlertTriangle,
      title: 'Notdienst unbesetzt',
      description: `${c} Notdienst-Auftrag${c !== 1 ? 'e haben' : ' hat'} heute keinen Techniker`,
      count: c,
      cta: 'Jetzt zuweisen',
      href: '/dashboard/disposition/tagesplanung',
      show: c > 0,
    };
  } catch {
    return { show: false };
  }
}

// Regel 2: Auftraege aelter als 3 Tage offen
async function regelAuftraegeUeberfaellig(companyId) {
  try {
    const grenz = new Date();
    grenz.setDate(grenz.getDate() - 3);
    const grenzDatum = grenz.toISOString().split('T')[0];
    const { count } = await supabase
      .from('auftraege')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'offen')
      .lt('datum', grenzDatum);
    const c = count ?? 0;
    return {
      id: 'auftraege_ueberfaellig',
      priority: 'warning',
      icon: Clock,
      title: 'Aufträge überfällig',
      description: `${c} offene${c !== 1 ? 'r' : ''} Auftrag${c !== 1 ? 'e sind' : ' ist'} seit über 3 Tagen offen`,
      count: c,
      cta: 'Aufträge prüfen',
      href: '/dashboard/auftraege',
      show: c > 0,
    };
  } catch {
    return { show: false };
  }
}

// Regel 3: Fehlende Einsatzberichte (abgeschlossene ohne interne Notiz)
async function regelFehlendeEinsatzberichte(companyId) {
  try {
    const { count } = await supabase
      .from('auftraege')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'abgeschlossen')
      .is('interne_notiz', null);
    const c = count ?? 0;
    return {
      id: 'fehlende_einsatzberichte',
      priority: 'warning',
      icon: FileX,
      title: 'Fehlende Einsatzberichte',
      description: `${c} abgeschlossene${c !== 1 ? 'n' : 'm'} Auftrag${c !== 1 ? 'en fehlt' : ' fehlt'} die interne Dokumentation`,
      count: c,
      cta: 'Berichte nachtragen',
      href: '/dashboard/auftraege',
      show: c > 0,
    };
  } catch {
    return { show: false };
  }
}

// Regel 4: Rechnungen bereit (abgeschlossene ohne Rechnung)
async function regelRechnungenBereit(companyId) {
  try {
    const { data: abgeschlossen } = await supabase
      .from('auftraege')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'abgeschlossen');
    if (!abgeschlossen || abgeschlossen.length === 0) return { show: false };
    const auftragIds = abgeschlossen.map((a) => a.id);
    const { data: rechnungen } = await supabase
      .from('rechnungen')
      .select('auftrag_id')
      .in('auftrag_id', auftragIds);
    const mitRechnung = new Set((rechnungen ?? []).map((r) => r.auftrag_id));
    const c = abgeschlossen.filter((a) => !mitRechnung.has(a.id)).length;
    return {
      id: 'rechnungen_bereit',
      priority: 'info',
      icon: Receipt,
      title: 'Rechnungen bereit',
      description: `${c} abgeschlossene${c !== 1 ? 'r' : ''} Auftrag${c !== 1 ? 'e können' : ' kann'} jetzt abgerechnet werden`,
      count: c,
      cta: 'Rechnungen erstellen',
      href: '/dashboard/rechnungen',
      show: c > 0,
    };
  } catch {
    return { show: false };
  }
}

// Regel 5: Fahrzeuge ausser Betrieb
async function regelFahrzeugeAusserBetrieb(companyId) {
  try {
    const { count } = await supabase
      .from('fahrzeuge')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('zustand', 'ausser_betrieb');
    const c = count ?? 0;
    return {
      id: 'fahrzeuge_ausser_betrieb',
      priority: 'warning',
      icon: Truck,
      title: 'Fahrzeuge außer Betrieb',
      description: `${c} Fahrzeug${c !== 1 ? 'e sind' : ' ist'} aktuell nicht einsatzbereit`,
      count: c,
      cta: 'Fahrzeuge verwalten',
      href: '/dashboard/fahrzeuge',
      show: c > 0,
    };
  } catch {
    return { show: false };
  }
}

// Regel 6: Kapazitaetsengpass heute
async function regelKapazitaetsengpass(companyId, heute) {
  try {
    const [{ count: einsaetze }, { count: techniker }] = await Promise.all([
      supabase
        .from('auftraege')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('datum', heute),
      supabase
        .from('company_members')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('role', ['techniker', 'admin', 'inhaber'])
        .eq('is_active', true),
    ]);
    const e = einsaetze ?? 0;
    const t = Math.max(techniker ?? 0, 1);
    const show = e > t;
    return {
      id: 'kapazitaetsengpass',
      priority: 'critical',
      icon: Users,
      title: 'Kapazitätsengpass heute',
      description: `${e} Einsätze heute, aber nur ${t} Techniker verfügbar`,
      count: e - t,
      cta: 'Disposition öffnen',
      href: '/dashboard/disposition/tagesplanung',
      show,
    };
  } catch {
    return { show: false };
  }
}

// Regel 7: Offene Rechnungen (ausstehende Forderungen)
async function regelOffeneRechnungen(companyId) {
  try {
    const { data } = await supabase
      .from('rechnungen')
      .select('positionen, steuersatz')
      .eq('company_id', companyId)
      .eq('status', 'offen');
    const c = (data ?? []).length;
    const summe = (data ?? []).reduce((total, r) => {
      const netto = (r.positionen || []).reduce(
        (s, p) => s + (Number(p.menge) || 1) * (Number(p.preis) || 0),
        0
      );
      return total + netto * (1 + (parseFloat(r.steuersatz) || 19) / 100);
    }, 0);
    const sumFormatiert = summe.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
    });
    return {
      id: 'offene_rechnungen',
      priority: 'info',
      icon: TrendingUp,
      title: 'Offene Forderungen',
      description: `${c} offene Rechnung${c !== 1 ? 'en' : ''} — ${sumFormatiert} ausstehend`,
      count: c,
      cta: 'Rechnungen prüfen',
      href: '/dashboard/rechnungen',
      show: c > 0,
    };
  } catch {
    return { show: false };
  }
}

// ============================================================
// PRIORITY COLOR MAP
// ============================================================
const PRIORITY_COLORS = {
  critical: {
    card: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700',
    icon: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  warning: {
    card: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700',
    icon: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  info: {
    card: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

// ============================================================
// DASHBOARD COMPONENT
// ============================================================
export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    kunden: 0,
    offen: 0,
    abgeschlossen: 0,
    heuteEinsaetze: 0,
  });
  const [alerts, setAlerts] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingSmart, setIsLoadingSmart] = useState(true);

  const heute = new Date().toISOString().split('T')[0];
  const wochentag = new Date().toLocaleDateString('de-DE', { weekday: 'long' });
  const datumFormatiert = new Date().toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    async function loadAll() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Basis-KPIs parallel laden
      const [
        { count: kunden },
        { count: offen },
        { count: abgeschlossen },
        { count: heuteEinsaetze },
      ] = await Promise.all([
        supabase
          .from('kunden')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('auftraege')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'offen'),
        supabase
          .from('auftraege')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'abgeschlossen'),
        supabase
          .from('auftraege')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('datum', heute),
      ]);
      setStats({
        kunden: kunden ?? 0,
        offen: offen ?? 0,
        abgeschlossen: abgeschlossen ?? 0,
        heuteEinsaetze: heuteEinsaetze ?? 0,
      });
      setIsLoadingStats(false);

      // Company-ID ermitteln
      const companyId = await getCompanyId(user.id);
      if (!companyId) {
        setIsLoadingSmart(false);
        return;
      }

      // Alle 7 Smart Rules parallel ausführen
      const results = await Promise.all([
        regelNotdienstUnbesetzt(companyId, heute),
        regelAuftraegeUeberfaellig(companyId),
        regelFehlendeEinsatzberichte(companyId),
        regelRechnungenBereit(companyId),
        regelFahrzeugeAusserBetrieb(companyId),
        regelKapazitaetsengpass(companyId, heute),
        regelOffeneRechnungen(companyId),
      ]);

      const priorityOrder = { critical: 0, warning: 1, info: 2 };
      const activeAlerts = results
        .filter((r) => r.show)
        .sort(
          (a, b) =>
            (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
        )
        .slice(0, 5);

      setAlerts(activeAlerts);
      setIsLoadingSmart(false);
    }
    loadAll();
  }, []);

  // Smart Summary Text
  function getSummaryText() {
    if (isLoadingSmart) return '';
    const critical = alerts.filter((a) => a.priority === 'critical').length;
    const warning = alerts.filter((a) => a.priority === 'warning').length;
    const info = alerts.filter((a) => a.priority === 'info').length;
    if (alerts.length === 0) {
      return 'Alles im grünen Bereich. Keine dringenden Aufgaben heute.';
    }
    const parts = [];
    if (critical > 0)
      parts.push(
        `${critical} Bereich${critical > 1 ? 'e benötigen' : ' benötigt'} kritische Aufmerksamkeit`
      );
    if (warning > 0)
      parts.push(
        `${warning} Warnung${warning > 1 ? 'en liegen' : ' liegt'} vor`
      );
    if (info > 0)
      parts.push(
        `${info} Hinweis${info > 1 ? 'e sind' : ' ist'} verfügbar`
      );
    return 'Heute: ' + parts.join(' · ') + '.';
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* HERO */}
      <div className="mb-8">
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">
          {wochentag}, {datumFormatiert}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Guten Morgen
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Ihr digitaler Betriebsassistent analysiert Ihre heutigen Aufgaben.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Kunden gesamt"
          value={stats.kunden}
          icon={Users}
          color="blue"
          loading={isLoadingStats}
        />
        <KpiCard
          label="Offene Aufträge"
          value={stats.offen}
          icon={Clock}
          color="yellow"
          loading={isLoadingStats}
        />
        <KpiCard
          label="Abgeschlossen"
          value={stats.abgeschlossen}
          icon={CheckCircle}
          color="green"
          loading={isLoadingStats}
        />
        <KpiCard
          label="Einsätze heute"
          value={stats.heuteEinsaetze}
          icon={Zap}
          color="orange"
          loading={isLoadingStats}
        />
      </div>

      {/* SMART SUMMARY */}
      {isLoadingSmart ? (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-6 h-12 animate-pulse" />
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getSummaryText()}
          </p>
        </div>
      )}

      {/* SMART EMPFEHLUNGEN */}
      {!isLoadingSmart && alerts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => router.push(alert.href)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              → {alert.cta}
            </button>
          ))}
        </div>
      )}

      {/* SMART FOKUS-KARTEN */}
      <PageSection title="Heute im Fokus">
        {isLoadingSmart ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Alles erledigt"
            description="Keine offenen Aufgaben. Heute läuft alles nach Plan."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {alerts.map((alert) => {
              const colors =
                PRIORITY_COLORS[alert.priority] ?? PRIORITY_COLORS.info;
              const IconComp = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`border rounded-xl p-4 flex items-center gap-4 ${colors.card}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colors.icon}`}
                  >
                    <IconComp size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {alert.title}
                      </p>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}
                      >
                        {alert.count}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {alert.description}
                    </p>
                  </div>
                  <SecondaryButton
                    className="shrink-0"
                    onClick={() => router.push(alert.href)}
                  >
                    {alert.cta}
                  </SecondaryButton>
                </div>
              );
            })}
          </div>
        )}
      </PageSection>

      {/* SCHNELLZUGRIFF */}
      <div className="mt-8">
        <PageSection title="Schnellzugriff">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/kunden/neu"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm"
            >
              + Neuer Kunde
            </Link>
            <Link
              href="/dashboard/auftraege/neu"
              className="px-5 py-2.5 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
            >
              + Neuer Auftrag
            </Link>
            <Link
              href="/dashboard/rechnungen"
              className="px-5 py-2.5 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
            >
              Rechnungen
            </Link>
          </div>
        </PageSection>
      </div>
    </div>
  );
}
