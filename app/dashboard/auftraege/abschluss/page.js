'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ════════════════════════════════════════════════════════════════
   KONFIGURATION & TYPEN
════════════════════════════════════════════════════════════════ */

// Rollen die dieses Modul bearbeiten dürfen
const BEARBEITEN_ROLLEN = ['inhaber', 'administrator', 'buero', 'disponent'];

const FOTO_KATEGORIEN = {
  vorher:   { label: 'Vorher',   color: 'bg-blue-100 text-blue-700'   },
  nachher:  { label: 'Nachher',  color: 'bg-green-100 text-green-700' },
  schaden:  { label: 'Schaden',  color: 'bg-red-100 text-red-700'     },
  sonstige: { label: 'Sonstige', color: 'bg-gray-100 text-gray-600'   },
};

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

function fmtDatumZeit(iso) {
  if (!iso) return '—';
  return `${fmtDatum(iso)}, ${fmtZeit(iso)}`;
}

function kundeAnzeigeName(k) {
  if (!k) return '—';
  return k.kundentyp === 'firma' ? (k.firmenname ?? k.firma ?? k.name ?? '—') : (k.name ?? '—');
}

function timeToMin(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

function minZuHM(min) {
  if (min == null || isNaN(min) || min < 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}min`;
}

function berechneNettozeit(dok) {
  if (!dok?.arbeit_start || !dok?.arbeit_ende) return null;
  const start = timeToMin(dok.arbeit_start);
  const ende  = timeToMin(dok.arbeit_ende);
  if (start == null || ende == null) return null;
  const pause = parseInt(dok.pause_minuten) || 0;
  return Math.max(0, ende - start - pause);
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

function KarteHeader({ icon, title, subtitle, badge, badgeVariant = 'blue', action }) {
  const variants = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    red:    'bg-red-50 text-red-600 border-red-100',
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
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${variants[badgeVariant] ?? variants.blue}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function InfoZeile({ label, value, multi, mono }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className={`text-sm font-medium text-gray-800 ${multi ? 'whitespace-pre-wrap' : ''} ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

function CheckItem({ ok, label, critical = false }) {
  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${ok ? 'bg-green-50' : critical ? 'bg-red-50' : 'bg-amber-50'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0
        ${ok ? 'bg-green-500' : critical ? 'bg-red-400' : 'bg-amber-400'}`}>
        {ok
          ? <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3 text-white" />
          : <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-3 h-3 text-white" />}
      </div>
      <span className={`text-sm font-medium ${ok ? 'text-green-700' : critical ? 'text-red-600' : 'text-amber-700'}`}>{label}</span>
    </div>
  );
}

function Alert({ type = 'info', children }) {
  const cfg = {
    success: { wrap: 'bg-green-50 border-green-100 text-green-700', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    error:   { wrap: 'bg-red-50 border-red-100 text-red-700',       icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
    info:    { wrap: 'bg-blue-50 border-blue-100 text-blue-700',    icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z' },
    amber:   { wrap: 'bg-amber-50 border-amber-100 text-amber-700', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
  }[type] ?? { wrap: 'bg-gray-50 border-gray-100 text-gray-700', icon: '' };
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${cfg.wrap}`}>
      {cfg.icon && <Svg d={cfg.icon} cls="w-4 h-4 mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-gray-400">Auftrag wird geladen…</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   VOLLSTÄNDIGKEITSPRÜFUNG
════════════════════════════════════════════════════════════════ */

function pruefe(auftrag, dok, material, fotos) {
  const checks = [
    {
      key:      'einsatz_gestartet',
      label:    'Einsatz wurde gestartet',
      ok:       !!(dok?.einsatz_status),
      critical: true,
    },
    {
      key:      'arbeit_beendet',
      label:    'Arbeit wurde beendet',
      ok:       ['Arbeit beendet', 'Dokumentiert'].includes(dok?.einsatz_status ?? ''),
      critical: true,
    },
    {
      key:      'dokumentation',
      label:    'Tätigkeitsdokumentation vorhanden',
      ok:       !!(dok?.durchgefuehrte_arbeiten?.trim()),
      critical: true,
    },
    {
      key:      'material',
      label:    'Material erfasst oder "Kein Material verwendet"',
      ok:       !!(dok?.kein_material_verwendet || material.length > 0),
      critical: true,
    },
    {
      key:      'arbeitszeiten',
      label:    'Arbeitszeiten vollständig',
      ok:       !!(dok?.arbeit_start && dok?.arbeit_ende),
      critical: true,
    },
    {
      key:      'fotos',
      label:    'Mindestens 1 Foto vorhanden',
      ok:       fotos.length > 0,
      critical: false, // optional
    },
    {
      key:      'unterschrift',
      label:    'Kundenunterschrift vorhanden',
      ok:       !!(dok?.unterschrift_base64 && dok?.kundenname),
      critical: false,
    },
  ];

  const pflicht = checks.filter(c => c.critical);
  const allOk   = pflicht.every(c => c.ok);
  return { checks, allOk };
}

/* ════════════════════════════════════════════════════════════════
   SEKTION: AUFTRAGSINFORMATIONEN
════════════════════════════════════════════════════════════════ */

function AuftragInfoKarte({ auftrag }) {
  const k = auftrag?.kunden;
  return (
    <Karte>
      <KarteHeader
        icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
        title="Auftragsinformationen"
        subtitle={`#${auftrag?.auftragsnummer ?? auftrag?.id?.slice(0, 8)}`}
        badge={auftrag?.status}
        badgeVariant={auftrag?.status === 'abgeschlossen' ? 'green' : auftrag?.status === 'Nachbearbeitung erforderlich' ? 'red' : 'blue'}
      />
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <InfoZeile label="Kunde" value={kundeAnzeigeName(k)} />
        <InfoZeile label="Auftragsart" value={auftrag?.typ ?? auftrag?.titel ?? '—'} />
        <InfoZeile label="Ansprechpartner" value={auftrag?.ansprechpartner ?? '—'} />
        <InfoZeile label="Einsatzdatum" value={fmtDatum(auftrag?.einsatzdatum ?? auftrag?.datum)} />
        <InfoZeile label="Startzeit" value={auftrag?.startzeit ?? '—'} />
        <InfoZeile label="Priorität" value={auftrag?.prioritaet ?? '—'} />
        <div className="sm:col-span-2">
          <InfoZeile label="Einsatzadresse" value={auftrag?.adresse ?? auftrag?.einsatzort ?? '—'} />
        </div>
        {auftrag?.beschreibung && (
          <div className="sm:col-span-2">
            <InfoZeile label="Beschreibung" value={auftrag.beschreibung} multi />
          </div>
        )}
        {k?.telefon && <InfoZeile label="Telefon Kunde" value={k.telefon} />}
        {k?.email && <InfoZeile label="E-Mail Kunde" value={k.email} />}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION: EINSATZDOKUMENTATION
════════════════════════════════════════════════════════════════ */

function DokumentationKarte({ dok }) {
  if (!dok) return (
    <Karte>
      <KarteHeader icon="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" title="Tätigkeitsdokumentation" badge="Nicht vorhanden" badgeVariant="red" />
      <div className="px-5 py-6 text-center">
        <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-8 h-8 text-red-300 mx-auto mb-2" />
        <p className="text-sm text-red-500 font-medium">Keine Dokumentation vorhanden</p>
      </div>
    </Karte>
  );

  const felder = [
    { key: 'durchgefuehrte_arbeiten', label: 'Durchgeführte Arbeiten' },
    { key: 'festgestellter_schaden',  label: 'Festgestellter Schaden'  },
    { key: 'ursache',                 label: 'Ursache'                  },
    { key: 'massnahmen',              label: 'Maßnahmen'                },
    { key: 'empfehlung',              label: 'Empfehlung an Kunden'     },
  ];

  const einsatzStatusCfg = {
    'Unterwegs':      'bg-blue-50 text-blue-700 border-blue-200',
    'Vor Ort':        'bg-cyan-50 text-cyan-700 border-cyan-200',
    'In Arbeit':      'bg-amber-50 text-amber-700 border-amber-200',
    'Arbeit beendet': 'bg-orange-50 text-orange-700 border-orange-200',
    'Dokumentiert':   'bg-green-50 text-green-700 border-green-200',
  };
  const statusCls = einsatzStatusCfg[dok.einsatz_status ?? ''] ?? 'bg-gray-50 text-gray-500 border-gray-200';

  return (
    <Karte>
      <KarteHeader
        icon="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
        title="Tätigkeitsdokumentation"
        badge={dok.einsatz_status ?? 'Kein Status'}
        badgeVariant={['Arbeit beendet', 'Dokumentiert'].includes(dok.einsatz_status) ? 'green' : 'amber'}
      />
      <div className="px-5 py-4 space-y-4">
        {/* Einsatz-Status Timeline */}
        {dok.einsatz_status && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusCls}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            Einsatzstatus: {dok.einsatz_status}
            {dok.arbeit_begonnen_at && <span className="opacity-60">· seit {fmtZeit(dok.arbeit_begonnen_at)}</span>}
          </div>
        )}

        {felder.map(f => {
          const v = dok[f.key];
          if (!v?.trim()) return null;
          return (
            <div key={f.key}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{f.label}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">{v}</p>
            </div>
          );
        })}

        {/* Interne Notiz (nur für Bearbeiter sichtbar) */}
        {dok.interne_notiz?.trim() && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Interne Notiz</p>
            <p className="text-sm text-amber-700 whitespace-pre-wrap">{dok.interne_notiz}</p>
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION: MATERIAL
════════════════════════════════════════════════════════════════ */

function MaterialKarte({ dok, material }) {
  const keinMaterial = dok?.kein_material_verwendet;
  return (
    <Karte>
      <KarteHeader
        icon="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        title="Materialverbrauch"
        subtitle={keinMaterial ? 'Kein Material verwendet' : `${material.length} Position${material.length !== 1 ? 'en' : ''}`}
        badge={keinMaterial ? 'Kein Material' : material.length > 0 ? `${material.length} Pos.` : 'Leer'}
        badgeVariant={keinMaterial || material.length > 0 ? 'green' : 'amber'}
      />
      <div className="px-5 py-4">
        {keinMaterial ? (
          <div className="flex items-center gap-2.5 p-3 bg-green-50 rounded-xl border border-green-100">
            <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-sm text-green-700 font-medium">Kein Material verwendet — vom Techniker bestätigt</p>
          </div>
        ) : material.length === 0 ? (
          <div className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">Kein Material erfasst und nicht als „Kein Material verwendet" markiert</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-2 pb-1 border-b border-gray-100">
              <p className="col-span-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bezeichnung</p>
              <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Menge</p>
              <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Einheit</p>
              <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bemerkung</p>
            </div>
            {material.map((m, i) => (
              <div key={m.id ?? i} className="grid grid-cols-12 gap-2 px-2 py-2 bg-gray-50 rounded-xl border border-gray-100 items-center">
                <p className="col-span-6 text-sm font-medium text-gray-800">{m.bezeichnung}</p>
                <p className="col-span-2 text-sm text-gray-600 text-right font-mono">{m.menge}</p>
                <p className="col-span-2 text-sm text-gray-500">{m.einheit}</p>
                <p className="col-span-2 text-xs text-gray-400 truncate">{m.bemerkung ?? '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION: ARBEITSZEITEN
════════════════════════════════════════════════════════════════ */

function ArbeitszeitenKarte({ dok }) {
  const netto = berechneNettozeit(dok);
  const hatZeiten = dok?.arbeit_start && dok?.arbeit_ende;
  return (
    <Karte>
      <KarteHeader
        icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        title="Arbeitszeiten"
        badge={hatZeiten ? minZuHM(netto) + ' Netto' : 'Fehlt'}
        badgeVariant={hatZeiten ? 'green' : 'red'}
      />
      <div className="px-5 py-4">
        {!hatZeiten ? (
          <Alert type="error">Arbeitszeiten wurden nicht erfasst.</Alert>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Beginn</p>
                <p className="text-lg font-bold text-gray-800 font-mono">{dok.arbeit_start ?? '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Ende</p>
                <p className="text-lg font-bold text-gray-800 font-mono">{dok.arbeit_ende ?? '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Pause</p>
                <p className="text-lg font-bold text-gray-800 font-mono">{dok.pause_minuten ?? 0}min</p>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-xl border border-green-100 flex items-center gap-3">
              <Svg d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Netto-Arbeitszeit</p>
                <p className="text-xl font-bold text-green-700">{minZuHM(netto)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION: FOTOS
════════════════════════════════════════════════════════════════ */

function FotosKarte({ fotos }) {
  const [activePreview, setActivePreview] = useState(null);

  return (
    <Karte>
      <KarteHeader
        icon="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        title="Fotos"
        subtitle={`${fotos.length} Foto${fotos.length !== 1 ? 's' : ''} erfasst`}
        badge={fotos.length > 0 ? `${fotos.length} Fotos` : 'Keine Fotos'}
        badgeVariant={fotos.length > 0 ? 'green' : 'amber'}
      />
      <div className="px-5 py-4">
        {fotos.length === 0 ? (
          <Alert type="amber">Keine Fotos hochgeladen. Fotos sind optional, aber empfohlen.</Alert>
        ) : (
          <div className="space-y-4">
            {Object.entries(FOTO_KATEGORIEN).map(([key, cfg]) => {
              const gruppe = fotos.filter(f => f.kategorie === key);
              if (!gruppe.length) return null;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-400">{gruppe.length} Foto{gruppe.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    {gruppe.map(f => (
                      <button key={f.id} onClick={() => setActivePreview(f)}
                        className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50 hover:ring-2 hover:ring-blue-400 transition group">
                        <img src={f.url} alt={f.dateiname ?? 'Foto'} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Svg d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803zM10.5 7.5v6m3-3h-6" cls="w-5 h-5 text-white drop-shadow" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {activePreview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setActivePreview(null)}>
          <div className="relative max-w-3xl w-full max-h-screen" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActivePreview(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white">
              <Svg d="M6 18L18 6M6 6l12 12" cls="w-6 h-6" />
            </button>
            <img src={activePreview.url} alt={activePreview.dateiname ?? 'Foto'}
              className="w-full rounded-2xl shadow-2xl max-h-[80vh] object-contain" />
            <div className="mt-3 flex items-center gap-2">
              {FOTO_KATEGORIEN[activePreview.kategorie] && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FOTO_KATEGORIEN[activePreview.kategorie].color}`}>
                  {FOTO_KATEGORIEN[activePreview.kategorie].label}
                </span>
              )}
              {activePreview.dateiname && <span className="text-white/60 text-xs">{activePreview.dateiname}</span>}
            </div>
          </div>
        </div>
      )}
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION: KUNDENUNTERSCHRIFT
════════════════════════════════════════════════════════════════ */

function UnterschriftKarte({ dok }) {
  const hatUnterschrift = !!(dok?.unterschrift_base64 && dok?.kundenname);
  return (
    <Karte>
      <KarteHeader
        icon="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
        title="Kundenunterschrift"
        badge={hatUnterschrift ? 'Vorhanden' : 'Fehlt'}
        badgeVariant={hatUnterschrift ? 'green' : 'amber'}
      />
      <div className="px-5 py-4 space-y-4">
        {!hatUnterschrift ? (
          <Alert type="amber">Keine Kundenunterschrift vorhanden.</Alert>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoZeile label="Unterzeichner" value={dok.kundenname} />
              <InfoZeile label="Datum & Uhrzeit" value={fmtDatumZeit(dok.unterschrift_at)} />
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white p-2">
              <img src={dok.unterschrift_base64} alt="Kundenunterschrift"
                className="w-full max-h-32 object-contain" />
            </div>
          </>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION: VOLLSTÄNDIGKEITSPRÜFUNG
════════════════════════════════════════════════════════════════ */

function PruefungKarte({ checks, allOk }) {
  const done = checks.filter(c => c.ok).length;
  const pct  = Math.round((done / checks.length) * 100);
  return (
    <Karte className={allOk ? 'border-green-200' : 'border-amber-200'}>
      <KarteHeader
        icon="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
        title="Vollständigkeitsprüfung"
        subtitle={allOk ? 'Alle Pflichtfelder erfüllt' : `${done} von ${checks.length} Prüfungen bestanden`}
        badge={allOk ? 'Freigabe möglich' : 'Unvollständig'}
        badgeVariant={allOk ? 'green' : 'red'}
      />
      <div className="px-5 py-4 space-y-4">
        {/* Fortschrittsbalken */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Vollständigkeit</span>
            <span className={`text-sm font-bold ${pct === 100 ? 'text-green-600' : 'text-amber-600'}`}>{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          {checks.map(c => <CheckItem key={c.key} ok={c.ok} label={c.label} critical={c.critical} />)}
        </div>

        {!allOk && (
          <Alert type="error">
            <strong>Abschluss nicht möglich.</strong> Die Pflichtfelder (rot markiert) müssen zuerst durch den Techniker ergänzt werden.
          </Alert>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION: RÜCKGABE
════════════════════════════════════════════════════════════════ */

const RUECKGABE_GRUENDE = [
  'Kundenunterschrift fehlt',
  'Arbeitszeit prüfen',
  'Tätigkeitsdokumentation ergänzen',
  'Fotos fehlen / unvollständig',
  'Material nicht korrekt erfasst',
  'Einsatz nicht korrekt abgeschlossen',
  'Sonstiges',
];

function RueckgabeKarte({ onRueckgabe, saving, abgeschlossen }) {
  const [open,  setOpen]  = useState(false);
  const [grund, setGrund] = useState('');
  const [custom, setCustom] = useState('');
  const [err,   setErr]   = useState('');

  if (abgeschlossen) return null;

  function handleSenden() {
    const finalGrund = grund === 'Sonstiges' ? custom.trim() : grund;
    if (!finalGrund) { setErr('Bitte einen Grund angeben.'); return; }
    onRueckgabe(finalGrund);
    setOpen(false);
    setGrund('');
    setCustom('');
  }

  return (
    <Karte className="border-amber-100">
      <KarteHeader
        icon="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
        title="Zur Dokumentation zurückgeben"
        subtitle="Techniker muss Nacharbeit leisten"
      />
      <div className="px-5 py-4">
        {!open ? (
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-amber-200 text-amber-700 bg-amber-50 rounded-xl text-sm font-semibold hover:bg-amber-100 transition">
            <Svg d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" cls="w-4 h-4" />
            Auftrag zurückgeben
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Grund der Rückgabe *
              </label>
              <div className="space-y-2">
                {RUECKGABE_GRUENDE.map(g => (
                  <label key={g} className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="radio" name="rueckgabeGrund" value={g} checked={grund === g}
                      onChange={() => { setGrund(g); setErr(''); }}
                      className="w-4 h-4 text-amber-500 border-gray-300 focus:ring-amber-400" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{g}</span>
                  </label>
                ))}
              </div>
            </div>

            {grund === 'Sonstiges' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Eigener Grund</label>
                <textarea rows={2} value={custom} onChange={e => { setCustom(e.target.value); setErr(''); }}
                  placeholder="Beschreiben Sie den Rückgabegrund…"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            )}

            {err && <Alert type="error">{err}</Alert>}

            <div className="flex items-center gap-3">
              <button onClick={handleSenden} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-60">
                {saving
                  ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                  : <Svg d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" cls="w-4 h-4" />}
                Zurückgeben
              </button>
              <button onClick={() => { setOpen(false); setGrund(''); setErr(''); }}
                className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   SEKTION: ABSCHLUSS
════════════════════════════════════════════════════════════════ */

function AbschlussKarte({ auftrag, dok, allOk, onAbschliessen, onRechnungErstellen, saving, fehler, darf }) {
  const abgeschlossen = auftrag?.status === 'abgeschlossen';

  if (abgeschlossen) {
    return (
      <Karte className="border-green-200">
        <KarteHeader
          icon="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          title="Auftrag abgeschlossen"
          badge="Freigegeben"
          badgeVariant="green"
        />
        <div className="px-5 py-5 space-y-4">
          <div className="p-5 bg-green-50 rounded-2xl border border-green-100 text-center">
            <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-bold text-green-800 text-lg">Auftrag erfolgreich abgeschlossen</p>
            {auftrag?.abschluss_datum && (
              <p className="text-sm text-green-600 mt-1">Abgeschlossen am {fmtDatumZeit(auftrag.abschluss_datum)}</p>
            )}
            <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-2">
              <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4" />
              Für Rechnungsstellung freigegeben
            </p>
          </div>

          <button onClick={onRechnungErstellen}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-md hover:shadow-lg">
            <Svg d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" cls="w-5 h-5" />
            Rechnung erstellen
          </button>
        </div>
      </Karte>
    );
  }

  if (!darf) {
    return (
      <Karte>
        <KarteHeader
          icon="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          title="Auftrag abschließen"
          badge="Leserechte"
          badgeVariant="gray"
        />
        <div className="px-5 py-4">
          <Alert type="info">Als Techniker haben Sie nur Leserechte. Der Abschluss muss vom Büro oder der Disposition durchgeführt werden.</Alert>
        </div>
      </Karte>
    );
  }

  return (
    <Karte className={allOk ? 'border-blue-200' : 'border-gray-100'}>
      <KarteHeader
        icon="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        title="Auftrag abschließen"
        subtitle="Finale Qualitätskontrolle vor Rechnungsstellung"
      />
      <div className="px-5 py-4 space-y-4">
        {!allOk ? (
          <Alert type="error">
            Der Auftrag kann erst abgeschlossen werden, wenn alle Pflichtangaben vollständig sind. Bitte den Auftrag an den Techniker zurückgeben.
          </Alert>
        ) : (
          <Alert type="info">
            Alle Pflichtangaben sind vorhanden. Nach dem Abschluss wird der Auftrag gesperrt und für die Rechnungsstellung freigegeben.
          </Alert>
        )}

        {fehler && <Alert type="error">{fehler}</Alert>}

        <button onClick={onAbschliessen} disabled={saving || !allOk}
          className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-base font-bold transition
            ${allOk
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
          {saving
            ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-5 h-5 animate-spin" />
            : <Svg d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" cls="w-5 h-5" />}
          Auftrag abschließen & für Rechnung freigeben
        </button>
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   HAUPT-KOMPONENTE
════════════════════════════════════════════════════════════════ */

function AbschlussPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const auftragId    = searchParams.get('id');

  // ── State ──
  const [zustand,   setZustand]   = useState('loading');
  const [auftrag,   setAuftrag]   = useState(null);
  const [dok,       setDok]       = useState(null);
  const [material,  setMaterial]  = useState([]);
  const [fotos,     setFotos]     = useState([]);
  const [userRolle, setUserRolle] = useState(null);
  const [userId,    setUserId]    = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [fehler,    setFehler]    = useState('');
  const [erfolg,    setErfolg]    = useState('');

  const darf = BEARBEITEN_ROLLEN.includes(userRolle);

  /* ── Daten laden ── */
  const ladeDaten = useCallback(async () => {
    if (!auftragId) { setZustand('not_found'); return; }
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

      const erlaubt = ['inhaber', 'administrator', 'buero', 'disponent', 'techniker'];
      if (!erlaubt.includes(member.role)) { setZustand('forbidden'); return; }

      setUserRolle(member.role);
      setCompanyId(member.company_id);

      const [
        { data: auftragData, error: auftragErr },
        { data: dokData },
        { data: matData },
        { data: fotosData },
      ] = await Promise.all([
        supabase
          .from('auftraege')
          .select('*, kunden:kunde_id(id, name, firma, firmenname, kundentyp, telefon, email)')
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
      setDok(dokData ?? null);
      setMaterial(matData ?? []);
      setFotos(fotosData ?? []);
      setZustand('ok');
    } catch (e) {
      console.error(e);
      setZustand('not_found');
    }
  }, [auftragId, router]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  /* ── Aktivitätslog-Eintrag ── */
  async function logAktivitaet(aktion, details = {}) {
    try {
      await supabase.from('activity_log').insert({
        company_id: companyId,
        auftrag_id: auftragId,
        user_id:    userId,
        aktion,
        details,
        erstellt_am: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Log-Fehler:', e);
    }
  }

  /* ── Auftrag abschließen ── */
  async function handleAbschliessen() {
    setFehler('');
    setSaving(true);
    try {
      const jetzt = new Date().toISOString();

      // 1. Auftrag aktualisieren
      const { error } = await supabase
        .from('auftraege')
        .update({
          status:                    'abgeschlossen',
          abschluss_datum:           jetzt,
          abgeschlossen_von_id:      userId,
          freigegeben_fuer_rechnung: true,
          gesperrt:                  true,
        })
        .eq('id', auftragId)
        .eq('company_id', companyId);

      if (error) throw error;

      // 2. einsatz_dokumentation status updaten
      if (dok?.id) {
        await supabase
          .from('einsatz_dokumentation')
          .update({ status: 'dokumentiert', dokumentiert_at: jetzt })
          .eq('id', dok.id);
      }

      // 3. Aktivitätslog
      await logAktivitaet('Auftrag erfolgreich abgeschlossen.', {
        abschluss_datum:           jetzt,
        freigegeben_fuer_rechnung: true,
        abgeschlossen_von:         userId,
      });

      // 4. Lokalen State updaten
      setAuftrag(p => ({
        ...p,
        status:                    'Abgeschlossen',
        abschluss_datum:           jetzt,
        freigegeben_fuer_rechnung: true,
        gesperrt:                  true,
      }));
      setErfolg('Auftrag erfolgreich abgeschlossen und für die Rechnungsstellung freigegeben.');
    } catch (e) {
      setFehler(e.message ?? 'Fehler beim Abschließen des Auftrags');
    }
    setSaving(false);
  }

  /* ── Auftrag zurückgeben ── */
  async function handleRueckgabe(grund) {
    setFehler('');
    setSaving(true);
    try {
      const jetzt = new Date().toISOString();

      const { error } = await supabase
        .from('auftraege')
        .update({
          status:           'Nachbearbeitung erforderlich',
          rueckgabe_grund:  grund,
          rueckgabe_at:     jetzt,
          rueckgabe_von_id: userId,
        })
        .eq('id', auftragId)
        .eq('company_id', companyId);

      if (error) throw error;

      await logAktivitaet('Auftrag zur Nachbearbeitung zurückgegeben.', {
        rueckgabe_grund: grund,
        zurueckgegeben_von: userId,
        zurueckgegeben_am: jetzt,
      });

      setAuftrag(p => ({
        ...p,
        status:          'Nachbearbeitung erforderlich',
        rueckgabe_grund: grund,
        rueckgabe_at:    jetzt,
      }));
      setErfolg(`Auftrag zurückgegeben. Grund: "${grund}"`);
    } catch (e) {
      setFehler(e.message ?? 'Fehler beim Zurückgeben');
    }
    setSaving(false);
  }

  /* ── Zu Rechnung navigieren ── */
  function handleRechnungErstellen() {
    router.push(`/dashboard/rechnungen/neu?auftrag_id=${auftragId}`);
  }

  /* ── Vollständigkeitsprüfung ── */
  const { checks, allOk } = auftrag
    ? pruefe(auftrag, dok, material, fotos)
    : { checks: [], allOk: false };

  /* ── Render-Guards ── */
  if (zustand === 'loading') return <Skeleton />;

  if (zustand === 'forbidden') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <Svg d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008H12v-.008z" cls="w-12 h-12 text-red-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Kein Zugriff</h2>
        <p className="text-sm text-gray-400 mb-5">Sie haben keine Berechtigung für diese Seite.</p>
        <button onClick={() => router.push('/dashboard')}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Zum Dashboard
        </button>
      </div>
    </div>
  );

  if (zustand === 'not_found') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <Svg d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" cls="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Auftrag nicht gefunden</h2>
        <p className="text-sm text-gray-400 mb-5">{!auftragId ? 'Keine Auftrags-ID angegeben.' : 'Dieser Auftrag existiert nicht oder Sie haben keinen Zugriff.'}</p>
        <button onClick={() => router.push('/dashboard/auftraege')}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Zur Auftragsübersicht
        </button>
      </div>
    </div>
  );

  const istAbgeschlossen = auftrag?.status === 'abgeschlossen';
  const istZurueckgegeben = auftrag?.status === 'Nachbearbeitung erforderlich';

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
            <h1 className="text-base font-bold text-gray-900 truncate">Auftrag prüfen & abschließen</h1>
            <p className="text-xs text-gray-400 truncate">
              {auftrag?.typ ?? auftrag?.titel ?? 'Auftrag'} · #{auftrag?.auftragsnummer ?? auftragId?.slice(0, 8)}
            </p>
          </div>
          {/* Status-Badge im Header */}
          {auftrag?.status && (
            <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
              ${istAbgeschlossen ? 'bg-green-50 text-green-700 border-green-200'
                : istZurueckgegeben ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${istAbgeschlossen ? 'bg-green-500' : istZurueckgegeben ? 'bg-red-400' : 'bg-blue-500'}`} />
              {auftrag.status}
            </span>
          )}
        </div>
      </div>

      {/* Rückgabe-Banner */}
      {istZurueckgegeben && auftrag?.rueckgabe_grund && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-start gap-2.5">
            <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Nachbearbeitung erforderlich</p>
              <p className="text-xs text-amber-600 mt-0.5">Grund: {auftrag.rueckgabe_grund}</p>
              {auftrag.rueckgabe_at && <p className="text-xs text-amber-500 mt-0.5">Zurückgegeben am {fmtDatumZeit(auftrag.rueckgabe_at)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Globale Erfolgs/Fehler-Meldung */}
        {erfolg && (
          <Alert type="success">{erfolg}</Alert>
        )}

        {/* 1. Vollständigkeitsprüfung — oben anzeigen für schnellen Überblick */}
        <PruefungKarte checks={checks} allOk={allOk} />

        {/* 2. Auftragsinformationen */}
        <AuftragInfoKarte auftrag={auftrag} />

        {/* 3. Tätigkeitsdokumentation */}
        <DokumentationKarte dok={dok} />

        {/* 4. Material */}
        <MaterialKarte dok={dok} material={material} />

        {/* 5. Arbeitszeiten */}
        <ArbeitszeitenKarte dok={dok} />

        {/* 6. Fotos */}
        <FotosKarte fotos={fotos} />

        {/* 7. Kundenunterschrift */}
        <UnterschriftKarte dok={dok} />

        {/* 8. Rückgabe (nur für Bearbeiter, nur wenn noch nicht abgeschlossen) */}
        {darf && !istAbgeschlossen && (
          <RueckgabeKarte
            onRueckgabe={handleRueckgabe}
            saving={saving}
            abgeschlossen={istAbgeschlossen}
          />
        )}

        {/* 9. Abschluss */}
        <AbschlussKarte
          auftrag={auftrag}
          dok={dok}
          allOk={allOk}
          onAbschliessen={handleAbschliessen}
          onRechnungErstellen={handleRechnungErstellen}
          saving={saving}
          fehler={fehler}
          darf={darf}
        />

        <div className="h-8" />
      </div>
    </div>
  );
}

export default function AbschlussPage() {
  return <Suspense fallback={null}><AbschlussPageInner /></Suspense>;
}
