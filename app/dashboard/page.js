'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

// ── Widget-Sichtbarkeit pro Rolle ────────────────────────────────────────────
const WIDGET_ACCESS = {
  umsatz:            ['inhaber', 'administrator'],
  rechnungen:        ['inhaber', 'administrator', 'buero'],
  auftraege:         ['inhaber', 'administrator', 'disponent', 'buero'],
  mitarbeiter:       ['inhaber', 'administrator', 'disponent', 'buero'],
  fahrzeuge:         ['inhaber', 'administrator', 'disponent', 'buero'],
  benachrichtigungen:['inhaber', 'administrator', 'disponent', 'buero', 'techniker', 'fahrer'],
};

function canSee(role, widget) {
  if (!role) return true; // fallback: alles zeigen wenn Rolle unbekannt
  return WIDGET_ACCESS[widget]?.includes(role) ?? true;
}

// ── Formatierung ─────────────────────────────────────────────────────────────
function fmtEur(n) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function pct(a, total) {
  if (!total || !a) return 0;
  return Math.min(100, Math.round((a / total) * 100));
}

// ── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, total, centerLabel = 'gesamt' }) {
  const R = 36, CX = 44, CY = 44, STROKE = 10;
  const circ = 2 * Math.PI * R;
  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

  let cumulative = 0;
  const arcs = total > 0
    ? segments.filter(s => s.value > 0).map((seg, i) => {
        const len = (seg.value / total) * circ;
        const offset = circ - cumulative;
        cumulative += len;
        return { ...seg, len, offset, color: COLORS[i % COLORS.length] };
      })
    : [];

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }} className="w-24 h-24">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f3f4f6" strokeWidth={STROKE} />
        {arcs.length === 0 && (
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e5e7eb" strokeWidth={STROKE} />
        )}
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeDasharray={`${arc.len} ${circ - arc.len}`}
            strokeDashoffset={arc.offset}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-lg font-bold text-gray-900 leading-none">{total}</span>
        <span className="text-xs text-gray-400 mt-0.5">{centerLabel}</span>
      </div>
    </div>
  );
}

