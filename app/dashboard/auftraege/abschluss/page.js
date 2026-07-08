'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   KONFIGURATION & TYPEN
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

// Rollen die dieses Modul bearbeiten dÃ¼rfen
const BEARBEITEN_ROLLEN = ['inhaber', 'administrator', 'buero', 'disponent'];

const FOTO_KATEGORIEN = {
  vorher:   { label: 'Vorher',   color: 'bg-blue-100 text-blue-700'   },
  nachher:  { label: 'Nachher',  color: 'bg-green-100 text-green-700' },
  schaden:  { label: 'Schaden',  color: 'bg-red-100 text-red-700'     },
  sonstige: { label: 'Sonstige', color: 'bg-gray-100 text-gray-600'   },
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HILFSFUNKTIONEN
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function fmtDatum(iso) {
  if (!iso) return 'â€”';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtZeit(iso) {
  if (!iso) return 'â€”';
  try { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

function fmtDatumZeit(iso) {
  if (!iso) return 'â€”';
  return `${fmtDatum(iso)}, ${fmtZeit(iso)}`;
}

function kundeAnzeigeName(k) {
  if (!k) return 'â€”';
  return k.kundentyp === 'firma' ? (k.firmenname ?? k.firma ?? k.name ?? 'â€”') : (k.name ?? 'â€”');
}

function timeToMin(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

function minZuHM(min) {
  if (min == null || isNaN(min) || min < 0) return 'â€”';
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BASIS-KOMPONENTEN
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
        {value || 'â€”'}
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
        <p className="text-sm text-gray-400">Auftrag wird geladenâ€¦</p>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   VOLLSTÃ„NDIGKEITSPRÃœFUNG
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
      label:    'TÃ¤tigkeitsdokumentation vorhanden',
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
      label:    'Arbeitszeiten vollstÃ¤ndig',
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEKTION: AUFTRAGSINFORMATIONEN
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
        <InfoZeile label="Auftragsart" value={auftrag?.typ ?? auftrag?.titel ?? 'â€”'} />
        <InfoZeile label="Ansprechpartner" value={auftrag?.ansprechpartner ?? 'â€”'} />
        <InfoZeile label="Einsatzdatum" value={fmtDatum(auftrag?.einsatzdatum ?? auftrag?.datum)} />
        <InfoZeile label="Startzeit" value={auftrag?.startzeit ?? 'â€”'} />
        <InfoZeile label="PrioritÃ¤t" value={auftrag?.prioritaet ?? 'â€”'} />
        <div className="sm:col-span-2">
          <InfoZeile label="Einsatzadresse" value={auftrag?.adresse ?? auftrag?.einsatzort ?? 'â€”'} />
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEKTION: EINSATZDOKUMENTATION
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function DokumentationKarte({ dok }) {
  if (!dok) return (
    <Karte>
      <KarteHeader icon="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" title="TÃ¤tigkeitsdokumentation" badge="Nicht vorhanden" badgeVariant="red" />
      <div className="px-5 py-6 text-center">
        <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-8 h-8 text-red-300 mx-auto mb-2" />
        <p className="text-sm text-red-500 font-medium">Keine Dokumentation vorhanden</p>
      </div>
    </Karte>
  );

  const felder = [
    { key: 'durchgefuehrte_arbeiten', label: 'DurchgefÃ¸hrte Arbeiten' },
    { key: 'festgestellter_schaden',  label: 'Festgestellter Schaden'  },
    { key: 'ursache',                 label: 'Ursache'                  },
    { key: 'massnahmen',              label: 'MaÃŸnahmen'                },
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
        title="TÃ¤tigkeitsdokumentation"
        badge={dok.einsatz_status ?? 'Kein Status'}
        badgeVariant={['Arbeit beendet', 'Dokumentiert'].includes(dok.einsatz_status) ? 'green' : 'amber'}
      />
      <div className="px-5 py-4 space-y-4">
        {/* Einsatz-Status Timeline */}
        {dok.einsatz_status && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusCls}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            Einsatzstatus: {dok.einsatz_status}
            {dok.arbeit_begonnen_at && <span className="opacity-60">Â· seit {fmtZeit(dok.arbeit_begonnen_at)}</span>}
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

        {/* Interne Notiz (nur fÃ¼r Bearbeiter sichtbar) */}
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEKTION: MATERIAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
            <p className="text-sm text-green-700 font-medium">Kein Material verwendet â€” vom Techniker bestÃ¤tigt</p>
          </div>
        ) : material.length === 0 ? (
          <div className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">Kein Material erfasst und nicht als â€žKein Material verwendet" markiert</p>
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
                <p className="col-span-2 text-xs text-gray-400 truncate">{m.bemerkung ?? 'â€”'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Karte>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEKTION: ARBEITSZEITEN
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
                <p className="text-lg font-bold text-gray-800 font-mono">{dok.arbeit_start ?? 'â€”'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Ende</p>
                <p className="text-lg font-bold text-gray-800 font-mono">{dok.arbeit_ende ?? 'â€”'}</p>
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEKTION: FOTOS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEKTION: KUNDENUNTERSCHRIFT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEKTION: VOLLSTÃ„NDIGKEITSPRÃœFUNG
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function PruefungKarte({ checks, allOk }) {
  const done = checks.filter(c => c.ok).length;
  const pct  = Math.round((done / checks.length) * 100);
  return (
    <Karte className={allOk ? 'border-green-200' : 'border-amber-200'}>
      <KarteHeader
        icon="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
        title="VollstÃ¤ndigkeitsprÃ¼fung"
        subtitle={allOk ? 'Alle Pflichtfelder erfÃ¼llt' : `${done} von ${checks.length} PrÃ¼fungen bestanden`}
        badge={allOk ? 'Freigabe mÃ¶glich' : 'UnvollstÃ¤ndig'}
        badgeVariant={allOk ? 'green' : 'red'}
      />
      <div className="px-5 py-4 space-y-4">
        {/* Fortschrittsbalken */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">VollstÃ¤ndigkeit</span>
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
            <strong>Abschluss nicht mÃ¶glich.</strong> Die Pflichtfelder (rot markiert) mÃ¼ssen zuerst durch den Techniker ergÃ¤nzt werden.
          </Alert>
        )}
      </div>
    </Karte>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEKTION: RUCKGABE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const RUECKGABE_GRUENDE = [
  'Kundenunterschrift fehlt',
  'Arbeitszeit prÃ¼fen',
  'TÃ¤tigkeitsdokumentation ergÃ¤nzen',
  'Fotos fehlen / unvollstÃ¤ndig',
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
        title="Zur Dokumentation zurÃ¼ckgeben"
        subtitle="Techniker muss Nacharbeit leisten"
      />
      <div className="px-5 py-4">
        {!open ? (
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-amber-200 text-amber-700 bg-amber-50 rounded-xl text-sm font-semibold hover:bg-amber-100 transition">
            <Svg d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" cls="w-4 h-4" />
            Auftrag zurÃ¼ckgeben
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Grund der RÃ¼ckgabe *
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
                  placeholder="Beschreiben Sie den RÃ¼ckgabegrundâ€¦"
                  className="w-u±°Áà´ÌÁä´È¸Ô‰½É‘•È‰½É‘•ÈµÉ…ä´ÈÀÀÉ½Õ¹‘•µá°Ñ•áÐµÍ´É•Í¥é”µ¹½¹”™½ÕÌé½ÕÑ±¥¹”µ¹½¹”™½ÕÌéÉ¥¹œ´È™½ÕÌéÉ¥¹œµ…µ‰•È´ÐÀÀˆ€¼ø(€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€¥ô((€€€€€€€€€€€í•ÉÈ€˜˜€ñ±•ÉÐÑåÁ”ô‰•ÉÉ½Èˆùí•ÉÉôð½±•ÉÐùô((€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Ìˆø(€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õí¡…¹‘±•M•¹‘•¹ô‘¥Í…‰±•õíÍ…Ù¥¹ô(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´ÈÁà´ÐÁä´È¸Ô‰œµ…µ‰•È´ÔÀÀÑ•áÐµÝ¡¥Ñ”É½Õ¹‘•µá°Ñ•áÐµÍ´™½¹ÐµÍ•µ¥‰½±¡½Ù•Èé‰œµ…µ‰•È´ØÀÀÑÉ…¹Í¥Ñ¥½¸‘¥Í…‰±•é½Á…¥Ñä´ØÀˆø(€€€€€€€€€€€€€€€íÍ…Ù¥¹œ(€€€€€€€€€€€€€€€€€€ü€ñMÙœô‰4ÄØ¸ÀÈÌ€ä¸ÌÐá Ð¸ääÉØ´¸ÀÀÅ4È¸äàÔ€Ää¸ØÐÑØ´Ð¸ääÉ´À€Á Ð¸ääÉ´´Ð¸ääÌ€Á°Ì¸ÄàÄ€Ì¸ÄàÍ„à¸ÈÔ€à¸ÈÔ€À€ÀÀÄÌ¸àÀÌ´Ì¸Ý4Ð¸ÀÌÄ€ä¸àØÕ„à¸ÈÔ€à¸ÈÔ€À€ÀÄÄÌ¸àÀÌ´Ì¸Ý°Ì¸ÄàÄ€Ì¸ÄàÉ´À´Ð¸ääÅØÐ¸ääˆ±Ìô‰Ü´Ð ´Ð…¹¥µ…Ñ”µÍÁ¥¸ˆ€¼ø(€€€€€€€€€€€€€€€€€€è€ñMÙœô‰4ä€ÄÕ0Ì€å´À€Á°Ø´Ù4Ì€å ÄÉ„Ø€Ø€À€ÀÄÀ€ÄÉ ´Ìˆ±Ìô‰Ü´Ð ´Ðˆ€¼ùô(€€€€€€€€€€€€€€€iÕËñ­•‰•¸(€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õì ¤€ôøìÍ•Ñ=Á•¸¡™…±Í”¤ìÍ•ÑÉÕ¹ œœ¤ìÍ•ÑÉÈ œœ¤ìõô(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Áà´ÐÁä´È¸Ô‰½É‘•È‰½É‘•ÈµÉ…ä´ÈÀÀÑ•áÐµÉ…ä´ÔÀÀÉ½Õ¹‘•µá°Ñ•áÐµÍ´™½¹Ðµµ•‘¥Õ´¡½Ù•Èé‰œµÉ…ä´ÔÀÑÉ…¹Í¥Ñ¥½¸ˆø(€€€€€€€€€€€€€€€‰‰É•¡•¸(€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€¥ô(€€€€€€ð½‘¥Øø(€€€€ð½-…ÉÑ”ø(€€¤ì)ô((¼¨ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(€€M-Q%=8è	M!1UML+ŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@€¨¼()™Õ¹Ñ¥½¸‰Í¡±ÕÍÍ-…ÉÑ”¡ì…Õ™ÑÉ…œ°‘½¬°…±±=¬°½¹‰Í¡±¥•ÍÍ•¸°½¹I•¡¹Õ¹ÉÍÑ•±±•¸°Í…Ù¥¹œ°™•¡±•È°‘…É˜ô¤ì(€½¹ÍÐ…‰•Í¡±½ÍÍ•¸€ô…Õ™ÑÉ…œü¹ÍÑ…ÑÕÌ€ôôô€…‰•Í¡±½ÍÍ•¸œì((€¥˜€¡…‰•Í¡±½ÍÍ•¸¤ì(€€€É•ÑÕÉ¸€ (€€€€€€ñ-…ÉÑ”±…ÍÍ9…µ”ô‰‰½É‘•ÈµÉ••¸´ÈÀÀˆø(€€€€€€€€ñ-…ÉÑ•!•…‘•È(€€€€€€€€€¥½¸ô‰4ä€ÄÈ¸ÜÕ0ÄÄ¸ÈÔ€ÄÔ€ÄÔ€ä¸ÜÕ´´Ì´Ü¸ÀÌÙÄÄ¸äÔä€ÄÄ¸äÔä€À€ÀÄÌ¸Ôäà€Ø€ÄÄ¸ää€ÄÄ¸ää€À€ÀÀÌ€ä¸ÜÐåŒÀ€Ô¸ÔäÈ€Ì¸àÈÐ€ÄÀ¸Èä€ä€ÄÄ¸ØÈÌ€Ô¸ÄÜØ´Ä¸ÌÌÈ€ä´Ø¸ÀÌ€ä´ÄÄ¸ØÈÈ€À´Ä¸ÌÄ´¸ÈÄ´È¸ÔÜÄ´¸Ôäà´Ì¸ÜÔÅ ´¸ÄÔÉŒ´Ì¸ÄäØ€À´Ø¸Ä´Ä¸ÈÐà´à¸ÈÔ´Ì¸ÈàÕèˆ(€€€€€€€€€Ñ¥Ñ±”ô‰Õ™ÑÉ…œ…‰•Í¡±½ÍÍ•¸ˆ(€€€€€€€€€‰…‘”ô‰É•¥••‰•¸ˆ(€€€€€€€€€‰…‘•Y…É¥…¹Ðô‰É••¸ˆ(€€€€€€€€¼ø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Áà´ÔÁä´ÔÍÁ…”µä´Ðˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰À´Ô‰œµÉ••¸´ÔÀÉ½Õ¹‘•´Éá°‰½É‘•È‰½É‘•ÈµÉ••¸´ÄÀÀÑ•áÐµ•¹Ñ•Èˆø(€€€€€€€€€€€€ñMÙœô‰4ä€ÄÈ¸ÜÕ0ÄÄ¸ÈÔ€ÄÔ€ÄÔ€ä¸ÜÕ4ÈÄ€ÄÉ„ä€ä€À€ÄÄ´Äà€À€ä€ä€À€ÀÄÄà€Áèˆ±Ìô‰Ü´ÄÀ ´ÄÀÑ•áÐµÉ••¸´ÔÀÀµàµ…ÕÑ¼µˆ´Ìˆ€¼ø(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰™½¹Ðµ‰½±Ñ•áÐµÉ••¸´àÀÀÑ•áÐµ±œˆùÕ™ÑÉ…œ•É™½±É•¥ …‰•Í¡±½ÍÍ•¸ð½Àø(€€€€€€€€€€€í…Õ™ÑÉ…œü¹…‰Í¡±ÕÍÍ}‘…ÑÕ´€˜˜€ (€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµÉ••¸´ØÀÀµÐ´Äˆù‰•Í¡±½ÍÍ•¸…´í™µÑ…ÑÕµi•¥Ð¡…Õ™ÑÉ…œ¹…‰Í¡±ÕÍÍ}‘…ÑÕ´¥ôð½Àø(€€€€€€€€€€€€¥ô(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµÉ••¸´ØÀÀµÐ´È™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•È…À´Èˆø(€€€€€€€€€€€€€€ñMÙœô‰4ä€ÄÈ¸ÜÕ0ÄÄ¸ÈÔ€ÄÔ€ÄÔ€ä¸ÜÕ4ÈÄ€ÄÉ„ä€ä€À€ÄÄ´Äà€À€ä€ä€À€ÀÄÄà€Áèˆ±Ìô‰Ü´Ð ´Ðˆ€¼ø(€€€€€€€€€€€€€ñÈI•¡¹Õ¹ÍÍÑ•±±Õ¹œ™É•¥••‰•¸(€€€€€€€€€€€€ð½Àø(€€€€€€€€€€ð½‘¥Øø((€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õí½¹I•¡¹Õ¹ÉÍÑ•±±•¹ô(€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•È…À´È¸ÔÁä´Ì¸ÔÉ½Õ¹‘•µá°Ñ•áÐµÍ´™½¹Ðµ‰½±‰œµ‰±Õ”´ØÀÀ¡½Ù•Èé‰œµ‰±Õ”´ÜÀÀÑ•áÐµÝ¡¥Ñ”ÑÉ…¹Í¥Ñ¥½¸Í¡…‘½Üµµ¡½Ù•ÈéÍ¡…‘½Üµ±œˆø(€€€€€€€€€€€€ñMÙœô‰4ä€ÄÐ¸ÈÕ°Ø´Ù´Ð¸Ô´Ì¸ÐäÍXÈÄ¸ÜÕ°´Ì¸ÜÔ´Ä¸Ô´Ì¸ÜÔ€Ä¸Ô´Ì¸ÜÔ´Ä¸Ô´Ì¸ÜÔ€Ä¸ÕXÐ¸ÜÔÝŒÀ´Ä¸ÄÀà¸àÀØ´È¸ÀÔÜ€Ä¸äÀÜ´È¸ÄàÕ„Ðà¸ÔÀÜ€Ðà¸ÔÀÜ€À€ÀÄÄÄ¸ÄàØ€ÁŒÄ¸Ä¸ÄÈà€Ä¸äÀÜ€Ä¸ÀÜÜ€Ä¸äÀÜ€È¸ÄàÕé4ä¸ÜÔ€å ¸ÀÀáØ¸ÀÀá ä¸ÜÕXåé´¸ÌÜÔ€Á„¸ÌÜÔ¸ÌÜÔ€À€ÄÄ´¸ÜÔ€À€¸ÌÜÔ¸ÌÜÔ€À€ÀÄ¸ÜÔ€Áé´Ð¸ÄÈÔ€Ð¸Õ ¸ÀÀáØ¸ÀÀá ´¸ÀÀáXÄÌ¸Õé´¸ÌÜÔ€Á„¸ÌÜÔ¸ÌÜÔ€À€ÄÄ´¸ÜÔ€À€¸ÌÜÔ¸ÌÜÔ€À€ÀÄ¸ÜÔ€Áèˆ±Ìô‰Ü´Ô ´Ôˆ€¼ø(€€€€€€€€€€€I•¡¹Õ¹œ•ÉÍÑ•±±•¸(€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€ð½‘¥Øø(€€€€€€ð½-…ÉÑ”ø(€€€€¤ì(€ô((€¥˜€ …‘…É˜¤ì(€€€É•ÑÕÉ¸€ (€€€€€€ñ-…ÉÑ”ø(€€€€€€€€ñ-…ÉÑ•!•…‘•È(€€€€€€€€€¥½¸ô‰4ÄØ¸Ô€ÄÀ¸ÕXØ¸ÜÕ„Ð¸Ô€Ð¸Ô€À€ÄÀ´ä€ÁØÌ¸ÜÕ´´¸ÜÔ€ÄÄ¸ÈÕ ÄÀ¸Õ„È¸ÈÔ€È¸ÈÔ€À€ÀÀÈ¸ÈÔ´È¸ÈÕØ´Ø¸ÜÕ„È¸ÈÔ€È¸ÈÔ€À€ÀÀ´È¸ÈÔ´È¸ÈÕ Ø¸ÜÕ„È¸ÈÔ€È¸ÈÔ€À€ÀÀ´È¸ÈÔ€È¸ÈÕØØ¸ÜÕ„È¸ÈÔ€È¸ÈÔ€À€ÀÀÈ¸ÈÔ€È¸ÈÕèˆ(€€€€€€€€€Ñ¥Ñ±”ô‰Õ™ÑÉ…œ…‰Í¡±¥—}•¸ˆ(€€€€€€€€€‰…‘”ô‰1•Í•É•¡Ñ”ˆ(€€€€€€€€€‰…‘•Y…É¥…¹Ðô‰É…äˆ(€€€€€€€€¼ø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Áà´ÔÁä´Ðˆø(€€€€€€€€€€ñ±•ÉÐÑåÁ”ô‰¥¹™¼ˆù±ÌQ•¡¹¥­•È¡…‰•¸M¥”¹ÕÈ1•Í•É•¡Ñ”¸•È‰Í¡±ÕÍÌµÕÍÌÙ½´ñÉ¼½‘•È‘•È¥ÍÁ½Í¥Ñ¥½¸‘ÕÉ¡•›ñ¡ÉÐÝ•É‘•¸¸ð½±•ÉÐø(€€€€€€€€ð½‘¥Øø(€€€€€€ð½-…ÉÑ”ø(€€€€¤ì(€ô((€É•ÑÕÉ¸€ (€€€€ñ-…ÉÑ”±…ÍÍ9…µ”õí…±±=¬€ü€‰½É‘•Èµ‰±Õ”´ÈÀÀœ€è€‰½É‘•ÈµÉ…ä´ÄÀÀôø(€€€€€€ñ-…ÉÑ•!•…‘•È(€€€€€€€¥½¸ô‰4ä€ÄÈ¸ÜÕ0ÄÄ¸ÈÔ€ÄÔ€ÄÔ€ä¸ÜÕ´´Ì´Ü¸ÀÌÙÄÄ¸äÔä€ÄÄ¸äÔä€À€ÀÄÌ¸Ôäà€Ø€ÄÄ¸ää€ÄÄ¸ää€À€ÀÀÌ€ä¸ÜÐåŒÀ€Ô¸ÔäÈ€Ì¸àÈÐ€ÄÀ¸Èä€ä€ÄÄ¸ØÈÌ€Ô¸ÄÜØ´Ä¸ÌÌÈ€ä´Ø¸ÀÌ€ä´ÄÄ¸ØÈÈ€À´Ä¸ÌÄ´¸ÈÄ´È¸ÔÜÄ´¸Ôäà´Ì¸ÜÔÅ ´¸ÄÔÉŒ´Ì¸ÄäØ€À´Ø¸Ä´Ä¸ÈÐà´à¸ÈÔ´Ì¸ÈàÕèˆ(€€€€€€€Ñ¥Ñ±”ô‰Õ™ÑÉ…œ…‰Í¡±¥—}•¸ˆ(€€€€€€€ÍÕ‰Ñ¥Ñ±”ô‰¥¹…±”EÕ…±¥Ó‘ÑÍ­½¹ÑÉ½±±”Ù½ÈI•¡¹Õ¹ÍÍÑ•±±Õ¹œˆ(€€€€€€¼ø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Áà´ÔÁä´ÐÍÁ…”µä´Ðˆø(€€€€€€€ì……±±=¬€ü€ (€€€€€€€€€€ñ±•ÉÐÑåÁ”ô‰•ÉÉ½Èˆø(€€€€€€€€€€€•ÈÕ™ÑÉ…œ­…¹¸•ÉÍÐ…‰•Í¡±½ÍÍ•¸Ý•É‘•¸°Ý•¹¸…±±”A™±¥¡Ñ…¹…‰•¸Ù½±±ÍÓ‘¹‘¥œÍ¥¹¸	¥ÑÑ”‘•¸Õ™ÑÉ…œ…¸‘•¸Q•¡¹¥­•ÈéÕËñ­•‰•¸¸(€€€€€€€€€€ð½±•ÉÐø(€€€€€€€€¤€è€ (€€€€€€€€€€ñ±•ÉÐÑåÁ”ô‰¥¹™¼ˆø(€€€€€€€€€€€±±”A™±¥¡Ñ…¹…‰•¸Í¥¹Ù½É¡…¹‘•¸¸9… ‘•´‰Í¡±ÕÍÌÝ¥É‘•ÈÕ™ÑÉ…œ•ÍÁ•ÉÉÐÕ¹›ñÈ‘¥”I•¡¹Õ¹ÍÍÑ•±±Õ¹œ™É•¥••‰•¸¸(€€€€€€€€€€ð½±•ÉÐø(€€€€€€€€¥ô((€€€€€€€í™•¡±•È€˜˜€ñ±•ÉÐÑåÁ”ô‰•ÉÉ½Èˆùí™•¡±•Éôð½±•ÉÐùô((€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õí½¹‰Í¡±¥•ÍÍ•¹ô‘¥Í…‰±•õíÍ…Ù¥¹œñð€……±±=­ô(€€€€€€€€€±…ÍÍ9…µ”õíÜµ™Õ±°™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•È…À´È¸ÔÁä´ÐÉ½Õ¹‘•µá°Ñ•áÐµ‰…Í”™½¹Ðµ‰½±ÑÉ…¹Í¥Ñ¥½¸(€€€€€€€€€€€€‘í…±±=¬(€€€€€€€€€€€€€€ü€‰œµÉ••¸´ØÀÀ¡½Ù•Èé‰œµÉ••¸´ÜÀÀÑ•áÐµÝ¡¥Ñ”Í¡…‘½Üµ±œ¡½Ù•ÈéÍ¡…‘½Üµá°œ(€€€€€€€€€€€€€€è€‰œµÉ…ä´ÄÀÀÑ•áÐµÉ…ä´ÌÀÀÕÉÍ½Èµ¹½Ðµ…±±½Ý•õôø(€€€€€€€€€íÍ…Ù¥¹œ(€€€€€€€€€€€€ü€ñMÙœô‰4ÄØ¸ÀÈÌ€ä¸ÌÐá Ð¸ääÉØ´¸ÀÀÅ4È¸äàÔ€Ää¸ØÐÑØ´Ð¸ääÉ´À€Á Ð¸ääÉ´´Ð¸ääÌ€Á°Ì¸ÄàÄ€Ì¸ÄàÍ„à¸ÈÔ€à¸ÈÔ€À€ÀÀÄÌ¸àÀÌ´Ì¸Ý4Ð¸ÀÌÄ€ä¸àØÕ„à¸ÈÔ€à¸ÈÔ€À€ÀÄÄÌ¸àÀÌ´Ì¸Ý°Ì¸ÄàÄ€Ì¸ÄàÉ´À´Ð¸ääÅØÐ¸ääˆ±Ìô‰Ü´Ô ´Ô…¹¥µ…Ñ”µÍÁ¥¸ˆ€¼ø(€€€€€€€€€€€€è€ñMÙœô‰4ä€ÄÈ¸ÜÕ0ÄÄ¸ÈÔ€ÄÔ€ÄÔ€ä¸ÜÕ´´Ì´Ü¸ÀÌÙÄÄ¸äÔä€ÄÄ¸äÔä€À€ÀÄÌ¸Ôäà€Ø€ÄÄ¸ää€ÄÄ¸ää€À€ÀÀÌ€ä¸ÜÐåŒÀ€Ô¸ÔäÈ€Ì¸àÈÐ€ÄÀ¸Èä€ä€ÄÄ¸ØÈÌ€Ô¸ÄÜØ´Ä¸ÌÌÈ€ä´Ø¸ÀÌ€ä´ÄÄ¸ØÈÈ€À´Ä¸ÌÄ´¸ÈÄ´È¸ÔÜÄ´¸Ôäà´Ì¸ÜÔÅ ´¸ÄÔÉŒ´Ì¸ÄäØ€À´Ø¸Ä´Ä¸ÈÐà´à¸ÈÔ´Ì¸ÈàÕèˆ±Ìô‰Ü´Ô ´Ôˆ€¼ùô(€€€€€€€€€Õ™ÑÉ…œ…‰Í¡±¥—}•¸€˜›ñÈI•¡¹Õ¹œ™É•¥•‰•¸(€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€ð½‘¥Øø(€€€€ð½-…ÉÑ”ø(€€¤ì)ô((¼¨ƒŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@(€€!UAPµ-=5A=99Q+ŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠVCŠV@€¨¼()™Õ¹Ñ¥½¸‰Í¡±ÕÍÍA…•%¹¹•È ¤ì(€½¹ÍÐÉ½ÕÑ•È€€€€€€€ôÕÍ•I½ÕÑ•È ¤ì(€½¹ÍÐÍ•…É¡A…É…µÌ€ôÕÍ•M•…É¡A…É…µÌ ¤ì(€½¹ÍÐ…Õ™ÑÉ…%€€€€ôÍ•…É¡A…É…µÌ¹•Ð ¥œ¤ì((€€¼¼ƒŠRŠR MÑ…Ñ”ƒŠRŠR (€½¹ÍÐméÕÍÑ…¹°€€Í•ÑiÕÍÑ…¹‘t€€€ôÕÍ•MÑ…Ñ” ±½…‘¥¹œœ¤ì(€½¹ÍÐm…Õ™ÑÉ…œ°€€Í•ÑÕ™ÑÉ…t€€€ôÕÍ•MÑ…Ñ”¡¹Õ±°¤ì(€½¹ÍÐm‘½¬°€€€€€€Í•Ñ½­t€€€€€€€ôÕÍ•MÑ…Ñ”¡¹Õ±°¤ì(€½¹ÍÐmµ…Ñ•É¥…°°€Í•Ñ5…Ñ•É¥…±t€€ôÕÍ•MÑ…Ñ”¡mt¤ì(€½¹ÍÐm™½Ñ½Ì°€€€€Í•Ñ½Ñ½Ít€€€€€ôÕÍ•MÑ…Ñ”¡mt¤ì(€½¹ÍÐmÕÍ•ÉI½±±”°Í•ÑUÍ•ÉI½±±•t€ôÕÍ•MÑ…Ñ”¡¹Õ±°¤ì(€½¹ÍÐmÕÍ•É%°€€€Í•ÑUÍ•É%‘t€€€€ôÕÍ•MÑ…Ñ”¡¹Õ±°¤ì(€½¹ÍÐm½µÁ…¹å%°Í•Ñ½µÁ…¹å%‘t€ôÕÍ•MÑ…Ñ”¡¹Õ±°¤ì(€½¹ÍÐmÍ…Ù¥¹œ°€€€Í•ÑM…Ù¥¹t€€€€ôÕÍ•MÑ…Ñ”¡™…±Í”¤ì(€½¹ÍÐm™•¡±•È°€€€Í•Ñ•¡±•Ét€€€€ôÕÍ•MÑ…Ñ” œœ¤ì(€½¹ÍÐm•É™½±œ°€€€Í•ÑÉ™½±t€€€€ôÕÍ•MÑ…Ñ” œœ¤ì((€½¹ÍÐ‘…É˜€ô	I	%Q9}I=118¹¥¹±Õ‘•Ì¡ÕÍ•ÉI½±±”¤ì((€€¼¨ƒŠRŠR …Ñ•¸±…‘•¸ƒŠRŠR €¨¼(€½¹ÍÐ±…‘•…Ñ•¸€ôÕÍ•…±±‰…¬¡…Íå¹Œ€ ¤€ôøì(€€€¥˜€ ……Õ™ÑÉ…%¤ìÍ•ÑiÕÍÑ…¹ ¹½Ñ}™½Õ¹œ¤ìÉ•ÑÕÉ¸ìô(€€€ÑÉäì(€€€€€½¹ÍÐì‘…Ñ„èìÕÍ•Èôô€ô…Ý…¥ÐÍÕÁ…‰…Í”¹…ÕÑ ¹•ÑUÍ•È ¤ì(€€€€€¥˜€ …ÕÍ•È¤ìÉ½ÕÑ•È¹ÁÕÍ  œ½±½¥¸œ¤ìÉ•ÑÕÉ¸ìô(€€€€€Í•ÑUÍ•É%¡ÕÍ•È¹¥¤ì((€€€€€½¹ÍÐì‘…Ñ„èµ•µ‰•Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”(€€€€€€€€¹™É½´ ½µÁ…¹å}µ•µ‰•ÉÌœ¤(€€€€€€€€¹Í•±•Ð ½µÁ…¹å}¥°É½±”œ¤(€€€€€€€€¹•Ä ÕÍ•É}¥œ°ÕÍ•È¹¥¤(€€€€€€€€¹•Ä ¥Í}…Ñ¥Ù”œ°ÑÉÕ”¤(€€€€€€€€¹µ…å‰•M¥¹±” ¤ì((€€€€€¥˜€ …µ•µ‰•È¤ìÍ•ÑiÕÍÑ…¹ ™½É‰¥‘‘•¸œ¤ìÉ•ÑÕÉ¸ìô((€€€€€½¹ÍÐ•É±…Õ‰Ð€ôl¥¹¡…‰•Èœ°€…‘µ¥¹¥ÍÑÉ…Ñ½Èœ°€‰Õ•É¼œ°€‘¥ÍÁ½¹•¹Ðœ°€Ñ•¡¹¥­•Ètì(€€€€€¥˜€ …•É±…Õ‰Ð¹¥¹±Õ‘•Ì¡µ•µ‰•È¹É½±”¤¤ìÍ•ÑiÕÍÑ…¹ ™½É‰¥‘‘•¸œ¤ìÉ•ÑÕÉ¸ìô((€€€€€Í•ÑUÍ•ÉI½±±”¡µ•µ‰•È¹É½±”¤ì(€€€€€Í•Ñ½µÁ…¹å%¡µ•µ‰•È¹½µÁ…¹å}¥¤ì((€€€€€½¹ÍÐl(€€€€€€€ì‘…Ñ„è…Õ™ÑÉ……Ñ„°•ÉÉ½Èè…Õ™ÑÉ…ÉÈô°(€€€€€€€ì‘…Ñ„è‘½­…Ñ„ô°(€€€€€€€ì‘…Ñ„èµ…Ñ…Ñ„ô°(€€€€€€€ì‘…Ñ„è™½Ñ½Í…Ñ„ô°(€€€€€t€ô…Ý…¥ÐAÉ½µ¥Í”¹…±°¡l(€€€€€€€ÍÕÁ…‰…Í”(€€€€€€€€€€¹™É½´ …Õ™ÑÉ…•”œ¤(€€€€€€€€€€¹Í•±•Ð œ¨°­Õ¹‘•¸é­Õ¹‘•}¥¡¥°¹…µ”°™¥Éµ„°™¥Éµ•¹¹…µ”°­Õ¹‘•¹ÑåÀ°Ñ•±•™½¸°•µ…¥°¤œ¤(€€€€€€€€€€¹•Ä ¥œ°…Õ™ÑÉ…%¤(€€€€€€€€€€¹•Ä ½µÁ…¹å}¥œ°µ•µ‰•È¹½µÁ…¹å}¥¤(€€€€€€€€€€¹µ…å‰•M¥¹±” ¤°(€€€€€€€ÍÕÁ…‰…Í”(€€€€€€€€€€¹™É½´ •¥¹Í…Ñé}‘½­Õµ•¹Ñ…Ñ¥½¸œ¤(€€€€€€€€€€¹Í•±•Ð œ¨œ¤(€€€€€€€€€€¹•Ä …Õ™ÑÉ…}¥œ°…Õ™ÑÉ…%¤(€€€€€€€€€€¹•Ä ½µÁ…¹å}¥œ°µ•µ‰•È¹½µÁ…¹å}¥¤(€€€€€€€€€€¹µ…å‰•M¥¹±” ¤°(€€€€€€€ÍÕÁ…‰…Í”(€€€€€€€€€€¹™É½´ •¥¹Í…Ñé}µ…Ñ•É¥…°œ¤(€€€€€€€€€€¹Í•±•Ð œ¨œ¤(€€€€€€€€€€¹•Ä …Õ™ÑÉ…}¥œ°…Õ™ÑÉ…%¤(€€€€€€€€€€¹•Ä ½µÁ…¹å}¥œ°µ•µ‰•È¹½µÁ…¹å}¥¤(€€€€€€€€€€¹½É‘•È •ÉÍÑ•±±Ñ}…Ðœ¤°(€€€€€€€ÍÕÁ…‰…Í”(€€€€€€€€€€¹™É½´ •¥¹Í…Ñé}™½Ñ½Ìœ¤(€€€€€€€€€€¹Í•±•Ð œ¨œ¤(€€€€€€€€€€¹•Ä …Õ™ÑÉ…}¥œ°…Õ™ÑÉ…%¤(€€€€€€€€€€¹•Ä ½µÁ…¹å}¥œ°µ•µ‰•È¹½µÁ…¹å}¥¤(€€€€€€€€€€¹½É‘•È •ÉÍÑ•±±Ñ}…Ðœ¤°(€€€€€t¤ì((€€€€€¥˜€¡…Õ™ÑÉ…ÉÈñð€……Õ™ÑÉ……Ñ„¤ìÍ•ÑiÕÍÑ…¹ ¹½Ñ}™½Õ¹œ¤ìÉ•ÑÕÉ¸ìô((€€€€€Í•ÑÕ™ÑÉ…œ¡…Õ™ÑÉ……Ñ„¤ì(€€€€€Í•Ñ½¬¡‘½­…Ñ„€üü¹Õ±°¤ì(€€€€€Í•Ñ5…Ñ•É¥…°¡µ…Ñ…Ñ„€üümt¤ì(€€€€€Í•Ñ½Ñ½Ì¡™½Ñ½Í…Ñ„€üümt¤ì(€€€€€Í•ÑiÕÍÑ…¹ ½¬œ¤ì(€€€ô…Ñ €¡”¤ì(€€€€€½¹Í½±”¹•ÉÉ½È¡”¤ì(€€€€€Í•ÑiÕÍÑ…¹ ¹½Ñ}™½Õ¹œ¤ì(€€€ô(€ô°m…Õ™ÑÉ…%°É½ÕÑ•Ét¤ì((€ÕÍ•™™•Ð  ¤€ôøì±…‘•…Ñ•¸ ¤ìô°m±…‘•…Ñ•¹t¤ì((€€¼¨ƒŠRŠR ­Ñ¥Ù¥Ó‘ÑÍ±½œµ¥¹ÑÉ…œƒŠRŠR €¨¼(€…Íå¹Œ™Õ¹Ñ¥½¸±½­Ñ¥Ù¥Ñ…•Ð¡…­Ñ¥½¸°‘•Ñ…¥±Ì€ôíô¤ì(€€€ÑÉäì(€€€€€…Ý…¥ÐÍÕÁ…‰…Í”¹™É½´ …Ñ¥Ù¥Ñå}±½œœ¤¹¥¹Í•ÉÐ¡ì(€€€€€€€½µÁ…¹å}¥è½µÁ…¹å%°(€€€€€€€…Õ™ÑÉ…}¥è…Õ™ÑÉ…%°(€€€€€€€ÕÍ•É}¥è€€€ÕÍ•É%°(€€€€€€€…­Ñ¥½¸°(€€€€€€€‘•Ñ…¥±Ì°(€€€€€€€•ÉÍÑ•±±Ñ}…´è¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤°(€€€€€ô¤ì(€€€ô…Ñ €¡”¤ì(€€€€€½¹Í½±”¹•ÉÉ½È 1½œµ•¡±•Èèœ°”¤ì(€€€ô(€ô((€€¼¨ƒŠRŠR Õ™ÑÉ…œ…‰Í¡±¥—}•¸ƒŠRŠR €¨¼(€…Íå¹Œ™Õ¹Ñ¥½¸¡…¹‘±•‰Í¡±¥•ÍÍ•¸ ¤ì(€€€Í•Ñ•¡±•È œœ¤ì(€€€Í•ÑM…Ù¥¹œ¡ÑÉÕ”¤ì(€€€ÑÉäì(€€€€€½¹ÍÐ©•ÑéÐ€ô¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì((€€€€€€¼¼€Ä¸Õ™ÑÉ…œ…­ÑÕ…±¥Í¥•É•¸(€€€€€½¹ÍÐì•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”(€€€€€€€€¹™É½´ …Õ™ÑÉ…•”œ¤(€€€€€€€€¹ÕÁ‘…Ñ”¡ì(€€€€€€€€€ÍÑ…ÑÕÌè€€€€€€€€€€€€€€€€€€€€…‰•Í¡±½ÍÍ•¸œ°(€€€€€€€€€…‰Í¡±ÕÍÍ}‘…ÑÕ´è€€€€€€€€€€©•ÑéÐ°(€€€€€€€€€…‰•Í¡±½ÍÍ•¹}Ù½¹}¥è€€€€€ÕÍ•É%°(€€€€€€€€€™É•¥••‰•¹}™Õ•É}É•¡¹Õ¹œèÑÉÕ”°(€€€€€€€€€•ÍÁ•ÉÉÐè€€€€€€€€€€€€€€€€€ÑÉÕ”°(€€€€€€€ô¤(€€€€€€€€¹•Ä ¥œ°…Õ™ÑÉ…%¤(€€€€€€€€¹•Ä ½µÁ…¹å}¥œ°½µÁ…¹å%¤ì((€€€€€¥˜€¡•ÉÉ½È¤Ñ¡É½Ü•ÉÉ½Èì((€€€€€€¼¼€È¸•¥¹Í…Ñé}‘½­Õµ•¹Ñ…Ñ¥½¸ÍÑ…ÑÕÌÕÁ‘…Ñ•¸(€€€€€¥˜€¡‘½¬ü¹¥¤ì(€€€€€€€…Ý…¥ÐÍÕÁ…‰…Í”(€€€€€€€€€€¹™É½´ •¥¹Í…Ñé}‘½­Õµ•¹Ñ…Ñ¥½¸œ¤(€€€€€€€€€€¹ÕÁ‘…Ñ”¡ìÍÑ…ÑÕÌè€‘½­Õµ•¹Ñ¥•ÉÐœ°‘½­Õµ•¹Ñ¥•ÉÑ}…Ðè©•ÑéÐô¤(€€€€€€€€€€¹•Ä ¥œ°‘½¬¹¥¤ì(€€€€€ô((€€€€€€¼¼€Ì¸­Ñ¥Ù¥Ó‘ÑÍ±½œ(€€€€€…Ý…¥Ð±½­Ñ¥Ù¥Ñ…•Ð Õ™ÑÉ…œ•É™½±É•¥ …‰•Í¡±½ÍÍ•¸¸œ°ì(€€€€€€€…‰Í¡±ÕÍÍ}‘…ÑÕ´è€€€€€€€€€€©•ÑéÐ°(€€€€€€€™É•¥••‰•¹}™Õ•É}É•¡¹Õ¹œèÑÉÕ”°(€€€€€€€…‰•Í¡±½ÍÍ•¹}Ù½¸è€€€€€€€€ÕÍ•É%°(€€€€€ô¤ì((€€€€€€¼¼€Ð¸1½­…±•¸MÑ…Ñ”ÕÁ‘…Ñ•¸(€€€€€Í•ÑÕ™ÑÉ…œ¡À€ôø€¡ì(€€€€€€€€¸¸¹À°(€€€€€€€ÍÑ…ÑÕÌè€€€€€€€€€€€€€€€€€€€€‰•Í¡±½ÍÍ•¸œ°(€€€€€€€…‰Í¡±ÕÍÍ}‘…ÑÕ´è€€€€€€€€€€©•ÑéÐ°(€€€€€€€™É•¥••‰•¹}™Õ•É}É•¡¹Õ¹œèÑÉÕ”°(€€€€€€€•ÍÁ•ÉÉÐè€€€€€€€€€€€€€€€€€ÑÉÕ”°(€€€€€ô¤¤ì(€€€€€Í•ÑÉ™½±œ Õ™ÑÉ…œ•É™½±É•¥ …‰•Í¡±½ÍÍ•¸Õ¹›ñÈ‘¥”I•¡¹Õ¹ÍÍÑ•±±Õ¹œ™É•¥••‰•¸¸œ¤ì(€€€ô…Ñ €¡”¤ì(€€€€€Í•Ñ•¡±•È¡”¹µ•ÍÍ…”€üü€•¡±•È‰•¥´‰Í¡±¥—}•¸‘•ÌÕ™ÑÉ…Ìœ¤ì(€€€ô(€€€Í•ÑM…Ù¥¹œ¡™…±Í”¤ì(€ô((€€¼¨ƒŠRŠR Õ™ÑÉ…œéÕËñ­•‰•¸ƒŠRŠR €¨¼(€…Íå¹Œ™Õ¹Ñ¥½¸¡…¹‘±•IÕ•­…‰”¡ÉÕ¹¤ì(€€€Í•Ñ•¡±•È œœ¤ì(€€€Í•ÑM…Ù¥¹œ¡ÑÉÕ”¤ì(€€€ÑÉäì(€€€€€½¹ÍÐ©•ÑéÐ€ô¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì((€€€€€½¹ÍÐì•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”(€€€€€€€€¹™É½´ …Õ™ÑÉ…•”œ¤(€€€€€€€€¹ÕÁ‘…Ñ”¡ì(€€€€€€€€€ÍÑ…ÑÕÌè€€€€€€€€€€€9…¡‰•…É‰•¥ÑÕ¹œ•É™½É‘•É±¥ œ°(€€€€€€€€€ÉÕ•­…‰•}ÉÕ¹è€ÉÕ¹°(€€€€€€€€€ÉÕ•­…‰•}…Ðè€€€€©•ÑéÐ°(€€€€€€€€€ÉÕ•­…‰•}Ù½¹}¥èÕÍ•É%°(€€€€€€€ô¤(€€€€€€€€¹•Ä ¥œ°…Õ™ÑÉ…%¤(€€€€€€€€¹•Ä ½µÁ…¹å}¥œ°½µÁ…¹å%¤ì((€€€€€¥˜€¡•ÉÉ½È¤Ñ¡É½Ü•ÉÉ½Èì((€€€€€…Ý…¥Ð±½­Ñ¥Ù¥Ñ…•Ð Õ™ÑÉ…œéÕÈ9…¡‰•…É‰•¥ÑÕ¹œéÕËñ­••‰•¸¸œ°ì(€€€€€€€ÉÕ•­…‰•}ÉÕ¹èÉÕ¹°(€€€€€€€éÕÉÕ•­••‰•¹}Ù½¸èÕÍ•É%°(€€€€€€€éÕÉÕ•­••‰•¹}…´è©•ÑéÐ°(€€€€€ô¤ì((€€€€€Í•ÑÕ™ÑÉ…œ¡À€ôø€¡ì(€€€€€€€€¸¸¹À°(€€€€€€€ÍÑ…ÑÕÌè€€€€€€€€€€9…¡‰•…É‰•¥ÑÕ¹œ•É™½É‘•É±¥ œ°(€€€€€€€ÉÕ•­…‰•}ÉÕ¹èÉÕ¹°(€€€€€€€ÉÕ•­…‰•}…Ðè€€€©•ÑéÐ°(€€€€€ô¤¤ì(€€€€€Í•ÑÉ™½±œ¡Õ™ÑÉ…œéÕËñ­••‰•¸¸ÉÕ¹è€ˆ‘íÉÕ¹‘ô‰€¤ì(€€€ô…Ñ €¡”¤ì(€€€€€Í•Ñ•¡±•È¡”¹µ•ÍÍ…”€üü€•¡±•È‰•¥´iÕËñ­•‰•¸œ¤ì(€€€ô(€€€Í•ÑM…Ù¥¹œ¡™…±Í”¤ì(€ô((€€¼¨ƒŠRŠR iÔI•¡¹Õ¹œ¹…Ù¥¥•É•¸ƒŠRŠR €¨¼(€™Õ¹Ñ¥½¸¡…¹‘±•I•¡¹Õ¹ÉÍÑ•±±•¸ ¤ì(€€€É½ÕÑ•È¹ÁÕÍ ¡€½‘…Í¡‰½…É½É•¡¹Õ¹•¸½¹•Ôý…Õ™ÑÉ…}¥ô‘í…Õ™ÑÉ…%‘õ€¤ì(€ô((€€¼¨ƒŠRŠR Y½±±ÍÓ‘¹‘¥­•¥ÑÍÁËñ™Õ¹œƒŠRŠR €¨¼(€½¹ÍÐì¡•­Ì°…±±=¬ô€ô…Õ™ÑÉ…œ(€€€€üÁÉÕ•™”¡…Õ™ÑÉ…œ°‘½¬°µ…Ñ•É¥…°°™½Ñ½Ì¤(€€€€èì¡•­Ìèmt°…±±=¬è™…±Í”ôì((€€¼¨ƒŠRŠR I•¹‘•ÈµÕ…É‘ÌƒŠRŠR €¨¼(€¥˜€¡éÕÍÑ…¹€ôôô€±½…‘¥¹œœ¤É•ÑÕÉ¸€ñM­•±•Ñ½¸€¼øì((€¥˜€¡éÕÍÑ…¹€ôôô€™½É‰¥‘‘•¸œ¤É•ÑÕÉ¸€ (€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ¥¸µ µÍÉ••¸‰œµÉ…ä´ÔÀ™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÀ´Ðˆø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ•áÐµ•¹Ñ•Èµ…àµÜµÍ´ˆø(€€€€€€€€ñMÙœô‰4ÄÈ€åØÌ¸ÜÕ´À´ÄÀ¸ÀÌÙÄÄ¸äÔä€ÄÄ¸äÔä€À€ÀÄÌ¸Ôäà€Ø€ÄÄ¸ää€ÄÄ¸ää€À€ÀÀÌ€ä¸ÜÕŒÀ€Ô¸ÔäÈ€Ì¸àÈÐ€ÄÀ¸Èä€ä€ÄÄ¸ØÈÌ€Ô¸ÄÜØ´Ä¸ÌÌÈ€ä´Ø¸ÀÌ€ä´ÄÄ¸ØÈÈ€À´Ä¸ÌÄ´¸ÈÄ´È¸ÔÜÄ´¸Ôäà´Ì¸ÜÔÅ ´¸ÄÔÉŒ´Ì¸ÄäØ€À´Ø¸Ä´Ä¸ÈÐà´à¸ÈÔ´Ì¸ÈàÙé´À€ÄÌ¸ÀÌÙ ¸ÀÀáØ¸ÀÀá ÄÉØ´¸ÀÀáèˆ±Ìô‰Ü´ÄÈ ´ÄÈÑ•áÐµÉ•´ÌÀÀµàµ…ÕÑ¼µˆ´Ðˆ€¼ø(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰Ñ•áÐµ±œ™½¹Ðµ‰½±Ñ•áÐµÉ…ä´àÀÀµˆ´Èˆù-•¥¸iÕÉ¥™˜ð½ Èø(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµÉ…ä´ÐÀÀµˆ´ÔˆùM¥”¡…‰•¸­•¥¹”	•É•¡Ñ¥Õ¹œ›ñÈ‘¥•Í”M•¥Ñ”¸ð½Àø(€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õì ¤€ôøÉ½ÕÑ•È¹ÁÕÍ  œ½‘…Í¡‰½…Éœ¥ô(€€€€€€€€€±…ÍÍ9…µ”ô‰Áà´ÐÁä´È¸Ô‰œµ‰±Õ”´ØÀÀÑ•áÐµÝ¡¥Ñ”É½Õ¹‘•µá°Ñ•áÐµÍ´™½¹ÐµÍ•µ¥‰½±¡½Ù•Èé‰œµ‰±Õ”´ÜÀÀÑÉ…¹Í¥Ñ¥½¸ˆø(€€€€€€€€€iÕ´…Í¡‰½…É(€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€ð½‘¥Øø(€€€€ð½‘¥Øø(€€¤ì((€¥˜€¡éÕÍÑ…¹€ôôô€¹½Ñ}™½Õ¹œ¤É•ÑÕÉ¸€ (€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ¥¸µ µÍÉ••¸‰œµÉ…ä´ÔÀ™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÀ´Ðˆø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ•áÐµ•¹Ñ•Èµ…àµÜµÍ´ˆø(€€€€€€€€ñMÙœô‰4Ää¸Ô€ÄÐ¸ÈÕØ´È¸ØÈÕ„Ì¸ÌÜÔ€Ì¸ÌÜÔ€À€ÀÀ´Ì¸ÌÜÔ´Ì¸ÌÜÕ ´Ä¸ÕÄ¸ÄÈÔ€Ä¸ÄÈÔ€À€ÀÄÄÌ¸Ô€Ü¸ÄÈÕØ´Ä¸Õ„Ì¸ÌÜÔ€Ì¸ÌÜÔ€À€ÀÀ´Ì¸ÌÜÔ´Ì¸ÌÜÕ à¸ÈÕ´À€ÄÈ¸ÜÕ Ü¸Õ´´Ü¸Ô€Í ÄÉ4ÄÀ¸Ô€È¸ÈÕ Ô¸ØÈÕŒ´¸ØÈÄ€À´Ä¸ÄÈÔ¸ÔÀÐ´Ä¸ÄÈÔ€Ä¸ÄÈÕØÄÜ¸ÈÕŒÀ€¸ØÈÄ¸ÔÀÐ€Ä¸ÄÈÔ€Ä¸ÄÈÔ€Ä¸ÄÈÕ ÄÈ¸ÜÕŒ¸ØÈÄ€À€Ä¸ÄÈÔ´¸ÔÀÐ€Ä¸ÄÈÔ´Ä¸ÄÈÕXÄÄ¸ÈÕ„ä€ä€À€ÀÀ´ä´åèˆ±Ìô‰Ü´ÄÈ ´ÄÈÑ•áÐµÉ…ä´ÈÀÀµàµ…ÕÑ¼µˆ´Ðˆ€¼ø(€€€€€€€€ñ È±…ÍÍ9…µ”ô‰Ñ•áÐµ±œ™½¹Ðµ‰½±Ñ•áÐµÉ…ä´àÀÀµˆ´ÈˆùÕ™ÑÉ…œ¹¥¡Ð•™Õ¹‘•¸ð½ Èø(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµÉ…ä´ÐÀÀµˆ´Ôˆùì……Õ™ÑÉ…%€ü€-•¥¹”Õ™ÑÉ…Ìµ%…¹••‰•¸¸œ€è€¥•Í•ÈÕ™ÑÉ…œ•á¥ÍÑ¥•ÉÐ¹¥¡Ð½‘•ÈM¥”¡…‰•¸­•¥¹•¸iÕÉ¥™˜¸ôð½Àø(€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õì ¤€ôøÉ½ÕÑ•È¹ÁÕÍ  œ½‘…Í¡‰½…É½…Õ™ÑÉ…•”œ¥ô(€€€€€€€€€±…ÍÍ9…µ”ô‰Áà´ÐÁä´È¸Ô‰œµ‰±Õ”´ØÀÀÑ•áÐµÝ¡¥Ñ”É½Õ¹‘•µá°Ñ•áÐµÍ´™½¹ÐµÍ•µ¥‰½±¡½Ù•Èé‰œµ‰±Õ”´ÜÀÀÑÉ…¹Í¥Ñ¥½¸ˆø(€€€€€€€€€iÕÈÕ™ÑÉ…Ïñ‰•ÉÍ¥¡Ð(€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€ð½‘¥Øø(€€€€ð½‘¥Øø(€€¤ì((€½¹ÍÐ¥ÍÑ‰•Í¡±½ÍÍ•¸€ô…Õ™ÑÉ…œü¹ÍÑ…ÑÕÌ€ôôô€…‰•Í¡±½ÍÍ•¸œì(€½¹ÍÐ¥ÍÑiÕÉÕ•­••‰•¸€ô…Õ™ÑÉ…œü¹ÍÑ…ÑÕÌ€ôôô€9…¡‰•…É‰•¥ÑÕ¹œ•É™½É‘•É±¥ œì((€€¼¨ƒŠRŠR !…ÕÁÑ…¹Í¥¡ÐƒŠRŠR €¨¼(€É•ÑÕÉ¸€ (€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ¥¸µ µÍÉ••¸‰œµÉ…ä´ÔÀˆø(€€€€€ì¼¨MÑ¥­ä!•…‘•È€¨½ô(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰‰œµÝ¡¥Ñ”‰½É‘•Èµˆ‰½É‘•ÈµÉ…ä´ÄÀÀÍÑ¥­äÑ½À´Àè´ÌÀˆø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ…àµÜ´Íá°µàµ…ÕÑ¼Áà´ÐÁä´Ì™±•à¥Ñ•µÌµ•¹Ñ•È…À´Ìˆø(€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õì ¤€ôøÉ½ÕÑ•È¹ÁÕÍ ¡€½‘…Í¡‰½…É½…Õ™ÑÉ…•”¼‘í…Õ™ÑÉ…%‘õ€¥ô(€€€€€€€€€€€±…ÍÍ9…µ”ô‰À´ÈÉ½Õ¹‘•µá°Ñ•áÐµÉ…ä´ÐÀÀ¡½Ù•Èé‰œµÉ…ä´ÔÀ¡½Ù•ÈéÑ•áÐµÉ…ä´ØÀÀÑÉ…¹Í¥Ñ¥½¸ˆø(€€€€€€€€€€€€ñMÙœô‰4ÄÀ¸Ô€Ää¸Õ0Ì€ÄÉ´À€Á°Ü¸Ô´Ü¸Õ4Ì€ÄÉ Äàˆ±Ìô‰Ü´Ô ´Ôˆ€¼ø(€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à´Äµ¥¸µÜ´Àˆø(€€€€€€€€€€€€ñ Ä±…ÍÍ9…µ”ô‰Ñ•áÐµ‰…Í”™½¹Ðµ‰½±Ñ•áÐµÉ…ä´äÀÀÑÉÕ¹…Ñ”ˆùÕ™ÑÉ…œÁËñ™•¸€˜…‰Í¡±¥—}•¸ð½ Äø(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµÉ…ä´ÐÀÀÑÉÕ¹…Ñ”ˆø(€€€€€€€€€€€€€í…Õ™ÑÉ…œü¹ÑåÀ€üü…Õ™ÑÉ…œü¹Ñ¥Ñ•°€üü€Õ™ÑÉ…œôƒ
Ü€í…Õ™ÑÉ…œü¹…Õ™ÑÉ…Í¹Õµµ•È€üü…Õ™ÑÉ…%ü¹Í±¥” À°€à¥ô(€€€€€€€€€€€€ð½Àø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€ì¼¨MÑ…ÑÕÌµ	…‘”¥´!•…‘•È€¨½ô(€€€€€€€€€í…Õ™ÑÉ…œü¹ÍÑ…ÑÕÌ€˜˜€ (€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍ¡É¥¹¬´À™±•à¥Ñ•µÌµ•¹Ñ•È…À´Ä¸ÔÁà´È¸ÔÁä´ÄÉ½Õ¹‘•µ™Õ±°Ñ•áÐµáÌ™½¹ÐµÍ•µ¥‰½±‰½É‘•È(€€€€€€€€€€€€€€‘í¥ÍÑ‰•Í¡±½ÍÍ•¸€ü€‰œµÉ••¸´ÔÀÑ•áÐµÉ••¸´ÜÀÀ‰½É‘•ÈµÉ••¸´ÈÀÀœ(€€€€€€€€€€€€€€€€è¥ÍÑiÕÉÕ•­••‰•¸€ü€‰œµÉ•´ÔÀÑ•áÐµÉ•´ØÀÀ‰½É‘•ÈµÉ•´ÈÀÀœ(€€€€€€€€€€€€€€€€è€‰œµ‰±Õ”´ÔÀÑ•áÐµ‰±Õ”´ÜÀÀ‰½É‘•Èµ‰±Õ”´ÈÀÀõôø(€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÜ´Ä¸Ô ´Ä¸ÔÉ½Õ¹‘•µ™Õ±°€‘í¥ÍÑ‰•Í¡±½ÍÍ•¸€ü€‰œµÉ••¸´ÔÀÀœ€è¥ÍÑiÕÉÕ•­••‰•¸€ü€‰œµÉ•´ÐÀÀœ€è€‰œµ‰±Õ”´ÔÀÀõô€¼ø(€€€€€€€€€€€€€í…Õ™ÑÉ…œ¹ÍÑ…ÑÕÍô(€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€¥ô(€€€€€€€€ð½‘¥Øø(€€€€€€ð½‘¥Øø((€€€€€ì¼¨Kñ­…‰”µ	…¹¹•È€¨½ô(€€€€€í¥ÍÑiÕÉÕ•­••‰•¸€˜˜…Õ™ÑÉ…œü¹ÉÕ•­…‰•}ÉÕ¹€˜˜€ (€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰‰œµ…µ‰•È´ÔÀ‰½É‘•Èµˆ‰½É‘•Èµ…µ‰•È´ÄÀÀÁà´ÐÁä´Ìˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ…àµÜ´Íá°µàµ…ÕÑ¼™±•à¥Ñ•µÌµÍÑ…ÉÐ…À´È¸Ôˆø(€€€€€€€€€€€€ñMÙœô‰4ÄÈ€åØÌ¸ÜÕ´´ä¸ÌÀÌ€Ì¸ÌÜÙŒ´¸àØØ€Ä¸Ô¸ÈÄÜ€Ì¸ÌÜÐ€Ä¸äÐà€Ì¸ÌÜÑ ÄÐ¸ÜÅŒÄ¸ÜÌ€À€È¸àÄÌ´Ä¸àÜÐ€Ä¸äÐà´Ì¸ÌÜÑ0ÄÌ¸äÐä€Ì¸ÌÜáŒ´¸àØØ´Ä¸Ô´Ì¸ÀÌÈ´Ä¸Ô´Ì¸àäà€Á0È¸ØäÜ€ÄØ¸ÄÈÙé4ÄÈ€ÄÔ¸ÜÕ ¸ÀÀÝØ¸ÀÀá ÄÉØ´¸ÀÀáèˆ±Ìô‰Ü´Ð ´ÐÑ•áÐµ…µ‰•È´ØÀÀµÐ´À¸ÔÍ¡É¥¹¬´Àˆ€¼ø(€€€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´™½¹ÐµÍ•µ¥‰½±Ñ•áÐµ…µ‰•È´àÀÀˆù9…¡‰•…É‰•¥ÑÕ¹œ•É™½É‘•É±¥ ð½Àø(€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµ…µ‰•È´ØÀÀµÐ´À¸ÔˆùÉÕ¹èí…Õ™ÑÉ…œ¹ÉÕ•­…‰•}ÉÕ¹‘ôð½Àø(€€€€€€€€€€€€€í…Õ™ÑÉ…œ¹ÉÕ•­…‰•}…Ð€˜˜€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµ…µ‰•È´ÔÀÀµÐ´À¸ÔˆùiÕËñ­••‰•¸…´í™µÑ…ÑÕµi•¥Ð¡…Õ™ÑÉ…œ¹ÉÕ•­…‰•}…Ð¥ôð½Àùô(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½‘¥Øø(€€€€€€¥ô((€€€€€ì¼¨½¹Ñ•¹Ð€¨½ô(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ…àµÜ´Íá°µàµ…ÕÑ¼Áà´ÐÁä´ÔÍÁ…”µä´Ðˆø(€€€€€€€ì¼¨±½‰…±”É™½±Ì½•¡±•Èµ5•±‘Õ¹œ€¨½ô(€€€€€€€í•É™½±œ€˜˜€ (€€€€€€€€€€ñ±•ÉÐÑåÁ”ô‰ÍÕ•ÍÌˆùí•É™½±ôð½±•ÉÐø(€€€€€€€€¥ô((€€€€€€€ì¼¨€Ä¸Y½±±ÍÓ‘¹‘¥­•¥ÑÍÁËñ™Õ¹œƒŠP½‰•¸…¹é•¥•¸›ñÈÍ¡¹•±±•¸ƒq‰•É‰±¥¬€¨½ô(€€€€€€€€ñAÉÕ•™Õ¹-…ÉÑ”¡•­Ìõí¡•­Íô…±±=¬õí…±±=­ô€¼ø((€€€€€€€ì¼¨€È¸Õ™ÑÉ…Í¥¹™½Éµ…Ñ¥½¹•¸€¨½ô(€€€€€€€€ñÕ™ÑÉ…%¹™½-…ÉÑ”…Õ™ÑÉ…œõí…Õ™ÑÉ…ô€¼ø((€€€€€€€ì¼¨€Ì¸S‘Ñ¥­•¥ÑÍ‘½­Õµ•¹Ñ…Ñ¥½¸€¨½ô(€€€€€€€€ñ½­Õµ•¹Ñ…Ñ¥½¹-…ÉÑ”‘½¬õí‘½­ô€¼ø((€€€€€€€ì¼¨€Ð¸5…Ñ•É¥…°€¨½ô(€€€€€€€€ñ5…Ñ•É¥…±-…ÉÑ”‘½¬õí‘½­ôµ…Ñ•É¥…°õíµ…Ñ•É¥…±ô€¼ø((€€€€€€€ì¼¨€Ô¸É‰•¥ÑÍé•¥Ñ•¸€¨½ô(€€€€€€€€ñÉ‰•¥ÑÍé•¥Ñ•¹-…ÉÑ”‘½¬õí‘½­ô€¼ø((€€€€€€€ì¼¨€Ø¸½Ñ½Ì€¨½ô(€€€€€€€€ñ½Ñ½Í-…ÉÑ”™½Ñ½Ìõí™½Ñ½Íô€¼ø((€€€€€€€ì¼¨€Ü¸-Õ¹‘•¹Õ¹Ñ•ÉÍ¡É¥™Ð€¨½ô(€€€€€€€€ñU¹Ñ•ÉÍ¡É¥™Ñ-…ÉÑ”‘½¬õí‘½­ô€¼ø((€€€€€€€ì¼¨€à¸Kñ­…‰”€¡¹ÕÈ›ñÈ	•…É‰•¥Ñ•È°¹ÕÈÝ•¹¸¹½ ¹¥¡Ð…‰•Í¡±½ÍÍ•¸¤€¨½ô(€€€€€€€í‘…É˜€˜˜€…¥ÍÑ‰•Í¡±½ÍÍ•¸€˜˜€ (€€€€€€€€€€ñIÕ•­…‰•-…ÉÑ”(€€€€€€€€€€€½¹IÕ•­…‰”õí¡…¹‘±•IÕ•­…‰•ô(€€€€€€€€€€€Í…Ù¥¹œõíÍ…Ù¥¹ô(€€€€€€€€€€€…‰•Í¡±½ÍÍ•¸õí¥ÍÑ‰•Í¡±½ÍÍ•¹ô(€€€€€€€€€€¼ø(€€€€€€€€¥ô((€€€€€€€ì¼¨€ä¸‰Í¡±ÕÍÌ€¨½ô(€€€€€€€€ñ‰Í¡±ÕÍÍ-…ÉÑ”(€€€€€€€€€…Õ™ÑÉ…œõí…Õ™ÑÉ…ô(€€€€€€€€€‘½¬õí‘½­ô(€€€€€€€€€…±±=¬õí…±±=­ô(€€€€€€€€€½¹‰Í¡±¥•ÍÍ•¸õí¡…¹‘±•‰Í¡±¥•ÍÍ•¹ô(€€€€€€€€€½¹I•¡¹Õ¹ÉÍÑ•±±•¸õí¡…¹‘±•I•¡¹Õ¹ÉÍÑ•±±•¹ô(€€€€€€€€€Í…Ù¥¹œõíÍ…Ù¥¹ô(€€€€€€€€€™•¡±•Èõí™•¡±•Éô(€€€€€€€€€‘…É˜õí‘…É™ô(€€€€€€€€¼ø((€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ ´àˆ€¼ø(€€€€€€ð½‘¥Øø(€€€€ð½‘¥Øø(€€¤ì)ô()•áÁ½ÉÐ‘•™…Õ±Ð™Õ¹Ñ¥½¸‰Í¡±ÕÍÍA…” ¤ì(€É•ÑÕÉ¸€ñMÕÍÁ•¹Í”™…±±‰…¬õí¹Õ±±ôøñ‰Í¡±ÕÍÍA…•%¹¹•È€¼øð½MÕÍÁ•¹Í”øì)ô(