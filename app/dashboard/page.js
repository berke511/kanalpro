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

// ── Line Chart ───────────────────────────────────────────────────────────────
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
function KPICard({ label, value, sub, trend, accent, href, loading, iconPath }) {
  const inner = (
    <div className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition h-full ${
      accent === 'red' ? 'border-red-100 bg-red-50' :
      accent === 'green' ? 'border-green-100 bg-green-50' :
      'border-gray-100'
    }`}>
      {iconPath && (
        <div className="mb-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
            </svg>
          </div>
        </div>
      )}
      {trend != null && (
        <div className="flex justify-end mb-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        </div>
      )}
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
  const [rechnung, setRechnung] = useState({ offen: 0, bezahlt: 0, ueberfaellig: 0, betrag: 0 });
  // Fahrzeuge (Modul noch nicht vorhanden)
  const [fahrzeug, setFahrzeug] = useState({ total: 0, imEinsatz: 0, verfuegbar: 0, werkstatt: 0 });
  const [fahrzeugeRaw, setFahrzeugeRaw] = useState([]);
  // Umsatz
  const [umsatz, setUmsatz] = useState({ monat: 0, jahr: 0, verlauf: Array(12).fill(0) });
  // Ereignisse
  const [events, setEvents] = useState([]);
// Angebote
const [angebote, setAngebote] = useState([]);
  const [maschinenKritisch, setMaschinenKritisch] = useState([]);
  const [zertifikateKritisch, setZertifikateKritisch] = useState([]);

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
        const eventsAuftraege = (auftraegeData || []).slice(0, 5).map(a => ({
          id: a.id,
          text: a.titel ?? '(kein Titel)',
          zeit: a.erstellt_am || a.datum,
          status: a.status,
          quelle: 'auftrag'
        }));
        const alleEvents = [...eventsAuftraege]
          .sort((a, b) => new Date(b.zeit) - new Date(a.zeit))
          .slice(0, 8);
        setEvents(alleEvents);
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

      // Rechnungen
      if (member?.company_id) {
        const { data: rechnungenData } = await supabase
          .from('rechnungen')
          .select('id, status, betrag, faellig_am, datum, company_id')
          .eq('company_id', member.company_id);

        if (rechnungenData) {
          const heute = new Date();
          const monatStart = new Date(heute.getFullYear(), heute.getMonth(), 1);
          const jahrStart  = new Date(heute.getFullYear(), 0, 1);

          const offen        = rechnungenData.filter(r => r.status !== 'bezahlt').length;
          const bezahlt      = rechnungenData.filter(r => r.status === 'bezahlt').length;
          const ueberfaellig = rechnungenData.filter(r =>
            r.status !== 'bezahlt' && r.faellig_am && new Date(r.faellig_am) < heute
          ).length;

          const monatsumsatz = rechnungenData
            .filter(r => r.status === 'bezahlt' && r.datum && new Date(r.datum) >= monatStart)
            .reduce((s, r) => s + (r.betrag || 0), 0);
          const jahresumsatz = rechnungenData
            .filter(r => r.status === 'bezahlt' && r.datum && new Date(r.datum) >= jahrStart)
            .reduce((s, r) => s + (r.betrag || 0), 0);

          setRechnung({ offen, bezahlt, ueberfaellig, betrag: monatsumsatz });
          setUmsatz(prev => ({ ...prev, monat: monatsumsatz, jahr: jahresumsatz }));
        }
      }

      // Fahrzeuge
      const { data: fahrzeugeData } = await supabase
        .from('fahrzeuge')
        .select('id, zustand, company_id, kennzeichen, bezeichnung, marke, modell, tuev_datum, naechste_wartung')

      if (fahrzeugeData) {
        const total      = fahrzeugeData.length;
        const imEinsatz  = fahrzeugeData.filter(f => f.zustand === 'aktiv').length;
        const verfuegbar = fahrzeugeData.filter(f => f.zustand === 'reserviert').length;
        const werkstatt  = fahrzeugeData.filter(f => f.zustand === 'wartung').length;
        setFahrzeug({ total, imEinsatz, verfuegbar, werkstatt });
        setFahrzeugeRaw(fahrzeugeData);
      }

      

// Angebote
const { data: angeboteData } = await supabase
  .from('angebote')
  .select('id, angebotsnummer, status, positionen, steuersatz, datum')
  .order('datum', { ascending: false })
  .limit(20);

if (angeboteData) {
  const offene = angeboteData
    .filter(a => !['angenommen', 'abgelehnt', 'storniert'].includes(a.status))
    .map(a => {
      const netto = (a.positionen ?? []).reduce((s, p) => s + (p.menge || 0) * (p.preis || 0), 0);
      return { ...a, betrag: netto * (1 + (a.steuersatz ?? 19) / 100) };
    });
  setAngebote(offene);
}

// Maschinen
const { data: maschinenData } = await supabase
  .from('maschinen')
  .select('id, name, typ, lagerort, zustand, naechste_pruefung_datum, company_id')
  .eq('company_id', companyId);

if (maschinenData) {
  const heute = new Date();
  const in30 = new Date(); in30.setDate(heute.getDate() + 30);
  const kritisch = maschinenData.filter(m =>
    ['defekt', 'ausser_betrieb'].includes(m.zustand) ||
    (m.naechste_pruefung_datum && new Date(m.naechste_pruefung_datum) <= in30)
  );
  setMaschinenKritisch(kritisch);
}

// Zertifikate
const { data: zertData } = await supabase
  .from('zertifikate')
  .select('id, name, gueltig_bis, mitarbeiter(vorname, nachname, company_id)')
  .order('gueltig_bis', { ascending: true })
  .limit(50);

if (zertData) {
  const heute = new Date();
  const in30 = new Date(); in30.setDate(heute.getDate() + 30);
  const kritisch = zertData
    .filter(z => z.mitarbeiter?.company_id === companyId)
    .filter(z => z.gueltig_bis && new Date(z.gueltig_bis) <= in30)
    .slice(0, 5);
  setZertifikateKritisch(kritisch);
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
            <KPICard label="Monatsumsatz" value={fmtEur(umsatz.monat)}
              sub="Laufender Monat" href="/dashboard/rechnungen" loading={laden}
              iconPath="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            <KPICard label="Jahresumsatz" value={fmtEur(umsatz.jahr)}
              sub={String(new Date().getFullYear())} href="/dashboard/rechnungen" loading={laden}
              iconPath="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            <KPICard label="Rechnungen gesamt"
              value={rechnung.offen + rechnung.bezahlt + rechnung.ueberfaellig} href="/dashboard/rechnungen" loading={laden}
              iconPath="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
          </div>
          {/* Umsatz-Diagramm */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
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
            <KPICard label="Offen" value={auftrag.offen}
              href="/dashboard/auftraege" loading={laden} />
            <KPICard label="Heute fällig" value={auftrag.heute}
              href="/dashboard/auftraege" loading={laden} />
            <KPICard label="Überfällig" value={auftrag.ueberfaellig}
              accent={auftrag.ueberfaellig > 0 ? 'red' : undefined}
              href="/dashboard/auftraege" loading={laden} />
            <KPICard label="Gesamt" value={auftrag.total}
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
            <KPICard label="Offene Rechnungen" value={rechnung.offen}
              href="/dashboard/rechnungen" loading={laden} />
            <KPICard label="Offener Betrag" value={fmtEur(rechnung.betrag)}
              href="/dashboard/rechnungen" loading={laden} />
            <KPICard label="Überfällig" value={rechnung.ueberfaellig}
              accent={rechnung.ueberfaellig > 0 ? 'red' : undefined}
              href="/dashboard/rechnungen" loading={laden} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
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
                <KPICard label="Team gesamt" value={mitarbeiter.total} loading={laden} />
                <KPICard label="Im Einsatz" value="—" loading={false} sub="Bald verføgbar" />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
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
                <KPICard label="Fahrzeuge gesamt" value={fahrzeug.total} loading={false} />
                <KPICard label="Im Einsatz" value={fahrzeug.imEinsatz} loading={false} sub="Bald verfügbar" />
              </div>
              {(() => {
                const heute = new Date();
                const in30 = new Date(); in30.setDate(heute.getDate() + 30);

                const kritisch = fahrzeugeRaw
                  .filter(f => {
                    if (['ausser_betrieb', 'wartung'].includes(f.zustand)) return true;
                    if (f.tuev_datum && new Date(f.tuev_datum) <= in30) return true;
                    if (f.naechste_wartung && new Date(f.naechste_wartung) < heute) return true;
                    return false;
                  })
                  .slice(0, 5)
                  .map(f => {
                    const gruende = [];
                    if (['ausser_betrieb', 'wartung'].includes(f.zustand))
                      gruende.push(f.zustand === 'ausser_betrieb' ? 'Außer Betrieb' : 'In Wartung');
                    if (f.tuev_datum) {
                      const d = new Date(f.tuev_datum);
                      if (d < heute) gruende.push('TÜV überfällig');
                      else if (d <= in30) gruende.push('TÜV fällig in < 30 Tagen');
                    }
                    if (f.naechste_wartung && new Date(f.naechste_wartung) < heute)
                      gruende.push('Wartung überfällig');
                    const istRot = f.zustand === 'ausser_betrieb' ||
                      (f.tuev_datum && new Date(f.tuev_datum) < heute) ||
                      (f.naechste_wartung && new Date(f.naechste_wartung) < heute);
                    return { ...f, gruende, istRot };
                  });

                return (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">Kritische Fahrzeuge</h3>
                      <a href="/dashboard/fahrzeuge" className="text-sm text-blue-600 hover:underline">Fahrzeuge öffnen →</a>
                    </div>
                    {kritisch.length === 0 ? (
                      <p className="text-sm text-gray-500">Keine kritischen Fahrzeuge</p>
                    ) : (
                      <ul className="space-y-2">
                        {kritisch.map(f => (
                          <li key={f.id} className={`flex items-start gap-3 rounded-lg px-3 py-2 ${f.istRot ? 'bg-red-50' : 'bg-yellow-50'}`}>
                            <span className="mt-0.5 text-base">{f.istRot ? '🔴' : '🟡'}</span>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{f.kennzeichen || f.bezeichnung || f.marke || '–'}</p>
                              <p className="text-xs text-gray-600">{f.gruende.join(' · ')}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
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
                  <p className="text-sm font-medium">Noch keine Ereignisse</p>
                <p className="text-xs mt-0.5">Lege deinen ersten Auftrag an</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {events.map((e, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      e.status === 'abgeschlossen' ? 'bg-emerald-400' :
                      e.status === 'in_bearbeitung' ? 'bg-blue-400' : 'bg-amber-400'
                    }`} />
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
                    {e.quelle && <span className="text-xs text-gray-400 ml-1">{e.quelle === 'auftrag' ? '📋' : ''}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Offene-Angebote-Karte ── */}
<div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
  <div className="flex items-center justify-between mb-3">
    <div>
      <h3 className="font-semibold text-gray-800">Offene Angebote</h3>
      <p className="text-sm text-gray-500 mt-0.5">
        {angebote.length} offen · {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(angebote.reduce((s, a) => s + (a.betrag || 0), 0))}
      </p>
    </div>
    <a href="/dashboard/angebote" className="text-sm text-blue-600 hover:underline">Angebote öffnen →</a>
  </div>
  {angebote.length === 0 ? (
    <p className="text-sm text-gray-500">Keine offenen Angebote</p>
  ) : (
    <ul className="space-y-2">
      {angebote.slice(0, 5).map(a => (
        <li key={a.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
          <div>
            <p className="font-medium text-gray-800">{a.angebotsnummer || `#${a.id?.slice(0,8)}`}</p>
            <p className="text-xs text-gray-500">{a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-700">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(a.betrag || 0)}</p>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{a.status || '–'}</span>
          </div>
        </li>
      ))}
    </ul>
  )}
</div>

{/* ── Kritische-Maschinen-Karte ── */}
{(() => {
  const heute = new Date();
  const in30 = new Date(); in30.setDate(heute.getDate() + 30);

  const liste = maschinenKritisch.slice(0, 5).map(m => {
    const gruende = [];
    if (m.zustand === 'defekt') gruende.push('Defekt');
    if (m.zustand === 'ausser_betrieb') gruende.push('Außer Betrieb');
    if (m.naechste_pruefung_datum) {
      const d = new Date(m.naechste_pruefung_datum);
      if (d < heute) gruende.push('Prüfung überfällig');
      else if (d <= in30) gruende.push('Prüfung fällig in < 30 Tagen');
    }
    const istRot = m.zustand === 'defekt' || m.zustand === 'ausser_betrieb' ||
      (m.naechste_pruefung_datum && new Date(m.naechste_pruefung_datum) < heute);
    return { ...m, gruende, istRot };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Kritische Maschinen</h3>
        <a href="/dashboard/maschinen" className="text-sm text-blue-600 hover:underline">Maschinen öffnen →</a>
      </div>
      {liste.length === 0 ? (
        <p className="text-sm text-gray-500">Keine kritischen Maschinen</p>
      ) : (
        <ul className="space-y-2">
          {liste.map(m => (
            <li key={m.id} className={`flex items-start gap-3 rounded-lg px-3 py-2 ${m.istRot ? 'bg-red-50' : 'bg-yellow-50'}`}>
              <span className="mt-0.5 text-base">{m.istRot ? '🔴' : '🟡'}</span>
              <div>
                <p className="font-medium text-gray-800 text-sm">{m.name || '–'}{m.typ ? ` · ${m.typ}` : ''}</p>
                <p className="text-xs text-gray-600">{m.gruende.join(' · ')}{m.lagerort ? ` · ${m.lagerort}` : ''}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
})()}

{/* ── Ablaufende-Zertifikate-Karte ── */}
{(() => {
  const heute = new Date();
  const liste = zertifikateKritisch.slice(0, 5).map(z => {
    const d = z.gueltig_bis ? new Date(z.gueltig_bis) : null;
    const abgelaufen = d && d < heute;
    const name = z.mitarbeiter
      ? `${z.mitarbeiter.vorname || ''} ${z.mitarbeiter.nachname || ''}`.trim()
      : '–';
    return { ...z, abgelaufen, mitarbeiterName: name };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Ablaufende Zertifikate</h3>
        <a href="/dashboard/mitarbeiter" className="text-sm text-blue-600 hover:underline">Mitarbeiter öffnen →</a>
      </div>
      {liste.length === 0 ? (
        <p className="text-sm text-gray-500">Keine ablaufenden Zertifikate</p>
      ) : (
        <ul className="space-y-2">
          {liste.map(z => (
            <li key={z.id} className={`flex items-start gap-3 rounded-lg px-3 py-2 ${z.abgelaufen ? 'bg-red-50' : 'bg-yellow-50'}`}>
              <span className="mt-0.5 text-base">{z.abgelaufen ? '🔴' : '🟡'}</span>
              <div>
                <p className="font-medium text-gray-800 text-sm">{z.name || z.bezeichnung || '–'}</p>
                <p className="text-xs text-gray-600">
                  {z.mitarbeiterName}
                  {z.gueltig_bis ? ` · ${new Date(z.gueltig_bis).toLocaleDateString('de-DE')}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
})()}

{/* ══ SCHNELLZUGRIFF (unterste Zeile) ════════════════════════════════ */}
      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Schnellzugriff</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/kunden',         label: 'Kunden',        sub: `${kundenTotal} gesamt`,    d: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
            { href: '/dashboard/auftraege',       label: 'Aufträge',      sub: `${auftrag.offen} offen`,   d: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z' },
            { href: '/dashboard/rechnungen',      label: 'Rechnungen',    sub: 'Bald verfügbar',           d: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z' },
            { href: '/dashboard/einstellungen',   label: 'Einstellungen', sub: 'Team & Konto',             d: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
          ].map(l => (
            <Link key={l.href} href={l.href}>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-gray-200 transition cursor-pointer">
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={l.d} />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900">{l.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{laden ? '...' : l.sub}</p>
              </div>
            </Link>
          ))}
        </div>
        {/* ── Schnellaktionen ── */}
        <div className="flex flex-wrap gap-2 mt-3">
          <a href="/dashboard/auftraege/neu" className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            ＋ Neuer Auftrag
          </a>
          <a href="/dashboard/rechnungen/neu" className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
            ＋ Neue Rechnung
          </a>
          <a href="/dashboard/kunden/neu" className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
            ＋ Neuer Kunde
          </a>
        </div>
      </section>

    </div>
  );
}
