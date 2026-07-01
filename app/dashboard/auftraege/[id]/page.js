'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import TabNav from '@/components/ui/TabNav';

/* ════════════════════════════════════════════════════════════════
   ROLLEN & RECHTE
════════════════════════════════════════════════════════════════ */

function berechneRechte(rolle) {
  const alle      = ['inhaber', 'administrator'];
  const bueroEdit = [...alle, 'buero'];
  const dispEdit  = [...alle, 'disponent'];
  return {
    editAuftrag:    bueroEdit.includes(rolle),
    editRessourcen: dispEdit.includes(rolle),
    changeStatus:   dispEdit.includes(rolle),
    abschliessen:   ['inhaber', 'buero'].includes(rolle),
    addNotizen:     ['inhaber', 'administrator', 'buero', 'disponent', 'techniker'].includes(rolle),
    sichtbar:       ['inhaber', 'administrator', 'buero', 'disponent', 'techniker'].includes(rolle),
  };
}

/* ════════════════════════════════════════════════════════════════
   STATUS-KONFIGURATION
════════════════════════════════════════════════════════════════ */

const STATUS_CFG = {
  'Neu':           { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200'   },
  'Geplant':       { bg: 'bg-cyan-50',    text: 'text-cyan-700',   dot: 'bg-cyan-500',   border: 'border-cyan-200'   },
  'Notdienst':     { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200' },
  'Zugewiesen':    { bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-200' },
  'In Arbeit':     { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500',  border: 'border-amber-200'  },
  'Abgeschlossen': { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200'  },
  'Storniert':     { bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400',    border: 'border-red-200'    },
};
const STATUS_LISTE = Object.keys(STATUS_CFG);

const RESSOURCE_STATUS = {
  verfuegbar: { label: 'Verfügbar',   dot: 'bg-green-500'  },
  im_einsatz: { label: 'Im Einsatz',  dot: 'bg-orange-400' },
  urlaub:     { label: 'Urlaub',      dot: 'bg-blue-400'   },
  krank:      { label: 'Krank',       dot: 'bg-red-400'    },
  gut:        { label: 'Gut',         dot: 'bg-green-500'  },
  in_ordnung: { label: 'OK',          dot: 'bg-green-500'  },
  ok:         { label: 'OK',          dot: 'bg-green-500'  },
  defekt:     { label: 'Defekt',      dot: 'bg-red-500'    },
  wartung:    { label: 'In Wartung',  dot: 'bg-yellow-400' },
};

/* ════════════════════════════════════════════════════════════════
   WORKFLOW-KONFIGURATION
════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════
   TAB-KONFIGURATION
════════════════════════════════════════════════════════════════ */

const AUFTRAG_TABS = [
  { id: 'uebersicht',    label: 'Übersicht'            },
  { id: 'planung',       label: 'Planung'              },
  { id: 'ressourcen',    label: 'Ressourcen'           },
  { id: 'einsatz',       label: 'Einsatz & Dokumentation' },
  { id: 'abschluss',     label: 'Abschluss'            },
];

const WORKFLOW_SCHRITTE = [
  { key: 'erstellt',      label: 'Auftrag erstellt',      kurz: 'Erstellt'    },
  { key: 'geplant',       label: 'Auftrag geplant',       kurz: 'Geplant'     },
  { key: 'ressourcen',    label: 'Ressourcen eingeteilt', kurz: 'Ressourcen'  },
  { key: 'bearbeiten',    label: 'Auftrag bearbeiten',    kurz: 'Bearbeiten'  },
  { key: 'dokumentieren', label: 'Einsatz dokumentieren', kurz: 'Doku'        },
  { key: 'unterschrift',  label: 'Kundenunterschrift',    kurz: 'Unterschrift'},
  { key: 'abschluss',     label: 'Auftrag abschließen',  kurz: 'Abschluss'   },
];

function berechneWorkflowStati(auftrag, mitarbeiterList) {
  if (!auftrag) return {};
  let meta = {};
  try { meta = typeof auftrag.notizen === 'string' ? JSON.parse(auftrag.notizen) : (auftrag.notizen ?? {}); } catch { meta = {}; }
  const hatPlanung   = !!(meta.planungs_datum) || auftrag.status !== 'Neu';
  const hatRessourcen = mitarbeiterList.length > 0 && !!auftrag.fahrzeug_id;
  const hatEinsatz   = ['In Arbeit', 'Abgeschlossen', 'Storniert'].includes(auftrag.status);
  const abgeschlossen = auftrag.status === 'Abgeschlossen';
  return {
    erstellt:      'done',
    geplant:       hatPlanung    ? 'done' : 'open',
    ressourcen:    hatRessourcen ? 'done' : 'open',
    bearbeiten:    'current',
    dokumentieren: hatEinsatz    ? 'done' : 'open',
    unterschrift:  'open',
    abschluss:     abgeschlossen ? 'done' : 'open',
  };
}

/* ════════════════════════════════════════════════════════════════
   HILFSFUNKTIONEN
════════════════════════════════════════════════════════════════ */

function kundeAnzeigeName(k) {
  if (!k) return '—';
  return k.kundentyp === 'firma' ? (k.firmenname ?? k.name ?? '—') : (k.name ?? '—');
}

function parseNotizen(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [{ ts: new Date().toISOString(), text: raw, autor: 'System' }];
  } catch {
    return [{ ts: new Date().toISOString(), text: String(raw), autor: 'System' }];
  }
}

function fmtDatum(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtZeit(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function minZuHM(min) {
  if (min == null || isNaN(min)) return '—';
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${h}h ${m}min`;
}

function initials(m) {
  if (!m) return '?';
  return ((m.vorname?.[0] ?? '') + (m.nachname?.[0] ?? '')).toUpperCase() || '?';
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

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status || 'Unbekannt'}
    </span>
  );
}

function RessourceStatusDot({ status }) {
  const key = (status ?? '').toLowerCase().replace(/[ -]/g, '_');
  const cfg = RESSOURCE_STATUS[key];
  if (!cfg) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function inp(err = false) {
  return `w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 bg-white placeholder-gray-300
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
    ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`;
}

function Karte({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function KarteHeader({ icon, title, badge, badgeVariant = 'blue', action }) {
  const vars = {
    blue:   'bg-blue-50 text-blue-500',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-500',
    amber:  'bg-amber-50 text-amber-600',
    gray:   'bg-gray-100 text-gray-500',
  };
  return (
    <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
      {icon && (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${vars[badgeVariant] ?? vars.blue}`}>
          <Svg d={icon} cls="w-3.5 h-3.5" />
        </div>
      )}
      <span className="text-sm font-semibold text-gray-900">{title}</span>
      {badge !== undefined && (
        <span className="ml-auto text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 font-medium">
          {badge}
        </span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function InfoZeile({ label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value || <span className="text-gray-300 font-normal italic">—</span>}</p>
    </div>
  );
}

function EditBtn({ onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition">
      <Svg d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" cls="w-3.5 h-3.5" />
      Bearbeiten
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
   SKELETON / FEHLERZUSTÄNDE
════════════════════════════════════════════════════════════════ */

function Skeleton() {
  return (
    <div className="space-y-5 max-w-6xl animate-pulse">
      <div className="h-8 w-64 bg-gray-100 rounded-xl" />
      <div className="h-20 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="h-52 bg-gray-100 rounded-2xl" />
          <div className="h-44 bg-gray-100 rounded-2xl" />
          <div className="h-36 bg-gray-100 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="h-28 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function FehlerKarte({ icon, titel, text, button }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Svg d={icon} cls="w-6 h-6 text-gray-400" />
      </div>
      <h2 className="text-base font-semibold text-gray-800 mb-1">{titel}</h2>
      <p className="text-sm text-gray-400 mb-5">{text}</p>
      {button}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   WORKFLOW-LEISTE
════════════════════════════════════════════════════════════════ */

function WorkflowLeiste({ auftrag, mitarbeiterList }) {
  const stati = berechneWorkflowStati(auftrag, mitarbeiterList);

  return (
    <Karte>
      {/* Desktop */}
      <div className="hidden md:flex items-stretch divide-x divide-gray-100">
        {WORKFLOW_SCHRITTE.map((s, i) => {
          const st = stati[s.key] ?? 'open';
          const isDone    = st === 'done';
          const isCurrent = st === 'current';
          const isLast    = i === WORKFLOW_SCHRITTE.length - 1;
          return (
            <div key={s.key} className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-4 relative
              ${isCurrent ? 'bg-blue-50/60' : 'bg-white'}
              ${!isLast ? '' : ''}
            `}>
              {/* Step circle */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors
                ${isCurrent
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : isDone
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                {isDone && !isCurrent
                  ? <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3.5 h-3.5" />
                  : <span className="text-[10px] font-bold">{i + 1}</span>
                }
              </div>
              {/* Label */}
              <span className={`text-[10px] font-semibold text-center leading-tight
                ${isCurrent ? 'text-blue-700' : isDone ? 'text-gray-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
              {/* Current indicator */}
              {isCurrent && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact chips */}
      <div className="flex md:hidden items-center gap-1 px-4 py-3 overflow-x-auto">
        {WORKFLOW_SCHRITTE.map((s, i) => {
          const st = stati[s.key] ?? 'open';
          const isDone    = st === 'done';
          const isCurrent = st === 'current';
          return (
            <div key={s.key} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold
                ${isCurrent ? 'bg-blue-600 text-white' : isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {isDone
                  ? <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3" />
                  : <span>{i + 1}</span>
                }
                {isCurrent && <span>{s.kurz}</span>}
              </div>
              {i < WORKFLOW_SCHRITTE.length - 1 && (
                <div className="w-2 h-px bg-gray-200 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   BEREICH 1 – AUFTRAGSINFORMATIONEN
════════════════════════════════════════════════════════════════ */

function AuftragInfoKarte({ auftrag, rechte, onRefresh }) {
  const [edit,   setEdit]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [erfolg, setErfolg] = useState(false);
  const [form,   setForm]   = useState({
    typ:             auftrag.typ             ?? '',
    beschreibung:    auftrag.beschreibung    ?? '',
    ansprechpartner: auftrag.ansprechpartner ?? '',
    einsatzdatum:    auftrag.einsatzdatum    ?? '',
    startzeit:       auftrag.startzeit       ?? '',
  });

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  async function speichern() {
    setSaving(true);
    setErfolg(false);
    await supabase.from('auftraege').update({
      typ:             form.typ.trim()             || null,
      beschreibung:    form.beschreibung.trim()    || null,
      ansprechpartner: form.ansprechpartner.trim() || null,
      einsatzdatum:    form.einsatzdatum           || null,
      startzeit:       form.startzeit              || null,
    }).eq('id', auftrag.id);
    setErfolg(true);
    setEdit(false);
    setSaving(false);
    onRefresh();
  }

  const kname  = kundeAnzeigeName(auftrag.kunden);
  const adresse = [auftrag.einsatzort_strasse, auftrag.einsatzort_plz, auftrag.einsatzort_ort].filter(Boolean).join(', ');
  const telefon = auftrag.kunden?.telefon ?? auftrag.telefon ?? '—';

  return (
    <Karte>
      <KarteHeader
        icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        title="Auftragsinformationen"
        badgeVariant="blue"
        action={rechte.editAuftrag && !edit
          ? <EditBtn onClick={() => setEdit(true)} />
          : null
        }
      />

      <div className="px-5 py-5">
        {!edit ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <InfoZeile label="Auftragsnummer" value={auftrag.nummer} />
            <InfoZeile label="Auftragsart"    value={auftrag.typ} />
            <InfoZeile label="Priorität"      value={auftrag.prioritaet} />
            <InfoZeile label="Kunde"          value={kname} />
            <InfoZeile label="Ansprechpartner" value={auftrag.ansprechpartner} />
            <InfoZeile label="Telefon"        value={telefon} />
            <InfoZeile label="Einsatzort"     value={adresse || '—'} fullWidth />
            <InfoZeile label="Einsatzdatum"   value={fmtDatum(auftrag.einsatzdatum)} />
            <InfoZeile label="Startzeit"      value={auftrag.startzeit ?? '—'} />
            <InfoZeile label="Erstellungsdatum" value={fmtDatum(auftrag.created_at)} />
            {auftrag.beschreibung && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Beschreibung</p>
                <p className="text-sm text-gray-700 leading-relaxed">{auftrag.beschreibung}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Auftragsart
                </label>
                <input value={form.typ} onChange={set('typ')}
                  placeholder="z. B. Kanalreinigung" className={inp()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Ansprechpartner
                </label>
                <input value={form.ansprechpartner} onChange={set('ansprechpartner')}
                  placeholder="Name" className={inp()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Einsatzdatum
                </label>
                <input type="date" value={form.einsatzdatum} onChange={set('einsatzdatum')} className={inp()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Startzeit
                </label>
                <input type="time" value={form.startzeit} onChange={set('startzeit')} className={inp()} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Beschreibung
              </label>
              <textarea rows={3} value={form.beschreibung} onChange={set('beschreibung')}
                placeholder="Auftragsbeschreibung…" className={`${inp()} resize-none`} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={speichern} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                {saving ? (
                  <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                ) : (
                  <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-4 h-4" />
                )}
                Speichern
              </button>
              <button onClick={() => setEdit(false)}
                className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {erfolg && (
          <div className="mt-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
            <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 shrink-0" />
            Auftragsdaten gespeichert.
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   BEREICH 2 – RESSOURCEN
════════════════════════════════════════════════════════════════ */

function RessourcenKarte({ auftrag, mitarbeiterList, maschinenList, rechte, auftragId }) {
  const fahrzeug    = auftrag.fahrzeuge;
  const einsatzltr  = auftrag.einsatzleiter;
  const hatDaten    = mitarbeiterList.length > 0 || fahrzeug || maschinenList.length > 0;

  return (
    <Karte>
      <KarteHeader
        icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        title="Ressourcen"
        badgeVariant="purple"
        badge={hatDaten ? undefined : 'Noch nicht eingeteilt'}
        action={rechte.editRessourcen ? (
          <a href={`/dashboard/auftraege/zuweisung?id=${auftragId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition">
            <Svg d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" cls="w-3.5 h-3.5" />
            Bearbeiten
          </a>
        ) : null}
      />

      <div className="px-5 py-5 space-y-5">
        {!hatDaten && (
          <div className="text-center py-6">
            <Svg d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              cls="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Noch keine Ressourcen eingeteilt.</p>
            {rechte.editRessourcen && (
              <a href={`/dashboard/auftraege/zuweisung?id=${auftragId}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline">
                <Svg d="M12 4.5v15m7.5-7.5h-15" cls="w-3.5 h-3.5" />
                Ressourcen einteilen
              </a>
            )}
          </div>
        )}

        {/* Mitarbeiter */}
        {mitarbeiterList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              Mitarbeiter ({mitarbeiterList.length})
            </p>
            <div className="space-y-2">
              {mitarbeiterList.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-1">
                  <div className={`w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0`}>
                    {initials(m)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.vorname} {m.nachname}
                      {einsatzltr?.id === m.id && (
                        <span className="ml-2 text-xs bg-yellow-50 text-yellow-700 border border-yellow-100 px-1.5 py-0.5 rounded-full font-medium">
                          Einsatzleiter
                        </span>
                      )}
                    </p>
                    {m.position && <p className="text-xs text-gray-400 truncate">{m.position}</p>}
                  </div>
                  <div className="ml-auto shrink-0">
                    <RessourceStatusDot status={m.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fahrzeug */}
        {fahrzeug && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Fahrzeug</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Svg d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                  cls="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {fahrzeug.marke} {fahrzeug.modell ?? ''}
                </p>
                <p className="text-xs text-gray-400">{fahrzeug.kennzeichen}</p>
              </div>
            </div>
          </div>
        )}

        {/* Maschinen & Geräte */}
        {maschinenList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              Maschinen & Geräte ({maschinenList.length})
            </p>
            <div className="space-y-1.5">
              {maschinenList.map(g => (
                <div key={g.id} className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Svg d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                      cls="w-3 h-3 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-700">{g.name}</p>
                  {g.typ && <span className="text-xs text-gray-400">· {g.typ}</span>}
                  <div className="ml-auto"><RessourceStatusDot status={g.zustand} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   BEREICH 4 – AUFTRAGSNOTIZEN
════════════════════════════════════════════════════════════════ */

function NotizenKarte({ auftrag, rechte, userName, onRefresh }) {
  const [notizen, setNotizen]     = useState(() => parseNotizen(auftrag.interne_notizen));
  const [neuText, setNeuText]     = useState('');
  const [saving,  setSaving]      = useState(false);

  async function hinzufuegen() {
    if (!neuText.trim()) return;
    setSaving(true);
    const neueNotizen = [
      ...notizen,
      { ts: new Date().toISOString(), text: neuText.trim(), autor: userName || 'Unbekannt' },
    ];
    await supabase.from('auftraege').update({
      interne_notizen: JSON.stringify(neueNotizen),
    }).eq('id', auftrag.id);
    setNotizen(neueNotizen);
    setNeuText('');
    setSaving(false);
  }

  return (
    <Karte>
      <KarteHeader
        icon="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        title="Interne Notizen"
        badgeVariant="amber"
        badge={notizen.length > 0 ? `${notizen.length}` : undefined}
      />

      <div className="px-5 py-5 space-y-4">
        {/* Existing notes */}
        {notizen.length === 0 ? (
          <p className="text-sm text-gray-300 italic text-center py-4">Noch keine Notizen vorhanden.</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {notizen.slice().reverse().map((n, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {(n.autor?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-700">{n.autor}</span>
                    <span className="text-[10px] text-gray-400">{fmtDatum(n.ts)} {fmtZeit(n.ts)}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add note */}
        {rechte.addNotizen && (
          <div className="border-t border-gray-50 pt-4">
            <textarea
              rows={3}
              value={neuText}
              onChange={e => setNeuText(e.target.value)}
              placeholder="Notiz hinzufügen…"
              className={`${inp()} resize-none mb-2`}
            />
            <button onClick={hinzufuegen} disabled={saving || !neuText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {saving
                ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-3.5 h-3.5 animate-spin" />
                : <Svg d="M12 4.5v15m7.5-7.5h-15" cls="w-3.5 h-3.5" />
              }
              Notiz speichern
            </button>
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   RECHTE SPALTE – STATUS-KARTE
════════════════════════════════════════════════════════════════ */

function StatusKarte({ auftrag, rechte, onRefresh }) {
  const [status,  setStatus]  = useState(auftrag.status ?? 'Neu');
  const [saving,  setSaving]  = useState(false);
  const [erfolg,  setErfolg]  = useState(false);
  const changed = status !== auftrag.status;

  async function speichern() {
    setSaving(true);
    setErfolg(false);
    await supabase.from('auftraege').update({ status }).eq('id', auftrag.id);
    setErfolg(true);
    setSaving(false);
    onRefresh();
  }

  return (
    <Karte>
      <KarteHeader
        icon="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        title="Auftragsstatus"
        badgeVariant="green"
      />

      <div className="px-5 py-5 space-y-4">
        {/* Current status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Aktuell</span>
          <StatusBadge status={auftrag.status} />
        </div>

        {/* Status picker */}
        {rechte.changeStatus && (
          <>
            <div className="space-y-1.5">
              {STATUS_LISTE.map(s => {
                const c = STATUS_CFG[s];
                const aktiv = status === s;
                return (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition text-left
                      ${aktiv
                        ? `${c.bg} ${c.text} ${c.border}`
                        : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600 bg-white'
                      }`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${aktiv ? c.dot : 'bg-gray-200'}`} />
                    {s}
                    {aktiv && <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3 ml-auto" />}
                  </button>
                );
              })}
            </div>

            {(changed || erfolg) && (
              <button onClick={speichern} disabled={saving || !changed}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition
                  ${changed ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-green-50 text-green-700 border border-green-100 cursor-default'}
                  disabled:opacity-60`}>
                {saving
                  ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                  : erfolg && !changed
                    ? <><Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4" /> Status gespeichert</>
                    : 'Status speichern'
                }
              </button>
            )}
          </>
        )}

        {/* Abschließen */}
        {rechte.abschliessen && auftrag.status !== 'Abgeschlossen' && (
          <div className="border-t border-gray-50 pt-3">
            <button
              onClick={async () => {
                setSaving(true);
                await supabase.from('auftraege').update({ status: 'Abgeschlossen' }).eq('id', auftrag.id);
                setSaving(false);
                onRefresh();
              }}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60">
              <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4" />
              Auftrag abschließen
            </button>
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   RECHTE SPALTE – NÄCHSTER SCHRITT (Bereich 5)
════════════════════════════════════════════════════════════════ */

function NaechsterSchrittKarte({ auftrag, rechte, router }) {
  const istAbgeschlossen = auftrag.status === 'Abgeschlossen';
  const istStorniert     = auftrag.status === 'Storniert';

  if (istAbgeschlossen) {
    return (
      <Karte>
        <div className="px-5 py-5 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Auftrag abgeschlossen</p>
          <p className="text-xs text-gray-400 mb-4">Bereit zur Rechnungsstellung</p>
          <button
            onClick={() => router.push(`/dashboard/rechnungen/neu?auftrag=${auftrag.id}`)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            <Svg d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" cls="w-4 h-4" />
            Rechnung erstellen
          </button>
        </div>
      </Karte>
    );
  }

  if (istStorniert) {
    return (
      <Karte>
        <div className="px-5 py-5 text-center">
          <p className="text-sm text-gray-400 italic">Auftrag wurde storniert.</p>
        </div>
      </Karte>
    );
  }

  return (
    <Karte>
      <div className="px-5 py-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nächster Schritt</p>
        <button
          onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?id=${auftrag.id}`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition shadow-sm shadow-blue-200 group">
          <Svg d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" cls="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          Einsatz durchführen
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">Zur Einsatzdokumentation</p>

        {/* Quick links */}
        <div className="mt-4 space-y-1.5 border-t border-gray-50 pt-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Weitere Aktionen</p>
          <a href={`/dashboard/auftraege/planen?id=${auftrag.id}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition">
            <Svg d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" cls="w-3.5 h-3.5" />
            Auftrag planen
          </a>
          {rechte.editRessourcen && (
            <a href={`/dashboard/auftraege/zuweisung?id=${auftrag.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition">
              <Svg d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" cls="w-3.5 h-3.5" />
              Ressourcen einteilen
            </a>
          )}
          <a href={`/dashboard/auftraege/fotos?id=${auftrag.id}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition">
            <Svg d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" cls="w-3.5 h-3.5" />
            Fotos hochladen
          </a>
        </div>
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   RECHTE SPALTE – AKTIVITÄTSCHRONIK
════════════════════════════════════════════════════════════════ */

function AktivitaetschronikKarte({ aktivitaeten }) {
  return (
    <Karte>
      <KarteHeader
        icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        title="Aktivitätschronik"
      />
      <div className="px-5 py-5">
        {aktivitaeten.length === 0 ? (
          <div className="text-center py-6 space-y-1">
            <p className="text-sm font-medium text-gray-500">Noch keine Aktivitäten vorhanden</p>
            <p className="text-xs text-gray-400">Für diesen Auftrag wurden bisher keine Aktivitäten protokolliert.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {aktivitaeten.map((e) => (
              <div key={e.id} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-blue-500 bg-blue-50">
                  <Svg d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700">{e.aktion}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {fmtDatum(e.erstellt_am)} · {fmtZeit(e.erstellt_am)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   EINSATZ-SUMMARY (Tab: Einsatz & Dokumentation)
════════════════════════════════════════════════════════════════ */

const EINSATZ_STATUS_CFG = {
  'Unterwegs':      { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'Vor Ort':        { bg: 'bg-cyan-50',   text: 'text-cyan-700',   dot: 'bg-cyan-500'   },
  'In Arbeit':      { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  'Arbeit beendet': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Dokumentiert':   { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
};

function EinsatzSummaryKarte({ dok, material, fotos, auftragId, router }) {
  /* ── Empty State ── */
  if (!dok) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Svg
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              cls="w-6 h-6 text-amber-500"
            />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Noch keine Einsatzdokumentation vorhanden</h2>
            <p className="text-sm text-gray-400">Der Techniker hat für diesen Auftrag noch keine Dokumentation erfasst.</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?id=${auftragId}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition">
            <Svg d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" cls="w-4 h-4" />
            Einsatz dokumentieren
          </button>
        </div>
      </div>
    );
  }

  /* ── Berechnungen ── */
  const statusCfg = EINSATZ_STATUS_CFG[dok.status] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
  const dauer = (dok.arbeit_begonnen_at && dok.arbeit_beendet_at)
    ? Math.round((new Date(dok.arbeit_beendet_at) - new Date(dok.arbeit_begonnen_at)) / 60000)
    : null;
  const hatUnterschrift = !!(dok.unterschrift_at || dok.unterschrift_vorhanden);
  const ersteMat    = (material ?? []).slice(0, 3);
  const ersteFotos  = (fotos   ?? []).slice(0, 3);

  function ZeitZeile({ label, iso }) {
    if (!iso) return <InfoZeile label={label} value="—" />;
    return <InfoZeile label={label} value={`${fmtDatum(iso)}  ${fmtZeit(iso)}`} />;
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* 1 — Einsatzstatus */}
      <Karte>
        <KarteHeader
          icon="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          title="Einsatzstatus"
          badgeVariant="amber"
        />
        <div className="px-5 py-4">
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
            <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
            {dok.status ?? 'Unbekannt'}
          </span>
        </div>
      </Karte>

      {/* 2 — Zeitübersicht */}
      <Karte>
        <KarteHeader
          icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          title="Zeitübersicht"
          badgeVariant="blue"
        />
        <div className="px-5 py-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <ZeitZeile label="Einsatz gestartet"   iso={dok.unterwegs_at}      />
          <ZeitZeile label="Ankunft beim Kunden" iso={dok.vor_ort_at}         />
          <ZeitZeile label="Arbeitsbeginn"        iso={dok.arbeit_begonnen_at} />
          <ZeitZeile label="Arbeitsende"          iso={dok.arbeit_beendet_at}  />
          {dauer !== null && (
            <InfoZeile label="Gesamtdauer" value={minZuHM(dauer)} />
          )}
        </div>
      </Karte>

      {/* 3 — Tätigkeiten */}
      {(dok.taetigkeiten || dok.schaden || dok.massnahmen || dok.empfehlung) && (
        <Karte>
          <KarteHeader
            icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            title="Tätigkeiten"
            badgeVariant="blue"
          />
          <div className="px-5 py-5 space-y-4">
            {dok.taetigkeiten && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Durchgeführte Arbeiten</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{dok.taetigkeiten}</p>
              </div>
            )}
            {dok.schaden && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Festgestellter Schaden</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{dok.schaden}</p>
              </div>
            )}
            {dok.massnahmen && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Durchgeführte Maßnahmen</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{dok.massnahmen}</p>
              </div>
            )}
            {dok.empfehlung && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Empfehlung</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{dok.empfehlung}</p>
              </div>
            )}
          </div>
        </Karte>
      )}

      {/* 4 — Material */}
      <Karte>
        <KarteHeader
          icon="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          title="Material"
          badgeVariant="purple"
          badge={material.length > 0 ? `${material.length} Position${material.length !== 1 ? 'en' : ''}` : undefined}
        />
        <div className="px-5 py-5">
          {dok.kein_material_verwendet ? (
            <p className="text-sm text-gray-400 italic">Kein Material verwendet.</p>
          ) : material.length === 0 ? (
            <p className="text-sm text-gray-300 italic">Noch kein Material erfasst.</p>
          ) : (
            <div className="space-y-2">
              {ersteMat.map((m, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <Svg d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5" cls="w-3 h-3 text-purple-400" />
                  </div>
                  <p className="text-sm text-gray-700 flex-1 truncate">{m.bezeichnung}</p>
                  <span className="text-xs text-gray-400 shrink-0">{m.menge} {m.einheit}</span>
                </div>
              ))}
              {material.length > 3 && (
                <p className="text-xs text-gray-400 pt-1">
                  + {material.length - 3} weitere Position{material.length - 3 !== 1 ? 'en' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </Karte>

      {/* 5 — Fotos */}
      <Karte>
        <KarteHeader
          icon="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          title="Fotos"
          badgeVariant="gray"
          badge={fotos.length > 0 ? `${fotos.length} Foto${fotos.length !== 1 ? 's' : ''}` : undefined}
        />
        <div className="px-5 py-5">
          {fotos.length === 0 ? (
            <p className="text-sm text-gray-300 italic">Noch keine Fotos hochgeladen.</p>
          ) : (
            <div className="flex items-start gap-3 flex-wrap">
              {ersteFotos.map((f, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.dateiname ?? 'Foto'} className="w-full h-full object-cover" />
                  {f.kategorie && (
                    <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-semibold bg-black/40 text-white py-0.5 capitalize">
                      {f.kategorie}
                    </span>
                  )}
                </div>
              ))}
              {fotos.length > 3 && (
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-gray-400">+{fotos.length - 3}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Karte>

      {/* 6 — Kundenunterschrift */}
      <Karte>
        <KarteHeader
          icon="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
          title="Kundenunterschrift"
          badgeVariant={hatUnterschrift ? 'green' : 'gray'}
        />
        <div className="px-5 py-4">
          {hatUnterschrift ? (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
              <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4" />
              Unterschrift vorhanden
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
              <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-4 h-4" />
              Unterschrift fehlt
            </span>
          )}
        </div>
      </Karte>

      {/* CTA */}
      <div className="pt-1">
        <button
          onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?id=${auftragId}`)}
          className="flex items-center gap-2 px-5 py-3 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition shadow-sm shadow-amber-100">
          <Svg d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" cls="w-4 h-4" />
          Vollständige Dokumentation öffnen
        </button>
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ABSCHLUSS TAB
════════════════════════════════════════════════════════════════ */

const RECHNUNG_STATUS_CFG = {
  'Entwurf':   { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
  'Gesendet':  { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'Bezahlt':   { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500'  },
  'Überfällig':{ bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500'    },
  'Storniert': { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
};

function fmtEuro(val) {
  if (val == null) return '—';
  return Number(val).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function AbschlussTabKarte({ auftrag, rechnungen, auftragId, router }) {
  const abgeschlossen = auftrag?.status === 'Abgeschlossen';
  const freigegeben   = !!auftrag?.freigegeben_fuer_rechnung;

  /* ── Empty State: noch nicht abgeschlossen und keine Rechnung ── */
  if (!abgeschlossen && rechnungen.length === 0) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-600" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Abschluss</h2>
            <p className="text-sm text-gray-500">Prüfe die Dokumentation und schließe den Auftrag ab.</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/auftraege/abschluss?id=${auftragId}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
            Auftrag abschließen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Abschluss-Status ── */}
      <Karte titel="Abschluss-Status">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Status</p>
            {abgeschlossen ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                Abgeschlossen
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                Offen
              </span>
            )}
          </div>

          {abgeschlossen && auftrag.abschluss_datum && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Abgeschlossen am</p>
              <p className="text-sm font-medium text-gray-800">{fmtDatum(auftrag.abschluss_datum)}</p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Freigabe für Rechnung</p>
            {freigegeben ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                Freigegeben
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-500 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                Nicht freigegeben
              </span>
            )}
          </div>

          {auftrag?.rueckgabe_grund && (
            <div className="sm:col-span-2 space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Rückgabegrund</p>
              <p className="text-sm text-gray-700 bg-red-50 rounded-xl px-3 py-2">{auftrag.rueckgabe_grund}</p>
            </div>
          )}
        </div>

        {/* CTA zum Abschluss-Modul */}
        {!abgeschlossen && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={() => router.push(`/dashboard/auftraege/abschluss?id=${auftragId}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Auftrag abschließen
            </button>
          </div>
        )}
      </Karte>

      {/* ── Rechnungen ── */}
      {rechnungen.length > 0 && (
        <Karte titel={`Rechnungen (${rechnungen.length})`}>
          <div className="space-y-3">
            {rechnungen.map(r => {
              const cfg = RECHNUNG_STATUS_CFG[r.status] ?? RECHNUNG_STATUS_CFG['Entwurf'];
              return (
                <div
                  key={r.id}
                  onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {r.status}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">{r.nummer ?? `Rechnung`}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{fmtEuro(r.betrag_brutto)}</p>
                    <p className="text-xs text-gray-400">
                      {r.bezahlt_am ? `Bezahlt ${fmtDatum(r.bezahlt_am)}` : r.faellig_am ? `Fällig ${fmtDatum(r.faellig_am)}` : fmtDatum(r.erstellt_am)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => router.push(`/dashboard/rechnungen/neu?auftrag_id=${auftragId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Neue Rechnung erstellen
            </button>
          </div>
        </Karte>
      )}

      {/* Rechnung erstellen wenn noch keine vorhanden */}
      {rechnungen.length === 0 && abgeschlossen && (
        <Karte titel="Rechnungen">
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-gray-400">Noch keine Rechnung für diesen Auftrag erstellt.</p>
            <button
              onClick={() => router.push(`/dashboard/rechnungen/neu?auftrag_id=${auftragId}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Rechnung erstellen
            </button>
          </div>
        </Karte>
      )}

    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HAUPTKOMPONENTE
════════════════════════════════════════════════════════════════ */

export default function AuftragBearbeiten() {
  const { id }   = useParams();
  const router   = useRouter();

  const [auftrag,        setAuftrag]        = useState(null);
  const [mitarbeiterList, setMitarbeiterList] = useState([]);
  const [maschinenList,   setMaschinenList]   = useState([]);
  const [companyId,      setCompanyId]      = useState(null);
  const [userRolle,      setUserRolle]      = useState(null);
  const [userName,       setUserName]       = useState('');
  const [zustand,        setZustand]        = useState('loading'); // loading | forbidden | not_found | ok
  const [auftragTab,     setAuftragTab]     = useState('uebersicht');
  const [einsatzDok,     setEinsatzDok]     = useState(null);
  const [einsatzMat,     setEinsatzMat]     = useState([]);
  const [einsatzFotos,   setEinsatzFotos]   = useState([]);
  const [rechnungen,     setRechnungen]     = useState([]);
  const [aktivitaeten,   setAktivitaeten]   = useState([]);

  const rechte = useMemo(() => berechneRechte(userRolle), [userRolle]);

  const ladeDaten = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id, rolle, mitarbeiter:mitarbeiter_id(vorname, nachname)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!member) { setZustand('forbidden'); return; }

      const rolle    = member.rolle ?? '';
      const mName    = member.mitarbeiter
        ? `${member.mitarbeiter.vorname ?? ''} ${member.mitarbeiter.nachname ?? ''}`.trim()
        : (user.email ?? 'Benutzer');

      setCompanyId(member.company_id);
      setUserRolle(rolle);
      setUserName(mName || user.email || 'Benutzer');

      // Prüfe Zugriff
      const erlaubt = ['inhaber', 'administrator', 'buero', 'disponent', 'techniker'];
      if (!erlaubt.includes(rolle)) { setZustand('forbidden'); return; }

      // Lade Auftrag + Ressourcen + Einsatzdaten parallel
      const [
        { data: auftragData, error: auftragErr },
        { data: maData },
        { data: geData },
        { data: dokData },
        { data: matData },
        { data: fotosData },
        { data: rechnungenData },
        { data: aktivitaetenData },
      ] = await Promise.all([
        supabase
          .from('auftraege')
          .select(`*,
            kunden:kunden_id(id, name, firmenname, kundentyp, email, telefon),
            fahrzeuge:fahrzeug_id(id, kennzeichen, marke, modell),
            einsatzleiter:verantw_mitarbeiter_id(id, vorname, nachname, position)
          `)
          .eq('id', id)
          .eq('company_id', member.company_id)
          .maybeSingle(),

        supabase
          .from('auftrag_mitarbeiter')
          .select('mitarbeiter:mitarbeiter_id(id, vorname, nachname, position, status)')
          .eq('auftrag_id', id)
          .eq('company_id', member.company_id),

        supabase
          .from('auftrag_maschinen')
          .select('maschine:maschine_id(id, name, typ, zustand)')
          .eq('auftrag_id', id)
          .eq('company_id', member.company_id),

        supabase
          .from('einsatz_dokumentation')
          .select('*')
          .eq('auftrag_id', id)
          .eq('company_id', member.company_id)
          .maybeSingle(),

        supabase
          .from('einsatz_material')
          .select('*')
          .eq('auftrag_id', id)
          .eq('company_id', member.company_id),

        supabase
          .from('einsatz_fotos')
          .select('*')
          .eq('auftrag_id', id)
          .eq('company_id', member.company_id),

        supabase
          .from('rechnungen')
          .select('id, nummer, status, betrag_netto, betrag_brutto, erstellt_am, faellig_am, bezahlt_am')
          .eq('auftrag_id', id)
          .eq('company_id', member.company_id)
          .order('erstellt_am'),

        supabase
          .from('activity_log')
          .select('id, aktion, details, erstellt_am')
          .eq('auftrag_id', id)
          .eq('company_id', member.company_id)
          .order('erstellt_am', { ascending: false }),
      ]);

      if (auftragErr || !auftragData) { setZustand('not_found'); return; }

      setAuftrag(auftragData);
      setMitarbeiterList((maData ?? []).map(r => r.mitarbeiter).filter(Boolean));
      setMaschinenList((geData ?? []).map(r => r.maschine).filter(Boolean));
      setEinsatzDok(dokData ?? null);
      setEinsatzMat(matData ?? []);
      setEinsatzFotos(fotosData ?? []);
      setRechnungen(rechnungenData ?? []);
      setAktivitaeten(aktivitaetenData ?? []);
      setZustand('ok');
    } catch {
      setZustand('not_found');
    }
  }, [id, router]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  /* ── States ── */
  if (zustand === 'loading') return <Skeleton />;

  if (zustand === 'forbidden') return (
    <FehlerKarte
      icon="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      titel="Kein Zugriff"
      text="Du hast keine Berechtigung, diesen Auftrag zu öffnen."
      button={
        <button onClick={() => router.push('/dashboard/auftraege')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Zurück zur Übersicht
        </button>
      }
    />
  );

  if (zustand === 'not_found') return (
    <FehlerKarte
      icon="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
      titel="Auftrag nicht gefunden"
      text="Dieser Auftrag existiert nicht oder wurde gelöscht."
      button={
        <button onClick={() => router.push('/dashboard/auftraege')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Zurück zur Übersicht
        </button>
      }
    />
  );

  if (!auftrag) return null;

  const kname  = kundeAnzeigeName(auftrag.kunden);
  const nummer = auftrag.nummer ?? 'Auftrag';

  return (
    <div className="space-y-5 max-w-6xl pb-10">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/dashboard/auftraege')}
          className="mt-0.5 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition shrink-0">
          <Svg d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" cls="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 truncate">{nummer}</h1>
            <StatusBadge status={auftrag.status} />
          </div>
          <p className="text-sm text-gray-400 mt-0.5 truncate">
            {[auftrag.typ, kname, fmtDatum(auftrag.einsatzdatum)].filter(Boolean).join(' · ')}
          </p>
        </div>
        {/* Header-Aktionen */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?id=${auftrag.id}`)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            <Svg d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" cls="w-4 h-4" />
            Einsatz starten
          </button>
        </div>
      </div>

      {/* ── Workflow-Leiste (Bereich 3) ── */}
      <WorkflowLeiste auftrag={auftrag} mitarbeiterList={mitarbeiterList} />

      {/* ── Tab-Navigation ── */}
      <TabNav
        id="auftrag-tabs"
        tabs={AUFTRAG_TABS}
        activeTab={auftragTab}
        onChange={setAuftragTab}
        label="Auftragsnavigation"
        className="mb-5"
      />

      {/* ── Tab: Übersicht (bestehendes 2-Spalten-Layout) ── */}
      {auftragTab === 'uebersicht' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Linke Spalte (2/3) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Bereich 1: Auftragsinformationen */}
            <AuftragInfoKarte
              auftrag={auftrag}
              rechte={rechte}
              onRefresh={ladeDaten}
            />

            {/* Bereich 2: Ressourcen */}
            <RessourcenKarte
              auftrag={auftrag}
              mitarbeiterList={mitarbeiterList}
              maschinenList={maschinenList}
              rechte={rechte}
              auftragId={id}
            />

            {/* Bereich 4: Auftragsnotizen */}
            <NotizenKarte
              auftrag={auftrag}
              rechte={rechte}
              userName={userName}
              onRefresh={ladeDaten}
            />
          </div>

          {/* Rechte Spalte (1/3) */}
          <div className="space-y-5">
            {/* Status-Karte */}
            <StatusKarte
              auftrag={auftrag}
              rechte={rechte}
              onRefresh={ladeDaten}
            />

            {/* Bereich 5: Nächster Schritt */}
            <NaechsterSchrittKarte
              auftrag={auftrag}
              rechte={rechte}
              router={router}
            />

            {/* Aktivitätschronik (vorbereitet) */}
            <AktivitaetschronikKarte aktivitaeten={aktivitaeten} />
          </div>
        </div>
      )}

      {/* ── Tab: Planung ── */}
      {auftragTab === 'planung' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Planung</h2>
              <p className="text-sm text-gray-500">Plane Termin, Uhrzeit und Einsatzdauer für diesen Auftrag.</p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/auftraege/planen?id=${auftrag.id}`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
              Zur Planung
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Ressourcen ── */}
      {auftragTab === 'ressourcen' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-600" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Ressourcen</h2>
              <p className="text-sm text-gray-500">Teile Mitarbeiter, Fahrzeuge und Geräte für diesen Auftrag ein.</p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/auftraege/zuweisung?id=${auftrag.id}`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition">
              Ressourcen einteilen
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Einsatz & Dokumentation ── */}
      {auftragTab === 'einsatz' && (
        <div className="space-y-4">
          <Karte>
            <KarteHeader icon="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" title="Einsatzstatus" />
            <div className="px-5 py-5">
              {!einsatzDok ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm font-medium text-gray-500">Noch keine Einsatzdokumentation</p>
                  <p className="text-xs text-gray-400">Für diesen Auftrag wurde noch kein Einsatz begonnen.</p>
                  <button
                    onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?id=${id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                    Einsatz dokumentieren
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={({'Unterwegs':'bg-amber-100 text-amber-800','Vor Ort':'bg-blue-100 text-blue-800','In Arbeit':'bg-indigo-100 text-indigo-800','Arbeit beendet':'bg-green-100 text-green-800','Dokumentiert':'bg-emerald-100 text-emerald-800'}[einsatzDok.status]??'bg-gray-100 text-gray-700')+' px-3 py-1 rounded-full text-xs font-semibold'}>
                    {einsatzDok.status ?? '–'}
                  </span>
                </div>
              )}
            </div>
          </Karte>
          {einsatzDok && (
            <Karte>
              <KarteHeader icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" title="Zeitübersicht" />
              <div className="px-5 py-5 divide-y divide-gray-50">
                {[['Einsatz gestartet',einsatzDok.unterwegs_at],['Ankunft beim Kunden',einsatzDok.vor_ort_at],['Arbeitsbeginn',einsatzDok.arbeit_begonnen_at],['Arbeitsende',einsatzDok.arbeit_beendet_at]].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} className="flex justify-between items-center text-sm py-2">
                    <span className="text-gray-500">{l}</span>
                    <span className="font-medium text-gray-800">{fmtDatum(v)} · {fmtZeit(v)}</span>
                  </div>
                ))}
                {einsatzDok.arbeit_begonnen_at && einsatzDok.arbeit_beendet_at && (()=>{
                  const min=Math.max(0,Math.round((new Date(einsatzDok.arbeit_beendet_at)-new Date(einsatzDok.arbeit_begonnen_at))/60000));
                  const h=Math.floor(min/60),m=min%60;
                  return <div className="flex justify-between items-center text-sm py-3 mt-1 border-t-2 border-gray-100"><span className="text-gray-600 font-medium">Gesamtdauer</span><span className="font-bold text-gray-900">{h>0?h+' Std. ':''}{m} Min.</span></div>;
                })()}
              </div>
            </Karte>
          )}
          {einsatzDok && (
            <Karte>
              <KarteHeader icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" title="Tätigkeiten" />
              <div className="px-5 py-5">
                {[['Durchgeführte Arbeiten',einsatzDok.durchgefuehrte_arbeiten],['Festgestellter Schaden',einsatzDok.festgestellter_schaden],['Maßnahmen',einsatzDok.massnahmen],['Empfehlung',einsatzDok.empfehlung]].filter(([,v])=>v).length===0 ? (
                  <div className="text-center py-6 space-y-1">
                    <p className="text-sm font-medium text-gray-500">Noch keine Tätigkeiten dokumentiert</p>
                    <p className="text-xs text-gray-400">Für diesen Auftrag wurden bisher keine Tätigkeiten erfasst.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[['Durchgeführte Arbeiten',einsatzDok.durchgefuehrte_arbeiten],['Festgestellter Schaden',einsatzDok.festgestellter_schaden],['Maßnahmen',einsatzDok.massnahmen],['Empfehlung',einsatzDok.empfehlung]].filter(([,v])=>v).map(([l,v])=>(
                      <div key={l}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{l}</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Karte>
          )}
        </div>
      )}

      {/* ── Tab: Abschluss ── */}
      {auftragTab === 'abschluss' && (
        <AbschlussTabKarte
          auftrag={auftrag}
          rechnungen={rechnungen}
          auftragId={id}
          router={router}
        />
      )}

    </div>
  );
}
