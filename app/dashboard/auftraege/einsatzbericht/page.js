'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   KONFIGURATION
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

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

const FOTO_BUCKET = 'einsatz-fotos';

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   HILFSFUNKTIONEN
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function fmtDatum(iso) {
  if (!iso) return 'â';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtZeit(iso) {
  if (!iso) return 'â';
  try { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

function nowIso() { return new Date().toISOString(); }

function minZuHM(min) {
  if (min == null || isNaN(min) || min < 0) return 'â';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} Std ${m} Min`;
}

function timeDiffMin(von, bis) {
  if (!von || !bis) return 0;
  const [vh, vm] = von.split(':').map(Number);
  const [bh, bm] = bis.split(':').map(Number);
  return Math.max(0, (bh * 60 + bm) - (vh * 60 + vm));
}

function nettoArbeitszeit(start, ende, pauseBeginn, pauseEnde) {
  if (!start || !ende) return null;
  const gesamtMin = timeDiffMin(start, ende);
  const pauseMin  = timeDiffMin(pauseBeginn, pauseEnde);
  return Math.max(0, gesamtMin - pauseMin);
}

function kundeAnzeigeName(k) {
  if (!k) return 'â';
  return k.kundentyp === 'firma' ? (k.firmenname ?? k.name ?? 'â') : (k.name ?? 'â');
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

async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img  = new Image();
    const url  = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= maxWidth) { resolve(file); return; }
      const ratio  = maxWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   BASIS-KOMPONENTEN
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

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
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function KarteHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-700">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <Svg d={icon} cls="w-4 h-4 text-blue-500" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function inp(err = false) {
  return `w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-300 dark:placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
    ${err ? 'border-red-300 bg-red-50' : 'border-gray-200 dark:border-gray-600'}`;
}

function Label({ children }) {
  return <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{children}</label>;
}

function BtnPrimary({ onClick, disabled, loading, children, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{ minHeight: '44px' }}
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-gray-400">Wird geladenâ¦</p>
      </div>
    </div>
  );
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SEKTION 1 â AUFTRAGSINFORMATIONEN
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function InfoZeile({ label, value, multi }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${multi ? 'whitespace-pre-wrap' : ''}`}>{value || 'â'}</dd>
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
        <InfoZeile label="Auftragsart" value={auftrag.typ ?? auftrag.titel ?? 'â'} />
        <InfoZeile label="Adresse" value={auftrag.adresse ?? auftrag.einsatzort ?? 'â'} />
        <InfoZeile label="Einsatzdatum" value={fmtDatum(auftrag.datum ?? auftrag.einsatzdatum)} />
        <InfoZeile label="Startzeit" value={auftrag.uhrzeit ?? auftrag.startzeit ?? 'â'} />
        <InfoZeile label="PrioritÃ¤t" value={auftrag.prioritaet ?? 'â'} />
        {auftrag.beschreibung && (
          <div className="sm:col-span-2">
            <InfoZeile label="Beschreibung" value={auftrag.beschreibung} multi />
          </div>
        )}
        {kd?.telefon && <InfoZeile label="Telefon Kunde" value={kd.telefon} />}
        {kd?.email && <InfoZeile label="E-Mail Kunde" value={kd.email} />}
      </div>
    </Karte>
  );
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SEKTION 2 â FORTSCHRITT
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function FortschrittSektion({ dok, material, fotos }) {
  const checks = [
    { label: 'Status gesetzt',           ok: !!dok?.einsatz_status },
    { label: 'TÃ¤tigkeiten dokumentiert', ok: !!dok?.durchgefuehrte_arbeiten },
    { label: 'Material erfasst',         ok: dok?.kein_material_verwendet || material.length > 0 },
    { label: 'Arbeitszeiten erfasst',    ok: !!dok?.arbeit_start && !!dok?.arbeit_ende },
    { label: 'Mindestens 1 Foto',        ok: fotos.length > 0 },
    { label: 'Kundenunterschrift',       ok: !!dok?.unterschrift_base64 },
    { label: 'PrÃ¼fliste ausgefÃ¼llt',     ok: dok?.werkzeug_vollstaendig && dok?.bereich_gereinigt && dok?.kunde_informiert },
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
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Gesamt</span>
            <span className={`text-sm font-bold ${pct === 100 ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'}`}>{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map(c => (
            <div key={c.label} className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${c.ok ? 'bg-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
                {c.ok
                  ? <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3 text-green-600" />
                  : <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-500" />}
              </div>
              <span className={`text-sm ${c.ok ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Karte>
  );
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SEKTION 3 â EINSATZSTATUS
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

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
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {EINSATZ_STATUS.map((s, i) => {
            const done  = aktIdx >= i;
            const cfg   = STATUS_CFG[s];
            const tsKey = statusTimestampKey(s);
            return (
              <div key={s} className="flex items-center gap-1 shrink-0">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition
                  ${done ? `${cfg.bg} ${cfg.text} border ${cfg.border}` : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border border-gray-100 dark:border-gray-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${done ? cfg.dot : 'bg-gray-300'}`} />
                  {s}
                  {done && dok?.[tsKey] && (
                    <span className="opacity-60">Â· {fmtZeit(dok[tsKey])}</span>
                  )}
                </div>
                {i < EINSATZ_STATUS.length - 1 && (
                  <div className={`w-4 h-px shrink-0 ${i < aktIdx ? 'bg-gray-300' : 'bg-gray-100 dark:bg-gray-600'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {EINSATZ_STATUS.map((s, i) => {
            const istAktuell   = aktuellerStatus === s;
            const istNaechster = i === aktIdx + 1;
            const istErster    = aktuellerStatus === null && i === 0;
            if (!istAktuell && !istNaechster && !istErster) return null;
            const cfg = STATUS_CFG[s];
            return (
              <button key={s} onClick={() => !istAktuell && onStatusChange(s)}
                disabled={istAktuell || saving} style={{ minHeight: '44px' }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition
                  ${istAktuell
                    ? `${cfg.bg} ${cfg.text} border ${cfg.border} cursor-default`
                    : `${cfg.btn} text-white shadow-sm hover:shadow-md disabled:opacity-60`}`}>
                {saving && (istNaechster || istErster)
                  ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                  : null}
               {istAktuell ? `Aktuell: ${s}` : `Weiter: ${s}`}
              </button>
            );
          })}
        </div>
      </div>
    </Karte>
  );
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SEKTION 4  â TÃTIGKEITSDOKUMENTATION
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function TaetigkeitenSektion({ form, onChange, onSave, saving, gespeichert }) {
  const felder = [
    { key: 'durchgefuehrte_arbeiten', label: 'DurchgefÃ¼hrte Arbeiten *', placeholder: 'Was wurde gemacht?', rows: 4, required: true },
    { key: 'festgestellter_schaden',  label: 'Festgestellter Schaden',   placeholder: 'SchÃ¤den, MÃ¤ngenâ¦',    rows: 2 },
    { key: 'ursache',                 label: 'Ursache',                   placeholder: 'Ursache des Problemsâ¦', rows: 2 },
    { key: 'massnahmen',              label: 'MaÃnahmen',                 placeholder: 'Ergriffene MaÃnahmenâ¦', rows: 2 },
    { key: 'empfehlung',              label: 'Empfehlung an Kunden',      placeholder: 'Weitere Empfehlungenâ¦', rows: 2 },
    { key: 'interne_notiz',           label: 'Interne Notiz',             placeholder: 'Interne Hinweiseâ¦',     rows: 2, internal: true },
  ];

  return (
    <Karte>
      <KarteHeader
        icon="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
        title="TÃ¤tigkeitsdokumentation"
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
          {gespeichert && <span className="text-xs text-green-600 font-medium">Gespeichert</span>}
        </div>
      </div>
    </Karte>
  );
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SEKTION 5 â MATERIAL
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function MaterialSektion({ material, onAdd, onDelete, keinMaterial, onKeinMaterial, saving }) {
  const [neu, setNeu]       = useState({ bezeichnung: '', menge: '1', einheit: 'Stk.', bemerkung: '' });
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
        <label className="flex items-center gap-2.5 cursor-pointer select-none" style={{ minHeight: '44px' }}>
          <input type="checkbox" checked={keinMaterial} onChange={e => onKeinMaterial(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Kein Material verwendet</span>
        </label>

        {!keinMaterial && (
          <>
            {material.length > 0 && (
              <div className="space-y-2">
                {material.map((m, i) => (
                  <div key={m.id ?? i} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.bezeichnung}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{m.menge} {m.einheit}{m.bemerkung ? ` Â· ${m.bemerkung}` : ''}</p>
                    </div>
                    <button onClick={() => onDelete(m.id ?? i)} style={{ minHeight: '44px' }}
                      className="shrink-0 p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition">
                      <Svg d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" cls="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 space-y-3">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Position hinzufÃ¼gen</p>
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
              <button onClick={handleAdd} disabled={saving} style={{ minHeight: '44px' }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                <Svg d="M12 4.5v15m7.5-7.5h-15" cls="w-4 h-4" />
                HinzufÃ¼gen
              </button>
            </div>
          </>
        )}
      </div>
    </Karte>
  );
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SEKTION 6 â ARBEITSZEITEN (4 Felder)
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function ArbeitszeitenSektion({ form, onChange, onSave, saving, gespeichert }) {
  const nettoMin = nettoArbeitszeit(form.arbeit_start, form.arbeit_ende, form.pause_beginn, form.pause_ende);
  const pauseMin = timeDiffMin(form.pause_beginn, form.pause_ende);

  return (
    <Karte>
      <KarteHeader
        icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        title="Arbeitszeiten"
        subtitle="Erfassung der Arbeitszeit"
      />
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Startzeit</Label>
            <input type="time" value={form.arbeit_start ?? ''} style={{ minHeight: '44px' }}
              onChange={e => onChange('arbeit_start', e.target.value)} className={inp()} />
          </div>
          <div>
            <Label>Pausenbeginn</Label>
            <input type="time" value={form.pause_beginn ?? ''} style={{ minHeight: '44px' }}
              onChange={e => onChange('pause_beginn', e.target.value)} className={inp()} />
          </div>
          <div>
            <Label>Pausenende</Label>
            <input type="time" value={form.pause_ende ?? ''} style={{ minHeight: '44px' }}
              onChange={e => onChange('pause_ende', e.target.value)} className={inp()} />
          </div>
          <div>
            <Label>Endzeit</Label>
            <input type="time" value={form.arbeit_ende ?? ''} style={{ minHeight: '44px' }}
              onChange={e => onChange('arbeit_ende', e.target.value)} className={inp()} />
          </div>
        </div>

        {nettoMin != null && (
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
            <Svg d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide">Netto-Arbeitszeit</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{minZuHM(nettoMin)}</p>
              {pauseMin > 0 && (
                <p className="text-xs text-green-500 mt-0.5">Pause: {minZuHM(pauseMin)}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <BtnPrimary onClick={onSave} loading={saving}>
            <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-4 h-4" />
            Speichern
          </BtnPrimary>
          {gespeichert && <span className="text-xs text-green-600 dark:text-green-400 font-medium">Gespeichert</span>}
        </div>
      </div>
    </Karte>
  );
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SEKTION 7 â FOTODOKUMENTATION (Kamera + Galerie + Komprimierung + Zoom)
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function FotosSektion({ fotos, auftragId, companyId, onFotoAdded, onFotoDeleted }) {
  const [pending,      setPending]      = useState([]);
  const [uploading,    setUploading]    = useState(false);
  const [uploadErr,    setUploadErr]    = useState('');
  const [kategorie,    setKategorie]    = useState('vorher');
  const [fullscreenUrl, setFullscreenUrl] = useState(null);
  const kameraRef  = useRef(null);
  const galerieRef = useRef(null);

  function addFiles(files) {
    const neu = Array.from(files).map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPending(p => [...p, ...neu]);
  }

  function removePending(id) {
    setPending(p => {
      const item = p.find(x => x.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return p.filter(x => x.id !== id);
    });
  }

  async function uploadAll() {
    if (!pending.length) return;
    setUploading(true);
    setUploadErr('');
    try {
      for (const item of pending) {
        let fileToUpload = item.file;
        try { fileToUpload = await compressImage(item.file); } catch (_) { /* fallback to original */ }

        const ext  = fileToUpload.name.split('.').pop() || 'jpg';
        const path = `${companyId}/${auftragId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: upErr } = await supabase.storage.from(FOTO_BUCKET).upload(path, fileToUpload);
        if (upErr) throw new Error(upErr.message ?? 'Bucket nicht verfÃ¼gbar');

        const { data: { publicUrl } } = supabase.storage.from(FOTO_BUCKET).getPublicUrl(path);

        const { data: fotoRow, error: insErr } = await supabase
          .from('einsatz_fotos')
          .insert({ auftrag_id: auftragId, company_id: companyId, kategorie, url: publicUrl, storage_path: path, dateiname: item.file.name })
          .select().single();
        if (insErr) throw new Error(insErr.message);

        URL.revokeObjectURL(item.previewUrl);
        onFotoAdded(fotoRow);
      }
      setPending([]);
    } catch (e) {
      setUploadErr(e.message ?? 'Upload fehlgeschlagen');
    }
    setUploading(false);
  }

  async function handleDelete(foto) {
    try {
      if (foto.storage_path) {
        await supabase.storage.from(FOTO_BUCKET).remove([foto.storage_path]);
      }
      await supabase.from('einsatz_fotos').delete().eq('id', foto.id);
      onFotoDeleted(foto.id);
    } catch (_) { /* ignoriere Fehler beim LÃ¶schen */ }
  }

  return (
    <Karte>
      {fullscreenUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreenUrl(null)}
          style={{ touchAction: 'none' }}
        >
          <img src={fullscreenUrl} alt="Vollbild" className="max-w-full max-h-full object-contain rounded-xl" />
          <button
            className="absolute top-4 right-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition"
            onClick={() => setFullscreenUrl(null)}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <Svg d="M6 18L18 6M6 6l12 12" cls="w-6 h-6" />
          </button>
        </div>
      )}

      <KarteHeader
        icon="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        title="Fotodokumentation"
        subtitle={`${fotos.length} hochgeladen${pending.length > 0 ? ` Â· ${pending.length} ausstehend` : ''}`}
      />

      <div className="px-5 py-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {FOTO_KATEGORIEN.map(k => (
            <button key={k.key} onClick={() => setKategorie(k.key)} style={{ minHeight: '44px' }}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition
                ${kategorie === k.key ? k.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {k.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => kameraRef.current?.click()} style={{ minHeight: '44px' }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            <Svg d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" cls="w-5 h-5" />
            Kamera
          </button>
          <button onClick={() => galerieRef.current?.click()} style={{ minHeight: '44px' }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            <Svg d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" cls="w-5 h-5" />
            Galerie
          </button>
        </div>

        <input ref={kameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
          onChange={e => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ''; } }} />
        <input ref={galerieRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ''; } }} />

        {pending.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Vorschau â Kategorie: {FOTO_KATEGORIEN.find(k => k.key === kategorie)?.label}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {pending.map(item => (
                <div key={item.id} className="relative rounded-xl overflow-hidden aspect-square bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <img src={item.previewUrl} alt="Vorschau" className="w-full h-full object-cover" />
                  <button onClick={() => removePending(item.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md">
                    <Svg d="M6 18L18 6M6 6l12 12" cls="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={uploadAll} disabled={uploading} style={{ minHeight: '44px' }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
              {uploading
                ? <><Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" /> Wird hochgeladenâ¦</>
                : <><Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-4 h-4" />{pending.length} Foto{pending.length !== 1 ? 's' : ''} hochladen</>
              }
            </button>
          </div>
        )}

        {uploadErr && <Alert type="error" onClose={() => setUploadErr('')}>{uploadErr}</Alert>}

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
                      <div key={f.id} className="relative group rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 aspect-square bg-gray-50 dark:bg-gray-700">
                        <img src={f.url} alt={f.dateiname ?? 'Foto'} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button onClick={() => setFullscreenUrl(f.url)}
                            className="p-1.5 bg-white/20 text-white rounded-lg shadow-lg hover:bg-white/40 transition">
                            <Svg d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" cls="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(f)}
                            className="p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition">
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

        {fotos.length === 0 && pending.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">Noch keine Fotos hinzugefÃ¼gt</p>
        )}
      </div>
    </Karte>
  );
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SEKTION 8 â KUNDENUNTERSCHRIFT (Canvas)
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

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
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  }

  function startDraw(e) { e.preventDefault(); setDrawing(true); lastPt.current = getPos(e, canvasRef.current); }

  function draw(e) {
    e.preventDefault();
    if (!drawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const pt     = getPos(e, canvas);
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
            placeholder="Vor- und Nachname" className={inp()} style={{ minHeight: '44px' }} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Unterschrift</Label>
            {hatZeich && (
              <button onClick={loeschen} className="text-xs text-red-400 hover:text-red-600 font-medium transition">LÃ¶schen</button>
            )}
          </div>
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-900"
            style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full cursor-crosshair"
              style={{ touchAction: 'none' }}
              onPointerDown={startDraw}
            ÛÚ[\[ÝO^Ù]ßBÛÚ[\\^ÜÝÜ]ßBÛÚ[\X]O^ÜÝÜ]ßBÏÙ]ÈZ]ZXÚ	Û\ÜÓ[YOH^^È^YÜ^KM^XÙ[\]LHY\[\ØÚZX[ÜBÙ]]Û\ÜÓ[YOH^][\ËXÙ[\Ø\LÈ[X\HÛÛXÚÏ^ÛÛØ]_HØY[Ï^ÜØ][ßH\ØXY^ÈZ]ZXÚYÜKÝ[[[Y_OÝÈHLÈM]PLHH
KHZLËPLHHHNÍUM[KLLËKNSLÛL
H
SLLÝLËHÛÏHËMMÏÜZXÚ\Ð[X\OÙÙ\ÜZXÚ\	Ü[Û\ÜÓ[YOH^^È^YÜY[M\Î^YÜY[MÛ[YY][H[\ØÚYÙ\ÜZXÚ\ÜÜ[BÙ]ÙÜK[\ØÚYØ]	
Û\ÜÓ[YOH^^È^YÜ^KM[\ØÚYX[[HÙ]Z]
ÜK[\ØÚYØ]
_OÜ
_BÙ]ÒØ\O
NÂBÊ8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥dÑRÕSÓH8 $ÈPÐÒTÔÔ°çSÂ¸¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d
Â[Ý[ÛXØÚ\ÜÜYY[ÔÙZÝ[ÛÈÜKÛÚ[ÙHJHÂÛÛÝÚXÚÜÈHÂÈÙ^N	ÝÙ\Þ]Y×ÝÛÝY[YÉËX[	ÕÙ\Þ]YÈÛÝ0éYÈ[Z[Ù\XÚÝ	ÈKÈÙ^N	Ø\ZXÚÙÙ\Z[YÝ	ËX[	ÑZ[Ø]\ZXÚÙ\ðéX\[Ù\°é[]	ÈKÈÙ^N	ÚÝ[WÚ[ÜZY\	ËX[	ÒÝ[[0ï\\ÙX\È[ÜZY\	ÈKNÂ]\
Ø\OØ\RXY\XÛÛHNHLÍSLKHMHMHKÍSLHLÌKKÈÎKLKNLÈË
LËÍ
HËÍ
HKLK
ÈËMËÍ
HËÍ
HKLËMK
ÐLËÍ
HËÍ
HLLXËLKLÎKKËLË
LKNLØLËÍ
ËÍ
KLËMLK
ÈËÍ
HËÍ
HKLK
ËLËMLËÍ
HËÍ
HLÈLÌLKËLÎHKNLËLË
LËÍ
HËÍ
HLK
ËLËMËÍ
ËÍ
LËMLK
ÐLËÍ
ËÍ
LLØÌKÎKÈË
KNLØLËÍ
ËÍ
LËMK
ÈËÍ
ËÍ
LK
ÈËMLËÍ
HËÍ
HLHL]OHXØÚ\ÜÜ°ï[ÈÝX]OHÚXÚÛ\ÝHÜXØÚ\ÜÈÏ]Û\ÜÓ[YOHMHKMÜXÙK^KLØÚXÚÜËX\
ÈO
X[Ù^O^ØËÙ^_HÛ\ÜÓ[YOH^][\ËXÙ[\Ø\LÈÝ\ÛÜ\Ú[\Ù[XÝ[ÛHLÈÝ[Y^Ý\ËYÜ^KML\ÎÝ\ËYÜ^KMÌ[Ú][ÛÝ[O^ÞÈZ[ZYÚ	Í
	È_O[]\OHÚXÚØÞÚXÚÙY^ÈHYÜVØËÙ^W_BÛÚ[ÙO^ÙHOÛÚ[ÙJËÙ^KK\Ù]ÚXÚÙY
_BÛ\ÜÓ[YOHËMHMHÝ[Y[ÈÜ\YÜ^KLÌ^YÜY[MØÝ\Î[ËYÜY[MLÏÜ[Û\ÜÓ[YO^Ø^\ÛHÛ[YY][H^LH	ÙÜVØËÙ^WHÈ	Ý^YÜ^KMÌ\Î^YÜ^KL	È	Ý^YÜ^KM\Î^YÜ^KML	ßXOØËX[OÜÜ[ÙÜVØËÙ^WH	ÝÈHMHLÍ[

KLLËHÛÏHËMM^YÜY[MLÚ[ËLÏBÛX[
J_BÙ]ÒØ\O
NÂBÊ8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥dÑRÕSÓL8 $ÈPÐÒTÔÈ
ÈRÕSÓS¸¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d
Â[Ý[ÛXØÚ\ÜÔÙZÝ[ÛÈÚËX]\X[ÝÜËÛXØÚY\ÜÙ[ÛXÚ[ËÛYXÚÝ\Z[Ø]Ø][ËZ\JHÂÛÛÝÚXÚÜÈHÂÈX[	ÔÝ]\ÈÙ\Ù]	ËÚÎHYÚÏËZ[Ø]ÜÝ]\ÈKÈX[	Õ0éYÚÙZ][ÚÝ[Y[Y\	ËÚÎHYÚÏË\ÚÙYYZWØ\Z][KÈX[	ÓX]\X[\\ÜÝ	ËÚÎÚÏËÙZ[ÛX]\X[Ý\Ù[]X]\X[[ÝKÈX[	Ð\Z]ÞZ][\\ÜÝ	ËÚÎHYÚÏË\Z]ÜÝ\	HYÚÏË\Z]Ù[HKÈX[	Ô°ï\ÝH]\ÙÙY°ï	ËÚÎÚÏËÙ\Þ]Y×ÝÛÝY[YÈ	ÚÏË\ZXÚÙÙ\Z[YÝ	ÚÏËÝ[WÚ[ÜZY\KNÂÛÛÝ[ÚÈHÚXÚÜË]\JÈOËÚÊNÂÛÛÝXÙ\ØÚÜÜÙ[HÚÏËÝ]\ÈOOH	ÙÚÝ[Y[Y\	ÎÂ]\
Ø\HÛ\ÜÓ[YO^ØXÙ\ØÚÜÜÙ[È	ØÜ\YÜY[L\ÎÜ\YÜY[N	È	ÉßOØ\RXY\XÛÛHNHLÍSLKHMHMHKÍ[KLËMËÍLLKMNHLKMNHLËNN
LKNHLKNHÈKÍXÌ
KNLËLHHLKÈ
KMÍLKÌÌKMÈKLLKLKÌKKKLMÌKKNNLËÍLZKMLËLËNMMKLKNKLË
^]OHXØÚ\ÜÈÝX]O^ØXÙ\ØÚÜÜÙ[È	ÑZ[Ø]XÙ\ØÚÜÜÙ[È	ÑZ[Ø]\XÚ[[\ÚY\[ßBÏ]Û\ÜÓ[YOHMHKMÜXÙK^KMØXÙ\ØÚÜÜÙ[È
]Û\ÜÓ[YOHMËYÜY[ML\ÎËYÜY[NLÌÝ[Y^Ü\Ü\YÜY[LL\ÎÜ\YÜY[N^XÙ[\ÝÈHNHLÍSLKHMHMHKÍSLHLNHHLKLNHHLNÛÏHËNN^YÜY[ML^X]]ÈXLÏÛ\ÜÓ[YOHÛ\Ù[ZXÛ^YÜY[MÌ\Î^YÜY[LÌZ[Ø]\XÚXÙ\ØÚÜÜÙ[ÜÙÚÏËÚÝ[Y[Y\Ø]	
Û\ÜÓ[YOH^^È^YÜY[ML]LHXÙ\ØÚÜÜÙ[[HÙ]Z]
ÚËÚÝ[Y[Y\Ø]
_OÜ
_BÙ]]Û\ÜÓ[YOH^^XÛÛØ\LÈ]ÛÛÛXÚÏ^ÛÛXÚ[ßHÝ[O^ÞÈZ[ZYÚ	Í
	È_BÛ\ÜÓ[YOHËY[^][\ËXÙ[\\ÝYKXÙ[\Ø\LKLÈËXYKM^]Ú]HÝ[Y^^\ÛHÛ\Ù[ZXÛÝ\ËXYKMÌ[Ú][ÛÝÈHLNKHM]LXLËÍÍHËÍÍHLËÍÍKLËÍÍZLKPLKLHKLHLLËH
ËL]LKXLËÍÍHËÍÍHLËÍÍKLËÍÍR[LLÍZ
Ë[KMËHÒLLLHR
KXËKHLKLKL
LKLHKL]MËXÌKL
KLHKLHKLZLÍXËHKLKKL
KLKLKLULKXNHHNKN^ÛÏHËMMÏXÚ[ÈÜ\Z][Ø]Û]ÛÛÛXÚÏ^ÛÛYXÚÝ\Z[Ø]HÝ[O^ÞÈZ[ZYÚ	Í
	È_BÛ\ÜÓ[YOHËY[^][\ËXÙ[\\ÝYKXÙ[\Ø\LKLÈËYÜ^KLL\ÎËYÜ^KMÌ^YÜ^KMÌ\Î^YÜ^KLÝ[Y^^\ÛHÛ\Ù[ZXÛÝ\ËYÜ^KL\ÎÝ\ËYÜ^KM[Ú][ÛÝÈHLLËH
SHLLMËH
ËSLHLÈÛÏHËMMÏ°éÚÝ[Z[Ø]0í[Ø]ÛÙ]Ï
H
ÈX[ÚÈ	
]Û\ÜÓ[YOHÜXÙK^KLKHLÈËX[X\ML\ÎËX[X\NLÌÝ[Y^Ü\Ü\X[X\LL\ÎÜ\X[X\NÛ\ÜÓ[YOH^^ÈÛ\Ù[ZXÛ^X[X\MÌ\Î^X[X\LÌ\\Ø\ÙHXÚÚ[Ë]ÚYHXLØÚ]\ÜÝZ[ÜØÚXÚÜË[\ÈOXËÚÊKX\
ÈO
]Ù^O^ØËX[HÛ\ÜÓ[YOH^][\ËXÙ[\Ø\L^\ÛH^X[X\M\Î^X[X\MÝÈHLL]ËÍ[KNKÌÈËÍÍËK
KKMÈËÍÍKMËÍÍMÌXÌKÌÈLËLK
ÍKMLËÍÍLËMHËÍÎËK
LKKLËÌLKKLËNMÈMLLLMKÍZ
ÝLKÛÏHËMMÚ[ËLÏØËX[BÙ]
J_BÙ]
_BÙZ\	[\\OH\ÜÙZ\OÐ[\B]ÛÛÛXÚÏ^ÛÛXØÚY\ÜÙ[H\ØXY^ÜØ][ÈX[ÚßHÝ[O^ÞÈZ[ZYÚ	Í
	È_BÛ\ÜÓ[YO^ØËY[^][\ËXÙ[\\ÝYKXÙ[\Ø\LKLËHÝ[Y^^\ÛHÛXÛ[Ú][Û	Ø[ÚÂÈ	ØËYÜY[MÝ\ËYÜY[MÌ^]Ú]HÚYÝË[YÝ\ÚYÝË[ÉÂ	ØËYÜ^KLL\ÎËYÜ^KMÌ^YÜ^KLÌ\Î^YÜ^KMLÝ\ÛÜ[ÝX[ÝÙY	ßXOÜØ][ÂÈÝÈHLMÈKÍ
NLKSLN
HNK
MNLL
NLKMNLÈËNHËNØNHHLËËLËÓMÌHK
XNHHLLËËLËÛËNHËNLMNL]NHÛÏHËMHMH[[X]K\Ü[ÏÝÈHNHLÍSLKHMHMHKÍ[KLËMËÍLLKMNHLKMNHLËNN
LKNHLKNHÈKÍXÌ
KNLËLHHLKÈ
KMÍLKÌÌKMÈKLLKLKÌKKKLMÌKKNNLËÍLZKMLËLËNMMKLKNKLË
^ÛÏHËMHMHÏBZ[Ø]ÚÝ[Y[Y\[	XØÚYpçÙ[Ø]ÛÏ
_BÙ]ÒØ\O
NÂBÊ8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥dUTRÓÓTÓSB¸¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d8¥d
Â[Ý[ÛZ[Ø]\XÚYÙR[\
HÂÛÛÝÝ]\H\ÙTÝ]\
NÂÛÛÝÙX\Ú\[\ÈH\ÙTÙX\Ú\[\Ê
NÂÛÛÝ]YYÒYHÙX\Ú\[\ËÙ]
	ÚY	ÊNÂÛÛÝÞ\Ý[Ù]\Ý[HH\ÙTÝ]J	ÛØY[ÉÊNÂÛÛÝØ]YYËÙ]]YY×HH\ÙTÝ]J[
NÂÛÛÝØÛÛ\[RYÙ]ÛÛ\[RYHH\ÙTÝ]J[
NÂÛÛÝÝ\Ù\YÙ]\Ù\YHH\ÙTÝ]J[
NÂÛÛÝÙÚËÙ]Ú×HH\ÙTÝ]J[
NÂÛÛÝÛX]\X[Ù]X]\X[HH\ÙTÝ]J×JNÂÛÛÝÙÝÜËÙ]ÝÜ×HH\ÙTÝ]J×JNÂÛÛÝÝY]ÜKÙ]Y]ÜWHH\ÙTÝ]JÂ\ÚÙYYZWØ\Z][	ÉË\ÝÙ\Ý[\ÜØÚY[	ÉË\ØXÚN	ÉËX\ÜÛZY[	ÉË[\Z[Î	ÉË[\WÛÝ^	ÉËJNÂÛÛÝÞZ]ÜKÙ]Z]ÜWHH\ÙTÝ]JÂ\Z]ÜÝ\	ÉË]\ÙWØYÚ[	ÉË]\ÙWÙ[N	ÉË\Z]Ù[N	ÉËJNÂÛÛÝÝ[\ØÚÜKÙ][\ØÚÜWHH\ÙTÝ]JÂÝ[[[YN	ÉË[\ØÚYØ\ÙM[[\ØÚYØ][JNÂÛÛÝØXØÚÜKÙ]XØÚÜWHH\ÙTÝ]JÂÙ\Þ]Y×ÝÛÝY[YÎ[ÙK\ZXÚÙÙ\Z[YÝ[ÙKÝ[WÚ[ÜZY\[ÙKÙZ[ÛX]\X[Ý\Ù[][ÙKJNÂÛÛÝÜØ][ËÙ]Ø][×HH\ÙTÝ]J[ÙJNÂÛÛÝÝY]Ø]YÙ]Y]Ø]YHH\ÙTÝ]J[ÙJNÂÛÛÝÞZ]Ø]YÙ]Z]Ø]YHH\ÙTÝ]J[ÙJNÂÛÛÝÝ[\ØÚØ]YÙ][\ØÚØ]YHH\ÙTÝ]J[ÙJNÂÛÛÝØXØÚZ\Ù]XØÚZ\HH\ÙTÝ]J	ÉÊNÂÛÛÝÙÛØ[\Ù]ÛØ[\HH\ÙTÝ]J	ÉÊNÂÛÛÝYQ][H\ÙPØ[XÚÊ\Þ[È

HOÂY
X]YYÒY
HÈÙ]\Ý[
	ÛÝÙÝ[	ÊNÈ]\ÈBHÂÛÛÝÈ]NÈ\Ù\HHH]ØZ]Ý\X\ÙK]]Ù]\Ù\
NÂY
]\Ù\HÈÝ]\\Ú
	ËÛÙÚ[ÊNÈ]\ÈBÙ]\Ù\Y
\Ù\Y
NÂÛÛÝÈ]NY[X\HH]ØZ]Ý\X\ÙBÛJ	ØÛÛ\[WÛY[X\ÉÊBÙ[XÝ
	ØÛÛ\[WÚYÛIÊB\J	Ý\Ù\ÚY	Ë\Ù\Y
B\J	Ú\×ØXÝ]IËYJBX^XTÚ[ÛJ
NÂY
[Y[X\HÈÙ]\Ý[
	ÙÜY[ÊNÈ]\ÈBÛÛÝ\]XHÉÚ[X\Ë	ØYZ[\Ý]ÜË	ØY\ÉË	Ù\ÜÛ[	Ë	ÝXÚZÙ\×NÂY
Y\]X[ÛY\ÊY[X\ÛJJHÈÙ]\Ý[
	ÙÜY[ÊNÈ]\ÈBÙ]ÛÛ\[RY
Y[X\ÛÛ\[WÚY
NÂÛÛÝÂÈ]N]YYÑ]K\Ü]YYÑ\KÈ]NÚÑ]HKÈ]NX]]HKÈ]NÝÜÑ]HKHH]ØZ]ÛZ\ÙK[
ÂÝ\X\ÙBÛJ	Ø]YYYÙIÊBÙ[XÝ
	ÊÝ[[Ý[[ÚY
Y[YK\Y[[YKÝ[[\[XZ[[YÛB\J	ÚY	Ë]YYÒY
B\J	ØÛÛ\[WÚY	ËY[X\ÛÛ\[WÚY
BX^XTÚ[ÛJ
KÝ\X\ÙBÛJ	ÙZ[Ø]ÙÚÝ[Y[][ÛÊBÙ[XÝ
	ÊÊB\J	Ø]YY×ÚY	Ë]YYÒY
B\J	ØÛÛ\[WÚY	ËY[X\ÛÛ\[WÚY
BX^XTÚ[ÛJ
KÝ\X\ÙBÛJ	ÙZ[Ø]ÛX]\X[	ÊBÙ[XÝ
	ÊÊB\J	Ø]YY×ÚY	Ë]YYÒY
B\J	ØÛÛ\[WÚY	ËY[X\ÛÛ\[WÚY
BÜ\	Ù\Ý[Ø]	ÊKÝ\X\ÙBÛJ	ÙZ[Ø]ÙÝÜÉÊBÙ[XÝ
	ÊÊB\J	Ø]YY×ÚY	Ë]YYÒY
B\J	ØÛÛ\[WÚY	ËY[X\ÛÛ\[WÚY
BÜ\	Ù\Ý[Ø]	ÊKJNÂY
]YYÑ\X]YYÑ]JHÈÙ]\Ý[
	ÛÝÙÝ[	ÊNÈ]\ÈBÙ]]YYÊ]YYÑ]JNÂÙ]X]\X[
X]]HÏÈ×JNÂÙ]ÝÜÊÝÜÑ]HÏÈ×JNÂY
ÚÑ]JHÂÙ]ÚÊÚÑ]JNÂÙ]Y]ÜJÂ\ÚÙYYZWØ\Z][ÚÑ]K\ÚÙYYZWØ\Z][ÏÈ	ÉË\ÝÙ\Ý[\ÜØÚY[ÚÑ]K\ÝÙ\Ý[\ÜØÚY[ÏÈ	ÉË\ØXÚNÚÑ]K\ØXÚHÏÈ	ÉËX\ÜÛZY[ÚÑ]KX\ÜÛZY[ÏÈ	ÉË[\Z[ÎÚÑ]K[\Z[ÈÏÈ	ÉË[\WÛÝ^ÚÑ]K[\WÛÝ^ÏÈ	ÉËJNÂÙ]Z]ÜJÂ\Z]ÜÝ\ÚÑ]K\Z]ÜÝ\ÏÈ	ÉË]\ÙWØYÚ[	ÉË]\ÙWÙ[N	ÉË\Z]Ù[NÚÑ]K\Z]Ù[HÏÈ	ÉËJNÂÙ][\ØÚÜJÂÝ[[[YNÚÑ]KÝ[[[YHÏÈ	ÉË[\ØÚYØ\ÙMÚÑ]K[\ØÚYØ\ÙMÏÈ[[\ØÚYØ]ÚÑ]K[\ØÚYØ]ÏÈ[JNÂÙ]XØÚÜJÂÙ\Þ]Y×ÝÛÝY[YÎÚÑ]KÙ\Þ]Y×ÝÛÝY[YÈÏÈ[ÙK\ZXÚÙÙ\Z[YÝÚÑ]K\ZXÚÙÙ\Z[YÝÏÈ[ÙKÝ[WÚ[ÜZY\ÚÑ]KÝ[WÚ[ÜZY\ÏÈ[ÙKÙZ[ÛX]\X[Ý\Ù[]ÚÑ]KÙZ[ÛX]\X[Ý\Ù[]ÏÈ[ÙKJNÂBÙ]\Ý[
	ÛÚÉÊNÂHØ]Ú
JHÂÛÛÛÛK\ÜJNÂÙ]\Ý[
	ÛÝÙÝ[	ÊNÂBKØ]YYÒYÝ]\JNÂ\ÙQYXÝ


HOÈYQ][
NÈKÛYQ][JNÂ\Þ[È[Ý[ÛÙ]ÚÒY

HÂY
ÚÏËY
H]\ÚËYÂÛÛÝÈ]K\ÜHH]ØZ]Ý\X\ÙBÛJ	ÙZ[Ø]ÙÚÝ[Y[][ÛÊB[Ù\
È]YY×ÚY]YYÒYÛÛ\[WÚYÛÛ\[RY\Ý[ÝÛÚY\Ù\YJBÙ[XÝ

BÚ[ÛJ
NÂY
\ÜHÝÈ\ÜÂÙ]ÚÊ]JNÂ]\]KYÂB\Þ[È[Ý[Û\]QÚÊY[ÊHÂÛÛÝYH]ØZ]Ù]ÚÒY

NÂÛÛÝÈ]K\ÜHH]ØZ]Ý\X\ÙBÛJ	ÙZ[Ø]ÙÚÝ[Y[][ÛÊB\]JÈY[ËZÝX[\ÚY\Ø]ÝÒ\ÛÊ
HJB\J	ÚY	ËY
BÙ[XÝ

BÚ[ÛJ
NÂY
\ÜHÝÈ\ÜÂÙ]ÚÊ]JNÂ]\]NÂB\Þ[È[Ý[Û[TÝ]\ÐÚ[ÙJ]Y\Ý]\ÊHÂÙ]Ø][ÊYJNÂHÂÛÛÝÒÙ^HHÝ]\Õ[Y\Ý[\Ù^J]Y\Ý]\ÊNÂÛÛÝY[ÈHÈZ[Ø]ÜÝ]\Î]Y\Ý]\ÈNÂY
ÒÙ^JHY[ÖÝÒÙ^WHHÝÒ\ÛÊ
NÂ]ØZ]\]QÚÊY[ÊNÂHØ]Ú
JHÈÙ]ÛØ[\KY\ÜØYÙJNÈBÙ]Ø][Ê[ÙJNÂB\Þ[È[Ý[ÛØ]UY]YÚÙZ][
HÂÙ]Ø][ÊYJNÂHÂ]ØZ]\]QÚÊY]ÜJNÂÙ]Y]Ø]Y
YJNÂÙ][Y[Ý]


HOÙ]Y]Ø]Y
[ÙJKÌ
NÂHØ]Ú
JHÈÙ]ÛØ[\KY\ÜØYÙJNÈBÙ]Ø][Ê[ÙJNÂB\Þ[È[Ý[ÛØ]VZ][
HÂÙ]Ø][ÊYJNÂHÂÛÛÝ]\ÙSZ[H[YQYZ[Z]ÜK]\ÙWØYÚ[Z]ÜK]\ÙWÙ[JNÂ]ØZ]\]QÚÊÂ\Z]ÜÝ\Z]ÜK\Z]ÜÝ\[\Z]Ù[NZ]ÜK\Z]Ù[H[]\ÙWÛZ[][]\ÙSZ[JNÂÙ]Z]Ø]Y
YJNÂÙ][Y[Ý]


HOÙ]Z]Ø]Y
[ÙJKÌ
NÂHØ]Ú
JHÈÙ]ÛØ[\KY\ÜØYÙJNÈBÙ]Ø][Ê[ÙJNÂB\Þ[È[Ý[ÛØ]U[\ØÚY

HÂÙ]Ø][ÊYJNÂHÂ]ØZ]\]QÚÊÈ[\ØÚÜK[\ØÚYØ]ÝÒ\ÛÊ
HJNÂÙ][\ØÚØ]Y
YJNÂÙ][Y[Ý]


HOÙ][\ØÚØ]Y
[ÙJKÌ
NÂHØ]Ú
JHÈÙ]ÛØ[\KY\ÜØYÙJNÈBÙ]Ø][Ê[ÙJNÂB\Þ[È[Ý[Û[PXØÚÚ[ÙJÙ^K[
HÂÙ]XØÚÜJO
ÈÚÙ^WN[JJNÂHÈ]ØZ]\]QÚÊÈÚÙ^WN[JNÈHØ]Ú
JHÈÙ]ÛØ[\KY\ÜØYÙJNÈBB\Þ[È[Ý[Û[RÙZ[X]\X[
[
HÂÙ]XØÚÜJO
ÈÙZ[ÛX]\X[Ý\Ù[][JJNÂHÈ]ØZ]\]QÚÊÈÙZ[ÛX]\X[Ý\Ù[][JNÈHØ]Ú
JHÈÙ]ÛØ[\KY\ÜØYÙJNÈBB\Þ[È[Ý[Û[SX]\X[Y
ÜÊHÂHÂÛÛÝÈ]K\ÜHH]ØZ]Ý\X\ÙBÛJ	ÙZ[Ø]ÛX]\X[	ÊB[Ù\
ÈÜË]YY×ÚY]YYÒYÛÛ\[WÚYÛÛ\[RYJBÙ[XÝ

KÚ[ÛJ
NÂY
\ÜHÝÈ\ÜÂÙ]X]\X[
OË]WJNÂHØ]Ú
JHÈÙ]ÛØ[\KY\ÜØYÙJNÈBB\Þ[È[Ý[Û[SX]\X[[]JY
HÂHÂ]ØZ]Ý\X\ÙKÛJ	ÙZ[Ø]ÛX]\X[	ÊK[]J
K\J	ÚY	ËY
NÂÙ]X]\X[
O[\HOKYOOHY
JNÂHØ]Ú
JHÈÙ]ÛØ[\KY\ÜØYÙJNÈBB\Þ[È[Ý[Û[PXØÚY\ÜÙ[
HÂÙ]XØÚZ\	ÉÊNÂÙ]Ø][ÊYJNÂHÂ]ØZ]\]QÚÊÈÝ]\Î	ÙÚÝ[Y[Y\	ËÚÝ[Y[Y\Ø]ÝÒ\ÛÊ
HJNÂ]ØZ]Ý\X\ÙKÛJ	Ø]YYYÙIÊK\]JÈÝ]\Î	ÐXÙ\ØÚÜÜÙ[ÈJK\J	ÚY	Ë]YYÒY
NÂÙ]]YYÊO
ÈÝ]\Î	ÐXÙ\ØÚÜÜÙ[ÈJJNÂHØ]Ú
JHÂÙ]XØÚZ\KY\ÜØYÙHÏÈ	ÑZ\Z[HXØÚYpçÙ[ÊNÂBÙ]Ø][Ê[ÙJNÂB[Ý[Û[TXÚ[ÕÜ\Z][
HÂÝ]\\Ú
Ù\ÚØ\ÜXÚ[Ù[Û]OØ]YY×ÚYIØ]YYÒYX
NÂB\Þ[È[Ý[Û[SYXÚÝ\Z[Ø]
HÂHÂÛÛÝ]]HH]YYÏË][HÏÈ]È]J
KÒTÓÔÝ[Ê
KÛXÙJL
NÂÛÛÝÈ]HHH]ØZ]Ý\X\ÙBÛJ	Ø]YYYÙIÊBÙ[XÝ
	ÚY	ÊB\J	ØÛÛ\[WÚY	ËÛÛ\[RY
B\J	Ù][IË]]JB\J	ÚY	Ë]YYÒY
BÝ
	ÜÝ]\ÉË	Ú[Ë	ÊXÙ\ØÚÜÜÙ[ÚÝ[Y[Y\IÊBÜ\	ÝZZ]	ËÈ\ØÙ[[ÎYHJB[Z]
JBX^XTÚ[ÛJ
NÂY
]OËY
HÂÝ]\\Ú
Ù\ÚØ\Ø]YYYÙKÉÙ]KYX
NÂH[ÙHÂÙ]ÛØ[\	ÒÙZ[ÙZ]\\Z[Ø]°ï]]HÙY[[ÊNÂÙ][Y[Ý]


HOÙ]ÛØ[\	ÉÊK

NÂBHØ]Ú
JHÂÙ]ÛØ[\KY\ÜØYÙHÏÈ	ÑZ\Z[HÝXÚ[\È°éÚÝ[Z[Ø]\ÉÊNÂBBY
\Ý[OOH	ÛØY[ÉÊH]\ÚÙ[]ÛÏÂY
\Ý[OOH	ÙÜY[ÊH]\
]Û\ÜÓ[YOHZ[Z\ØÜY[ËYÜ^KML\ÎËYÜ^KNL^][\ËXÙ[\\ÝYKXÙ[\M]Û\ÜÓ[YOH^XÙ[\ÝÈHLL]ËÍ[LLLÍLLKMNHLKMNHLËNN
LKNHLKNHÈKÍXÌ
KNLËLHHLKÈ
KMÍLKÌÌKMÈKLLKLKÌKKKLMÌKKNNLËÍLZKMLËLËNMMKLKNKLË
LLËÍLKÛÏHËLLLL^\YLÌ^X]]ÈXLÈÏÛ\ÜÓ[YOHÛ\Ù[ZXÛ^YÜ^KMÌ\Î^YÜ^KLXLHÙZ[YÜYÚÛ\ÜÓ[YOH^\ÛH^YÜ^KMXMÚYHX[ÙZ[H\XÚYÝ[È°ïY\ÙHÙZ]KÜ]ÛÛÛXÚÏ^Ê
HOÝ]\\Ú
	ËÙ\ÚØ\	Ê_HÛ\ÜÓ[YOH^\ÛH^XYKMÛ[YY][HÝ\[\[H[H\ÚØ\Ø]ÛÙ]Ù]
NÂY
\Ý[OOH	ÛÝÙÝ[	ÊH]\
]Û\ÜÓ[YOHZ[Z\ØÜY[ËYÜ^KML\ÎËYÜ^KNL^][\ËXÙ[\\ÝYKXÙ[\M]Û\ÜÓ[YOH^XÙ[\ÝÈHLNKHM]LXLËÍÍHËÍÍHLËÍÍKLËÍÍZLKPLKLHKLHLLËH
ËL]LKXLËÍÍHËÍÍHLËÍÍKLËÍÍR[MÍHL[LKKLL
KXËKHLKLKL
LKLHKL]MËXÌKL
KLHKLHKLZLÍXËHKLKKL
KLKLKLULKXNHHNKN^ÛÏHËLLLL^YÜ^KL^X]]ÈXLÈÏÛ\ÜÓ[YOHÛ\Ù[ZXÛ^YÜ^KMÌ\Î^YÜ^KLXLH]YYÈXÚÙY[[ÚÛ\ÜÓ[YOH^\ÛH^YÜ^KMXMÈX]YYÒYÈ	ÒÙZ[H]YYÜËRQ[ÙYÙX[È	Ð]YYÈXÚÙY[[ßOÜ]ÛÛÛXÚÏ^Ê
HOÝ]\\Ú
	ËÙ\ÚØ\Ø]YYYÙIÊ_HÛ\ÜÓ[YOH^\ÛH^XYKMÛ[YY][HÝ\[\[H\]YYÜðï\ÚXÚØ]ÛÙ]Ù]
NÂ]\
]Û\ÜÓ[YOHZ[Z\ØÜY[ËYÜ^KML\ÎËYÜ^KNL]Û\ÜÓ[YOHË]Ú]H\ÎËYÜ^KNÜ\XÜ\YÜ^KLL\ÎÜ\YÜ^KMÌÝXÚÞHÜLLÌ]Û\ÜÓ[YOHX^]ËLÞ^X]]ÈMKLÈ^][\ËXÙ[\Ø\LÈ]ÛÛÛXÚÏ^Ê
HOÝ]\\Ú
Ù\ÚØ\Ø]YYYÙKÉØ]YYÒYX
_HÝ[O^ÞÈZ[ZYÚ	Í
	ËZ[ÚY	Í
	È_BÛ\ÜÓ[YOHLÝ[Y^^YÜ^KMÝ\ËYÜ^KML\ÎÝ\ËYÜ^KMÌÝ\^YÜ^KM[Ú][ÛÝÈHLLHNKSÈLL
ËKMËSLÈLNÛÏHËMHMHÏØ]Û]Û\ÜÓ[YOH^LHZ[]ËLHÛ\ÜÓ[YOH^X\ÙHÛXÛ^YÜ^KNL\Î^]Ú]H[Ø]HZ[Ø]	ÚÝ[Y[][ÛÚOÛ\ÜÓ[YOH^^È^YÜ^KM[Ø]HØ]YYÏË\ÏÈ]YYÏË][ÏÈ	Ð]YYÉßH0­ÈÞØ]YYÏË]YYÜÛ[[Y\ÏÈ]YYÒYËÛXÙJ
_BÜÙ]ÙÚÏËÝ]\ÈOOH	ÙÚÝ[Y[Y\	È	
Ü[Û\ÜÓ[YOHÚ[ËL^][\ËXÙ[\Ø\LKHLHKLHÝ[YY[^^ÈÛ\Ù[ZXÛËYÜY[ML^YÜY[MÌÜ\Ü\YÜY[LÜ[Û\ÜÓ[YOHËLKHLKHÝ[YY[ËYÜY[MLÏXÙ\ØÚÜÜÙ[ÜÜ[
_BÙ]Ù]]Û\ÜÓ[YOHX^]ËLÞ^X]]ÈMKMHÜXÙK^KMÙÛØ[\	
[\\OH\ÜÛÛÜÙO^Ê
HOÙ]ÛØ[\	ÉÊ_OÙÛØ[\OÐ[\
_B]YYÒ[ÔÙZÝ[Û]YYÏ^Ø]YYßHÏÜØÚ]ÙZÝ[ÛÚÏ^ÙÚßHX]\X[^ÛX]\X[HÝÜÏ^ÙÝÜßHÏZ[Ø]Ý]\ÔÙZÝ[ÛÚÏ^ÙÚßBÛÝ]\ÐÚ[ÙO^Ú[TÝ]\ÐÚ[Ù_BØ][Ï^ÜØ][ßBÏY]YÚÙZ][ÙZÝ[ÛÜO^ÝY]Ü_BÛÚ[ÙO^ÊËHOÙ]Y]ÜJO
ÈÚ×NJJ_BÛØ]O^ÜØ]UY]YÚÙZ][BØ][Ï^ÜØ][ßBÙ\ÜZXÚ\^ÝY]Ø]YBÏX]\X[ÙZÝ[ÛX]\X[^ÛX]\X[BÛY^Ú[SX]\X[YBÛ[]O^Ú[SX]\X[[]_BÙZ[X]\X[^ØXØÚÜKÙZ[ÛX]\X[Ý\Ù[]BÛÙZ[X]\X[^Ú[RÙZ[X]\X[BØ][Ï^ÜØ][ßBÏ\Z]ÞZ][ÙZÝ[ÛÜO^ÞZ]Ü_BÛÚ[ÙO^ÊËHOÙ]Z]ÜJO
ÈÚ×NJJ_BÛØ]O^ÜØ]VZ][BØ][Ï^ÜØ][ßBÙ\ÜZXÚ\^ÞZ]Ø]YBÏÝÜÔÙZÝ[ÛÝÜÏ^ÙÝÜßB]YYÒY^Ø]YYÒYBÛÛ\[RY^ØÛÛ\[RYBÛÝÐYY^ÙOÙ]ÝÜÊOËJ_BÛÝÑ[]Y^ÚYOÙ]ÝÜÊO[\OYOOHY
J_BÏ[\ØÚYÙZÝ[ÛÜO^Ý[\ØÚÜ_BÛÚ[ÙO^ÊËHOÙ][\ØÚÜJO
ÈÚ×NJJ_BÛØ]O^ÜØ]U[\ØÚYBØ][Ï^ÜØ][ßBÙ\ÜZXÚ\^Ý[\ØÚØ]YBÏXØÚ\ÜÜYY[ÔÙZÝ[ÛÜO^ØXØÚÜ_BÛÚ[ÙO^Ú[PXØÚÚ[Ù_BÏXØÚ\ÜÔÙZÝ[ÛÚÏ^ÙÚßBX]\X[^ÛX]\X[BÝÜÏ^ÙÝÜßBÛXØÚY\ÜÙ[^Ú[PXØÚY\ÜÙ[BÛXÚ[Ï^Ú[TXÚ[ÕÜ\Z][BÛYXÚÝ\Z[Ø]^Ú[SYXÚÝ\Z[Ø]BØ][Ï^ÜØ][ßBZ\^ØXØÚZ\BÏ]Û\ÜÓ[YOHNÏÙ]Ù]
NÂB^ÜY][[Ý[ÛZ[Ø]\XÚYÙJ
HÂ]\Ý\Ü[ÙH[XÚÏ^Û[OZ[Ø]\XÚYÙR[\ÏÔÝ\Ü[ÙOÂB
