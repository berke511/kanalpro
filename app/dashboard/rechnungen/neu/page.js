'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ════════════════════════════════════════════════════════════════
   KONSTANTEN
════════════════════════════════════════════════════════════════ */

const BEARBEITEN_ROLLEN = ['inhaber', 'administrator', 'buero'];
const LESEN_ROLLEN      = ['inhaber', 'administrator', 'buero', 'disponent'];

const EINHEITEN = ['Pauschal', 'Stk.', 'Stunden', 'Meter', 'Liter', 'kg', 'm²', 'm³', 'Rollen'];

const ZAHLUNGSSTATUS_CFG = {
  offen:              { label: 'Offen',              bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  teilweise_bezahlt:  { label: 'Teilweise bezahlt',  bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  bezahlt:            { label: 'Bezahlt',             bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  storniert:          { label: 'Storniert',           bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
};

const LEISTUNGEN = [
  'Rohrreinigung','Kanalreinigung','Grundleitungsreinigung','Fallstrangreinigung',
  'Hochdruckspülung','Kombinierte Saug- und Spülarbeiten','Absaugarbeiten',
  'Schlammentsorgung','Verstopfungsbeseitigung','Wurzelentfernung','Wurzelfräsen',
  'TV-Inspektion','Kamerainspektion','Rohrkamerauntersuchung','Schadensaufnahme',
  'Fotodokumentation','Zustandsbewertung','Dichtheitsprüfung Luft','Dichtheitsprüfung Wasser',
  'Rohrreparatur','Kanalreparatur','Leckstellenabdichtung','Injektionsarbeiten',
  'Schachtreinigung','Hebeanlagenreinigung','Fettabscheiderreinigung','Ölabscheiderreinigung',
  'Kanalwartung','Pumpenprüfung','Wartungsvertrag','Notdienst','Fahrtkosten',
  'Entsorgungsgebühren','Material','Sonstige Leistungen',
];

/* ════════════════════════════════════════════════════════════════
   HILFSFUNKTIONEN
════════════════════════════════════════════════════════════════ */

function today() { return new Date().toISOString().split('T')[0]; }

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function fmtEuro(n) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function fmtDatum(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function kundeAnzeigeName(k) {
  if (!k) return '—';
  return k.kundentyp === 'firma' ? (k.firmenname ?? k.firma ?? k.name ?? '—') : (k.name ?? '—');
}

function genRechnungsnummer(count) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `RE-${y}${m}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

function safeStr(s) {
  return (s || '').toString()
    .replace(/–|—/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x00-ÿ]/g, '?');
}

function timeToMin(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

function minZuH(min) {
  if (min == null) return 0;
  return Math.round((min / 60) * 100) / 100;
}

/* ════════════════════════════════════════════════════════════════
   BASIS-KOMPONENTEN
════════════════════════════════════════════════════════════════ */

function Svg({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Karte({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function KarteHeader({ icon, title, subtitle, badge, badgeColor = 'blue', action }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
    gray:   'bg-gray-50 text-gray-500 border-gray-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-50">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Svg d={icon} cls="w-4 h-4 text-blue-500" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            {badge && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[badgeColor] ?? colors.blue}`}>{badge}</span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function inp(err = false, className = '') {
  return `w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 bg-white placeholder-gray-300
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
    ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'} ${className}`;
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function Alert({ type = 'info', children, onClose }) {
  const cfg = {
    success: { wrap: 'bg-green-50 border-green-100 text-green-700', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    error:   { wrap: 'bg-red-50 border-red-100 text-red-700',       icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
    info:    { wrap: 'bg-blue-50 border-blue-100 text-blue-700',    icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z' },
    amber:   { wrap: 'bg-amber-50 border-amber-100 text-amber-700', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
  }[type] ?? {};
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${cfg.wrap}`}>
      {cfg.icon && <Svg d={cfg.icon} cls="w-4 h-4 mt-0.5 shrink-0" />}
      <span className="flex-1">{children}</span>
      {onClose && <button onClick={onClose}><Svg d="M6 18L18 6M6 6l12 12" cls="w-3.5 h-3.5 opacity-50 hover:opacity-100" /></button>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-gray-400">Daten werden geladen…</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   POSITIONEN EDITOR
════════════════════════════════════════════════════════════════ */

function PositionenEditor({ positionen, setPositionen, readonly }) {
  const [openDrop, setOpenDrop] = useState(null);
  const dropRef = useRef(null);

  useEffect(() => {
    function outside(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpenDrop(null); }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  function onField(i, field, value) {
    const n = [...positionen];
    n[i] = { ...n[i], [field]: (field === 'menge' || field === 'preis') ? parseFloat(value) || 0 : value };
    setPositionen(n);
  }

  function addPos() {
    setPositionen([...positionen, { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]);
  }

  function removePos(i) {
    if (positionen.length > 1) setPositionen(positionen.filter((_, j) => j !== i));
  }

  function moveUp(i) {
    if (i === 0) return;
    const n = [...positionen];
    [n[i - 1], n[i]] = [n[i], n[i - 1]];
    setPositionen(n);
  }

  function moveDown(i) {
    if (i === positionen.length - 1) return;
    const n = [...positionen];
    [n[i], n[i + 1]] = [n[i + 1], n[i]];
    setPositionen(n);
  }

  function selectLeistung(i, leistung) {
    onField(i, 'beschreibung', leistung);
    setOpenDrop(null);
  }

  if (readonly) {
    return (
      <div className="space-y-2">
        {positionen.map((p, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{p.beschreibung || '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.menge} {p.einheit}</p>
            </div>
            <p className="text-sm font-semibold text-gray-800 font-mono">{fmtEuro(p.menge * p.preis)}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={dropRef}>
      {positionen.map((pos, i) => {
        const filtered = LEISTUNGEN.filter(l => l.toLowerCase().includes((pos.beschreibung || '').toLowerCase()) && l !== pos.beschreibung);
        return (
          <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            {/* Reihenfolge + Löschen */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pos. {i + 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveUp(i)} disabled={i === 0} title="Nach oben"
                  className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 rounded-lg transition">
                  <Svg d="M4.5 15.75l7.5-7.5 7.5 7.5" cls="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveDown(i)} disabled={i === positionen.length - 1} title="Nach unten"
                  className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 rounded-lg transition">
                  <Svg d="M19.5 8.25l-7.5 7.5-7.5-7.5" cls="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removePos(i)} title="Löschen"
                  className="p-1 text-gray-300 hover:text-red-400 rounded-lg transition">
                  <Svg d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" cls="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Beschreibung + Autocomplete */}
            <div className="relative">
              <Label>Beschreibung</Label>
              <input
                value={pos.beschreibung}
                onChange={e => { onField(i, 'beschreibung', e.target.value); setOpenDrop(i); }}
                onFocus={() => setOpenDrop(i)}
                placeholder="Leistung oder Freitext…"
                className={inp()}
              />
              {openDrop === i && filtered.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filtered.slice(0, 10).map(l => (
                    <button key={l} type="button" onMouseDown={() => selectLeistung(i, l)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition">
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Menge / Einheit / Preis */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Menge</Label>
                <input type="number" min="0" step="0.5" value={pos.menge}
                  onChange={e => onField(i, 'menge', e.target.value)} className={inp()} />
              </div>
              <div>
                <Label>Einheit</Label>
                <select value={pos.einheit} onChange={e => onField(i, 'einheit', e.target.value)} className={inp()}>
                  {EINHEITEN.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <Label>Einzelpreis (€)</Label>
                <input type="number" min="0" step="0.01" value={pos.preis}
                  onChange={e => onField(i, 'preis', e.target.value)} className={inp()} />
              </div>
            </div>

            {/* Summe */}
            <div className="flex justify-end">
              <p className="text-sm font-bold text-gray-700">
                Gesamt: <span className="font-mono">{fmtEuro(pos.menge * pos.preis)}</span>
              </p>
            </div>
          </div>
        );
      })}

      {/* Neue Position */}
      <button onClick={addPos}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition">
        <Svg d="M12 4.5v15m7.5-7.5h-15" cls="w-4 h-4" />
        Position hinzufügen
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   RECHNUNGSSUMMEN
════════════════════════════════════════════════════════════════ */

function Summen({ positionen, steuersatz, skonto }) {
  const netto       = positionen.reduce((s, p) => s + (p.menge || 0) * (p.preis || 0), 0);
  const skontoAmt   = skonto > 0 ? netto * (skonto / 100) : 0;
  const nettoNachSk = netto - skontoAmt;
  const mwst        = nettoNachSk * (steuersatz / 100);
  const brutto      = nettoNachSk + mwst;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Nettobetrag</span>
        <span className="font-mono font-medium">{fmtEuro(netto)}</span>
      </div>
      {skontoAmt > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Skonto ({skonto}%)</span>
          <span className="font-mono">-{fmtEuro(skontoAmt)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm text-gray-600">
        <span>MwSt. ({steuersatz}%)</span>
        <span className="font-mono font-medium">{fmtEuro(mwst)}</span>
      </div>
      <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold text-gray-900">
        <span>Gesamtbetrag</span>
        <span className="font-mono text-blue-600">{fmtEuro(brutto)}</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PDF GENERATOR
════════════════════════════════════════════════════════════════ */

async function generatePDF({ firma, kunde, form, positionen, logoUrl, rechnungsnummer, auftrag }) {
  if (!window.jspdf) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const blau = [37, 99, 235];
  const dunkelgrau = [31, 41, 55];
  const grau = [107, 114, 128];
  const hellgrau = [243, 244, 246];

  const nr = rechnungsnummer || `RE-${new Date().getFullYear()}-0001`;

  // ── Header-Block ──
  doc.setFillColor(...blau);
  doc.rect(0, 0, 210, 38, 'F');

  if (logoUrl) {
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image(); i.crossOrigin = 'anonymous';
        i.onload = () => res(i); i.onerror = rej; i.src = logoUrl;
      });
      doc.addImage(img, 'PNG', 12, 6, 0, 26);
    } catch {}
  }

  const firmaName = safeStr(firma.firmenname) || 'Ihr Unternehmen';
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.text(firmaName, logoUrl ? 52 : 15, 16);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  const firmaZeile = [firma.adresse, firma.telefon, firma.email].filter(Boolean).join(' · ');
  if (firmaZeile) doc.text(safeStr(firmaZeile), logoUrl ? 52 : 15, 24);

  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text('RECHNUNG', 195, 17, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Nr. ${nr}`, 195, 26, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  let y = 50;

  // ── Absender (klein über Empfänger) ──
  doc.setFontSize(7); doc.setTextColor(...grau);
  doc.text(safeStr([firmaName, firma.adresse].filter(Boolean).join(', ')), 15, y);
  y += 8;

  // ── Rechnungsempfänger ──
  const kundenName = kunde ? kundeAnzeigeName(kunde) : safeStr(form.kundenname_manuell || '');
  doc.setTextColor(...dunkelgrau); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(safeStr(kundenName), 15, y);
  y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  if (form.rechnungsadresse || kunde?.adresse) {
    const adresse = safeStr(form.rechnungsadresse || kunde?.adresse || '');
    const zeilen = doc.splitTextToSize(adresse, 90);
    doc.text(zeilen, 15, y); y += zeilen.length * 5;
  }
  if (kunde?.email) { doc.setTextColor(...grau); doc.text(safeStr(kunde.email), 15, y); y += 5; }

  // ── Rechnungsinfos (rechte Seite) ──
  const infoX = 125;
  let infoY = 58;
  const infoZeilen = [
    ['Rechnungsnummer:', nr],
    ['Rechnungsdatum:', fmtDatum(form.datum)],
    ['Zahlungsziel:', fmtDatum(form.faellig_am)],
    ...(form.leistungsdatum ? [['Leistungsdatum:', fmtDatum(form.leistungsdatum)]] : []),
    ...(auftrag?.auftragsnummer ? [['Auftragsnummer:', safeStr(auftrag.auftragsnummer)]] : []),
  ];
  doc.setFontSize(9);
  for (const [label, val] of infoZeilen) {
    doc.setTextColor(...grau); doc.setFont('helvetica', 'normal');
    doc.text(label, infoX, infoY);
    doc.setTextColor(...dunkelgrau); doc.setFont('helvetica', 'bold');
    doc.text(safeStr(val), 195, infoY, { align: 'right' });
    infoY += 6;
  }

  y = Math.max(y, infoY) + 8;

  // ── Betreff ──
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dunkelgrau);
  const betreff = safeStr(form.betreff || `Rechnung für ${auftrag?.typ || 'Leistungen'}`);
  doc.text(betreff, 15, y); y += 8;

  // ── Tabelle Positionen ──
  const netto = positionen.reduce((s, p) => s + (p.menge || 0) * (p.preis || 0), 0);
  const skontoAmt = (form.skonto || 0) > 0 ? netto * (form.skonto / 100) : 0;
  const nettoNachSk = netto - skontoAmt;
  const mwst = nettoNachSk * ((form.steuersatz) / 100);
  const brutto = nettoNachSk + mwst;

  const tableBody = positionen
    .filter(p => p.beschreibung?.trim())
    .map((p, i) => [
      i + 1,
      safeStr(p.beschreibung),
      String(p.menge || 1),
      safeStr(p.einheit || 'Pauschal'),
      fmtEuro(p.preis || 0),
      fmtEuro((p.menge || 1) * (p.preis || 0)),
    ]);

  doc.autoTable({
    startY: y,
    head: [['Pos.', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamtpreis']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: blau, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: dunkelgrau },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      2: { halign: 'right', cellWidth: 18 },
      3: { cellWidth: 22 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: hellgrau },
    margin: { left: 15, right: 15 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Summenblock ──
  const sumX = 130;
  const zeile = (label, val, bold = false) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...(bold ? dunkelgrau : grau));
    doc.text(safeStr(label), sumX, y);
    doc.setTextColor(...dunkelgrau);
    doc.text(safeStr(val), 195, y, { align: 'right' });
    y += 6;
  };

  zeile('Nettobetrag', fmtEuro(netto));
  if (skontoAmt > 0) zeile(`Skonto (${form.skonto}%)`, `-${fmtEuro(skontoAmt)}`);
  zeile(`MwSt. (${form.steuersatz}%)`, fmtEuro(mwst));
  doc.setFillColor(...hellgrau); doc.rect(sumX - 4, y - 4, 80, 9, 'F');
  zeile('Gesamtbetrag', fmtEuro(brutto), true);

  y += 6;

  // ── Notizen / Bemerkungen ──
  if (form.notizen?.trim() || form.bemerkungen?.trim()) {
    const text = safeStr(form.notizen || form.bemerkungen);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grau);
    const zeilen = doc.splitTextToSize(text, 180);
    if (y + zeilen.length * 5 > 270) { doc.addPage(); y = 20; }
    doc.text(zeilen, 15, y); y += zeilen.length * 5 + 4;
  }

  // ── Zahlungshinweis ──
  y += 4;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grau);
  doc.text(`Bitte überweisen Sie den Betrag von ${fmtEuro(brutto)} bis zum ${fmtDatum(form.faellig_am)} auf folgendes Konto:`, 15, y);
  y += 7;
  if (firma.iban) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...dunkelgrau);
    doc.text(`IBAN: ${safeStr(firma.iban)}`, 15, y); y += 5;
    if (firma.bic) { doc.text(`BIC: ${safeStr(firma.bic)}  ·  Bank: ${safeStr(firma.bank)}`, 15, y); y += 5; }
  }
  if (firma.steuernummer) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...grau);
    doc.text(`Steuernummer: ${safeStr(firma.steuernummer)}${firma.ust_id ? `  ·  USt-IdNr.: ${safeStr(firma.ust_id)}` : ''}`, 15, y);
  }

  return { doc, nr, brutto };
}

/* ════════════════════════════════════════════════════════════════
   VORSCHAU-MODAL
════════════════════════════════════════════════════════════════ */

function VorschauModal({ firma, kunde, form, positionen, logoUrl, rechnungsnummer, auftrag, onClose }) {
  const netto      = positionen.reduce((s, p) => s + (p.menge || 0) * (p.preis || 0), 0);
  const skontoAmt  = (form.skonto || 0) > 0 ? netto * (form.skonto / 100) : 0;
  const nettoNachSk = netto - skontoAmt;
  const mwst       = nettoNachSk * ((form.steuersatz) / 100);
  const brutto     = nettoNachSk + mwst;
  const kundenName = kunde ? kundeAnzeigeName(kunde) : (form.kundenname_manuell || '—');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Rechnungsvorschau</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition">
            <Svg d="M6 18L18 6M6 6l12 12" cls="w-5 h-5" />
          </button>
        </div>

        {/* Vorschau-Inhalt */}
        <div className="p-5 font-sans text-sm text-gray-800">
          {/* Absender */}
          <div className="bg-blue-600 text-white rounded-xl p-5 mb-5 flex items-start justify-between">
            <div>
              <p className="font-bold text-base">{firma.firmenname || 'Ihr Unternehmen'}</p>
              {firma.adresse && <p className="text-blue-100 text-xs mt-1">{firma.adresse}</p>}
              {firma.telefon && <p className="text-blue-100 text-xs">{firma.telefon}</p>}
            </div>
            <div className="text-right">
              <p className="font-bold text-xl">RECHNUNG</p>
              <p className="text-blue-200 text-xs mt-1">Nr. {rechnungsnummer || 'RE-XXXX-0001'}</p>
            </div>
          </div>

          {/* Rechnungsdetails */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Rechnungsempfänger</p>
              <p className="font-bold text-gray-800">{kundenName}</p>
              {(form.rechnungsadresse || kunde?.adresse) && (
                <p className="text-gray-500 text-xs mt-0.5 whitespace-pre-wrap">{form.rechnungsadresse || kunde?.adresse}</p>
              )}
              {kunde?.email && <p className="text-gray-400 text-xs mt-0.5">{kunde.email}</p>}
            </div>
            <div className="space-y-1 text-right">
              {[
                ['Datum', fmtDatum(form.datum)],
                ['Zahlungsziel', fmtDatum(form.faellig_am)],
                ...(form.leistungsdatum ? [['Leistungsdatum', fmtDatum(form.leistungsdatum)]] : []),
                ...(auftrag?.auftragsnummer ? [['Auftragsnr.', auftrag.auftragsnummer]] : []),
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-4">
                  <span className="text-xs text-gray-400">{l}:</span>
                  <span className="text-xs font-medium text-gray-700">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Betreff */}
          {form.betreff && <p className="font-semibold text-gray-800 mb-4">{form.betreff}</p>}

          {/* Positionen */}
          <table className="w-full text-xs mb-4 border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                {['Pos.', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt'].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positionen.filter(p => p.beschreibung?.trim()).map((p, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1.5 text-center text-gray-500">{i + 1}</td>
                  <td className="px-2 py-1.5 text-gray-800 font-medium">{p.beschreibung}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{p.menge}</td>
                  <td className="px-2 py-1.5 text-gray-500">{p.einheit}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmtEuro(p.preis)}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmtEuro(p.menge * p.preis)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summen */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500"><span>Nettobetrag</span><span className="font-mono">{fmtEuro(netto)}</span></div>
              {skontoAmt > 0 && <div className="flex justify-between text-green-600"><span>Skonto ({form.skonto}%)</span><span className="font-mono">-{fmtEuro(skontoAmt)}</span></div>}
              <div className="flex justify-between text-gray-500"><span>MwSt. ({form.steuersatz}%)</span><span className="font-mono">{fmtEuro(mwst)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-sm border-t border-gray-200 pt-1.5">
                <span>Gesamtbetrag</span>
                <span className="font-mono text-blue-600">{fmtEuro(brutto)}</span>
              </div>
            </div>
          </div>

          {/* Notizen */}
          {(form.notizen?.trim() || form.bemerkungen?.trim()) && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 whitespace-pre-wrap">
              {form.notizen || form.bemerkungen}
            </div>
          )}

          {/* Zahlungsinfos */}
          {firma.iban && (
            <div className="mt-4 text-xs text-gray-400">
              <p>IBAN: {firma.iban}{firma.bic ? ` · BIC: ${firma.bic}` : ''}{firma.bank ? ` · ${firma.bank}` : ''}</p>
              {firma.steuernummer && <p>Steuernummer: {firma.steuernummer}{firma.ust_id ? ` · USt-IdNr.: ${firma.ust_id}` : ''}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HAUPT-KOMPONENTE (inner, braucht useSearchParams)
════════════════════════════════════════════════════════════════ */

function NeueRechnungInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const auftragId    = searchParams.get('auftrag_id');

  // ── State ──
  const [zustand,    setZustand]    = useState('loading');
  const [userRolle,  setUserRolle]  = useState(null);
  const [userId,     setUserId]     = useState(null);
  const [companyId,  setCompanyId]  = useState(null);
  const [kunden,     setKunden]     = useState([]);
  const [auftrag,    setAuftrag]    = useState(null);
  const [dok,        setDok]        = useState(null);
  const [material,   setMaterial]   = useState([]);
  const [firma,      setFirma]      = useState({ firmenname:'', adresse:'', telefon:'', email:'', steuernummer:'', ust_id:'', iban:'', bic:'', bank:'' });
  const [logoUrl,    setLogoUrl]    = useState(null);
  const [rechnungsNr, setRechnungsNr] = useState('');

  // ── Formular ──
  const [form, setForm] = useState({
    kunde_id:          '',
    kundenname_manuell:'',
    rechnungsadresse:  '',
    datum:             today(),
    faellig_am:        addDays(today(), 14),
    leistungsdatum:    '',
    steuersatz:        19,
    skonto:            0,
    betreff:           '',
    notizen:           '',
    bemerkungen:       '',
    zahlungsstatus:    'offen',
  });
  const [positionen, setPositionen] = useState([{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]);

  // ── UI ──
  const [saving,     setSaving]     = useState(false);
  const [pdfLaden,   setPdfLaden]   = useState(false);
  const [emailSend,  setEmailSend]  = useState(false);
  const [fehler,     setFehler]     = useState('');
  const [erfolg,     setErfolg]     = useState('');
  const [vorschau,   setVorschau]   = useState(false);
  const [gespeichert, setGespeichert] = useState(null); // rechnungs-id nach save

  const darf    = BEARBEITEN_ROLLEN.includes(userRolle);
  const hatZugriff = LESEN_ROLLEN.includes(userRolle);

  /* ── Initial laden ── */
  const laden = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!member) { setZustand('forbidden'); return; }
      if (!LESEN_ROLLEN.includes(member.role)) { setZustand('forbidden'); return; }

      setUserRolle(member.role);
      setCompanyId(member.company_id);

      // Rechnungsnummer vorab generieren
      const { count } = await supabase
        .from('rechnungen')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', member.company_id);
      setRechnungsNr(genRechnungsnummer(count));

      // Parallel laden: Kunden, Firmeneinstellungen, Logo, ggf. Auftrag
      const promises = [
        supabase.from('kunden').select('*').eq('company_id', member.company_id).order('name'),
        supabase.from('companies').select('name, adresse, telefon, email, ust_id, steuernummer, iban, bic, bank, logo_url, standard_steuersatz').eq('id', member.company_id).maybeSingle(),
      ];

      if (auftragId) {
        promises.push(
          supabase.from('auftraege')
            .select('*, kunden:kunde_id(*)')
            .eq('id', auftragId)
            .eq('company_id', member.company_id)
            .maybeSingle(),
          supabase.from('einsatz_dokumentation')
            .select('*')
            .eq('auftrag_id', auftragId)
            .eq('company_id', member.company_id)
            .maybeSingle(),
          supabase.from('einsatz_material')
            .select('*')
            .eq('auftrag_id', auftragId)
            .eq('company_id', member.company_id)
            .order('erstellt_at'),
        );
      }

      const results = await Promise.all(promises);
      const [kundenRes, coRes] = results;

      setKunden(kundenRes.data ?? []);

      // Firmeninfos zusammenführen
      const coData    = coRes?.data ?? {};
      setFirma(prev => ({
        ...prev,
        firmenname: coData.name || '',
        adresse:    coData.adresse || '',
        telefon:    coData.telefon || '',
        email:      coData.email || '',
        steuernummer: coData.steuernummer || '',
        ust_id:     coData.ust_id || '',
        iban:       coData.iban || '',
        bic:        coData.bic || '',
        bank:       coData.bank || '',
      }));
      if (coData.logo_url) setLogoUrl(coData.logo_url);
      setForm(prev => ({ ...prev, steuersatz: coData.standard_steuersatz ?? 19 }));

      // Auftragsdaten übernehmen
      if (auftragId && results.length >= 5) {
        const [, , auftragRes, dokRes, matRes] = results;
        const a   = auftragRes?.data;
        const d   = dokRes?.data;
        const mat = matRes?.data ?? [];

        if (a) {
          setAuftrag(a);
          setDok(d);
          setMaterial(mat);

          // Formular-Vorausfüllung
          const kd = a.kunden;
          setForm(prev => ({
            ...prev,
            kunde_id:        kd?.id ?? '',
            rechnungsadresse: kd?.adresse ?? '',
            leistungsdatum:  a.einsatzdatum ?? a.datum ?? '',
            betreff:         `Rechnung für ${a.typ ?? a.titel ?? 'Leistungen'} – ${a.auftragsnummer ?? ''}`.trim(),
            notizen:         d?.empfehlung?.trim() ? `Empfehlung: ${d.empfehlung}` : '',
          }));

          // Positionen aus Material + Arbeitszeit vorausfüllen
          const neuePos = [];

          // Arbeitszeit als Position
          if (d?.arbeit_start && d?.arbeit_ende) {
            const startMin = timeToMin(d.arbeit_start);
            const endeMin  = timeToMin(d.arbeit_ende);
            if (startMin != null && endeMin != null) {
              const nettoMin = Math.max(0, endeMin - startMin - (parseInt(d.pause_minuten) || 0));
              const stunden  = minZuH(nettoMin);
              if (stunden > 0) {
                neuePos.push({
                  beschreibung: 'Arbeitszeit / Einsatz',
                  menge:        stunden,
                  einheit:      'Stunden',
                  preis:        0,
                });
              }
            }
          }

          // Material-Positionen
          for (const m of mat) {
            neuePos.push({
              beschreibung: m.bezeichnung,
              menge:        parseFloat(m.menge) || 1,
              einheit:      m.einheit || 'Stk.',
              preis:        0,
            });
          }

          // Tätigkeiten als Freitext-Position
          if (d?.durchgefuehrte_arbeiten?.trim()) {
            neuePos.push({
              beschreibung: d.durchgefuehrte_arbeiten.slice(0, 120),
              menge:        1,
              einheit:      'Pauschal',
              preis:        0,
            });
          }

          if (neuePos.length > 0) {
            setPositionen(neuePos);
          }
        }
      }

      // Material aus Auftrag-Katalog laden (auftrag_material)
      if (auftragId) {
        const { data: matPos } = await supabase
          .from('auftrag_material')
          .select('*, materialien(name, einheit)')
          .eq('auftrag_id', auftragId)
          .eq('company_id', member.company_id);

        if (matPos && matPos.length > 0) {
          const neuePosi = matPos
            .filter(m => m.materialien?.name)
            .map(m => ({
              beschreibung: m.materialien.name,
              menge:        m.menge,
              einheit:      m.materialien.einheit || '',
              preis:        m.einzelpreis || 0,
            }));

          setPositionen(prev => {
            const vorhandeneBezeichnungen = new Set(prev.map(p => p.beschreibung));
            const ohneDouble = neuePosi.filter(p => !vorhandeneBezeichnungen.has(p.beschreibung));
            return [...prev, ...ohneDouble];
          });
        }
      }

      setZustand('ok');
    } catch (e) {
      console.error(e);
      setZustand('error');
    }
  }, [auftragId, router]);

  useEffect(() => { laden(); }, [laden]);

  /* ── Helpers ── */
  function onForm(k, v) { setForm(p => ({ ...p, [k]: v })); }

  const kundeObj = kunden.find(k => k.id === form.kunde_id) ?? null;

  /* ── Speichern ── */
  async function handleSpeichern() {
    if (!darf) return;
    setFehler(''); setSaving(true);
    try {
      const payload = {
        user_id:        userId,
        company_id:     companyId,
        kunde_id:       form.kunde_id || null,
        auftrag_id:     auftragId || null,
        rechnungsnummer: rechnungsNr,
        datum:          form.datum,
        faellig_am:     form.faellig_am || null,
        leistungsdatum: form.leistungsdatum || null,
        steuersatz:     Number(form.steuersatz),
        skonto:         Number(form.skonto) || 0,
        notizen:        form.notizen || null,
        bemerkungen:    form.bemerkungen || null,
        positionen,
        status:         'entwurf',
        zahlungsstatus: form.zahlungsstatus,
      };

      const { data, error } = await supabase
        .from('rechnungen')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      setGespeichert(data.id);
      setErfolg('Rechnung gespeichert.');
    } catch (e) {
      setFehler(e.message ?? 'Fehler beim Speichern');
    }
    setSaving(false);
  }

  /* ── PDF herunterladen ── */
  async function handlePDFDownload() {
    setPdfLaden(true);
    try {
      const { doc, nr } = await generatePDF({ firma, kunde: kundeObj, form, positionen, logoUrl, rechnungsnummer: rechnungsNr, auftrag });
      doc.save(`Rechnung_${nr}.pdf`);
    } catch (e) {
      setFehler('PDF konnte nicht erstellt werden: ' + e.message);
    }
    setPdfLaden(false);
  }

  /* ── PDF drucken ── */
  async function handlePDFDruck() {
    setPdfLaden(true);
    try {
      const { doc } = await generatePDF({ firma, kunde: kundeObj, form, positionen, logoUrl, rechnungsnummer: rechnungsNr, auftrag });
      doc.autoPrint();
      doc.output('dataurlnewwindow');
    } catch (e) {
      setFehler('Druck fehlgeschlagen: ' + e.message);
    }
    setPdfLaden(false);
  }

  /* ── E-Mail versenden ── */
  async function handleEmailVersenden() {
    const empfaenger = kundeObj?.email || form.email_manuell || '';
    if (!empfaenger) { setFehler('Keine E-Mail-Adresse hinterlegt.'); return; }
    setPdfLaden(true);
    setFehler('');
    try {
      const { doc, nr, brutto } = await generatePDF({ firma, kunde: kundeObj, form, positionen, logoUrl, rechnungsnummer: rechnungsNr, auftrag });
      // PDF → base64
      const ab = doc.output('arraybuffer');
      const bytes = new Uint8Array(ab);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const pdf_base64 = btoa(binary);
      // E-Mail-Inhalte
      const betreff = `Rechnung ${rechnungsNr}`;
      const emailHtml = [
        '<p>Sehr geehrte Damen und Herren,</p>',
        `<p>anbei erhalten Sie Rechnung <strong>${rechnungsNr}</strong> über <strong>${fmtEuro(brutto)}</strong>.</p>`,
        '<p>Bitte überweisen Sie den Betrag innerhalb von 14 Tagen auf folgendes Konto:</p>',
        `<p>${firma?.bank_name || ''}<br>IBAN: ${firma?.iban || ''}<br>BIC: ${firma?.bic || ''}<br>Verwendungszweck: ${rechnungsNr}</p>`,
        `<p>Mit freundlichen Grüßen,<br>${firma?.name || ''}</p>`,
      ].join('');
      // API-Call
      const res = await fetch('/api/send-dokument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: empfaenger,
          subject: betreff,
          body: emailHtml,
          pdf_base64,
          filename: `Rechnung_${rechnungsNr}.pdf`,
          dokument_typ: 'rechnung',
          dokument_id: gespeichert,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Versand fehlgeschlagen');
      // DB-Update: Versandstatus
      if (gespeichert) {
        await supabase.from('rechnungen').update({
          status: 'versendet',
          versendet_an: empfaenger,
        }).eq('id', gespeichert);
      }
      setErfolg('Rechnung erfolgreich per E-Mail versendet.');
    } catch (e) {
      setFehler('E-Mail-Versand fehlgeschlagen: ' + e.message);
    } finally {
      setPdfLaden(false);
    }
  }

  /* ── Render-Guards ── */
  if (zustand === 'loading') return <Skeleton />;

  if (zustand === 'forbidden') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <Svg d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" cls="w-10 h-10 text-red-300 mx-auto mb-3" />
        <h2 className="font-semibold text-gray-700 mb-1">Kein Zugriff</h2>
        <p className="text-sm text-gray-400 mb-4">Techniker haben keinen Zugriff auf das Rechnungsmodul.</p>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 font-medium hover:underline">Zum Dashboard</button>
      </div>
    </div>
  );

  const netto    = positionen.reduce((s, p) => s + (p.menge || 0) * (p.preis || 0), 0);
  const brutto   = netto * (1 - (form.skonto || 0) / 100) * (1 + (form.steuersatz) / 100);

  /* ── Hauptansicht ── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Vorschau-Modal */}
      {vorschau && (
        <VorschauModal
          firma={firma}
          kunde={kundeObj}
          form={form}
          positionen={positionen}
          logoUrl={logoUrl}
          rechnungsnummer={rechnungsNr}
          auftrag={auftrag}
          onClose={() => setVorschau(false)}
        />
      )}

      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition">
            <Svg d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" cls="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">Rechnung erstellen</h1>
            <p className="text-xs text-gray-400 truncate">
              {rechnungsNr || 'Entwurf'}
              {auftrag && ` · Auftrag #${auftrag.auftragsnummer ?? auftragId?.slice(0, 8)}`}
            </p>
          </div>
          {/* Aktionsbuttons Header */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setVorschau(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition">
              <Svg d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.637 0-8.572-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" cls="w-3.5 h-3.5" />
              Vorschau
            </button>
            {darf && (
              <button onClick={handleSpeichern} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                {saving
                  ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-3.5 h-3.5 animate-spin" />
                  : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-3.5 h-3.5" />}
                Speichern
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inhalt */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Alerts */}
        {fehler && <Alert type="error" onClose={() => setFehler('')}>{fehler}</Alert>}
        {erfolg && <Alert type="success" onClose={() => setErfolg('')}>{erfolg}</Alert>}

        {/* Auto-Übernahme-Banner */}
        {auftrag && (
          <Alert type="info">
            Daten wurden automatisch aus Auftrag #{auftrag.auftragsnummer ?? auftragId?.slice(0, 8)} übernommen: Kundendaten, Einsatzdatum, {material.length > 0 ? `${material.length} Materialposition${material.length !== 1 ? 'en' : ''}` : 'Materialdaten'}{dok?.arbeit_start ? ', Arbeitszeit' : ''}.
          </Alert>
        )}

        {/* Readonly-Hinweis für Disponent */}
        {!darf && hatZugriff && (
          <Alert type="amber">Sie haben nur Leserechte auf das Rechnungsmodul.</Alert>
        )}

        {/* ── 2-Spalten Layout ab sm ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Linke Spalte: Positionen + Formular */}
          <div className="lg:col-span-2 space-y-4">

            {/* 1. Rechnungsinformationen */}
            <Karte>
              <KarteHeader
                icon="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"
                title="Rechnungsinformationen"
                subtitle={`Nr. ${rechnungsNr}`}
              />
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Rechnungsdatum</Label>
                    <input type="date" value={form.datum}
                      onChange={e => { onForm('datum', e.target.value); onForm('faellig_am', addDays(e.target.value, 14)); }}
                      className={inp()} disabled={!darf} />
                  </div>
                  <div>
                    <Label>Zahlungsziel</Label>
                    <input type="date" value={form.faellig_am}
                      onChange={e => onForm('faellig_am', e.target.value)}
                      className={inp()} disabled={!darf} />
                  </div>
                  <div>
                    <Label>Leistungsdatum</Label>
                    <input type="date" value={form.leistungsdatum}
                      onChange={e => onForm('leistungsdatum', e.target.value)}
                      className={inp()} disabled={!darf} />
                  </div>
                </div>
                <div>
                  <Label>Betreff</Label>
                  <input value={form.betreff} onChange={e => onForm('betreff', e.target.value)}
                    placeholder="z. B. Rechnung für Kanalreinigung…"
                    className={inp()} disabled={!darf} />
                </div>
              </div>
            </Karte>

            {/* 2. Kunde */}
            <Karte>
              <KarteHeader
                icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                title="Rechnungsempfänger"
                badge={kundeObj ? kundeAnzeigeName(kundeObj) : 'Kein Kunde'}
                badgeColor={kundeObj ? 'green' : 'gray'}
              />
              <div className="px-5 py-4 space-y-3">
                <div>
                  <Label>Kunde auswählen</Label>
                  <select value={form.kunde_id} onChange={e => {
                    const k = kunden.find(k => k.id === e.target.value);
                    onForm('kunde_id', e.target.value);
                    if (k?.adresse) onForm('rechnungsadresse', k.adresse);
                  }}
                    className={inp()} disabled={!darf}>
                    <option value="">— Kunden wählen —</option>
                    {kunden.map(k => (
                      <option key={k.id} value={k.id}>{kundeAnzeigeName(k)}</option>
                    ))}
                  </select>
                </div>

                {kundeObj && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Kundendaten (automatisch übernommen)</p>
                    <p className="text-sm font-medium text-blue-800">{kundeAnzeigeName(kundeObj)}</p>
                    {kundeObj.adresse && <p className="text-xs text-blue-600 whitespace-pre-wrap">{kundeObj.adresse}</p>}
                    {kundeObj.email && <p className="text-xs text-blue-500">{kundeObj.email}</p>}
                    {kundeObj.telefon && <p className="text-xs text-blue-500">{kundeObj.telefon}</p>}
                  </div>
                )}

                <div>
                  <Label>Rechnungsadresse (anpassbar)</Label>
                  <textarea rows={3} value={form.rechnungsadresse}
                    onChange={e => onForm('rechnungsadresse', e.target.value)}
                    placeholder="Straße, PLZ Ort"
                    className={`${inp()} resize-none`} disabled={!darf} />
                </div>
              </div>
            </Karte>

            {/* 3. Positionen */}
            <Karte>
              <KarteHeader
                icon="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                title="Rechnungspositionen"
                subtitle={`${positionen.filter(p => p.beschreibung?.trim()).length} Positionen`}
                badge={auftrag ? 'Automatisch übernommen' : undefined}
                badgeColor="purple"
              />
              <div className="px-5 py-4">
                <PositionenEditor positionen={positionen} setPositionen={setPositionen} readonly={!darf} />
              </div>
            </Karte>

            {/* 4. Steuern / Skonto / Notizen */}
            <Karte>
              <KarteHeader
                icon="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.616 4.5 4.667V19.5a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5V4.667c0-1.05-.807-1.967-1.907-2.094A48.55 48.55 0 0012 2.25z"
                title="Abschluss & Konditionen"
              />
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Steuersatz (%)</Label>
                    <select value={form.steuersatz} onChange={e => onForm('steuersatz', Number(e.target.value))}
                      className={inp()} disabled={!darf}>
                      <option value={19}>19% (Standard)</option>
                      <option value={7}>7% (Ermäßigt)</option>
                      <option value={0}>0% (Steuerfrei)</option>
                    </select>
                  </div>
                  <div>
                    <Label>Skonto (%)</Label>
                    <input type="number" min="0" max="20" step="0.5" value={form.skonto}
                      onChange={e => onForm('skonto', e.target.value)}
                      className={inp()} disabled={!darf} />
                  </div>
                  <div>
                    <Label>Zahlungsstatus</Label>
                    <select value={form.zahlungsstatus} onChange={e => onForm('zahlungsstatus', e.target.value)}
                      className={inp()} disabled={!darf}>
                      {Object.entries(ZAHLUNGSSTATUS_CFG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Bemerkungen / Hinweise</Label>
                  <textarea rows={3} value={form.notizen}
                    onChange={e => onForm('notizen', e.target.value)}
                    placeholder="z. B. Zahlungshinweise, besondere Konditionen…"
                    className={`${inp()} resize-none`} disabled={!darf} />
                </div>
              </div>
            </Karte>
          </div>

          {/* Rechte Spalte: Summen + Aktionen */}
          <div className="space-y-4">
            {/* Summen */}
            <Karte>
              <KarteHeader title="Rechnungssumme" icon="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <div className="px-5 py-4">
                <Summen positionen={positionen} steuersatz={Number(form.steuersatz)} skonto={Number(form.skonto)} />
              </div>
            </Karte>

            {/* Aktionen */}
            <Karte>
              <KarteHeader title="Aktionen" icon="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              <div className="px-5 py-4 space-y-3">
                {/* Vorschau */}
                <button onClick={() => setVorschau(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  <Svg d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.637 0-8.572-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" cls="w-4 h-4" />
                  Vorschau anzeigen
                </button>

                {/* PDF Download */}
                <button onClick={handlePDFDownload} disabled={pdfLaden}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-60">
                  {pdfLaden
                    ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                    : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" cls="w-4 h-4" />}
                  PDF herunterladen
                </button>

                {/* Drucken */}
                <button onClick={handlePDFDruck} disabled={pdfLaden}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-60">
                  <Svg d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" cls="w-4 h-4" />
                  PDF drucken
                </button>

                {/* Speichern */}
                {darf && (
                  <button onClick={handleSpeichern} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60">
                    {saving
                      ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                      : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-4 h-4" />}
                    Rechnung speichern
                  </button>
                )}

                {/* E-Mail versenden */}
                {darf && (
                  <button onClick={handleEmailVersenden} disabled={emailSend || pdfLaden}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition disabled:opacity-60 shadow-md hover:shadow-lg">
                    {emailSend
                      ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                      : <Svg d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" cls="w-4 h-4" />}
                    Rechnung per E-Mail versenden
                  </button>
                )}

                {kundeObj?.email && (
                  <p className="text-xs text-gray-400 text-center">An: {kundeObj.email}</p>
                )}
                {!kundeObj?.email && form.kunde_id && (
                  <Alert type="amber">Für diesen Kunden ist keine E-Mail-Adresse hinterlegt.</Alert>
                )}
              </div>
            </Karte>

            {/* Auftragsdaten Übersicht */}
            {auftrag && (
              <Karte>
                <KarteHeader
                  title="Auftragsdaten"
                  icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                  badgeColor="blue"
                  badge="Automatisch"
                />
                <div className="px-5 py-4 space-y-2.5 text-xs">
                  {[
                    ['Auftragsnr.', auftrag.auftragsnummer ?? auftragId?.slice(0, 8)],
                    ['Auftragsart', auftrag.typ ?? auftrag.titel ?? '—'],
                    ['Einsatzdatum', fmtDatum(auftrag.einsatzdatum ?? auftrag.datum)],
                    ['Material Pos.', `${material.length}`],
                    ...(dok?.arbeit_start && dok?.arbeit_ende ? [['Arbeitszeit', `${dok.arbeit_start} – ${dok.arbeit_ende}`]] : []),
                  ].map(([l, v]) => (
                    <div key={l} className="flex items-start justify-between gap-2">
                      <span className="text-gray-400 shrink-0">{l}</span>
                      <span className="text-gray-700 font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </Karte>
            )}

            {/* Navigation zurück */}
            {gespeichert && (
              <button onClick={() => router.push('/dashboard/rechnungen')}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition">
                <Svg d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" cls="w-4 h-4" />
                Zur Rechnungsübersicht
              </button>
            )}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EXPORT — Wrapped in Suspense für useSearchParams
════════════════════════════════════════════════════════════════ */

export default function NeueRechnungPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <NeueRechnungInner />
    </Suspense>
  );
}
