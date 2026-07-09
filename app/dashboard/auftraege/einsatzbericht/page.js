'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import { MapPin } from 'lucide-react';

/* ════════════════════════════════════════════════════════════════
   KONFIGURATION
════════════════════════════════════════════════════════════════ */

const EINSATZ_STATUS = ['Unterwegs', 'Vor Ort', 'In Arbeit', 'Arbeit beendet', 'Dokumentiert'];

const STATUS_CFG = {
  'Unterwegs':      { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200',   btn: 'bg-blue-600 hover:bg-blue-700'   },
  'Vor Ort':        { bg: 'bg-cyan-50',   text: 'text-cyan-700',   dot: 'bg-cyan-500',   border: 'border-cyan-200',   btn: 'bg-cyan-600 hover:bg-cyan-700'   },
  'In Arbeit':      { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  border: 'border-amber-200',  btn: 'bg-amber-600 hover:bg-amber-700'  },
  'Arbeit beendet': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200', btn: 'bg-orange-600 hover:bg-orange-700'},
  'Dokumentiert':   { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200',  btn: 'bg-green-600 hover:bg-green-700'  },
};

const EINHEITEN = ['Stk.', 'Meter', 'Liter', 'kg', 'Rollen', 'Paar', 'Set', 'h'];

const FOTO_KATEGORIEN = [
  { key: 'vorher',   label: 'Vorher',   color: 'bg-blue-100 text-blue-700'   },
  { key: 'nachher',  label: 'Nachher',  color: 'bg-green-100 text-green-700' },
  { key: 'schaden',  label: 'Schaden',  color: 'bg-red-100 text-red-700'     },
  { key: 'sonstige', label: 'Sonstige', color: 'bg-gray-100 text-gray-600'   },
];

/* ════════════════════════════════════════════════════════════════
   HILFSFUNKTIONEN
════════════════════════════════════════════════════════════════ */

function fmtDatum(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtZeit(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

function nowIso() { return new Date().toISOString(); }

function minZuHM(min) {
  if (min == null || isNaN(min)) return '—';
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${h}h ${m}min`;
}

function kundeAnzeigeName(k) {
  if (!k) return '—';
  return k.kundentyp === 'firma' ? (k.firmenname ?? k.name ?? '—') : (k.name ?? '—');
}

function statusTimestampKey(status) {
  const map = {
    'Unterwegs':      'unterwegs_at',
    'Vor Ort':        'vor_ort_at',
    'In Arbeit':      'arbeit_begonnen_at',
    'Arbeit beendet': 'arbeit_beendet_at',
    'Dokumentiert':   'dokumentiert_at',
  };
  return map[status] ?? null;
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

function KarteHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-50">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Svg d={icon} cls="w-4 h-4 text-blue-500" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function inp(err = false) {
  return `w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 bg-white placeholder-gray-300
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
    ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`;
}

function Label({ children }) {
  return <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{children}</label>;
}

function BtnPrimary({ onClick, disabled, loading, children, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold
        hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed ${className}`}>
      {loading ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function Alert({ type = 'success', children, onClose }) {
  const cfg = {
    success: 'bg-green-50 border-green-100 text-green-700',
    error:   'bg-red-50 border-red-100 text-red-700',
    info:    'bg-blue-50 border-blue-100 text-blue-700',
  }[type];
  const icon = {
    success: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    error:   'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    info:    'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
  }[type];
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${cfg}`}>
      <Svg d={icon} cls="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1">{children}</span>
      {onClose && <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100"><Svg d="M6 18L18 6M6 6l12 12" cls="w-3.5 h-3.5" /></button>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-gray-400">Wird geladen…</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 1 – AUFTRAGSINFORMATIONEN
════════════════════════════════════════════════════════════════ */

function InfoZeile({ label, value, multi }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className={`text-sm font-medium text-gray-800 ${multi ? 'whitespace-pre-wrap' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

function AuftragInfoSektion({ auftrag }) {
  if (!auftrag) return null;
  const kd = auftrag.kunden;
  return (
    <Karte>
      <KarteHeader
        icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
        title="Auftragsinformationen"
        subtitle={`#${auftrag.auftragsnummer ?? auftrag.id?.slice(0, 8)}`}
      />
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <InfoZeile label="Kunde" value={kundeAnzeigeName(kd)} />
        <InfoZeile label="Auftragsart" value={auftrag.typ ?? '—'} />
        <div>
          <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Adresse</dt>
          <div className="flex items-center gap-2">
            <dd className="text-sm font-medium text-gray-800">{auftrag.adresse ?? auftrag.einsatzort ?? '—'}</dd>
            {(auftrag.adresse ?? auftrag.einsatzort) && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(auftrag.adresse ?? auftrag.einsatzort)}`}
                target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-blue-500 hover:text-blue-700 transition">
                <MapPin className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        <InfoZeile label="Einsatzdatum" value={fmtDatum(auftrag.einsatzdatum)} />
        <InfoZeile label="Startzeit" value={auftrag.startzeit ?? '—'} />
        <InfoZeile label="Priorität" value={auftrag.prioritaet ?? '—'} />
        {auftrag.beschreibung && (
          <div className="sm:col-span-2">
            <InfoZeile label="Beschreibung" value={auftrag.beschreibung} multi />
          </div>
        )}
        {kd?.telefon && (
          <div>
            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Telefon Kunde</dt>
            <dd className="text-sm font-medium text-gray-800">
              <a href={`tel:${kd.telefon}`} className="text-blue-600 hover:underline">{kd.telefon}</a>
            </dd>
          </div>
        )}
        {kd?.email && <InfoZeile label="E-Mail Kunde" value={kd.email} />}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 2 – FORTSCHRITT
════════════════════════════════════════════════════════════════ */

function FortschrittSektion({ dok, material, fotos }) {
  const checks = [
    { label: 'Status gesetzt',           ok: !!dok?.einsatz_status },
    { label: 'Tätigkeiten dokumentiert', ok: !!dok?.durchgefuehrte_arbeiten },
    { label: 'Material erfasst',         ok: dok?.kein_material_verwendet || material.length > 0 },
    { label: 'Arbeitszeiten erfasst',    ok: !!dok?.arbeit_start && !!dok?.arbeit_ende },
    { label: 'Mindestens 1 Foto',        ok: fotos.length > 0 },
    { label: 'Kundenunterschrift',       ok: !!dok?.unterschrift_base64 },
    { label: 'Prüfliste ausgefüllt',     ok: dok?.werkzeug_vollstaendig && dok?.bereich_gereinigt && dok?.kunde_informiert },
  ];

  const done = checks.filter(c => c.ok).length;
  const pct  = Math.round((done / checks.length) * 100);

  return (
    <Karte>
      <KarteHeader
        icon="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        title="Dokumentationsfortschritt"
        subtitle={`${done} von ${checks.length} Schritten erledigt`}
      />
      <div className="px-5 py-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Gesamt</span>
            <span className={`text-sm font-bold ${pct === 100 ? 'text-green-600' : 'text-gray-700'}`}>{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map(c => (
            <div key={c.label} className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${c.ok ? 'bg-green-100' : 'bg-gray-100'}`}>
                {c.ok
                  ? <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3 text-green-600" />
                  : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
              </div>
              <span className={`text-sm ${c.ok ? 'text-gray-700' : 'text-gray-400'}`}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 3 – EINSATZSTATUS
════════════════════════════════════════════════════════════════ */

function EinsatzStatusSektion({ dok, onStatusChange, saving }) {
  const aktuellerStatus = dok?.einsatz_status ?? null;
  const aktIdx = EINSATZ_STATUS.indexOf(aktuellerStatus);

  return (
    <Karte>
      <KarteHeader
        icon="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
        title="Einsatzstatus"
        subtitle={aktuellerStatus ? `Aktuell: ${aktuellerStatus}` : 'Noch nicht gestartet'}
      />
      <div className="px-5 py-4 space-y-4">
        {/* Timeline */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {EINSATZ_STATUS.map((s, i) => {
            const done    = aktIdx >= i;
            const cfg     = STATUS_CFG[s];
            const tsKey   = statusTimestampKey(s);
            return (
              <div key={s} className="flex items-center gap-1 shrink-0">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition
                  ${done ? `${cfg.bg} ${cfg.text} border ${cfg.border}` : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${done ? cfg.dot : 'bg-gray-300'}`} />
                  {s}
                  {done && dok?.[tsKey] && (
                    <span className="opacity-60">· {fmtZeit(dok[tsKey])}</span>
                  )}
                </div>
                {i < EINSATZ_STATUS.length - 1 && (
                  <div className={`w-4 h-px shrink-0 ${i < aktIdx ? 'bg-gray-300' : 'bg-gray-100'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Action-Buttons */}
        <div className="flex flex-wrap gap-2">
          {EINSATZ_STATUS.map((s, i) => {
            const istAktuell   = aktuellerStatus === s;
            const istNaechster = i === aktIdx + 1;
            const istErster    = aktuellerStatus === null && i === 0;
            if (!istAktuell && !istNaechster && !istErster) return null;
            const cfg = STATUS_CFG[s];
            return (
              <button key={s} onClick={() => !istAktuell && onStatusChange(s)}
                disabled={istAktuell || saving}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition
                  ${istAktuell
                    ? `${cfg.bg} ${cfg.text} border ${cfg.border} cursor-default`
                    : `${cfg.btn} text-white shadow-sm hover:shadow-md disabled:opacity-60`}`}>
                {saving && (istNaechster || istErster)
                  ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                  : null}
                {istAktuell ? `✓ ${s}` : `→ ${s}`}
              </button>
            );
          })}
        </div>
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 4 – TÄTIGKEITSDOKUMENTATION
════════════════════════════════════════════════════════════════ */

function TaetigkeitenSektion({ form, onChange, onSave, saving, gespeichert }) {
  const felder = [
    { key: 'durchgefuehrte_arbeiten', label: 'Durchgeführte Arbeiten *', placeholder: 'Was wurde gemacht?', rows: 4, required: true },
    { key: 'festgestellter_schaden',  label: 'Festgestellter Schaden',   placeholder: 'Schäden, Mängel…',    rows: 2 },
    { key: 'ursache',                 label: 'Ursache',                   placeholder: 'Ursache des Problems…', rows: 2 },
    { key: 'massnahmen',              label: 'Maßnahmen',                 placeholder: 'Ergriffene Maßnahmen…', rows: 2 },
    { key: 'empfehlung',              label: 'Empfehlung an Kunden',      placeholder: 'Weitere Empfehlungen…', rows: 2 },
    { key: 'interne_notiz',           label: 'Interne Notiz',             placeholder: 'Interne Hinweise…',     rows: 2, internal: true },
  ];

  return (
    <Karte>
      <KarteHeader
        icon="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
        title="Tätigkeitsdokumentation"
        subtitle="Was wurde getan?"
      />
      <div className="px-5 py-4 space-y-4">
        {felder.map(f => (
          <div key={f.key}>
            <Label>
              {f.label}
              {f.internal && <span className="ml-1.5 text-xs font-normal normal-case text-gray-300">(nur intern)</span>}
            </Label>
            <textarea
              rows={f.rows}
              value={form[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={`${inp(f.required && !form[f.key])} resize-none`}
            />
          </div>
        ))}
        <div className="flex items-center gap-3 pt-1">
          <BtnPrimary onClick={onSave} loading={saving}>
            <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-4 h-4" />
            Speichern
          </BtnPrimary>
          {gespeichert && <span className="text-xs text-green-600 font-medium">✓ Gespeichert</span>}
        </div>
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 5 – MATERIAL
════════════════════════════════════════════════════════════════ */

function MaterialSektion({ material, onAdd, onDelete, keinMaterial, onKeinMaterial, saving }) {
  const [neu, setNeu]     = useState({ bezeichnung: '', menge: '1', einheit: 'Stk.', bemerkung: '' });
  const [fehler, setFehler] = useState(false);

  function handleAdd() {
    if (!neu.bezeichnung.trim()) { setFehler(true); return; }
    setFehler(false);
    onAdd({ ...neu, menge: parseFloat(neu.menge) || 1 });
    setNeu({ bezeichnung: '', menge: '1', einheit: 'Stk.', bemerkung: '' });
  }

  return (
    <Karte>
      <KarteHeader
        icon="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        title="Materialverbrauch"
        subtitle={`${material.length} Position${material.length !== 1 ? 'en' : ''}`}
      />
      <div className="px-5 py-4 space-y-4">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={keinMaterial} onChange={e => onKeinMaterial(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-gray-600">Kein Material verwendet</span>
        </label>

        {!keinMaterial && (
          <>
            {material.length > 0 && (
              <div className="space-y-2">
                {material.map((m, i) => (
                  <div key={m.id ?? i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{m.bezeichnung}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.menge} {m.einheit}{m.bemerkung ? ` · ${m.bemerkung}` : ''}</p>
                    </div>
                    <button onClick={() => onDelete(m.id ?? i)}
                      className="shrink-0 p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition">
                      <Svg d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" cls="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Position hinzufügen</p>
              <div>
                <Label>Bezeichnung *</Label>
                <input value={neu.bezeichnung}
                  onChange={e => { setNeu(p => ({ ...p, bezeichnung: e.target.value })); setFehler(false); }}
                  placeholder="z. B. HD-Schlauch 50m" className={inp(fehler && !neu.bezeichnung)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Menge</Label>
                  <input type="number" min="0" step="0.5" value={neu.menge}
                    onChange={e => setNeu(p => ({ ...p, menge: e.target.value }))}
                    className={inp()} />
                </div>
                <div>
                  <Label>Einheit</Label>
                  <select value={neu.einheit} onChange={e => setNeu(p => ({ ...p, einheit: e.target.value }))}
                    className={inp()}>
                    {EINHEITEN.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Bemerkung</Label>
                <input value={neu.bemerkung} onChange={e => setNeu(p => ({ ...p, bemerkung: e.target.value }))}
                  placeholder="Optional" className={inp()} />
              </div>
              <button onClick={handleAdd} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                <Svg d="M12 4.5v15m7.5-7.5h-15" cls="w-4 h-4" />
                Hinzufügen
              </button>
            </div>
          </>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 6 – ARBEITSZEITEN
════════════════════════════════════════════════════════════════ */

function ArbeitszeitenSektion({ form, onChange, onSave, saving, gespeichert }) {
  function parseTime(t) {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return (h * 60 + m) * 60000;
  }

  const startMs  = parseTime(form.arbeit_start);
  const endeMs   = parseTime(form.arbeit_ende);
  const nettoMin = (startMs != null && endeMs != null)
    ? Math.max(0, Math.round((endeMs - startMs) / 60000) - (parseInt(form.pause_minuten) || 0))
    : null;

  return (
    <Karte>
      <KarteHeader
        icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        title="Arbeitszeiten"
        subtitle="Erfassung der Arbeitszeit"
      />
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Arbeit Beginn</Label>
            <input type="time" value={form.arbeit_start ?? ''}
              onChange={e => onChange('arbeit_start', e.target.value)} className={inp()} />
          </div>
          <div>
            <Label>Arbeit Ende</Label>
            <input type="time" value={form.arbeit_ende ?? ''}
              onChange={e => onChange('arbeit_ende', e.target.value)} className={inp()} />
          </div>
          <div>
            <Label>Pause (Minuten)</Label>
            <input type="number" min="0" step="5" value={form.pause_minuten ?? 0}
              onChange={e => onChange('pause_minuten', e.target.value)} className={inp()} />
          </div>
        </div>

        {nettoMin != null && (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
            <Svg d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Netto-Arbeitszeit</p>
              <p className="text-lg font-bold text-green-700">{minZuHM(nettoMin)}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <BtnPrimary onClick={onSave} loading={saving}>
            <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-4 h-4" />
            Speichern
          </BtnPrimary>
          {gespeichert && <span className="text-xs text-green-600 font-medium">✓ Gespeichert</span>}
        </div>
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 7 – FOTOS
════════════════════════════════════════════════════════════════ */

function FotosSektion({ fotos, auftragId, companyId, onFotoAdded, onFotoDeleted }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [kategorie, setKategorie] = useState('vorher');
  const inputRef = useRef(null);

  async function handleUpload(files) {
    if (!files?.length) return;
    setUploading(true);
    setUploadErr('');
    try {
      for (const file of Array.from(files)) {
        const ext  = file.name.split('.').pop();
        const path = `${companyId}/${auftragId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('einsatz-fotos').upload(path, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('einsatz-fotos').getPublicUrl(path);
        const { data: fotoRow, error: insErr } = await supabase
          .from('einsatz_fotos')
          .insert({ auftrag_id: auftragId, company_id: companyId, kategorie, url: publicUrl, storage_path: path, dateiname: file.name })
          .select().single();
        if (insErr) throw insErr;
        onFotoAdded(fotoRow);
      }
    } catch (e) {
      setUploadErr(e.message ?? 'Upload fehlgeschlagen');
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete(foto) {
    if (foto.storage_path) {
      await supabase.storage.from('einsatz-fotos').remove([foto.storage_path]);
    }
    await supabase.from('einsatz_fotos').delete().eq('id', foto.id);
    onFotoDeleted(foto.id);
  }

  return (
    <Karte>
      <KarteHeader
        icon="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        title="Fotos"
        subtitle={`${fotos.length} Foto${fotos.length !== 1 ? 's' : ''}`}
      />
      <div className="px-5 py-4 space-y-4">
        {/* Kategoriewahl */}
        <div className="flex flex-wrap gap-2">
          {FOTO_KATEGORIEN.map(k => (
            <button key={k.key} onClick={() => setKategorie(k.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition
                ${kategorie === k.key ? k.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {k.label}
            </button>
          ))}
        </div>

        {/* Upload-Drop-Zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition">
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-blue-500">
              <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-6 h-6 animate-spin" />
              <p className="text-sm">Wird hochgeladen…</p>
            </div>
          ) : (
            <>
              <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-7 h-7 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Fotos hochladen</p>
              <p className="text-xs text-gray-300 mt-1">Klicken oder Dateien hierher ziehen</p>
              <p className="text-xs text-blue-500 mt-1 font-medium">Kategorie: {FOTO_KATEGORIEN.find(k => k.key === kategorie)?.label}</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
          onChange={e => handleUpload(e.target.files)} />

        {uploadErr && <Alert type="error" onClose={() => setUploadErr('')}>{uploadErr}</Alert>}

        {/* Galerie */}
        {fotos.length > 0 && (
          <div className="space-y-3">
            {FOTO_KATEGORIEN.map(k => {
              const gruppe = fotos.filter(f => f.kategorie === k.key);
              if (!gruppe.length) return null;
              return (
                <div key={k.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${k.color}`}>{k.label}</span>
                    <span className="text-xs text-gray-400">{gruppe.length} Foto{gruppe.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {gruppe.map(f => (
                      <div key={f.id} className="relative group rounded-xl overflow-hidden border border-gray-100 aspect-square bg-gray-50">
                        <img src={f.url} alt={f.dateiname ?? 'Foto'} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button onClick={() => handleDelete(f)} className="p-1.5 bg-red-500 text-white rounded-lg shadow-lg">
                            <Svg d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" cls="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 8 – KUNDENUNTERSCHRIFT (CANVAS)
════════════════════════════════════════════════════════════════ */

function UnterschriftSektion({ form, onChange, onSave, saving, gespeichert }) {
  const canvasRef = useRef(null);
  const [drawing,  setDrawing]  = useState(false);
  const [hatZeich, setHatZeich] = useState(false);
  const lastPt    = useRef(null);

  useEffect(() => {
    if (form.unterschrift_base64 && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        canvasRef.current?.getContext('2d').drawImage(img, 0, 0);
        setHatZeich(true);
      };
      img.src = form.unterschrift_base64;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  }

  function startDraw(e) { e.preventDefault(); setDrawing(true); lastPt.current = getPos(e, canvasRef.current); }

  function draw(e) {
    e.preventDefault();
    if (!drawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pt  = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    lastPt.current = pt;
    setHatZeich(true);
  }

  function stopDraw(e) {
    e.preventDefault();
    setDrawing(false);
    if (canvasRef.current) onChange('unterschrift_base64', canvasRef.current.toDataURL('image/png'));
  }

  function loeschen() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHatZeich(false);
    onChange('unterschrift_base64', null);
  }

  return (
    <Karte>
      <KarteHeader
        icon="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
        title="Kundenunterschrift"
        subtitle="Digitale Unterschrift des Kunden"
      />
      <div className="px-5 py-4 space-y-4">
        <div>
          <Label>Name des Kunden</Label>
          <input value={form.kundenname ?? ''} onChange={e => onChange('kundenname', e.target.value)}
            placeholder="Vor- und Nachname" className={inp()} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Unterschrift</Label>
            {hatZeich && (
              <button onClick={loeschen} className="text-xs text-red-400 hover:text-red-600 font-medium transition">Löschen</button>
            )}
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full cursor-crosshair"
              style={{ touchAction: 'none' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          {!hatZeich && <p className="text-xs text-gray-400 text-center mt-1">Hier unterschreiben</p>}
        </div>

        <div className="flex items-center gap-3">
          <BtnPrimary onClick={onSave} loading={saving} disabled={!hatZeich || !form.kundenname}>
            <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-4 h-4" />
            Speichern
          </BtnPrimary>
          {gespeichert && <span className="text-xs text-green-600 font-medium">✓ Unterschrift gespeichert</span>}
        </div>
        {form.unterschrift_at && (
          <p className="text-xs text-gray-400">Unterschrieben um {fmtZeit(form.unterschrift_at)}</p>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 9 – ABSCHLUSSPRÜFUNG
════════════════════════════════════════════════════════════════ */

function AbschlusspruefungSektion({ form, onChange }) {
  const checks = [
    { key: 'werkzeug_vollstaendig', label: 'Werkzeug vollständig und eingepackt' },
    { key: 'bereich_gereinigt',     label: 'Einsatzbereich gesäubert und geräumt' },
    { key: 'kunde_informiert',      label: 'Kunden über Ergebnis informiert' },
  ];
  return (
    <Karte>
      <KarteHeader
        icon="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
        title="Abschlussprüfung"
        subtitle="Checkliste vor Abschluss"
      />
      <div className="px-5 py-4 space-y-2">
        {checks.map(c => (
          <label key={c.key} className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl hover:bg-gray-50 transition">
            <input type="checkbox" checked={!!form[c.key]}
              onChange={e => onChange(c.key, e.target.checked)}
              className="w-5 h-5 rounded-lg border-gray-300 text-green-600 focus:ring-green-500" />
            <span className={`text-sm font-medium flex-1 ${form[c.key] ? 'text-gray-700' : 'text-gray-400'}`}>{c.label}</span>
            {form[c.key] && <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-4 h-4 text-green-500 shrink-0" />}
          </label>
        ))}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION 10 – DOKUMENTATION ABSCHLIESSEN
════════════════════════════════════════════════════════════════ */

function AbschlussSektion({ dok, material, fotos, onAbschliessen, saving, fehler, naechsterEinsatzId }) {
  const checks = [
    { label: 'Status gesetzt',           ok: !!dok?.einsatz_status },
    { label: 'Tätigkeiten dokumentiert', ok: !!dok?.durchgefuehrte_arbeiten },
    { label: 'Material erfasst',         ok: dok?.kein_material_verwendet || material.length > 0 },
    { label: 'Arbeitszeiten erfasst',    ok: !!dok?.arbeit_start && !!dok?.arbeit_ende },
    { label: 'Prüfliste ausgefüllt',     ok: dok?.werkzeug_vollstaendig && dok?.bereich_gereinigt && dok?.kunde_informiert },
  ];
  const allOk        = checks.every(c => c.ok);
  const abgeschlossen = dok?.status === 'dokumentiert';
  const router       = useRouter();

  return (
    <Karte className={abgeschlossen ? 'border-green-200' : ''}>
      <KarteHeader
        icon="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        title="Dokumentation abschließen"
        subtitle={abgeschlossen ? 'Einsatz abgeschlossen ✓' : 'Einsatzbericht finalisieren'}
      />
      <div className="px-5 py-4 space-y-4">
        {abgeschlossen ? (
          <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
            <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-700">Einsatzbericht abgeschlossen</p>
            {dok?.dokumentiert_at && (
              <p className="text-xs text-green-500 mt-1">Abgeschlossen um {fmtZeit(dok.dokumentiert_at)}</p>
            )}
            <div className="flex flex-col gap-2 mt-3 items-center">
              {naechsterEinsatzId ? (
                <button
                  onClick={() => router.push(`/dashboard/auftraege/${naechsterEinsatzId}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  Nächster Einsatz →
                </button>
              ) : (
                <button
                  onClick={() => router.push('/dashboard/auftraege')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  Meine Einsätze
                </button>
              )}
                <button
                  onClick={() => router.push('/dashboard/rechnungen/neu')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  Rechnung erstellen
                </button>
            </div>
          </div>
        ) : (
          <>
            {!allOk && (
              <div className="space-y-1.5 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Noch ausstehend:</p>
                {checks.filter(c => !c.ok).map(c => (
                  <div key={c.label} className="flex items-center gap-2 text-sm text-amber-600">
                    <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-4 h-4 shrink-0" />
                    {c.label}
                  </div>
                ))}
              </div>
            )}

            {fehler && <Alert type="error">{fehler}</Alert>}

            <button onClick={onAbschliessen} disabled={saving || !allOk}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition
                ${allOk
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
              {saving
                ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-5 h-5 animate-spin" />
                : <Svg d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" cls="w-5 h-5" />}
              Einsatz dokumentieren & abschließen
            </button>
          </>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   HAUPT-KOMPONENTE
════════════════════════════════════════════════════════════════ */

function EinsatzberichtPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const auftragId    = searchParams.get('id');

  // ── Core ──
  const [zustand,   setZustand]   = useState('loading');
  const [auftrag,   setAuftrag]   = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [userId,    setUserId]    = useState(null);

  const [memberId, setMemberId] = useState(null);
  const [naechsterEinsatzId, setNaechsterEinsatzId] = useState(null);
  // ── Doku-State ──
  const [dok,      setDok]      = useState(null);
  const [material, setMaterial] = useState([]);
  const [fotos,    setFotos]    = useState([]);

  // ── Formular-States ──
  const [taetForm, setTaetForm] = useState({
    durchgefuehrte_arbeiten: '', festgestellter_schaden: '',
    ursache: '', massnahmen: '', empfehlung: '', interne_notiz: '',
  });
  const [zeitForm, setZeitForm] = useState({ arbeit_start: '', arbeit_ende: '', pause_minuten: 0 });
  const [unterschrForm, setUnterschrForm] = useState({ kundenname: '', unterschrift_base64: null, unterschrift_at: null });
  const [abschlForm, setAbschlForm] = useState({
    werkzeug_vollstaendig: false, bereich_gereinigt: false,
    kunde_informiert: false, kein_material_verwendet: false,
  });

  // ── UI ──
  const [saving,         setSaving]         = useState(false);
  const [taetSaved,      setTaetSaved]      = useState(false);
  const [zeitSaved,      setZeitSaved]      = useState(false);
  const [unterschrSaved, setUnterschrSaved] = useState(false);
  const [abschlFehler,   setAbschlFehler]   = useState('');
  const [globalErr,      setGlobalErr]      = useState('');

  /* ── Daten laden ── */
  const ladeDaten = useCallback(async () => {
    if (!auftragId) { setZustand('not_found'); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data: member } = await supabase
        .from('company_members')
        .select('id, company_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!member) { setZustand('forbidden'); return; }

      const erlaubt = ['inhaber', 'administrator', 'buero', 'disponent', 'techniker'];
      if (!erlaubt.includes(member.role)) { setZustand('forbidden'); return; }

      setCompanyId(member.company_id);
      setMemberId(member.id);

      const [
        { data: auftragData, error: auftragErr },
        { data: dokData },
        { data: matData },
        { data: fotosData },
      ] = await Promise.all([
        supabase
          .from('auftraege')
          .select('*, kunden:kunde_id(id, name, firmenname, kundentyp, email, telefon)')
          .eq('id', auftragId)
          .eq('company_id', member.company_id)
          .maybeSingle(),
        supabase
          .from('einsatz_dokumentation')
          .select('*')
          .eq('auftrag_id', auftragId)
          .eq('company_id', member.company_id)
          .maybeSingle(),
        supabase
          .from('einsatz_material')
          .select('*')
          .eq('auftrag_id', auftragId)
          .eq('company_id', member.company_id)
          .order('erstellt_at'),
        supabase
          .from('einsatz_fotos')
          .select('*')
          .eq('auftrag_id', auftragId)
          .eq('company_id', member.company_id)
          .order('erstellt_at'),
      ]);

      if (auftragErr || !auftragData) { setZustand('not_found'); return; }

      setAuftrag(auftragData);
      setMaterial(matData ?? []);
      setFotos(fotosData ?? []);

      if (dokData) {
        setDok(dokData);
        setTaetForm({
          durchgefuehrte_arbeiten: dokData.durchgefuehrte_arbeiten ?? '',
          festgestellter_schaden:  dokData.festgestellter_schaden  ?? '',
          ursache:                 dokData.ursache                 ?? '',
          massnahmen:              dokData.massnahmen               ?? '',
          empfehlung:              dokData.empfehlung               ?? '',
          interne_notiz:           dokData.interne_notiz            ?? '',
        });
        setZeitForm({
          arbeit_start:  dokData.arbeit_start  ?? '',
          arbeit_ende:   dokData.arbeit_ende   ?? '',
          pause_minuten: dokData.pause_minuten ?? 0,
        });
        setUnterschrForm({
          kundenname:          dokData.kundenname          ?? '',
          unterschrift_base64: dokData.unterschrift_base64 ?? null,
          unterschrift_at:     dokData.unterschrift_at     ?? null,
        });
        setAbschlForm({
          werkzeug_vollstaendig:  dokData.werkzeug_vollstaendig  ?? false,
          bereich_gereinigt:      dokData.bereich_gereinigt      ?? false,
          kunde_informiert:       dokData.kunde_informiert       ?? false,
          kein_material_verwendet: dokData.kein_material_verwendet ?? false,
        });
      }

      setZustand('ok');
    } catch (e) {
      console.error(e);
      setZustand('not_found');
    }
  }, [auftragId, router]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  /* ── Dok holen oder anlegen ── */
  async function getDokId() {
    if (dok?.id) return dok.id;
    const { data, error } = await supabase
      .from('einsatz_dokumentation')
      .insert({ auftrag_id: auftragId, company_id: companyId, erstellt_von_id: userId })
      .select()
      .single();
    if (error) throw error;
    setDok(data);
    return data.id;
  }

  async function updateDok(fields) {
    const id = await getDokId();
    const { data, error } = await supabase
      .from('einsatz_dokumentation')
      .update({ ...fields, aktualisiert_at: nowIso() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setDok(data);
    return data;
  }

  /* ── Handler ── */
  async function handleStatusChange(neuerStatus) {
    setSaving(true);
    try {
      const tsKey  = statusTimestampKey(neuerStatus);
      const fields = { einsatz_status: neuerStatus };
      if (tsKey) fields[tsKey] = nowIso();
      await updateDok(fields);
    } catch (e) { setGlobalErr(e.message); }
    setSaving(false);
  }

  async function saveTaetigkeiten() {
    setSaving(true);
    try {
      await updateDok(taetForm);
      setTaetSaved(true);
      setTimeout(() => setTaetSaved(false), 3000);
    } catch (e) { setGlobalErr(e.message); }
    setSaving(false);
  }

  async function saveZeiten() {
    setSaving(true);
    try {
      await updateDok(zeitForm);
      setZeitSaved(true);
      setTimeout(() => setZeitSaved(false), 3000);
    } catch (e) { setGlobalErr(e.message); }
    setSaving(false);
  }

  async function saveUnterschrift() {
    setSaving(true);
    try {
      await updateDok({ ...unterschrForm, unterschrift_at: nowIso() });
      setUnterschrSaved(true);
      setTimeout(() => setUnterschrSaved(false), 3000);
    } catch (e) { setGlobalErr(e.message); }
    setSaving(false);
  }

  async function handleAbschlChange(key, val) {
    setAbschlForm(p => ({ ...p, [key]: val }));
    try { await updateDok({ [key]: val }); } catch (e) { setGlobalErr(e.message); }
  }

  async function handleKeinMaterial(val) {
    setAbschlForm(p => ({ ...p, kein_material_verwendet: val }));
    try { await updateDok({ kein_material_verwendet: val }); } catch (e) { setGlobalErr(e.message); }
  }

  async function handleMaterialAdd(pos) {
    try {
      const { data, error } = await supabase
        .from('einsatz_material')
        .insert({ ...pos, auftrag_id: auftragId, company_id: companyId })
        .select().single();
      if (error) throw error;
      setMaterial(p => [...p, data]);
    } catch (e) { setGlobalErr(e.message); }
  }

  async function handleMaterialDelete(id) {
    try {
      await supabase.from('einsatz_material').delete().eq('id', id);
      setMaterial(p => p.filter(m => m.id !== id));
    } catch (e) { setGlobalErr(e.message); }
  }

  async function handleAbschliessen() {
    setAbschlFehler('');
    setSaving(true);
    try {
      await updateDok({ status: 'dokumentiert', dokumentiert_at: nowIso() });
      await supabase.from('auftraege').update({ status: 'abgeschlossen' }).eq('id', auftragId);
      setAuftrag(p => ({ ...p, status: 'abgeschlossen' }));
      // FR-002-5: Nächsten Einsatz ermitteln
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: zugewiesene } = await supabase
        .from('auftrag_mitarbeiter')
        .select('auftrag_id, auftraege:auftrag_id(id, status, datum)')
        .eq('company_id', companyId)
        .eq('mitarbeiter_id', memberId);
      const naechsteListe = (zugewiesene || [])
        .filter(r => r.auftraege?.datum === todayStr
          && r.auftraege?.status !== 'abgeschlossen'
          && r.auftrag_id !== auftragId);
      setNaechsterEinsatzId(naechsteListe.length === 1 ? naechsteListe[0].auftrag_id : null);
    } catch (e) {
      setAbschlFehler(e.message ?? 'Fehler beim Abschließen');
    }
    setSaving(false);
  }

  /* ── Render-Guards ── */
  if (zustand === 'loading') return <Skeleton />;

  if (zustand === 'forbidden') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <Svg d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008H12v-.008z" cls="w-10 h-10 text-red-300 mx-auto mb-3" />
        <h2 className="font-semibold text-gray-700 mb-1">Kein Zugriff</h2>
        <p className="text-sm text-gray-400 mb-4">Sie haben keine Berechtigung für diese Seite.</p>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 font-medium hover:underline">Zum Dashboard</button>
      </div>
    </div>
  );

  if (zustand === 'not_found') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <Svg d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" cls="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <h2 className="font-semibold text-gray-700 mb-1">Auftrag nicht gefunden</h2>
        <p className="text-sm text-gray-400 mb-4">{!auftragId ? 'Keine Auftrags-ID angegeben.' : `Auftrag nicht gefunden.`}</p>
        <button onClick={() => router.push('/dashboard/auftraege')} className="text-sm text-blue-600 font-medium hover:underline">Zur Auftragsübersicht</button>
      </div>
    </div>
  );

  /* ── Hauptansicht ── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push(`/dashboard/auftraege/${auftragId}`)}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition">
            <Svg d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" cls="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">Einsatz & Dokumentation</h1>
            <p className="text-xs text-gray-400 truncate">
              {auftrag?.typ ?? 'Auftrag'} · #{auftrag?.auftragsnummer ?? auftragId?.slice(0, 8)}
            </p>
          </div>
          {dok?.status === 'dokumentiert' && (
            <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Abgeschlossen
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {globalErr && (
          <Alert type="error" onClose={() => setGlobalErr('')}>{globalErr}</Alert>
        )}

        <AuftragInfoSektion auftrag={auftrag} />

        <FortschrittSektion dok={dok} material={material} fotos={fotos} />

        <EinsatzStatusSektion
          dok={dok}
          onStatusChange={handleStatusChange}
          saving={saving}
        />

        <TaetigkeitenSektion
          form={taetForm}
          onChange={(k, v) => setTaetForm(p => ({ ...p, [k]: v }))}
          onSave={saveTaetigkeiten}
          saving={saving}
          gespeichert={taetSaved}
        />

        <MaterialSektion
          material={material}
          onAdd={handleMaterialAdd}
          onDelete={handleMaterialDelete}
          keinMaterial={abschlForm.kein_material_verwendet}
          onKeinMaterial={handleKeinMaterial}
          saving={saving}
        />

        <ArbeitszeitenSektion
          form={zeitForm}
          onChange={(k, v) => setZeitForm(p => ({ ...p, [k]: v }))}
          onSave={saveZeiten}
          saving={saving}
          gespeichert={zeitSaved}
        />

        <FotosSektion
          fotos={fotos}
          auftragId={auftragId}
          companyId={companyId}
          onFotoAdded={f => setFotos(p => [...p, f])}
          onFotoDeleted={id => setFotos(p => p.filter(f => f.id !== id))}
        />

        <UnterschriftSektion
          form={unterschrForm}
          onChange={(k, v) => setUnterschrForm(p => ({ ...p, [k]: v }))}
          onSave={saveUnterschrift}
          saving={saving}
          gespeichert={unterschrSaved}
        />

        <AbschlusspruefungSektion
          form={abschlForm}
          onChange={handleAbschlChange}
        />

        <AbschlussSektion
          dok={dok}
          material={material}
          fotos={fotos}
          onAbschliessen={handleAbschliessen}
          saving={saving}
          fehler={abschlFehler}
          naechsterEinsatzId={naechsterEinsatzId}
        />

        <div className="h-8" />
      </div>
    </div>
  );
}

export default function EinsatzberichtPage() {
  return <Suspense fallback={null}><EinsatzberichtPageInner /></Suspense>;
}
