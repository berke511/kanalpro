'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Receipt,
  Zap,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  MapPin,
  ArrowRight,
  TrendingUp,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────────── */

function getDatumStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function fmtDatum(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function fmtUhrzeit(t) {
  if (!t) return null;
  return t.slice(0, 5);
}

function minZuText(min) {
  if (!min || min === 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function kundenName(k) {
  if (!k) return null;
  return k.firmenname || k.name || null;
}

function techName(t) {
  if (!t) return null;
  return `${t.vorname} ${t.nachname}`;
}

/* ─── Config ──────────────────────────────────────────────────── */

const PRIORITAET = {
  notfall: { label: 'Notfall', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500' },
  hoch:    { label: 'Hoch',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500' },
  normal:  { label: 'Normal',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-400' },
  niedrig: { label: 'Niedrig', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
};

const STATUS_CFG = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

/* ─── Kleine Komponenten ──────────────────────────────────────── */

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const palette = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
  };
  return (
    <div className={`rounded-2xl border p-4 ${palette[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, count, emptyLabel = 'Alle erledigt', children, laden }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
        <span className="text-xs text-gray-400">
          {laden ? '…' : count === 0 ? emptyLabel : `${count} Einträge`}
        </span>
      </div>
      {laden ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">Wird geladen…</div>
      ) : children}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="px-5 py-8 text-center">
      <p className="text-sm text-gray-400 dark:text-gray-500">{text}</p>
    </div>
  );
}

/* ─── Haupt-Komponente ────────────────────────────────────────── */

export default function Tagesabschluss() {
  const router = useRouter();

  const [companyId, setCompanyId] = useState(null);
  const [datum, setDatum]         = useState(getDatumStr(0));
  const [laden, setLaden]         = useState(true);
  const [auftraege, setAuftraege] = useState([]);
  const [einsatzDoks, setEinsatzDoks]         = useState([]);
  const [bereitsAbgerechnet, setBereitsAbgerechnet] = useState(new Set());

  /* Firma laden */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      setCompanyId(data?.company_id ?? null);
    }
    load();
  }, [router]);

  /* Tages-Daten laden */
  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLaden(true);
    try {
      const { data: auftragData } = await supabase
        .from('auftraege')
        .select([
          'id, titel, status, uhrzeit, dauer_minuten, prioritaet, adresse',
          'kunden:kunde_id(name, firmenname)',
          'mitarbeiter:techniker_id(vorname, nachname)',
        ].join(', '))
        .eq('company_id', companyId)
        .eq('datum', datum)
        .order('uhrzeit', { ascending: true, nullsFirst: false });

      const liste = auftragData ?? [];
      setAuftraege(liste);

      if (liste.length === 0) {
        setEinsatzDoks([]);
        setBereitsAbgerechnet(new Set());
        return;
      }

      const ids = liste.map(a => a.id);

      /* Einsatz-Dokumentation */
      const { data: dokData } = await supabase
        .from('einsatz_dokumentation')
        .select('id, auftrag_id, status, dokumentiert_at')
        .in('auftrag_id', ids)
        .eq('company_id', companyId);

      setEinsatzDoks(dokData ?? []);

      /* Rechnungen — auftrag_id-Join (graceful fallback wenn Spalte fehlt) */
      try {
        const { data: rechnData } = await supabase
          .from('rechnungen')
          .select('auftrag_id')
          .in('auftrag_id', ids);
        setBereitsAbgerechnet(
          new Set((rechnData ?? []).map(r => r.auftrag_id).filter(Boolean))
        );
      } catch {
        setBereitsAbgerechnet(new Set());
      }
    } finally {
      setLaden(false);
    }
  }, [companyId, datum]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Abgeleitete Werte ───────────────────────────────────────── */

  const dokByAuftrag = Object.fromEntries(einsatzDoks.map(d => [d.auftrag_id, d]));

  const offeneEinsaetze        = auftraege.filter(a => a.status !== 'abgeschlossen');
  const abgeschlossen          = auftraege.filter(a => a.status === 'abgeschlossen');
  const notdienste             = auftraege.filter(a => a.prioritaet === 'notfall');
  const offeneNotdienste       = notdienste.filter(a => a.status !== 'abgeschlossen');

  const fehlendeEinsatzberichte = abgeschlossen.filter(a => {
    const dok = dokByAuftrag[a.id];
    return !dok || dok.status !== 'dokumentiert';
  });

  const rechnungsbereit = abgeschlossen.filter(a => {
    const dok = dokByAuftrag[a.id];
    return dok?.status === 'dokumentiert' && !bereitsAbgerechnet.has(a.id);
  });

  const gesamtMinuten = auftraege.reduce((s, a) => s + (a.dauer_minuten ?? 0), 0);
  const abgMitDauer   = abgeschlossen.filter(a => a.dauer_minuten);
  const durchschnitt  = abgMitDauer.length
    ? Math.round(abgMitDauer.reduce((s, a) => s + a.dauer_minuten, 0) / abgMitDauer.length)
    : 0;
  const dokuQuote = abgeschlossen.length > 0
    ? `${Math.round(((abgeschlossen.length - fehlendeEinsatzberichte.length) / abgeschlossen.length) * 100)}%`
    : '—';

  /* ── Date helpers ────────────────────────────────────────────── */

  const isHeute   = datum === getDatumStr(0);
  const isGestern = datum === getDatumStr(-1);

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tagesabschluss</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Überblick und Abschluss aller Einsätze des gewählten Tages.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={laden}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${laden ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {/* Datum-Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setDatum(prev => addDays(prev, -1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
          <Calendar className="w-3.5 h-3.5" />
          {fmtDatum(datum)}
        </span>

        <button
          onClick={() => setDatum(prev => addDays(prev, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 flex-wrap">
          {!isHeute && (
            <button
              onClick={() => setDatum(getDatumStr(0))}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Heute
            </button>
          )}
          {!isGestern && (
            <button
              onClick={() => setDatum(getDatumStr(-1))}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
            >
              Gestern
            </button>
          )}
          <input
            type="date"
            value={datum}
            onChange={e => e.target.value && setDatum(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {laden ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse bg-gray-50 dark:bg-gray-800 h-24" />
          ))
        ) : (
          <>
            <KpiCard
              icon={ClipboardList}
              label="Einsätze heute"
              value={auftraege.length}
              color="blue"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Abgeschlossen"
              value={abgeschlossen.length}
              color="green"
            />
            <KpiCard
              icon={Clock}
              label="Noch offen"
              value={offeneEinsaetze.length}
              color={offeneEinsaetze.length > 0 ? 'yellow' : 'green'}
            />
            <KpiCard
              icon={AlertTriangle}
              label="Fehlende Berichte"
              value={fehlendeEinsatzberichte.length}
              color={fehlendeEinsatzberichte.length > 0 ? 'orange' : 'green'}
            />
            <KpiCard
              icon={Receipt}
              label="Rechnungen bereit"
              value={rechnungsbereit.length}
              color={rechnungsbereit.length > 0 ? 'indigo' : 'green'}
            />
            <KpiCard
              icon={Zap}
              label="Offene Notdienste"
              value={offeneNotdienste.length}
              color={offeneNotdienste.length > 0 ? 'red' : 'green'}
            />
          </>
        )}
      </div>

      {/* Liste 1 – Offene Einsätze */}
      <SectionCard
        title="Offene Einsätze"
        icon={Clock}
        count={offeneEinsaetze.length}
        emptyLabel="Alle erledigt"
        laden={laden}
      >
        {offeneEinsaetze.length === 0 ? (
          <EmptyState text="Alle Einsätze sind abgeschlossen." />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {offeneEinsaetze.map(a => {
              const prio = PRIORITAET[a.prioritaet] ?? PRIORITAET.normal;
              const stat = STATUS_CFG[a.status] ?? STATUS_CFG.offen;
              const kd   = kundenName(a.kunden);
              const tech = techName(a.mitarbeiter);
              const zeit = fmtUhrzeit(a.uhrzeit);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                  onClick={() => router.push(`/dashboard/auftraege/${a.id}`)}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${prio.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.titel}</span>
                      <Badge className={stat.cls}>{stat.label}</Badge>
                      {a.prioritaet && a.prioritaet !== 'normal' && (
                        <Badge className={prio.cls}>{prio.label}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                      {zeit && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {zeit}
                        </span>
                      )}
                      {kd && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {kd}
                        </span>
                      )}
                      {a.adresse && (
                        <span className="flex items-center gap-1 max-w-[200px] truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{a.adresse}</span>
                        </span>
                      )}
                      {tech && <span>{tech}</span>}
                    </div>
                  </div>
     0            <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Liste 2 – Fehlende Einsatzberichte */}
      <SectionCard
        title="Fehlende Einsatzberichte"
        icon={AlertTriangle}
        count={fehlendeEinsatzberichte.length}
        emptyLabel="Alle dokumentiert"
        laden={laden}
      >
        {fehlendeEinsatzberichte.length === 0 ? (
          <EmptyState text="Alle abgeschlossenen Aufträge sind dokumentiert." />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {fehlendeEinsatzberichte.map(a => {
              const kd   = kundenName(a.kunden);
              const tech = techName(a.mitarbeiter);
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.titel}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                      {kd   && <span className="flex items-center gap-1"><User className="w-3 h-3" />{kd}</span>}
                      {tech && <span>{tech}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?id=${a.id}`)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-xs font-medium hover:bg-orange-100 dark:hover:bg-orange-900/50 transition"
                  >
                    <FileText className="w-3 h-3" />
                    Einsatzbericht
                  </button>
                </div>
              );
            })}
   0      </div>
        )}
      </SectionCard>

      {/* Liste 3 – Rechnungen erstellbar */}
      <SectionCard
        title="Rechnungen erstellbar"
        icon={Receipt}
        count={rechnungsbereit.length}
        emptyLabel="Keine bereit"
        laden={laden}
      >
        {rechnungsbereit.length === 0 ? (
          <EmptyState text="Keine Aufträge bereit zur Abrechnung." />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {rechnungsbereit.map(a => {
              const kd   = kundenName(a.kunden);
              const tech = techName(a.mitarbeiter);
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.titel}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                      {kd   && <span className="flex items-center gap-1"><User className="w-3 h-3" />{kd}</span>}
                      {tech && <span>{tech}</span>}
                      {a.dauer_minuten && <span>{minZuText(a.dauer_minuten)}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/dashboard/rechnungen/neu')}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                  >
                    <Receipt className="w-3 h-3" />
                    Rechnung erstellen
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Liste 4 – Offene Notdienste */}
      <SectionCard
        title="Offene Notdienste"
        icon={Zap}
        count={offeneNotdienste.length}
        emptyLabel="Alle erledigt"
        laden={laden}
      >
        {offeneNotdienste.length === 0 ? (
          <EmptyState text="Alle Notdienste sind abgeschlossen." />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {offeneNotdienste.map(a => {
              const stat = STATUS_CFG[a.status] ?? STATUS_CFG.offen;
              const kd   = kundenName(a.kunden);
              const tech = techName(a.mitarbeiter);
              const zeit = fmtUhrzeit(a.uhrzeit);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                  onClick={() => router.push(`/dashboard/auftraege/${a.id}`)}
                >
                  <Zap className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.titel}</span>
                      <Badge className={stat.cls}>{stat.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                      {zeit && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{zeit}</span>}
                      {kd   && <span className="flex items-center gap-1"><User className="w-3 h-3" />{kd}</span>}
                      {a.adresse && (
                        <span className="flex items-center gap-1 max-w-[200px] truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{a.adresse}</span>
                        </span>
                      )}
                      {tech && <span>{tech}</span>}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Liste 5 – Tagesstatistik */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 dark:border-gray-700">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Tagesstatistik</span>
        </div>
        {laden ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Wird geladen…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-50 dark:divide-gray-700">
            {[
              { label: 'Erledigte Aufträge',  value: abgeschlossen.length },
              { label: 'Offene Aufträge',      value: offeneEinsaetze.length },
              { label: 'Notdienste gesamt',    value: notdienste.length },
              { label: 'Gesamtarbeitszeit',    value: minZuText(gesamtMinuten) },
              { label: 'Ø Einsatzdauer',       value: durchschnitt > 0 ? minZuText(durchschnitt) : '—' },
              { label: 'Dokumentationsquote',  value: dokuQuote },
            ].map((s, i) => (
              <div key={i} className="px-5 py-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
