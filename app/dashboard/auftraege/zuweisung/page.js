'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ─────────────────────────────────────────────────────────────
   Rollen
───────────────────────────────────────────────────────────── */
const SCHREIBRECHTE = ['inhaber', 'administrator', 'disponent'];
const LESERECHTE   = ['buero'];

/* ─────────────────────────────────────────────────────────────
   Status-Mapping für Mitarbeiter / Ressourcen
───────────────────────────────────────────────────────────── */
const STATUS_MAP = {
  verfuegbar:  { label: 'Verfügbar',   bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  im_einsatz:  { label: 'Im Einsatz',  bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  urlaub:      { label: 'Urlaub',      bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-400'   },
  krank:       { label: 'Krank',       bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
  gut:         { label: 'Gut',         bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  in_ordnung:  { label: 'OK',          bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  ok:          { label: 'OK',          bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  defekt:      { label: 'Defekt',      bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
  wartung:     { label: 'In Wartung',  bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
};

/* ─────────────────────────────────────────────────────────────
   Auftragsstatus-Mapping
───────────────────────────────────────────────────────────── */
const AUFTRAG_STATUS = {
  'Neu':           { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-500'   },
  'Geplant':       { bg: 'bg-cyan-50',   text: 'text-cyan-700',   dot: 'bg-cyan-500'   },
  'Notdienst':     { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Zugewiesen':    { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  'In Arbeit':     { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Abgeschlossen': { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
};

/* ─────────────────────────────────────────────────────────────
   Kleine UI-Helfer
───────────────────────────────────────────────────────────── */
function Svg({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function StatusPill({ status }) {
  if (!status) return null;
  const key = status.toLowerCase().replace(/[ -]/g, '_');
  const cfg = STATUS_MAP[key];
  const bg   = cfg?.bg   ?? 'bg-gray-50';
  const text = cfg?.text ?? 'text-gray-500';
  const dot  = cfg?.dot  ?? 'bg-gray-400';
  const lbl  = cfg?.label ?? status;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {lbl}
    </span>
  );
}

function AuftragStatusPill({ status }) {
  const cfg = AUFTRAG_STATUS[status] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status || 'Unbekannt'}
    </span>
  );
}

function InfoPill({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">
        {value || <span className="text-gray-300 italic font-normal">—</span>}
      </p>
    </div>
  );
}

function SectionCard({ icon, title, badge, badgeVariant = 'blue', children }) {
  const variants = {
    blue:   'bg-blue-50 text-blue-500',
    green:  'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-500',
    purple: 'bg-purple-50 text-purple-500',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${variants[badgeVariant] ?? variants.blue}`}>
          <Svg d={icon} cls="w-3.5 h-3.5" />
        </div>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {badge !== undefined && (
          <span className="ml-auto text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
            {badge}
          </span>
        )}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Svg
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        cls="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800
          placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500
          focus:border-transparent bg-white transition"
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse max-w-3xl">
      <div className="h-8 bg-gray-100 rounded-xl w-64 mb-6" />
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 h-44" />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Ressourcen-Kachel
───────────────────────────────────────────────────────────── */
function ResourceCard({ selected, onClick, disabled, avatar, title, subtitle, status }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition
        ${selected
          ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300'
          : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
        } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {avatar}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? 'text-blue-800' : 'text-gray-800'}`}>{title}</p>
        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      {status && <StatusPill status={status} />}
      {selected && (
        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hauptkomponente (inner — braucht Suspense)
───────────────────────────────────────────────────────────── */
function AuftragZuweisungInner() {
  const router    = useRouter();
  const params    = useSearchParams();
  const auftragId = params.get('id');

  /* ── Auth & Lade-Status ── */
  const [companyId,  setCompanyId]  = useState(null);
  const [ladeStatus, setLadeStatus] = useState('loading');
  // 'loading' | 'ready' | 'error' | 'forbidden' | 'not_found'

  /* ── Auftragsdaten (nur Anzeige) ── */
  const [auftrag, setAuftrag] = useState(null);
  const [kunde,   setKunde]   = useState(null);
  const [meta,    setMeta]    = useState({});

  /* ── Stammdaten aus DB ── */
  const [alleMitarbeiter, setAlleMitarbeiter] = useState([]);
  const [alleFahrzeuge,   setAlleFahrzeuge]   = useState([]);
  const [alleMaschinen,   setAlleMaschinen]   = useState([]);

  /* ── Selektion ── */
  const [selMitarbeiter, setSelMitarbeiter] = useState(new Set()); // Set<uuid>
  const [selFahrzeug,    setSelFahrzeug]    = useState(null);      // fahrzeug-Objekt | null
  const [selMaschinen,   setSelMaschinen]   = useState(new Set()); // Set<uuid>
  const [einsatzleiter,  setEinsatzleiter]  = useState(null);      // mitarbeiter-Objekt | null

  /* ── Suche ── */
  const [suchMA, setSuchMA] = useState('');
  const [suchFZ, setSuchFZ] = useState('');
  const [suchGE, setSuchGE] = useState('');

  /* ── UI-Zustand ── */
  const [readonly, setReadonly] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [apiErr,   setApiErr]   = useState('');
  const [fehler,   setFehler]   = useState({});
  const [erfolg,   setErfolg]   = useState(false);

  /* ── Initialisierung ── */
  useEffect(() => {
    if (!auftragId) { setLadeStatus('not_found'); return; }

    async function init() {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) { router.push('/login'); return; }

        const { data: member } = await supabase
          .from('company_members')
          .select('company_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!member) { setLadeStatus('error'); return; }

        const hasWrite = SCHREIBRECHTE.includes(member.role);
        const hasRead  = LESERECHTE.includes(member.role);
        if (!hasWrite && !hasRead) { setLadeStatus('forbidden'); return; }
        if (hasRead && !hasWrite) setReadonly(true);

        setCompanyId(member.company_id);

        /* Auftrag laden */
        const { data: auf, error: aufErr } = await supabase
          .from('auftraege')
          .select('id, titel, beschreibung, status, datum, adresse, notizen, kunde_id, fahrzeug_id, verantw_mitarbeiter_id')
          .eq('id', auftragId)
          .eq('company_id', member.company_id)
          .maybeSingle();

        if (aufErr || !auf) { setLadeStatus('not_found'); return; }
        setAuftrag(auf);

        let parsedMeta = {};
        try { parsedMeta = JSON.parse(auf.notizen || '{}'); } catch { /* leer */ }
        setMeta(parsedMeta);

        /* Alle Ressourcen + bestehende Zuweisungen parallel laden */
        const [
          { data: kundeData },
          { data: mitarbeiter },
          { data: fahrzeuge },
          { data: maschinen },
          { data: zugewMARows },
          { data: zugewGERows },
        ] = await Promise.all([
          auf.kunde_id
            ? supabase.from('kunden')
                .select('id, name, firmenname, firma, kundentyp')
                .eq('id', auf.kunde_id)
                .eq('company_id', member.company_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from('mitarbeiter')
            .select('id, vorname, nachname, position, status')
            .eq('company_id', member.company_id)
            .order('nachname'),
          supabase.from('fahrzeuge')
            .select('id, kennzeichen, marke, modell, typ, zustand')
            .eq('company_id', member.company_id)
            .order('kennzeichen'),
          supabase.from('maschinen')
            .select('id, name, typ, zustand')
            .eq('company_id', member.company_id)
            .order('name'),
          supabase.from('auftrag_mitarbeiter')
            .select('mitarbeiter_id')
            .eq('auftrag_id', auftragId)
            .eq('company_id', member.company_id),
          supabase.from('auftrag_maschinen')
            .select('maschine_id')
            .eq('auftrag_id', auftragId)
            .eq('company_id', member.company_id),
        ]);

        const ma  = mitarbeiter ?? [];
        const fzs = fahrzeuge   ?? [];
        const ges = maschinen   ?? [];

        setKunde(kundeData ?? null);
        setAlleMitarbeiter(ma);
        setAlleFahrzeuge(fzs);
        setAlleMaschinen(ges);

        /* Bestehende Zuweisungen vorausfüllen */
        if (zugewMARows?.length) {
          setSelMitarbeiter(new Set(zugewMARows.map(r => r.mitarbeiter_id)));
        }
        if (auf.fahrzeug_id) {
          const fz = fzs.find(f => f.id === auf.fahrzeug_id);
          if (fz) setSelFahrzeug(fz);
        }
        if (zugewGERows?.length) {
          setSelMaschinen(new Set(zugewGERows.map(r => r.maschine_id)));
        }
        if (auf.verantw_mitarbeiter_id) {
          const el = ma.find(m => m.id === auf.verantw_mitarbeiter_id);
          if (el) setEinsatzleiter(el);
        }

        setLadeStatus('ready');
      } catch (e) {
        console.error(e);
        setLadeStatus('error');
      }
    }
    init();
  }, [auftragId, router]);

  /* ── Gefilterte Listen ── */
  const filteredMA = useMemo(() => {
    const q = suchMA.toLowerCase();
    return alleMitarbeiter.filter(m =>
      `${m.vorname ?? ''} ${m.nachname ?? ''} ${m.position ?? ''}`.toLowerCase().includes(q)
    );
  }, [alleMitarbeiter, suchMA]);

  const filteredFZ = useMemo(() => {
    const q = suchFZ.toLowerCase();
    return alleFahrzeuge.filter(f =>
      `${f.marke ?? ''} ${f.modell ?? ''} ${f.kennzeichen ?? ''} ${f.typ ?? ''}`.toLowerCase().includes(q)
    );
  }, [alleFahrzeuge, suchFZ]);

  const filteredGE = useMemo(() => {
    const q = suchGE.toLowerCase();
    return alleMaschinen.filter(g =>
      `${g.name ?? ''} ${g.typ ?? ''}`.toLowerCase().includes(q)
    );
  }, [alleMaschinen, suchGE]);

  /* ── Computed Listen für Zusammenfassung ── */
  const selMA_list = useMemo(
    () => alleMitarbeiter.filter(m => selMitarbeiter.has(m.id)),
    [alleMitarbeiter, selMitarbeiter]
  );
  const selGE_list = useMemo(
    () => alleMaschinen.filter(g => selMaschinen.has(g.id)),
    [alleMaschinen, selMaschinen]
  );

  /* ── Hilfs-Funktionen ── */
  function kundeAnzeigeName(k) {
    if (!k) return '—';
    if (k.kundentyp === 'firma') return k.firmenname || k.firma || k.name;
    return k.name;
  }

  function fzName(f) {
    if (!f) return '';
    return [f.marke, f.modell].filter(Boolean).join(' ') || f.kennzeichen || 'Fahrzeug';
  }

  function initials(m) {
    return `${m.vorname?.[0] ?? ''}${m.nachname?.[0] ?? ''}`.toUpperCase() || '?';
  }

  /* ── Toggle-Aktionen ── */
  function toggleMA(id) {
    setSelMitarbeiter(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (einsatzleiter?.id === id) setEinsatzleiter(null);
      } else {
        next.add(id);
      }
      return next;
    });
    setFehler(p => ({ ...p, mitarbeiter: '' }));
  }

  function onFahrzeugWaehlen(fz) {
    setSelFahrzeug(prev => prev?.id === fz.id ? null : fz);
    setFehler(p => ({ ...p, fahrzeug: '' }));
  }

  function toggleGE(id) {
    setSelMaschinen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  /* ── Validierung ── */
  function validieren() {
    const e = {};
    if (selMitarbeiter.size === 0) e.mitarbeiter = 'Mindestens 1 Mitarbeiter auswählen.';
    if (!selFahrzeug)              e.fahrzeug    = 'Genau 1 Fahrzeug auswählen.';
    setFehler(e);
    return Object.keys(e).length === 0;
  }

  /* ── Speichern ── */
  async function speichern(weiterLeiten = false) {
    if (readonly) return;
    if (!validieren()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    setApiErr('');
    setErfolg(false);

    try {
      /* 1. Alte Zuweisungen löschen */
      const [delMA, delGE] = await Promise.all([
        supabase.from('auftrag_mitarbeiter').delete()
          .eq('auftrag_id', auftragId).eq('company_id', companyId),
        supabase.from('auftrag_maschinen').delete()
          .eq('auftrag_id', auftragId).eq('company_id', companyId),
      ]);
      if (delMA.error) throw delMA.error;
      if (delGE.error) throw delGE.error;

      /* 2. Mitarbeiter-Zuweisungen neu einfügen */
      if (selMitarbeiter.size > 0) {
        const rows = [...selMitarbeiter].map(mid => ({
          auftrag_id:     auftragId,
          mitarbeiter_id: mid,
          company_id:     companyId,
        }));
        const { error } = await supabase.from('auftrag_mitarbeiter').insert(rows);
        if (error) throw error;
      }

      /* 3. Maschinen-Zuweisungen neu einfügen */
      if (selMaschinen.size > 0) {
        const rows = [...selMaschinen].map(gid => ({
          auftrag_id:  auftragId,
          maschine_id: gid,
          company_id:  companyId,
        }));
        const { error } = await supabase.from('auftrag_maschinen').insert(rows);
        if (error) throw error;
      }

      /* 4. Auftrag aktualisieren */
      const { error: aufErr } = await supabase
        .from('auftraege')
        .update({
          fahrzeug_id:            selFahrzeug?.id ?? null,
          verantw_mitarbeiter_id: einsatzleiter?.id ?? null,
          status:                 'in_bearbeitung',
        })
        .eq('id', auftragId)
        .eq('company_id', companyId);

      if (aufErr) throw aufErr;

      setAuftrag(prev => ({
        ...prev,
        status:                 'Zugewiesen',
        fahrzeug_id:            selFahrzeug?.id ?? null,
        verantw_mitarbeiter_id: einsatzleiter?.id ?? null,
      }));

      if (weiterLeiten) {
        router.push(`/dashboard/auftraege/${auftragId}`);
        return;
      }
      setErfolg(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setApiErr(err.message ?? 'Fehler beim Speichern. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  }

  /* ─────────────── Render: Ladezustände ─────────────── */
  if (ladeStatus === 'loading') return <Skeleton />;

  if (ladeStatus === 'forbidden') return (
    <div className="bg-white rounded-2xl border border-red-100 p-10 text-center max-w-xl mx-auto">
      <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <Svg d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" cls="w-5 h-5 text-red-400" />
      </div>
      <p className="text-sm font-semibold text-gray-800 mb-1">Kein Zugriff</p>
      <p className="text-xs text-gray-400">Du hast keine Berechtigung für diesen Bereich.</p>
      <button onClick={() => router.push('/dashboard/auftraege')}
        className="mt-4 text-xs text-blue-500 hover:underline">← Zurück zur Übersicht</button>
    </div>
  );

  if (ladeStatus === 'not_found') return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-xl mx-auto">
      <p className="text-sm font-semibold text-gray-800 mb-1">Auftrag nicht gefunden</p>
      <p className="text-xs text-gray-400">Der Auftrag existiert nicht oder wurde gelöscht.</p>
      <button onClick={() => router.push('/dashboard/auftraege')}
        className="mt-4 text-xs text-blue-500 hover:underline">← Zurück zur Übersicht</button>
    </div>
  );

  if (ladeStatus === 'error') return (
    <div className="bg-white rounded-2xl border border-red-100 p-10 text-center max-w-xl mx-auto">
      <p className="text-sm font-semibold text-red-600 mb-1">Fehler beim Laden</p>
      <p className="text-xs text-gray-400">Bitte Seite neu laden oder Support kontaktieren.</p>
    </div>
  );

  const hatFehler = Object.keys(fehler).some(k => !!fehler[k]);

  /* ─────────────── Hauptrender ─────────────── */
  return (
    <div className="space-y-6 max-w-3xl">

      {/* ═══════════════════════════════════════
          SEITENKOPF
      ═══════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.push(`/dashboard/auftraege/${auftragId}`)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition"
            >
              <Svg d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" cls="w-3 h-3" />
              Zum Auftrag
            </button>
            <span className="text-gray-200">/</span>
            <span className="text-xs text-gray-400">Ressourcen einteilen</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Ressourcen einteilen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Mitarbeiter, Fahrzeug und Geräte für den Einsatz zuweisen.
          </p>
        </div>

        {!readonly ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => speichern(false)} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 border border-blue-200 text-blue-600
                bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50">
              {saving
                ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              }
              Speichern
            </button>
            <button type="button" onClick={() => speichern(true)} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl
                text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 shadow-sm">
              {saving
                ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                : <Svg d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              }
              Speichern & Auftrag öffnen
            </button>
          </div>
        ) : (
          <span className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400 font-medium">
            Nur Leserechte
          </span>
        )}
      </div>

      {/* ═══════════════════════════════════════
          STATUSMELDUNGEN
      ═══════════════════════════════════════ */}
      {erfolg && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-xs font-medium text-green-700">Ressourcen erfolgreich zugewiesen.</p>
          <button
            onClick={() => router.push(`/dashboard/auftraege/${auftragId}`)}
            className="ml-auto flex items-center gap-1 text-xs text-green-600 font-semibold hover:underline whitespace-nowrap"
          >
            Auftrag bearbeiten
            <Svg d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" cls="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {apiErr && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{apiErr}</p>
        </div>
      )}

      {hatFehler && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-amber-700 font-medium mb-0.5">Bitte Pflichtfelder ausfüllen:</p>
            {fehler.mitarbeiter && <p className="text-xs text-amber-600">• {fehler.mitarbeiter}</p>}
            {fehler.fahrzeug    && <p className="text-xs text-amber-600">• {fehler.fahrzeug}</p>}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          1. AUFTRAGSINFORMATIONEN (read-only)
      ═══════════════════════════════════════ */}
      <SectionCard
        icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        title="Auftragsdetails"
        badge="Nur lesbar"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <InfoPill label="Auftragsnummer" value={meta.nummer ?? '—'} />
          <InfoPill label="Auftragsart"    value={auftrag?.titel} />
          <InfoPill label="Kunde"          value={kundeAnzeigeName(kunde)} />
          <InfoPill label="Einsatzort"     value={auftrag?.adresse} />
          {meta.planungs_datum && (
            <InfoPill
              label="Einsatzdatum"
              value={new Date(meta.planungs_datum).toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            />
          )}
          {meta.planungs_beginn && (
            <InfoPill label="Einsatzbeginn" value={`${meta.planungs_beginn} Uhr`} />
          )}
          {meta.planungsnotiz && (
            <div className="col-span-2 sm:col-span-3">
              <InfoPill label="Planungsnotiz" value={meta.planungsnotiz} />
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status:</span>
          <AuftragStatusPill status={auftrag?.status} />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════
          2. MITARBEITER-AUSWAHL (multi-select)
      ═══════════════════════════════════════ */}
      <SectionCard
        icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        title="Mitarbeiter"
        badge={`${selMitarbeiter.size} ausgewählt`}
        badgeVariant={fehler.mitarbeiter ? 'orange' : 'blue'}
      >
        {fehler.mitarbeiter && (
          <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
            <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-3 h-3" />
            {fehler.mitarbeiter}
          </p>
        )}
        <div className="mb-3">
          <SearchInput value={suchMA} onChange={setSuchMA} placeholder="Mitarbeiter suchen…" />
        </div>

        {alleMitarbeiter.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">Keine Mitarbeiter angelegt.</p>
          </div>
        ) : filteredMA.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Kein Mitarbeiter gefunden.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredMA.map(m => {
              const sel = selMitarbeiter.has(m.id);
              return (
                <ResourceCard
                  key={m.id}
                  selected={sel}
                  onClick={() => toggleMA(m.id)}
                  disabled={readonly}
                  avatar={
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                      ${sel ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {initials(m)}
                    </div>
                  }
                  title={`${m.vorname} ${m.nachname}`}
                  subtitle={m.position}
                  status={m.status}
                />
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ═══════════════════════════════════════
          3. EINSATZLEITER
      ═══════════════════════════════════════ */}
      <SectionCard
        icon="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        title="Einsatzleiter"
        badgeVariant="purple"
      >
        <p className="text-xs text-gray-400 mb-3">
          Verantwortliche Person für diesen Einsatz. Wird im Protokoll hinterlegt.
        </p>
        <select
          value={einsatzleiter?.id ?? ''}
          onChange={e => {
            const m = alleMitarbeiter.find(x => x.id === e.target.value) ?? null;
            setEinsatzleiter(m);
          }}
          disabled={readonly || alleMitarbeiter.length === 0}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition bg-white disabled:opacity-60 cursor-pointer"
        >
          <option value="">— Einsatzleiter auswählen (optional) —</option>
          {alleMitarbeiter.map(m => (
            <option key={m.id} value={m.id}>
              {m.vorname} {m.nachname}{m.position ? ` · ${m.position}` : ''}
            </option>
          ))}
        </select>
      </SectionCard>

      {/* ═══════════════════════════════════════
          4. FAHRZEUG-AUSWAHL (single-select)
      ═══════════════════════════════════════ */}
      <SectionCard
        icon="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
        title="Fahrzeug"
        badge={selFahrzeug ? '1 ausgewählt' : 'keines'}
        badgeVariant={fehler.fahrzeug ? 'orange' : 'blue'}
      >
        {fehler.fahrzeug && (
          <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
            <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-3 h-3" />
            {fehler.fahrzeug}
          </p>
        )}
        <div className="mb-3">
          <SearchInput value={suchFZ} onChange={setSuchFZ} placeholder="Fahrzeug suchen…" />
        </div>

        {alleFahrzeuge.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">Keine Fahrzeuge angelegt.</p>
          </div>
        ) : filteredFZ.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Kein Fahrzeug gefunden.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {filteredFZ.map(f => {
              const sel = selFahrzeug?.id === f.id;
              return (
                <ResourceCard
                  key={f.id}
                  selected={sel}
                  onClick={() => onFahrzeugWaehlen(f)}
                  disabled={readonly}
                  avatar={
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                      ${sel ? 'bg-blue-600' : 'bg-gray-100'}`}>
                      <Svg d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                        cls={`w-4 h-4 ${sel ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                  }
                  title={fzName(f)}
                  subtitle={`${f.kennzeichen}${f.typ ? ` · ${f.typ}` : ''}`}
                  status={f.zustand}
                />
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ═══════════════════════════════════════
          5. MASCHINEN & GERÄTE (multi-select)
      ═══════════════════════════════════════ */}
      <SectionCard
        icon="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
        title="Maschinen & Geräte"
        badge={`${selMaschinen.size} ausgewählt`}
        badgeVariant="blue"
      >
        <div className="mb-3">
          <SearchInput value={suchGE} onChange={setSuchGE} placeholder="Maschine oder Gerät suchen…" />
        </div>

        {alleMaschinen.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">Keine Maschinen oder Geräte angelegt.</p>
          </div>
        ) : filteredGE.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nichts gefunden.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {filteredGE.map(g => {
              const sel = selMaschinen.has(g.id);
              return (
                <ResourceCard
                  key={g.id}
                  selected={sel}
                  onClick={() => toggleGE(g.id)}
                  disabled={readonly}
                  avatar={
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                      ${sel ? 'bg-blue-600' : 'bg-gray-100'}`}>
                      <Svg d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                        cls={`w-4 h-4 ${sel ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                  }
                  title={g.name}
                  subtitle={g.typ}
                  status={g.zustand}
                />
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ═══════════════════════════════════════
          6. LIVE-ZUSAMMENFASSUNG
      ═══════════════════════════════════════ */}
      <SectionCard
        icon="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        title="Zusammenfassung"
        badgeVariant="green"
      >
        <div className="space-y-5">

          {/* Mitarbeiter */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Mitarbeiter ({selMA_list.length})
            </p>
            {selMA_list.length === 0 ? (
              <p className="text-sm text-gray-200 italic">Noch keine Mitarbeiter ausgewählt.</p>
            ) : (
              <div className="space-y-1.5">
                {selMA_list.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(m)}
                    </div>
                    <span className="text-sm text-gray-700">{m.vorname} {m.nachname}</span>
                    {m.position && <span className="text-xs text-gray-400">· {m.position}</span>}
                    {einsatzleiter?.id === m.id && (
                      <span className="ml-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-100
                        px-1.5 py-0.5 rounded-full font-medium">
                        Einsatzleiter
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fahrzeug */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Fahrzeug</p>
            {!selFahrzeug ? (
              <p className="text-sm text-gray-200 italic">Noch kein Fahrzeug ausgewählt.</p>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                  <Svg d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                    cls="w-3.5 h-3.5 text-gray-500" />
                </div>
                <span className="text-sm text-gray-700">{fzName(selFahrzeug)}</span>
                <span className="text-xs text-gray-400">· {selFahrzeug.kennzeichen}</span>
              </div>
            )}
          </div>

          {/* Maschinen */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Maschinen & Geräte ({selGE_list.length})
            </p>
            {selGE_list.length === 0 ? (
              <p className="text-sm text-gray-200 italic">Keine Maschinen ausgewählt.</p>
            ) : (
              <div className="space-y-1.5">
                {selGE_list.map(g => (
                  <div key={g.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                      <Svg d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                        cls="w-3 h-3 text-gray-500" />
                    </div>
                    <span className="text-sm text-gray-700">{g.name}</span>
                    {g.typ && <span className="text-xs text-gray-400">· {g.typ}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════
          UNTERER AKTIONSBEREICH
      ═══════════════════════════════════════ */}
      {!readonly && (
        <div className="flex items-center justify-between gap-3 pt-2 pb-10 flex-wrap">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/auftraege/${auftragId}`)}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition disabled:opacity-40"
          >
            <Svg d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" cls="w-4 h-4" />
            Zurück zum Auftrag
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => speichern(false)} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 border border-blue-200 text-blue-600
                bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50">
              {saving
                ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              }
              Speichern
            </button>
            <button type="button" onClick={() => speichern(true)} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl
                text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 shadow-sm">
              {saving
                ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
                : <Svg d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              }
              Speichern & Auftrag bearbeiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Export mit Suspense-Boundary (wegen useSearchParams)
───────────────────────────────────────────────────────────── */
export default function AuftragZuweisung() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AuftragZuweisungInner />
    </Suspense>
  );
}
