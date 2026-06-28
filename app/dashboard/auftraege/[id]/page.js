'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ════════════════════════════════════════════════════════════════
   KONFIGURATION
════════════════════════════════════════════════════════════════ */

const STATUS_CFG = {
  'Neu':           { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'Geplant':       { bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-400' },
  'Zugewiesen':    { bg: 'bg-teal-50',    text: 'text-teal-700',   dot: 'bg-teal-500'   },
  'Unterwegs':     { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-400' },
  'Vor Ort':       { bg: 'bg-sky-50',     text: 'text-sky-700',    dot: 'bg-sky-400'    },
  'In Arbeit':     { bg: 'bg-amber-50',   text: 'text-amber-800',  dot: 'bg-amber-600'  },
  'Wartend':       { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
  'Abgeschlossen': { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500'  },
  'Storniert':     { bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400'    },
};

const STATUS_LISTE = Object.keys(STATUS_CFG);

const SCHRITTE = [
  { nr: 1,  key: 'auftrag',      label: 'Auftragsdaten',       kurz: 'Auftrag'      },
  { nr: 2,  key: 'planung',      label: 'Planung & Status',    kurz: 'Planung'      },
  { nr: 3,  key: 'ressourcen',   label: 'Ressourcen zuweisen', kurz: 'Ressourcen'   },
  { nr: 4,  key: 'einsatz',      label: 'Einsatz starten',     kurz: 'Einsatz'      },
  { nr: 5,  key: 'bericht',      label: 'Einsatzbericht',      kurz: 'Bericht'      },
  { nr: 6,  key: 'fotos',        label: 'Fotos & Dokumente',   kurz: 'Fotos'        },
  { nr: 7,  key: 'material',     label: 'Material & Zeiten',   kurz: 'Material'     },
  { nr: 8,  key: 'unterschrift', label: 'Kundenunterschrift',  kurz: 'Unterschrift' },
  { nr: 9,  key: 'abschluss',    label: 'Abschließen',        kurz: 'Abschluss'    },
  { nr: 10, key: 'rechnung',     label: 'Rechnungsstellung',   kurz: 'Rechnung'     },
];

function berechneStati(a) {
  if (!a) return {};
  const AKTIV = ['Unterwegs', 'Vor Ort', 'In Arbeit', 'Abgeschlossen', 'Storniert'];
  return {
    1:  'done',
    2:  a.status && a.status !== 'Neu'  ? 'done' : 'open',
    3:  a.mitarbeiter_id                ? 'done' : 'open',
    4:  AKTIV.includes(a.status)        ? 'done' : 'open',
    5:  'open',
    6:  'open',
    7:  'open',
    8:  'open',
    9:  a.status === 'Abgeschlossen'    ? 'done' : 'open',
    10: 'open',
  };
}

/* ════════════════════════════════════════════════════════════════
   BASISKOMPONENTEN
════════════════════════════════════════════════════════════════ */

function Ico({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG['Neu'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function Feld({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function inp(err = false) {
  return `w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 bg-white placeholder-gray-300
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
    ${err ? 'border-red-300' : 'border-gray-200'}`;
}

function InfoReihe({ label, wert }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{wert || '—'}</dd>
    </div>
  );
}

function Tipp({ text }) {
  return (
    <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
      <Ico d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" cls="w-4 h-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function Erfolg({ text }) {
  return (
    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
      <Ico d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4" />
      {text}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   WORKFLOW-LEISTE
════════════════════════════════════════════════════════════════ */

function WorkflowLeiste({ aktiv, stati, onWechseln }) {
  const aktuell = SCHRITTE.find(s => s.nr === aktiv);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">

      {/* Desktop: horizontal stepper */}
      <div className="hidden xl:flex items-stretch divide-x divide-gray-100">
        {SCHRITTE.map(s => {
          const st = stati[s.nr] ?? 'open';
          const isAktiv = s.nr === aktiv;
          const isDone  = st === 'done';
          return (
            <button
              key={s.nr}
              onClick={() => onWechseln(s.nr)}
              title={s.label}
              className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-3.5 text-center transition-colors
                ${isAktiv
                  ? 'bg-blue-50/70 border-b-2 border-blue-600'
                  : 'border-b-2 border-transparent hover:bg-gray-50'
                }
                ${!isDone && !isAktiv ? 'opacity-50' : ''}
              `}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors shrink-0
                ${isAktiv ? 'bg-blue-600 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {isDone && !isAktiv
                  ? <Ico d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3" />
                  : s.nr
                }
              </div>
              <span className={`text-[10px] font-semibold leading-none
                ${isAktiv ? 'text-blue-700' : isDone ? 'text-gray-600' : 'text-gray-400'}`}>
                {s.kurz}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tablet: compact row */}
      <div className="hidden sm:flex xl:hidden items-center gap-1 px-4 py-3 overflow-x-auto">
        {SCHRITTE.map((s, i) => {
          const st = stati[s.nr] ?? 'open';
          const isAktiv = s.nr === aktiv;
          const isDone  = st === 'done';
          return (
            <div key={s.nr} className="flex items-center gap-1 shrink-0">
              <button onClick={() => onWechseln(s.nr)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition
                  ${isAktiv ? 'bg-blue-600 text-white' : isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                {isDone && !isAktiv
                  ? <Ico d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3" />
                  : <span>{s.nr}</span>
                }
                {isAktiv && <span>{s.kurz}</span>}
              </button>
              {i < SCHRITTE.length - 1 && (
                <div className="w-3 h-px bg-gray-200 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: current step + prev/next */}
      <div className="flex sm:hidden items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {aktiv}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-medium">Schritt {aktiv} / {SCHRITTE.length}</p>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{aktuell?.label}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onWechseln(Math.max(1, aktiv - 1))}
            disabled={aktiv === 1}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 disabled:opacity-30 hover:bg-gray-50 transition">
            <Ico d="M15.75 19.5L8.25 12l7.5-7.5" />
          </button>
          <button onClick={() => onWechseln(Math.min(SCHRITTE.length, aktiv + 1))}
            disabled={aktiv === SCHRITTE.length}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 disabled:opacity-30 hover:bg-gray-50 transition">
            <Ico d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </button>
        </div>
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 1: AUFTRAGSDATEN
════════════════════════════════════════════════════════════════ */

function SchrittAuftrag({ auftrag, onAktualisieren }) {
  const [edit, setEdit]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({
    typ:             auftrag.typ             ?? '',
    beschreibung:    auftrag.beschreibung    ?? '',
    interne_notizen: auftrag.interne_notizen ?? '',
  });

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  async function speichern() {
    setSaving(true);
    await supabase.from('auftraege').update({
      typ:             form.typ.trim()             || null,
      beschreibung:    form.beschreibung.trim()    || null,
      interne_notizen: form.interne_notizen.trim() || null,
    }).eq('id', auftrag.id);
    setEdit(false);
    setSaving(false);
    onAktualisieren();
  }

  const ort = [auftrag.einsatzort_strasse, auftrag.einsatzort_plz, auftrag.einsatzort_ort]
    .filter(Boolean).join(', ');
  const kname = auftrag.kunden
    ? (auftrag.kunden.kundentyp === 'firma' ? auftrag.kunden.firmenname : auftrag.kunden.name) ?? ''
    : '';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Auftragsdaten</h2>
        {!edit && (
          <button onClick={() => setEdit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 transition">
            <Ico d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" cls="w-3.5 h-3.5" />
            Bearbeiten
          </button>
        )}
      </div>

      {!edit ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 bg-gray-50 rounded-xl p-4">
          <InfoReihe label="Auftragstyp"      wert={auftrag.typ} />
          <InfoReihe label="Nummer"           wert={auftrag.nummer} />
          <InfoReihe label="Priorität"        wert={auftrag.prioritaet} />
          <InfoReihe label="Status"           wert={<StatusBadge status={auftrag.status} />} />
          <InfoReihe label="Kunde"            wert={kname} />
          <InfoReihe label="Ansprechpartner"  wert={auftrag.ansprechpartner} />
          <InfoReihe label="Einsatzort"       wert={ort || '—'} />
          <InfoReihe label="Einsatzdatum"     wert={auftrag.einsatzdatum
            ? new Date(auftrag.einsatzdatum).toLocaleDateString('de-DE') : '—'} />
          {auftrag.beschreibung && (
            <div className="sm:col-span-2">
              <InfoReihe label="Beschreibung" wert={auftrag.beschreibung} />
            </div>
          )}
        </dl>
      ) : (
        <div className="space-y-4">
          <Feld label="Auftragstyp">
            <input value={form.typ} onChange={set('typ')} placeholder="z. B. Kanalreinigung" className={inp()} />
          </Feld>
          <Feld label="Beschreibung">
            <textarea rows={4} value={form.beschreibung} onChange={set('beschreibung')}
              placeholder="Problembeschreibung..." className={`${inp()} resize-none`} />
          </Feld>
          <Feld label="Interne Notizen">
            <textarea rows={3} value={form.interne_notizen} onChange={set('interne_notizen')}
              placeholder="Nur intern sichtbar..." className={`${inp()} resize-none`} />
          </Feld>
          <div className="flex gap-3">
            <button onClick={speichern} disabled={saving}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
            <button onClick={() => setEdit(false)}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 2: PLANUNG & STATUS
════════════════════════════════════════════════════════════════ */

function SchrittPlanung({ auftrag, onAktualisieren }) {
  const [status,    setStatus]    = useState(auftrag.status ?? 'Neu');
  const [datum,     setDatum]     = useState(auftrag.einsatzdatum ?? '');
  const [startzeit, setStartzeit] = useState(auftrag.startzeit ?? '');
  const [dauer,     setDauer]     = useState(auftrag.dauer_stunden ?? '');
  const [saving,    setSaving]    = useState(false);
  const [erfolg,    setErfolg]    = useState(false);

  async function speichern() {
    setSaving(true); setErfolg(false);
    const { error } = await supabase.from('auftraege').update({
      status,
      einsatzdatum:  datum     || null,
      startzeit:     startzeit || null,
      dauer_stunden: dauer     ? Number(dauer) : null,
    }).eq('id', auftrag.id);
    if (!error) { setErfolg(true); onAktualisieren(); }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Planung & Status</h2>

      {/* Status-Grid */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-3">Auftragsstatus</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STATUS_LISTE.map(s => {
            const c = STATUS_CFG[s];
            const aktiv = status === s;
            return (
              <button key={s} onClick={() => setStatus(s)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition
                  ${aktiv
                    ? `${c.bg} ${c.text} border-current ring-2 ring-offset-1 ring-blue-400`
                    : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                  }`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${aktiv ? c.dot : 'bg-gray-200'}`} />
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Termin */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Feld label="Einsatzdatum">
          <input type="date" value={datum} onChange={e => setDatum(e.target.value)} className={inp()} />
        </Feld>
        <Feld label="Startzeit">
          <input type="time" value={startzeit} onChange={e => setStartzeit(e.target.value)} className={inp()} />
        </Feld>
        <Feld label="Dauer (Stunden)">
          <input type="number" min="0" step="0.5" value={dauer}
            onChange={e => setDauer(e.target.value)} placeholder="z. B. 4" className={inp()} />
        </Feld>
      </div>

      {erfolg && <Erfolg text="Planung gespeichert." />}

      <button onClick={speichern} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
        {saving ? 'Speichern…' : 'Planung speichern'}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 3: RESSOURCEN ZUWEISEN
════════════════════════════════════════════════════════════════ */

function SchrittRessourcen({ auftrag, companyId, onAktualisieren }) {
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [fahrzeuge,   setFahrzeuge]   = useState([]);
  const [selMA, setSelMA] = useState(auftrag.mitarbeiter_id ?? '');
  const [selFZ, setSelFZ] = useState(auftrag.fahrzeug_id    ?? '');
  const [laden,  setLaden]  = useState(true);
  const [saving, setSaving] = useState(false);
  const [erfolg, setErfolg] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      supabase.from('mitarbeiter').select('id, vorname, nachname, position')
        .eq('company_id', companyId).order('nachname'),
      supabase.from('fahrzeuge').select('id, kennzeichen, marke, modell')
        .eq('company_id', companyId).order('kennzeichen'),
    ]).then(([{ data: m }, { data: f }]) => {
      setMitarbeiter(m ?? []);
      setFahrzeuge(f ?? []);
      setLaden(false);
    });
  }, [companyId]);

  async function speichern() {
    setSaving(true); setErfolg(false);
    const { error } = await supabase.from('auftraege').update({
      mitarbeiter_id: selMA || null,
      fahrzeug_id:    selFZ || null,
      status: (auftrag.status === 'Neu' || auftrag.status === 'Geplant') && selMA
        ? 'Zugewiesen' : auftrag.status,
    }).eq('id', auftrag.id);
    if (!error) { setErfolg(true); onAktualisieren(); }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Ressourcen zuweisen</h2>

      {laden ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-11 bg-gray-100 rounded-xl" />
          <div className="h-11 bg-gray-100 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <Feld label="Hauptmitarbeiter">
            <select value={selMA} onChange={e => setSelMA(e.target.value)} className={inp()}>
              <option value="">— Noch nicht zugewiesen —</option>
              {mitarbeiter.map(m => (
                <option key={m.id} value={m.id}>
                  {m.vorname} {m.nachname}{m.position ? ` · ${m.position}` : ''}
                </option>
              ))}
            </select>
          </Feld>
          <Feld label="Fahrzeug">
            <select value={selFZ} onChange={e => setSelFZ(e.target.value)} className={inp()}>
              <option value="">— Kein Fahrzeug zugewiesen —</option>
              {fahrzeuge.map(f => (
                <option key={f.id} value={f.id}>
                  {f.kennzeichen}{f.marke ? ` · ${f.marke} ${f.modell ?? ''}` : ''}
                </option>
              ))}
            </select>
          </Feld>
        </div>
      )}

      {erfolg && <Erfolg text="Ressourcen gespeichert. Status auf Zugewiesen gesetzt." />}

      <button onClick={speichern} disabled={saving || laden}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
        {saving ? 'Speichern…' : 'Ressourcen speichern'}
      </button>
      <Tipp text="Weitere Mitarbeiter und Geräte (Mehrfachzuweisung) folgen in Sprint 2." />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 4: EINSATZ STARTEN
════════════════════════════════════════════════════════════════ */

function SchrittEinsatz({ auftrag, onAktualisieren }) {
  const AKTIV = ['Unterwegs', 'Vor Ort', 'In Arbeit', 'Abgeschlossen'];
  const istGestartet = AKTIV.includes(auftrag.status);
  const [saving, setSaving] = useState(false);

  async function starten() {
    setSaving(true);
    await supabase.from('auftraege').update({ status: 'Unterwegs' }).eq('id', auftrag.id);
    onAktualisieren();
    setSaving(false);
  }

  const CHECKLISTE = [
    'Auftragsdaten vollständig und korrekt',
    'Mitarbeiter und Fahrzeug zugewiesen',
    'Einsatzdatum und Startzeit bestätigt',
    'Werkzeug und Materialien vorbereitet',
    'Sicherheitsausrüstung vorhanden',
    'Anfahrtsroute geprüft',
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Einsatz starten</h2>

      {istGestartet ? (
        <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-4">
          <Ico d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Einsatz läuft — Status: {auftrag.status}</p>
            <p className="text-xs text-green-600 mt-0.5">Dokumentiere den Fortschritt in den nächsten Schritten.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">Vor-Abfahrt Checkliste</p>
            <ul className="space-y-2.5">
              {CHECKLISTE.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={starten} disabled={saving}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-60">
            <Ico d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            {saving ? 'Wird gestartet…' : 'Einsatz starten'}
          </button>
          <Tipp text='Status wird auf „Unterwegs" gesetzt. Push-Benachrichtigungen für Mitarbeiter folgen in Sprint 2.' />
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 5: EINSATZBERICHT
════════════════════════════════════════════════════════════════ */

function SchrittBericht({ auftrag }) {
  const [form, setForm] = useState({
    taetigkeiten: '', schadensbeschreibung: '', loesung: '', notizen: '',
  });
  const [saving, setSaving] = useState(false);
  const [erfolg, setErfolg] = useState(false);

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  async function speichern() {
    setSaving(true);
    await supabase.from('auftraege').update({
      interne_notizen: JSON.stringify({ _bericht: form }),
    }).eq('id', auftrag.id);
    setErfolg(true);
    setSaving(false);
  }

  const FELDER = [
    { key: 'taetigkeiten',        label: 'Durchgeführte Tätigkeiten', placeholder: 'Was wurde genau gemacht?' },
    { key: 'schadensbeschreibung', label: 'Schadensbeschreibung',     placeholder: 'Welcher Schaden wurde festgestellt?' },
    { key: 'loesung',              label: 'Lösung / Maßnahmen',       placeholder: 'Wie wurde das Problem behoben?' },
    { key: 'notizen',              label: 'Notizen & Hinweise',       placeholder: 'Folgemaßnahmen, Besonderheiten…' },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Einsatzbericht</h2>
      {FELDER.map(f => (
        <Feld key={f.key} label={f.label}>
          <textarea rows={3} value={form[f.key]} onChange={set(f.key)}
            placeholder={f.placeholder} className={`${inp()} resize-none`} />
        </Feld>
      ))}
      {erfolg && <Erfolg text="Bericht gespeichert." />}
      <button onClick={speichern} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
        {saving ? 'Speichern…' : 'Bericht speichern'}
      </button>
      <Tipp text="Vollständige Berichtserfassung mit PDF-Export und Zeitstempel in Sprint 2." />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 6: FOTOS & DOKUMENTE
════════════════════════════════════════════════════════════════ */

function SchrittFotos() {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Fotos & Dokumentation</h2>
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50 hover:border-blue-300 transition cursor-pointer">
        <Ico d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" cls="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-500">Fotos hierher ziehen oder klicken</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, HEIC — bis 10 MB pro Datei</p>
        <button className="mt-4 px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-white transition">
          Fotos auswählen
        </button>
      </div>
      <Tipp text="Foto-Upload mit automatischer Komprimierung, Geolocation und Zeitstempel in Sprint 2." />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 7: MATERIAL & ARBEITSZEITEN
════════════════════════════════════════════════════════════════ */

function SchrittMaterial() {
  const [material, setMaterial] = useState([{ bez: '', menge: '', einheit: 'Stk', preis: '' }]);
  const [stunden,  setStunden]  = useState('');

  const addReihe = () => setMaterial(p => [...p, { bez: '', menge: '', einheit: 'Stk', preis: '' }]);
  const upd = (i, k, v) => setMaterial(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const del = i => setMaterial(p => p.filter((_, j) => j !== i));

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Material & Arbeitszeiten</h2>

      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-600">Arbeitszeiten</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Feld label="Arbeitsstunden gesamt">
            <input type="number" min="0" step="0.25" value={stunden}
              onChange={e => setStunden(e.target.value)} placeholder="z. B. 3.5" className={inp()} />
          </Feld>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-600 mb-3">Verbrauchtes Material</p>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-400 uppercase px-1">
            <div className="col-span-5">Bezeichnung</div>
            <div className="col-span-2">Menge</div>
            <div className="col-span-2">Einheit</div>
            <div className="col-span-2">€/Einh.</div>
          </div>
          {material.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <input value={r.bez} onChange={e => upd(i, 'bez', e.target.value)}
                  placeholder="Bezeichnung" className={inp()} />
              </div>
              <div className="col-span-2">
                <input type="number" value={r.menge} onChange={e => upd(i, 'menge', e.target.value)}
                  placeholder="0" className={inp()} />
              </div>
              <div className="col-span-2">
                <select value={r.einheit} onChange={e => upd(i, 'einheit', e.target.value)} className={inp()}>
                  {['Stk', 'm', 'm²', 'm³', 'kg', 'L'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input type="number" value={r.preis} onChange={e => upd(i, 'preis', e.target.value)}
                  placeholder="0.00" className={inp()} />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => del(i)}
                  className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-400 rounded-xl transition">
                  <Ico d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addReihe}
          className="mt-3 flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition">
          <Ico d="M12 4.5v15m7.5-7.5h-15" cls="w-3.5 h-3.5" />
          Position hinzufügen
        </button>
      </div>

      <Tipp text="Automatische Übernahme in Rechnungspositionen und Kostenauswertung in Sprint 2." />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 8: KUNDENUNTERSCHRIFT
════════════════════════════════════════════════════════════════ */

function SchrittUnterschrift({ auftrag, onAktualisieren }) {
  const [name,   setName]   = useState('');
  const [saving, setSaving] = useState(false);
  const [erfolg, setErfolg] = useState(false);

  async function bestaetigen() {
    setSaving(true);
    await supabase.from('auftraege').update({
      ansprechpartner: name || auftrag.ansprechpartner,
    }).eq('id', auftrag.id);
    setErfolg(true);
    setSaving(false);
    onAktualisieren();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Kundenunterschrift</h2>

      <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50">
        <Ico d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" cls="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-500">Digitales Unterschriftenfeld</p>
        <p className="text-xs text-gray-400 mt-1">Touch-Signatur via Tablet in Sprint 2</p>
      </div>

      <Feld label="Name des Unterzeichners" required>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Name des Kunden / Ansprechpartners" className={inp()} />
      </Feld>

      {erfolg && <Erfolg text="Bestätigung gespeichert." />}

      <button onClick={bestaetigen} disabled={saving || !name.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
        {saving ? 'Speichern…' : 'Bestätigung speichern'}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 9: AUFTRAG ABSCHLIEßEN
════════════════════════════════════════════════════════════════ */

function SchrittAbschluss({ auftrag, onAktualisieren }) {
  const istAbgeschlossen = auftrag.status === 'Abgeschlossen';
  const [saving, setSaving] = useState(false);

  async function abschliessen() {
    setSaving(true);
    await supabase.from('auftraege').update({ status: 'Abgeschlossen' }).eq('id', auftrag.id);
    onAktualisieren();
    setSaving(false);
  }

  const PUNKTE = [
    { label: 'Einsatzbericht ausgefüllt',   ok: false },
    { label: 'Fotos hochgeladen',            ok: false },
    { label: 'Material & Zeiten erfasst',    ok: false },
    { label: 'Kundenunterschrift vorhanden', ok: false },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Auftrag abschließen</h2>

      {istAbgeschlossen ? (
        <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-4">
          <Ico d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Auftrag wurde abgeschlossen</p>
            <p className="text-xs text-green-600 mt-0.5">Bereit zur Rechnungsstellung im nächsten Schritt.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">Abschluss-Checkliste</p>
            <ul className="space-y-2.5">
              {PUNKTE.map((p, i) => (
                <li key={i} className={`flex items-center gap-2.5 text-sm ${p.ok ? 'text-gray-800' : 'text-gray-400'}`}>
                  {p.ok
                    ? <Ico d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-green-500 shrink-0" />
                    : <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                  }
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={abschliessen} disabled={saving}
            className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 active:bg-green-800 transition disabled:opacity-60">
            <Ico d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            {saving ? 'Wird abgeschlossen…' : 'Auftrag abschließen'}
          </button>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 10: RECHNUNGSSTELLUNG
════════════════════════════════════════════════════════════════ */

function SchrittRechnung({ auftrag, router }) {
  const kname = auftrag.kunden
    ? (auftrag.kunden.kundentyp === 'firma' ? auftrag.kunden.firmenname : auftrag.kunden.name) ?? '—'
    : '—';

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Bereit zur Rechnungsstellung</h2>

      <div className="bg-green-50 border border-green-100 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <Ico d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">Auftrag bereit zur Abrechnung</p>
            <p className="text-xs text-green-700 mt-0.5">Alle Daten werden automatisch in die Rechnung øbernommen.</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-green-600">Auftragsnummer</dt>
            <dd className="text-sm font-semibold text-green-900 mt-0.5">{auftrag.nummer ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-green-600">Auftragstyp</dt>
            <dd className="text-sm font-semibold text-green-900 mt-0.5">{auftrag.typ ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-green-600">Kunde</dt>
            <dd className="text-sm font-semibold text-green-900 mt-0.5">{kname}</dd>
          </div>
          <div>
            <dt className="text-xs text-green-600">Einsatzdatum</dt>
            <dd className="text-sm font-semibold text-green-900 mt-0.5">
              {auftrag.einsatzdatum ? new Date(auftrag.einsatzdatum).toLocaleDateString('de-DE') : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <button
        onClick={() => router.push(`/dashboard/rechnungen/neu?auftrag=${auftrag.id}`)}
        className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
        <Ico d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        Rechnung erstellen
      </button>
      <Tipp text="Auftragsdaten, Material und Arbeitszeiten werden als Rechnungspositionen vorgeschlagen (Sprint 2)." />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HAUPTKOMPONENTE
════════════════════════════════════════════════════════════════ */

export default function AuftragWorkflow() {
  const { id }   = useParams();
  const router   = useRouter();
  const [auftrag,      setAuftrag]      = useState(null);
  const [companyId,    setCompanyId]    = useState(null);
  const [laden,        setLaden]        = useState(true);
  const [aktiv,        setAktiv]        = useState(1);
  const [autonavDone,  setAutonavDone]  = useState(false);

  const ladeDaten = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!member) { router.push('/dashboard/auftraege'); return; }
      setCompanyId(member.company_id);

      const { data, error } = await supabase
        .from('auftraege')
        .select(`*, kunden:kunden_id(id, name, firmenname, kundentyp),
                 mitarbeiter:mitarbeiter_id(id, vorname, nachname),
                 fahrzeuge:fahrzeug_id(id, kennzeichen, marke)`)
        .eq('id', id)
        .eq('company_id', member.company_id)
        .single();

      if (error || !data) { router.push('/dashboard/auftraege'); return; }
      setAuftrag(data);
    } catch {
      router.push('/dashboard/auftraege');
    } finally {
      setLaden(false);
    }
  }, [id, router]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  // Auto-navigate to first incomplete step on initial load
  useEffect(() => {
    if (!auftrag || autonavDone) return;
    const stati = berechneStati(auftrag);
    const erstOffen = SCHRITTE.find(s => stati[s.nr] !== 'done');
    if (erstOffen) setAktiv(erstOffen.nr);
    setAutonavDone(true);
  }, [auftrag, autonavDone]);

  /* ── Loading ── */
  if (laden) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl">
        <div className="h-7 w-52 bg-gray-100 rounded-xl" />
        <div className="h-28 bg-gray-100 rounded-2xl" />
        <div className="h-72 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (!auftrag) return null;

  const stati = berechneStati(auftrag);
  const kname = auftrag.kunden
    ? (auftrag.kunden.kundentyp === 'firma' ? auftrag.kunden.firmenname : auftrag.kunden.name) ?? ''
    : '';

  const renderSchritt = () => {
    switch (aktiv) {
      case 1:  return <SchrittAuftrag      auftrag={auftrag} onAktualisieren={ladeDaten} />;
      case 2:  return <SchrittPlanung      auftrag={auftrag} onAktualisieren={ladeDaten} />;
      case 3:  return <SchrittRessourcen   auftrag={auftrag} companyId={companyId} onAktualisieren={ladeDaten} />;
      case 4:  return <SchrittEinsatz      auftrag={auftrag} onAktualisieren={ladeDaten} />;
      case 5:  return <SchrittBericht      auftrag={auftrag} />;
      case 6:  return <SchrittFotos />;
      case 7:  return <SchrittMaterial />;
      case 8:  return <SchrittUnterschrift auftrag={auftrag} onAktualisieren={ladeDaten} />;
      case 9:  return <SchrittAbschluss    auftrag={auftrag} onAktualisieren={ladeDaten} />;
      case 10: return <SchrittRechnung     auftrag={auftrag} router={router} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">

      {/* ── Auftrag-Header ── */}
      <div className="flex items-start gap-3 min-w-0">
        <button onClick={() => router.push('/dashboard/auftraege')}
          className="mt-0.5 text-gray-400 hover:text-gray-600 transition shrink-0">
          <Ico d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {auftrag.nummer ?? 'Auftrag'}
            </h1>
            <StatusBadge status={auftrag.status} />
          </div>
          <p className="text-sm text-gray-400 mt-0.5 truncate">
            {[auftrag.typ, kname, auftrag.einsatzdatum
              ? new Date(auftrag.einsatzdatum).toLocaleDateString('de-DE') : null
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* ── Workflow-Leiste ── */}
      <WorkflowLeiste aktiv={aktiv} stati={stati} onWechseln={setAktiv} />

      {/* ── Schritt-Inhalt ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
        {renderSchritt()}
      </div>

      {/* ── Navigation: Zurück / Weiter ── */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={() => setAktiv(a => Math.max(1, a - 1))}
          disabled={aktiv === 1}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition disabled:opacity-30">
          <Ico d="M15.75 19.5L8.25 12l7.5-7.5" />
          Zurück
        </button>

        <span className="text-xs text-gray-400 font-medium">{aktiv} / {SCHRITTE.length}</span>

        <button
          onClick={() => setAktiv(a => Math.min(SCHRITTE.length, a + 1))}
          disabled={aktiv === SCHRITTE.length}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-30">
          Weiter
          <Ico d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </button>
      </div>

    </div>
  );
}