// ── Line Chart ──────────────────────────────────────────────────────────────
function LineChart({ data, months }) {
  const W = 600, H = 120;
  const PAD = { t: 10, b: 24, l: 4, r: 4 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = Math.max(...data, 1);
  const n = months.length;

  const xs = months.map((_, i) => PAD.l + (i / (n - 1)) * innerW);
  const ys = data.map(v => PAD.t + innerH - (v / max) * innerH);
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const area = `${xs[0]},${PAD.t + innerH} ${pts} ${xs[n - 1]},${PAD.t + innerH}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f}
          x1={PAD.l} x2={W - PAD.r}
          y1={PAD.t + innerH * (1 - f)} y2={PAD.t + innerH * (1 - f)}
          stroke="#f3f4f6" strokeWidth="1"
        />
      ))}
      {/* Area */}
      <polygon points={area} fill="url(#areaGrad)" />
      {/* Line */}
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3.5" fill="#3b82f6" stroke="white" strokeWidth="2" />
      ))}
      {/* Labels */}
      {months.map((m, i) => (
        <text key={i} x={xs[i]} y={H - 4} textAnchor="middle" fill="#9ca3af" fontSize="9">{m}</text>
      ))}
    </svg>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon, trend, accent, href, loading }) {
  const inner = (
    <div className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition h-full ${
      accent === 'red' ? 'border-red-100 bg-red-50' :
      accent === 'green' ? 'border-green-100 bg-green-50' :
      'border-gray-100'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend != null && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">
        {loading
          ? <span className="inline-block w-14 h-6 bg-gray-100 rounded animate-pulse" />
          : value}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );

  return href
    ? <Link href={href} className="block h-full">{inner}</Link>
    : inner;
}

// ── Status Legend Row ─────────────────────────────────────────────────────────
function LegendRow({ label, value, total, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          <span className="text-sm font-semibold text-gray-900">{value}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${pct(value, total)}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [role, setRole] = useState(null);
  const [laden, setLaden] = useState(true);

  // Aufträge
  const [auftrag, setAuftrag] = useState({
    total: 0, offen: 0, inBearbeitung: 0, abgeschlossen: 0, heute: 0, ueberfaellig: 0,
  });
  // Kunden
  const [kundenTotal, setKundenTotal] = useState(0);
  // Mitarbeiter
  const [mitarbeiter, setMitarbeiter] = useState({ total: 0 });
  // Rechnungen (Modul noch nicht vorhanden)
  const [rechnung] = useState({ offen: 0, bezahlt: 0, ueberfaellig: 0, betrag: 0 });
  // Fahrzeuge (Modul noch nicht vorhanden)
  const [fahrzeug] = useState({ total: 0, imEinsatz: 0, verfuegbar: 0, werkstatt: 0 });
  // Umsatz
  const [umsatz] = useState({ monat: 0, jahr: 0, verlauf: Array(12).fill(0) });
  // Ereignisse
  const [events, setEvents] = useState([]);

  const MONATE = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Rolle + Company laden
      const { data: member } = await supabase
        .from('company_members')
        .select('role, company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const userRole = member?.role ?? 'inhaber'; // Fallback: alles zeigen
      setRole(userRole);

      // Aufträge laden
      const { data: auftraegeData } = await supabase
        .from('auftraege')
        .select('id, status, datum, titel, erstellt_am')
        .eq('user_id', user.id)
        .order('erstellt_am', { ascending: false });

      if (auftraegeData) {
        const heute = new Date(); heute.setHours(0, 0, 0, 0);
        const morgen = new Date(heute); morgen.setDate(morgen.getDate() + 1);
        const offen        = auftraegeData.filter(a => a.status === 'offen').length;
        const inBearbeitung= auftraegeData.filter(a => a.status === 'in_bearbeitung').length;
        const abgeschlossen= auftraegeData.filter(a => a.status === 'abgeschlossen').length;
        const heuteCount   = auftraegeData.filter(a => {
          if (!a.datum) return false;
          const d = new Date(a.datum); d.setHours(0,0,0,0);
          return d.getTime() === heute.getTime();
        }).length;
        const ueberfaellig = auftraegeData.filter(a => {
          if (a.status === 'abgeschlossen') return false;
          if (!a.datum) return false;
          return new Date(a.datum) < heute;
        }).length;

        setAuftrag({ total: auftraegeData.length, offen, inBearbeitung, abgeschlossen, heute: heuteCount, ueberfaellig });

        // Ereignisse: neueste 8 Aufträge
        setEvents(auftraegeData.slice(0, 8).map(a => ({
          icon: a.status === 'abgeschlossen' ? '✅' : a.status === 'in_bearbeitung' ? '🔧' : '📋',
          text: a.titel ?? '(kein Titel)',
          zeit: a.erstellt_am,
          status: a.status,
        })));
      }

      // Kunden
      const { count: kCount } = await supabase
        .from('kunden')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setKundenTotal(kCount ?? 0);

      // Mitarbeiter (company_members)
      if (member?.company_id) {
        const { count: mCount } = await supabase
          .from('company_members')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', member.company_id)
          .eq('is_active', true);
        setMitarbeiter({ total: mCount ?? 0 });
      }

      setLaden(false);
    }
    init();
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-8">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Übersicht</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard/kunden/neu"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            + Neuer Kunde
          </Link>
          <Link href="/dashboard/auftraege/neu"
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            + Neuer Auftrag
          </Link>
        </div>
      </div>

      {/* ══ BEREICH 1: UMSATZ & FINANZEN (inhaber / administrator) ══════════ */}
      {canSee(role, 'umsatz') && (
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Umsatz & Finanzen</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <KPICard label="Monatsumsatz" value={fmtEur(umsatz.monat)} icon="💰"
              sub="Laufender Monat" href="/dashboard/rechnungen" loading={laden} />
            <KPICard label="Jahresumsatz" value={fmtEur(umsatz.jahr)} icon="📈"
              sub={String(new Date().getFullYear())} href="/dashboard/rechnungen" loading={laden} />
            <KPICard label="Rechnungen gesamt"
              value={rechnung.offen + rechnung.bezahlt + rechnung.ueberfaellig}
              icon="🧾" href="/dashboard/rechnungen" loading={laden} />
          </div>
          {/* Umsatz-Diagramm */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-900">Umsatzverlauf {new Date().getFullYear()}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Monatlich aus dem Rechnungsmodul</p>
              </div>
              <span className="text-xs bg-amber-50 text-amber-600 px-3 py-1 rounded-lg font-medium">
                Rechnungsmodul bald verfügbar
              </span>
            </div>
            <LineChart data={umsatz.verlauf} months={MONATE} />
          </div>
        </section>
      )}

      {/* ══ BEREICH 2: AUFTRÄGE ═════════════════════════════════════════════ */}
      {canSee(role, 'auftraege') && (
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Aufträge</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <KPICard label="Offen" value={auftrag.offen} icon="🔓"
              href="/dashboard/auftraege" loading={laden} />
            <KPICard label="Heute fällig" value={auftrag.heute} icon="📅"
              href="/dashboard/auftraege" loading={laden} />
            <KPICard label="Überfällig" value={auftrag.ueberfaellig} icon="⏰"
              accent={auftrag.ueberfaellig > 0 ? 'red' : undefined}
              href="/dashboard/auftraege" loading={laden} />
            <KPICard label="Gesamt" value={auftrag.total} icon="📋"
              href="/dashboard/auftraege" loading={laden} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-5">Auftragsstatus</h3>
            <div className="flex items-center gap-8">
              <DonutChart
                segments={[
                  { label: 'Offen',           value: auftrag.offen },
                  { label: 'In Bearbeitung',  value: auftrag.inBearbeitung },
                  { label: 'Abgeschlossen',   value: auftrag.abgeschlossen },
                ]}
                total={auftrag.total}
                centerLabel="Aufträge"
              />
              <div className="flex-1 space-y-3">
                <LegendRow label="Offen"         value={auftrag.offen}         total={auftrag.total} color="bg-blue-500" />
                <LegendRow label="In Bearbeitung" value={auftrag.inBearbeitung} total={auftrag.total} color="bg-amber-500" />
                <LegendRow label="Abgeschlossen"  value={auftrag.abgeschlossen} total={auftrag.total} color="bg-emerald-500" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══ BEREICH 3: RECHNUNGEN (inhaber / administrator / buero) ═════════ */}
      {canSee(role, 'rechnungen') && (
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Rechnungen</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <KPICard label="Offene Rechnungen" value={rechnung.offen} icon="📄"
              href="/dashboard/rechnungen" loading={laden} />
            <KPICard label="Offener Betrag" value={fmtEur(rechnung.betrag)} icon="💶"
              href="/dashboard/rechnungen" loading={laden} />
            <KPICard label="Überfällig" value={rechnung.ueberfaellig} icon="🚨"
              accent={rechnung.ueberfaellig > 0 ? 'red' : undefined}
              href="/dashboard/rechnungen" loading={laden} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Rechnungsstatus</h3>
              <span className="text-xs bg-amber-50 text-amber-600 px-3 py-1 rounded-lg font-medium">
                Modul wird bald freigeschaltet
              </span>
            </div>
            <div className="flex items-center gap-8">
              <DonutChart
                segments={[
                  { label: 'Bezahlt',   value: rechnung.bezahlt },
                  { label: 'Offen',     value: rechnung.offen },
                  { label: 'Überfällig',value: rechnung.ueberfaellig },
                ]}
                total={rechnung.bezahlt + rechnung.offen + rechnung.ueberfaellig}
                centerLabel="Rechnungen"
              />
              <div className="flex-1 space-y-3">
                <LegendRow label="Bezahlt"    value={rechnung.bezahlt}      total={rechnung.bezahlt + rechnung.offen + rechnung.ueberfaellig} color="bg-emerald-500" />
                <LegendRow label="Offen"      value={rechnung.offen}        total={rechnung.bezahlt + rechnung.offen + rechnung.ueberfaellig} color="bg-amber-500" />
                <LegendRow label="Überfällig" value={rechnung.ueberfaellig} total={rechnung.bezahlt + rechnung.offen + rechnung.ueberfaellig} color="bg-red-500" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══ BEREICH 4 + 5: MITARBEITER & FAHRZEUGE ══════════════════════════ */}
      {(canSee(role, 'mitarbeiter') || canSee(role, 'fahrzeuge')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Mitarbeiter */}
          {canSee(role, 'mitarbeiter') && (
            <section>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Mitarbeiter</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <KPICard label="Team gesamt" value={mitarbeiter.total} icon="👥" loading={laden} />
                <KPICard label="Im Einsatz" value="—" icon="🟢" loading={false} sub="Bald verfügbar" />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Mitarbeiterstatus</h3>
                  <span className="text-xs bg-gray-50 text-gray-500 px-3 py-1 rounded-lg">Kommt bald</span>
                </div>
                {[
                  { label: 'Im Einsatz', value: 0, color: 'bg-blue-500' },
                  { label: 'Verfügbar',  value: mitarbeiter.total, color: 'bg-emerald-500' },
                  { label: 'Urlaub',     value: 0, color: 'bg-amber-500' },
                  { label: 'Krank',      value: 0, color: 'bg-red-500' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3 mb-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color}`} />
                    <span className="text-sm text-gray-600 flex-1">{s.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{s.value}</span>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`}
                        style={{ width: `${pct(s.value, mitarbeiter.total)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Fahrzeuge */}
          {canSee(role, 'fahrzeuge') && (
            <section>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Fahrzeuge</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <KPICard label="Fahrzeuge gesamt" value={fahrzeug.total} icon="🚐" loading={false} />
                <KPICard label="Im Einsatz" value={fahrzeug.imEinsatz} icon="🟢" loading={false} sub="Bald verfügbar" />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-gray-900">Fahrzeugstatus</h3>
                  <span className="text-xs bg-gray-50 text-gray-500 px-3 py-1 rounded-lg">Kommt bald</span>
                </div>
                <div className="flex items-center gap-8">
                  <DonutChart
                    segments={[
                      { label: 'Im Einsatz', value: fahrzeug.imEinsatz },
                      { label: 'Verfügbar',  value: fahrzeug.verfuegbar },
                      { label: 'Werkstatt',  value: fahrzeug.werkstatt },
                    ]}
                    total={fahrzeug.total}
                    centerLabel="Fahrzeuge"
                  />
                  <div className="flex-1 space-y-3">
                    <LegendRow label="Im Einsatz" value={fahrzeug.imEinsatz} total={fahrzeug.total} color="bg-blue-500" />
                    <LegendRow label="Verfügbar"  value={fahrzeug.verfuegbar} total={fahrzeug.total} color="bg-emerald-500" />
                    <LegendRow label="Werkstatt"  value={fahrzeug.werkstatt} total={fahrzeug.total} color="bg-amber-500" />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ══ BEREICH 6: EREIGNISSE / AKTIVITÄTEN ════════════════════════════ */}
      {canSee(role, 'benachrichtigungen') && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Letzte Ereignisse</p>
            <Link href="/dashboard/auftraege"
              className="text-xs text-blue-600 hover:underline font-medium">Alle anzeigen →</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {laden ? (
              <div className="space-y-0 divide-y divide-gray-50">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-48" />
                      <div className="h-3 bg-gray-100 rounded-md animate-pulse w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-sm font-medium">Noch keine Ereignisse</p>
                <p className="text-xs mt-0.5">Lege deinen ersten Auftrag an</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {events.map((e, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                    <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-lg shrink-0">
                      {e.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{e.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {e.zeit ? new Date(e.zeit).toLocaleDateString('de-DE', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        }) : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                      e.status === 'abgeschlossen' ? 'bg-emerald-50 text-emerald-700' :
                      e.status === 'in_bearbeitung' ? 'bg-blue-50 text-blue-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {e.status === 'abgeschlossen' ? 'Abgeschlossen' :
                       e.status === 'in_bearbeitung' ? 'In Bearbeitung' : 'Offen'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══ SCHNELLZUGRIFF (unterste Zeile) ════════════════════════════════ */}
      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Schnellzugriff</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/kunden',    icon: '👥', label: 'Kunden',    sub: `${kundenTotal} gesamt` },
            { href: '/dashboard/auftraege', icon: '📋', label: 'Aufträge',  sub: `${auftrag.offen} offen` },
            { href: '/dashboard/rechnungen',icon: '🧾', label: 'Rechnungen',sub: 'Bald verfügbar' },
            { href: '/dashboard/einstellungen', icon: '⚙️', label: 'Einstellungen', sub: 'Team & Konto' },
          ].map(l => (
            <Link key={l.href} href={l.href}>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition cursor-pointer">
                <div className="text-2xl mb-2">{l.icon}</div>
                <p className="text-sm font-semibold text-gray-900">{l.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{laden ? '...' : l.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
