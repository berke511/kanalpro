'use client';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ─────────────────────────────────────────────────────────────
   Konfiguration
───────────────────────────────────────────────────────────── */

const MA_STATUS_CFG = {
  verfuegbar: { label: 'Verfügbar',   bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  im_einsatz: { label: 'Im Einsatz',  bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  urlaub:     { label: 'Urlaub',      bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-400'   },
  krank:      { label: 'Krank',       bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
};

const MA_FILTER_OPTS = [
  { key: 'alle',       label: 'Alle'       },
  { key: 'verfuegbar', label: 'Verfügbar'  },
  { key: 'im_einsatz', label: 'Im Einsatz' },
  { key: 'urlaub',     label: 'Urlaub'     },
  { key: 'krank',      label: 'Krank'      },
];

// Keys match actual DB values in fahrzeuge.zustand (with ü)
const FZ_STATUS_CFG = {
  'verfügbar':      { label: 'Verfügbar',     bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  'im_einsatz':     { label: 'Im Einsatz',    bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  'wartung':        { label: 'Werkstatt',     bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  'ausser_betrieb': { label: 'Außer Betrieb', bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400'  },
  // Legacy fallbacks from old data
  'aktiv':          { label: 'Verfügbar',     bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  'reserviert':     { label: 'Im Einsatz',    bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
};

const FZ_FILTER_OPTS = [
  { key: 'alle',          label: 'Alle'          },
  { key: 'verfügbar',     label: 'Verfügbar'     },
  { key: 'im_einsatz',    label: 'Im Einsatz'    },
  { key: 'wartung',       label: 'Werkstatt'     },
  { key: 'ausser_betrieb',label: 'Außer Betrieb' },
];

const MS_STATUS_CFG = {
  aktiv:          { label: 'Verfügbar',     bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  in_einsatz:     { label: 'Im Einsatz',    bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  wartung:        { label: 'Wartung',       bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  defekt:         { label: 'Defekt',        bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
  ausser_betrieb: { label: 'Außer Betrieb', bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400'  },
};

const MS_TYP_MAP = {
  kamera:           'Kamera / Optik',
  hochdruckspueler: 'Hochdruckspüler',
  fraese:           'Fräse / Bohrwerk',
  messgeraet:       'Messgerät',
  pruefgeraet:      'Prüfgerät',
  pumpe:            'Pumpe',
  kompressor:       'Kompressor',
  generator:        'Generator / Aggregat',
  roboter:          'Roboter',
  werkzeug:         'Werkzeug (Allg.)',
  sonstiges:        'Sonstiges',
};

const GERAETE_KATEGORIEN = [
  { key: 'alle',             label: 'Alle'             },
  { key: 'kamera',           label: 'Kamerasysteme'    },
  { key: 'hochdruckspueler', label: 'Hochdrucktechnik' },
  { key: 'fraese',           label: 'Frästechnik'      },
  { key: 'messgeraet',       label: 'Messgeräte'       },
  { key: 'pumpe',            label: 'Pumpentechnik'    },
  { key: 'pruefgeraet',      label: 'Prüftechnik'      },
];

const ROLLE_LABELS = {
  geschaeftsfuehrer: 'Geschäftsführer',
  administrator:     'Administrator',
  buero:             'Büro',
  disposition:       'Disposition',
  techniker:         'Techniker',
  monteur:           'Monteur',
};

const FZ_TYP_LABELS = {
  pkw:              'PKW',
  lkw:              'LKW',
  transporter:      'Transporter',
  kleintransporter: 'Kleintransporter',
  anhaenger:        'Anhänger',
  sonstiges:        'Sonstiges',
};

const AUFTRAG_STATUS_CFG = {
  offen:       { label: 'Offen',       bg: 'bg-gray-100',   text: 'text-gray-600'   },
  Zugewiesen:  { label: 'Zugewiesen',  bg: 'bg-blue-50',    text: 'text-blue-700'   },
  in_bearbeit: { label: 'In Bearbeit.', bg: 'bg-orange-50', text: 'text-orange-700' },
  abgeschl:    { label: 'Abgeschl.',   bg: 'bg-green-50',   text: 'text-green-700'  },
  storniert:   { label: 'Storniert',   bg: 'bg-red-50',     text: 'text-red-600'    },
};

/* ─────────────────────────────────────────────────────────────
   Hilfsfunktionen
───────────────────────────────────────────────────────────── */

function msName(m) {
  return m?.name ?? m?.bezeichnung ?? m?.typ ?? 'Gerät';
}

function fmtDatum(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
}

/* ─────────────────────────────────────────────────────────────
   Hilfskomponenten
───────────────────────────────────────────────────────────── */

function Svg({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function StatusPill({ cfg }) {
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot ?? ''}`} />
      {cfg.label}
    </span>
  );
}

function CheckCircle() {
  return (
    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
      <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3 text-white" />
    </div>
  );
}

function Avatar({ vorname = '', nachname = '', sel = false, gold = false }) {
  const ini = `${(vorname[0] ?? '')}${(nachname[0] ?? '')}`.toUpperCase();
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition
      ${gold  ? 'bg-amber-500 text-white ring-2 ring-amber-300'
      : sel   ? 'bg-blue-600 text-white ring-2 ring-blue-300'
              : 'bg-gray-100 text-gray-500'}`}>
      {ini || '?'}
    </div>
  );
}

function SectionCard({ children }) {
  return <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">{children}</div>;
}

function SectionHead({ titel, beschreibung, badge }) {
  return (
    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">{titel}</p>
        {beschreibung && <p className="text-xs text-gray-400 mt-0.5">{beschreibung}</p>}
      </div>
      {badge != null && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100 shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Svg d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607" cls="w-3.5 h-3.5 text-gray-400" />
      </div>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

function FilterPills({ opts, value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {opts.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0
            ${value === o.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-28" />
        <div className="h-2.5 bg-gray-100 rounded w-20" />
      </div>
      <div className="h-5 w-16 bg-gray-100 rounded-full" />
    </div>
  );
}

function EmptyState({ label }) {
  return <p className="py-8 text-center text-xs text-gray-400">{label}</p>;
}

/* ─────────────────────────────────────────────────────────────
   Auftragsinformationen (Sektion oben)
───────────────────────────────────────────────────────────── */
function AuftragInfo({ auftrag, laden }) {
  if (laden) {
    return (
      <SectionCard>
        <SectionHead titel="Auftragsinformationen" beschreibung="Ausgewählter Auftrag für diese Zuweisung" />
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="bg-gray-50 rounded-xl px-3 py-3 animate-pulse">
              <div className="h-2.5 bg-gray-100 rounded w-20 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-28" />
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  if (!auftrag) {
    return (
      <SectionCard>
        <SectionHead titel="Auftragsinformationen" beschreibung="Ausgewählter Auftrag für diese Zuweisung" />
        <div className="px-5 py-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Kein Auftrag ausgewählt. Bitte rufe diese Seite über die Auftragsübersicht auf
              (<code className="font-mono">?id=&lt;auftrag-id&gt;</code>).
            </p>
          </div>
        </div>
      </SectionCard>
    );
  }

  const kunde = auftrag.kunden;
  const kundeName = kunde
    ? (kunde.kundentyp === 'firma' ? kunde.firmenname : kunde.name) ?? kunde.name ?? '—'
    : '—';

  const statusCfg = AUFTRAG_STATUS_CFG[auftrag.status] ?? { label: auftrag.status ?? '—', bg: 'bg-gray-100', text: 'text-gray-600' };

  const felder = [
    { label: 'Auftragsnummer', value: auftrag.auftragsnummer ?? auftrag.id?.slice(0, 8).toUpperCase() ?? '—' },
    { label: 'Kunde',          value: kundeName },
    { label: 'Einsatzort',     value: auftrag.adresse ?? auftrag.ort ?? '—' },
    { label: 'Einsatzdatum',   value: fmtDatum(auftrag.datum ?? auftrag.einsatzdatum) },
    { label: 'Priorität',      value: auftrag.prioritaet ?? '—' },
  ];

  return (
    <SectionCard>
      <SectionHead titel="Auftragsinformationen" beschreibung="Ausgewählter Auftrag für diese Zuweisung" />
      <div className="px-5 py-4 space-y-4">
        {auftrag.titel && (
          <p className="text-base font-bold text-gray-900">{auftrag.titel}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {felder.map(f => (
            <div key={f.label} className="bg-gray-50 rounded-xl px-3 py-3">
              <p className="text-xs text-gray-400">{f.label}</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{f.value}</p>
            </div>
          ))}
          <div className="bg-gray-50 rounded-xl px-3 py-3">
            <p className="text-xs text-gray-400">Status</p>
            <div className="mt-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                {statusCfg.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hauptkomponente (benötigt useSearchParams → Suspense)
───────────────────────────────────────────────────────────── */
function ZuweisungInner() {
  const router     = useRouter();
  const params     = useSearchParams();
  const auftragId  = params.get('id');

  /* ── Rohdaten ── */
  const [auftrag,      setAuftrag]      = useState(null);
  const [mitarbeiter,  setMitarbeiter]  = useState([]);
  const [fahrzeuge,    setFahrzeuge]    = useState([]);
  const [maschinen,    setMaschinen]    = useState([]);
  const [companyId,    setCompanyId]    = useState(null);
  const [laden,        setLaden]        = useState(true);
  const [ladeErr,      setLadeErr]      = useState(null);

  /* ── Auswahl ── */
  const [selMA,   setSelMA]   = useState(new Set());
  const [selFZ,   setSelFZ]   = useState(null);
  const [selMS,   setSelMS]   = useState(new Set());
  const [verantw, setVerantw] = useState(null);

  /* ── Suche & Filter ── */
  const [sucheMA,  setSucheMA]  = useState('');
  const [filterMA, setFilterMA] = useState('alle');
  const [sucheFZ,  setSucheFZ]  = useState('');
  const [filterFZ, setFilterFZ] = useState('alle');
  const [katMS,    setKatMS]    = useState('alle');

  /* ── UI ── */
  const [speichert, setSpeichert] = useState(false);
  const [valfehler, setValfehler] = useState([]);
  const [erfolg,    setErfolg]    = useState(false);

  /* ── Daten laden ── */
  useEffect(() => {
    async function load() {
      setLaden(true);
      setLadeErr(null);
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) { router.push('/login'); return; }

        const { data: member } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!member) { setLadeErr('Kein Unternehmensaccount gefunden.'); setLaden(false); return; }

        const cid = member.company_id;
        setCompanyId(cid);

        // Basis-Daten parallel laden
        const queries = [
          supabase.from('mitarbeiter')
            .select('id, vorname, nachname, rolle, status')
            .eq('company_id', cid)
            .order('nachname', { ascending: true }),
          supabase.from('fahrzeuge')
            .select('id, kennzeichen, marke, modell, typ, zustand')
            .eq('company_id', cid)
            .order('kennzeichen', { ascending: true }),
          supabase.from('maschinen')
            .select('id, name, bezeichnung, typ, zustand, hersteller, modell, company_id')
            .eq('company_id', cid)
            .order('name', { ascending: true }),
        ];

        // Auftrag + bestehende Zuweisungen laden (falls id vorhanden)
        if (auftragId) {
          queries.push(
            supabase.from('auftraege')
              .select('*, kunden:kunden_id(name, firmenname, kundentyp)')
              .eq('id', auftragId)
              .single(),
            supabase.from('auftrag_mitarbeiter')
              .select('mitarbeiter_id')
              .eq('auftrag_id', auftragId),
            supabase.from('auftrag_maschinen')
              .select('maschine_id')
              .eq('auftrag_id', auftragId),
          );
        }

        const results = await Promise.all(queries);
        const [rMA, rFZ, rMS] = results;

        setMitarbeiter(rMA.data ?? []);
        setFahrzeuge(rFZ.data ?? []);
        setMaschinen(rMS.data ?? []);

        if (auftragId) {
          const [,, , rAuftrag, rExistMA, rExistMS] = results;

          if (rAuftrag?.data) {
            setAuftrag(rAuftrag.data);
            if (rAuftrag.data.fahrzeug_id)            setSelFZ(rAuftrag.data.fahrzeug_id);
            if (rAuftrag.data.verantw_mitarbeiter_id)  setVerantw(rAuftrag.data.verantw_mitarbeiter_id);
          }
          if (rExistMA?.data?.length > 0) {
            setSelMA(new Set(rExistMA.data.map(r => r.mitarbeiter_id)));
          }
          if (rExistMS?.data?.length > 0) {
            setSelMS(new Set(rExistMS.data.map(r => r.maschine_id)));
          }
        }

        setLaden(false);
      } catch (err) {
        setLadeErr('Daten konnten nicht geladen werden: ' + (err?.message ?? ''));
        setLaden(false);
      }
    }
    load();
  }, [auftragId, router]);

  /* Verantwortlicher zurücksetzen wenn Mitarbeiter abgewählt */
  useEffect(() => {
    if (verantw && !selMA.has(verantw)) setVerantw(null);
  }, [selMA, verantw]);

  /* ── Toggle-Callbacks ── */
  const toggleMA = useCallback(id => {
    setSelMA(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleMS = useCallback(id => {
    setSelMS(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  /* ── Gefilterte Listen ── */
  const filteredMA = useMemo(() => {
    let list = mitarbeiter;
    if (filterMA !== 'alle') list = list.filter(m => (m.status ?? 'verfuegbar') === filterMA);
    const s = sucheMA.toLowerCase().trim();
    if (!s) return list;
    return list.filter(m =>
      `${m.vorname ?? ''} ${m.nachname ?? ''}`.toLowerCase().includes(s) ||
      (ROLLE_LABELS[m.rolle] ?? m.rolle ?? '').toLowerCase().includes(s)
    );
  }, [mitarbeiter, sucheMA, filterMA]);

  const filteredFZ = useMemo(() => {
    let list = fahrzeuge;
    if (filterFZ !== 'alle') {
      // normalize: 'aktiv' legacy maps to 'verfügbar'
      list = list.filter(f => {
        const z = f.zustand ?? 'verfügbar';
        const norm = z === 'aktiv' ? 'verfügbar' : z;
        return norm === filterFZ;
      });
    }
    const s = sucheFZ.toLowerCase().trim();
    if (!s) return list;
    return list.filter(f =>
      (f.kennzeichen ?? '').toLowerCase().includes(s) ||
      (f.marke ?? '').toLowerCase().includes(s) ||
      (f.modell ?? '').toLowerCase().includes(s)
    );
  }, [fahrzeuge, sucheFZ, filterFZ]);

  const filteredMS = useMemo(() => {
    if (katMS === 'alle') return maschinen;
    return maschinen.filter(m => m.typ === katMS);
  }, [maschinen, katMS]);

  /* ── Konflikt-Erkennung (nicht-blockierend) ── */
  const konflikte = useMemo(() => {
    const warn = [];
    for (const mid of selMA) {
      const ma = mitarbeiter.find(m => m.id === mid);
      if (!ma) continue;
      if (ma.status === 'im_einsatz') warn.push(`${ma.vorname} ${ma.nachname} ist bereits im Einsatz.`);
      if (ma.status === 'urlaub')     warn.push(`${ma.vorname} ${ma.nachname} ist im Urlaub.`);
      if (ma.status === 'krank')      warn.push(`${ma.vorname} ${ma.nachname} ist krank gemeldet.`);
    }
    if (selFZ) {
      const fz = fahrzeuge.find(f => f.id === selFZ);
      if (fz) {
        const z = fz.zustand ?? 'verfügbar';
        const isFree = z === 'verfügbar' || z === 'aktiv';
        if (!isFree) {
          warn.push(`Fahrzeug ${fz.kennzeichen} ist aktuell nicht verfügbar (${FZ_STATUS_CFG[z]?.label ?? z}).`);
        }
      }
    }
    for (const mid of selMS) {
      const ms = maschinen.find(m => m.id === mid);
      if (!ms) continue;
      if (ms.zustand === 'in_einsatz') warn.push(`Gerät „${msName(ms)}" ist bereits im Einsatz.`);
      if (ms.zustand === 'wartung')    warn.push(`Gerät „${msName(ms)}" ist in Wartung.`);
      if (ms.zustand === 'defekt')     warn.push(`Gerät „${msName(ms)}" ist als defekt markiert.`);
    }
    return warn;
  }, [selMA, selFZ, selMS, mitarbeiter, fahrzeuge, maschinen]);

  /* ── Abgeleitete Objekte ── */
  const selMitarbeiterObjekte = useMemo(
    () => mitarbeiter.filter(m => selMA.has(m.id)),
    [mitarbeiter, selMA]
  );
  const selFahrzeugObj = useMemo(
    () => fahrzeuge.find(f => f.id === selFZ) ?? null,
    [fahrzeuge, selFZ]
  );
  const selMaschinenObjekte = useMemo(
    () => maschinen.filter(m => selMS.has(m.id)),
    [maschinen, selMS]
  );

  /* ── Validierung ── */
  function validieren() {
    const errs = [];
    if (selMA.size === 0) errs.push('Mindestens 1 Mitarbeiter muss zugewiesen werden.');
    if (!selFZ)           errs.push('Mindestens 1 Fahrzeug muss zugewiesen werden.');
    setValfehler(errs);
    return errs.length === 0;
  }

  /* ── Speichern ── */
  async function handleSpeichern(zuDisp = false) {
    if (!validieren()) return;
    setSpeichert(true);
    setValfehler([]);

    try {
      const autoStatus = selMA.size > 0 && !!selFZ;

      if (auftragId) {
        // 1. auftraege aktualisieren
        const upd = {
          fahrzeug_id:            selFZ,
          verantw_mitarbeiter_id: verantw ?? [...selMA][0] ?? null,
        };
        if (autoStatus) upd.status = 'Zugewiesen';

        const { error: updErr } = await supabase
          .from('auftraege')
          .update(upd)
          .eq('id', auftragId);
        if (updErr) throw updErr;

        // 2. Mitarbeiter Junction (löschen + neu einfügen)
        const { error: delMAErr } = await supabase
          .from('auftrag_mitarbeiter')
          .delete()
          .eq('auftrag_id', auftragId);
        if (delMAErr) throw delMAErr;

        if (selMA.size > 0) {
          const maRows = [...selMA].map(mid => ({
            auftrag_id:     auftragId,
            mitarbeiter_id: mid,
            company_id:     companyId,
          }));
          const { error: insMAErr } = await supabase.from('auftrag_mitarbeiter').insert(maRows);
          if (insMAErr) throw insMAErr;
        }

        // 3. Maschinen Junction (löschen + neu einfügen)
        const { error: delMSErr } = await supabase
          .from('auftrag_maschinen')
          .delete()
          .eq('auftrag_id', auftragId);
        if (delMSErr) throw delMSErr;

        if (selMS.size > 0) {
          const msRows = [...selMS].map(mid => ({
            auftrag_id:  auftragId,
            maschine_id: mid,
            company_id:  companyId,
          }));
          const { error: insMSErr } = await supabase.from('auftrag_maschinen').insert(msRows);
          if (insMSErr) throw insMSErr;
        }

        // 4. Activity Log
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('activity_log').insert({
          company_id: companyId,
          auftrag_id: auftragId,
          user_id:    user?.id ?? null,
          aktion:     'Zuweisung gespeichert',
          details: {
            mitarbeiter_ids:        [...selMA],
            fahrzeug_id:            selFZ,
            maschinen_ids:          [...selMS],
            verantw_mitarbeiter_id: verantw ?? null,
            status_gesetzt:         autoStatus ? 'Zugewiesen' : null,
          },
        });
      }

      setErfolg(true);
      if (zuDisp) setTimeout(() => router.push('/dashboard/einsatzplanung'), 1200);
    } catch (err) {
      setValfehler([err?.message ?? 'Speichern fehlgeschlagen. Bitte erneut versuchen.']);
    } finally {
      setSpeichert(false);
    }
  }

  /* ─────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mitarbeiter & Fahrzeuge</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Weise dem Auftrag Mitarbeiter, Fahrzeuge und Maschinen oder Geräte zu.
          </p>
        </div>
        {(selMA.size > 0 || selFZ) && !laden && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 shrink-0">
            <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-3.5 h-3.5" />
            {selMA.size} Mitarbeiter · {selFZ ? 1 : 0} Fahrzeug · {selMS.size} Gerät{selMS.size !== 1 ? 'e' : ''}
          </div>
        )}
      </div>

      {/* ── Lade-Fehler ── */}
      {ladeErr && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-700">{ladeErr}</p>
        </div>
      )}

      {/* ── Konflikte (nicht-blockierend, Warnung) ── */}
      {konflikte.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-700">Verfügbarkeitskonflikte (Hinweis — Speichern trotzdem möglich)</p>
          </div>
          {konflikte.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 pl-6">• {w}</p>
          ))}
        </div>
      )}

      {/* ── Validierungsfehler ── */}
      {valfehler.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-1.5">
          {valfehler.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{f}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Erfolg-Banner ── */}
      {erfolg && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-700 font-medium">
            Zuweisung gespeichert.{(selMA.size > 0 && selFZ) ? ' Auftragsstatus wurde auf „Zugewiesen" gesetzt.' : ''}
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          BEREICH 1 – AUFTRAGSINFORMATIONEN
      ══════════════════════════════════════════════════ */}
      <AuftragInfo auftrag={auftrag} laden={laden && !!auftragId} />

      {/* ══════════════════════════════════════════════════
          BEREICH 2 – MITARBEITER ZUWEISEN
      ══════════════════════════════════════════════════ */}
      <SectionCard>
        <SectionHead
          titel="Mitarbeiter zuweisen"
          beschreibung="Mehrfachauswahl — wähle alle Einsatzkräfte für diesen Auftrag."
          badge={selMA.size > 0 ? `${selMA.size} ausgewählt` : undefined}
        />
        <div className="px-5 py-4 space-y-3">
          <SearchBox value={sucheMA} onChange={setSucheMA} placeholder="Mitarbeiter suchen …" />
          <FilterPills opts={MA_FILTER_OPTS} value={filterMA} onChange={setFilterMA} />

          {laden ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          ) : filteredMA.length === 0 ? (
            <EmptyState label={
              sucheMA || filterMA !== 'alle'
                ? 'Keine Mitarbeiter gefunden.'
                : 'Noch keine Mitarbeiter angelegt.'
            } />
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredMA.map(m => {
                const sel  = selMA.has(m.id);
                const sCfg = MA_STATUS_CFG[m.status ?? 'verfuegbar'] ?? MA_STATUS_CFG.verfuegbar;
                const hatKonflikt = sel && (m.status === 'im_einsatz' || m.status === 'urlaub' || m.status === 'krank');
                return (
                  <button key={m.id} onClick={() => toggleMA(m.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition
                      ${sel
                        ? hatKonflikt
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-blue-200 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                    <Avatar vorname={m.vorname} nachname={m.nachname} sel={sel && !hatKonflikt} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate
                        ${sel ? (hatKonflikt ? 'text-amber-900' : 'text-blue-900') : 'text-gray-800'}`}>
                        {m.vorname} {m.nachname}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{ROLLE_LABELS[m.rolle] ?? m.rolle ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill cfg={sCfg} />
                      {sel && <CheckCircle />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════
          BEREICH 3 – FAHRZEUG ZUWEISEN
      ══════════════════════════════════════════════════ */}
      <SectionCard>
        <SectionHead
          titel="Fahrzeug zuweisen"
          beschreibung="Wähle das Fahrzeug für diesen Einsatz (Einzelauswahl)."
          badge={selFZ ? '1 ausgewählt' : undefined}
        />
        <div className="px-5 py-4 space-y-3">
          <SearchBox value={sucheFZ} onChange={setSucheFZ} placeholder="Kennzeichen, Marke oder Modell …" />
          <FilterPills opts={FZ_FILTER_OPTS} value={filterFZ} onChange={setFilterFZ} />

          {laden ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[0,1,2].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filteredFZ.length === 0 ? (
            <EmptyState label={
              sucheFZ || filterFZ !== 'alle'
                ? 'Kein Fahrzeug gefunden.'
                : 'Noch keine Fahrzeuge angelegt.'
            } />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredFZ.map(f => {
                const sel   = selFZ === f.id;
                const z     = f.zustand ?? 'verfügbar';
                const sCfg  = FZ_STATUS_CFG[z] ?? FZ_STATUS_CFG['verfügbar'];
                const name  = [f.marke, f.modell].filter(Boolean).join(' ');
                const isNotFree = z !== 'verfügbar' && z !== 'aktiv';
                return (
                  <button key={f.id} onClick={() => setSelFZ(sel ? null : f.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition
                      ${sel
                        ? isNotFree ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition
                      ${sel ? (isNotFree ? 'bg-amber-400' : 'bg-blue-600') : 'bg-gray-100'}`}>
                      <Svg
                        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                        cls={`w-4 h-4 ${sel ? 'text-white' : 'text-gray-400'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold font-mono truncate
                        ${sel ? (isNotFree ? 'text-amber-900' : 'text-blue-900') : 'text-gray-800'}`}>
                        {f.kennzeichen ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {name || FZ_TYP_LABELS[f.typ] ?? f.typ ?? '—'}
                      </p>
                      <div className="mt-1.5">
                        <StatusPill cfg={sCfg} />
                      </div>
                    </div>
                    {sel && <CheckCircle />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════
          BEREICH 4 – MASCHINEN & GERÄTE
      ══════════════════════════════════════════════════ */}
      <SectionCard>
        <SectionHead
          titel="Maschinen & Geräte"
          beschreibung="Mehrfachauswahl — wähle alle benötigten Geräte für diesen Einsatz."
          badge={selMS.size > 0 ? `${selMS.size} ausgewählt` : undefined}
        />
        <div className="px-5 py-4 space-y-3">
          <FilterPills opts={GERAETE_KATEGORIEN} value={katMS} onChange={setKatMS} />

          {laden ? (
            <div className="space-y-2">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>
          ) : filteredMS.length === 0 ? (
            <EmptyState label={katMS !== 'alle' ? 'Keine Geräte in dieser Kategorie.' : 'Noch keine Maschinen oder Geräte angelegt.'} />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredMS.map(m => {
                const sel      = selMS.has(m.id);
                const sCfg     = MS_STATUS_CFG[m.zustand] ?? MS_STATUS_CFG.aktiv;
                const konflikt = sel && (m.zustand === 'in_einsatz' || m.zustand === 'wartung' || m.zustand === 'defekt');
                return (
                  <button key={m.id} onClick={() => toggleMS(m.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition
                      ${sel
                        ? konflikt ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition
                      ${sel ? (konflikt ? 'bg-amber-400' : 'bg-blue-600') : 'bg-gray-100'}`}>
                      <Svg
                        d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                        cls={`w-3.5 h-3.5 ${sel ? 'text-white' : 'text-gray-400'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate
                        ${sel ? (konflikt ? 'text-amber-900' : 'text-blue-900') : 'text-gray-800'}`}>
                        {msName(m)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{MS_TYP_MAP[m.typ] ?? m.typ ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill cfg={sCfg} />
                      {sel && <CheckCircle />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════
          BEREICH 5 – VERANTWORTLICHER
      ══════════════════════════════════════════════════ */}
      <SectionCard>
        <SectionHead
          titel="Verantwortlicher Mitarbeiter"
          beschreibung="Lege den Einsatzleiter für diesen Auftrag fest."
        />
        <div className="px-5 py-4">
          {selMA.size === 0 ? (
            <p className="text-xs text-gray-400 py-3">Zuerst mindestens einen Mitarbeiter im Bereich oben auswählen.</p>
          ) : (
            <div className="space-y-2">
              {selMitarbeiterObjekte.map(m => {
                const sel = verantw === m.id;
                return (
                  <button key={m.id} onClick={() => setVerantw(sel ? null : m.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition
                      ${sel ? 'border-amber-200 bg-amber-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                    <Avatar vorname={m.vorname} nachname={m.nachname} gold={sel} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${sel ? 'text-amber-900' : 'text-gray-800'}`}>
                        {m.vorname} {m.nachname}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{ROLLE_LABELS[m.rolle] ?? m.rolle ?? '—'}</p>
                    </div>
                    {sel ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold shrink-0">
                        <Svg d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" cls="w-3 h-3" />
                        Verantwortlich
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">Auswählen</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════
          BEREICH 6 – ZUSAMMENFASSUNG
      ══════════════════════════════════════════════════ */}
      {(selMA.size > 0 || selFZ || selMS.size > 0) && (
        <SectionCard>
          <SectionHead titel="Zusammenfassung" beschreibung="Übersicht aller Zuweisungen vor dem Speichern" />
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Mitarbeiter */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Mitarbeiter ({selMA.size})
              </p>
              {selMitarbeiterObjekte.length === 0 ? (
                <p className="text-xs text-red-400 italic">Pflichtfeld — nicht ausgewählt</p>
              ) : (
                <div className="space-y-2.5">
                  {selMitarbeiterObjekte.map(m => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <Avatar vorname={m.vorname} nachname={m.nachname} gold={verantw === m.id} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{m.vorname} {m.nachname}</p>
                        {verantw === m.id && <p className="text-xs text-amber-600">Verantwortlich</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fahrzeug */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Fahrzeug</p>
              {!selFahrzeugObj ? (
                <p className="text-xs text-red-400 italic">Pflichtfeld — nicht ausgewählt</p>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                    <Svg d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" cls="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold font-mono text-gray-800">{selFahrzeugObj.kennzeichen}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[selFahrzeugObj.marke, selFahrzeugObj.modell].filter(Boolean).join(' ') || FZ_TYP_LABELS[selFahrzeugObj.typ] || '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Geräte */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Geräte ({selMS.size})
              </p>
              {selMaschinenObjekte.length === 0 ? (
                <p className="text-xs text-gray-300 italic">Optional — keine ausgewählt</p>
              ) : (
                <div className="space-y-1.5">
                  {selMaschinenObjekte.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5">
                      <Svg d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" cls="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-700 truncate">{msName(m)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Auto-Status Hinweis */}
          {selMA.size > 0 && selFZ && (
            <div className="mx-5 mb-4 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
              <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700">
                Beim Speichern wird der Auftragsstatus automatisch auf <strong>„Zugewiesen"</strong> gesetzt.
              </p>
            </div>
          )}
        </SectionCard>
      )}

      {/* ══════════════════════════════════════════════════
          BUTTONS
      ══════════════════════════════════════════════════ */}
      <SectionCard>
        <div className="px-5 py-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          <button onClick={() => router.back()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition sm:w-auto w-full">
            Abbrechen
          </button>

          <div className="flex-1" />

          <button
            onClick={() => handleSpeichern(false)}
            disabled={speichert || erfolg}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-blue-200 text-blue-700 bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto w-full">
            {speichert ? (
              <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            )}
            Speichern
          </button>

          <button
            onClick={() => handleSpeichern(true)}
            disabled={speichert || erfolg}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto w-full">
            <Svg d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            Speichern & zur Disposition
          </button>

        </div>
      </SectionCard>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Default Export – Suspense wrapper für useSearchParams
───────────────────────────────────────────────────────────── */
export default function Zuweisung() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 bg-gray-100 rounded-xl w-64 animate-pulse" />
        {[0,1,2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[0,1,2].map(j => <div key={j} className="h-14 bg-gray-50 rounded-xl" />)}
            </div>
          </div>
        ))}
      </div>
    }>
      <ZuweisungInner />
    </Suspense>
  );
}
