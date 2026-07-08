'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import TabNav from '@/components/ui/TabNav';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';

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
  'offen':          { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200'   },
  'Neu':            { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200'   },
  'Geplant':        { bg: 'bg-cyan-50',    text: 'text-cyan-700',   dot: 'bg-cyan-500',   border: 'border-cyan-200'   },
  'Notdienst':      { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200' },
  'in_bearbeitung': { bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-200' },
  'Zugewiesen':     { bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-200' },
  'In Arbeit':      { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500',  border: 'border-amber-200'  },
  'abgeschlossen':  { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200'  },
  'Abgeschlossen':  { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200'  },
  'Storniert':      { bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400',    border: 'border-red-200'    },
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
  const hatPlanung   = !!(meta.planungs_datum) || auftrag.status !== 'offen';
  const hatRessourcen = mitarbeiterList.length > 0 && !!auftrag.fahrzeug_id;
  const hatEinsatz   = ['In Arbeit', 'abgeschlossen', 'Storniert'].includes(auftrag.status);
  const abgeschlossen = auftrag.status === 'abgeschlossen';
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
    beschreibung:    auftrag.beschreibung     ?? '',
    ansprechpartner: auftrag.ansprechpartner ?? '',
    einsatzdatum:    auftrag.einsatzdatum     ?? '',
    startzeit:       auftrag.startzeit        ?? '',
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
                    <Svg d="M11.42 15.17L17.25 21A2.652 2.652 0 00