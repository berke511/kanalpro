'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ─────────────────────────────────────────────────────────────
   Zugriff: Geschäftsführer · Administrator · Büro · Disposition
   Kein Zugriff: Techniker · Fahrer
───────────────────────────────────────────────────────────── */
const ERLAUBTE_ROLLEN = ['inhaber', 'administrator', 'disponent', 'buero'];

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

function Label({ htmlFor, required, children }) {
  return (
    <label htmlFor={htmlFor}
      className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
      <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        cls="w-3 h-3 shrink-0" />
      {msg}
    </p>
  );
}

function inp(extra = '') {
  return `w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900
    placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500
    focus:border-transparent transition bg-white ${extra}`;
}

function SectionCard({ icon, title, badge, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
          <Svg d={icon} cls="w-3.5 h-3.5 text-blue-500" />
        </div>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {badge && (
          <span className="ml-auto text-xs text-blue-500 bg-blue-50 px-2 py-0.5
            rounded-full border border-blue-100">
            {badge}
          </span>
        )}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-gray-800 font-medium">
        {value || <span className="text-gray-300 italic font-normal">—</span>}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    'Neu':           { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-500'   },
    'Geplant':       { bg: 'bg-cyan-50',   text: 'text-cyan-700',   dot: 'bg-cyan-500'   },
    'Notdienst':     { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
    'In Arbeit':     { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    'Abgeschlossen': { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
    'Abgebrochen':   { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
  };
  const cfg = MAP[status] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status || 'Unbekannt'}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse max-w-3xl">
      <div className="h-8 bg-gray-100 rounded-xl w-56 mb-6" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 h-36" />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Innere Komponente (braucht Suspense wegen useSearchParams)
───────────────────────────────────────────────────────────── */
function AuftragPlanenInner() {
  const router     = useRouter();
  const params     = useSearchParams();
  const auftragId  = params.get('id');

  /* ── State: Auth & Laden ── */
  const [companyId,  setCompanyId]  = useState(null);
  const [ladeStatus, setLadeStatus] = useState('loading');
  // 'loading' | 'ready' | 'error' | 'forbidden' | 'not_found'

  /* ── State: Auftragsdaten (read-only) ── */
  const [auftrag, setAuftrag] = useState(null);
  const [kunde,   setKunde]   = useState(null);
  const [meta,    setMeta]    = useState({});

  /* ── State: Planungsformular ── */
  const [einsatzdatum,  setEinsatzdatum]  = useState('');
  const [einsatzbeginn, setEinsatzbeginn] = useState('');
  const [einsatzdauer,  setEinsatzdauer]  = useState('');
  const [notdienst,     setNotdienst]     = useState(false);
  const [planungsnotiz, setPlanungsnotiz] = useState('');

  /* ── State: UI ── */
  const [fehler, setFehler] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [erfolg, setErfolg] = useState(false);

  /* ── Laden: Auth + Auftrag + Kunde ── */
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
        if (!ERLAUBTE_ROLLEN.includes(member.role)) { setLadeStatus('forbidden'); return; }

        setCompanyId(member.company_id);

        /* Auftrag laden (Multi-Tenant-sicher) */
        const { data: auf, error: aufErr } = await supabase
          .from('auftraege')
          .select('id, titel, beschreibung, status, datum, adresse, notizen, kunde_id, objekt_id')
          .eq('id', auftragId)
          .eq('company_id', member.company_id)
          .maybeSingle();

        if (aufErr || !auf) { setLadeStatus('not_found'); return; }
        setAuftrag(auf);

        /* notizen-JSON parsen */
        let parsedMeta = {};
        try { parsedMeta = JSON.parse(auf.notizen || '{}'); } catch { /* leer */ }
        setMeta(parsedMeta);

        /* Vorausfüllen — falls Planung bereits vorhanden */
        if (parsedMeta.planungs_datum)   setEinsatzdatum(parsedMeta.planungs_datum);
        else if (auf.datum)              setEinsatzdatum(auf.datum);
        if (parsedMeta.planungs_beginn)  setEinsatzbeginn(parsedMeta.planungs_beginn);
        if (parsedMeta.planungs_dauer)   setEinsatzdauer(parsedMeta.planungs_dauer);
        if (parsedMeta.notdienst)        setNotdienst(!!parsedMeta.notdienst);
        if (parsedMeta.planungsnotiz)    setPlanungsnotiz(parsedMeta.planungsnotiz);

        /* Kunden laden */
        if (auf.kunde_id) {
          const { data: k } = await supabase
            .from('kunden')
            .select('id, name, firmenname, firma, kundentyp, telefon, email')
            .eq('id', auf.kunde_id)
            .eq('company_id', member.company_id)
            .maybeSingle();
          setKunde(k ?? null);
        }

        setLadeStatus('ready');
      } catch {
        setLadeStatus('error');
      }
    }
    init();
  }, [auftragId, router]);

  /* ── Helpers ── */
  function kundeAnzeigeName(k) {
    if (!k) return '—';
    if (k.kundentyp === 'firma') return k.firmenname || k.firma || k.name;
    return k.name;
  }

  function ansprechpartner(k) {
    if (!k || k.kundentyp !== 'firma') return null;
    return k.name || null;
  }

  function auftragNummer() {
    return meta.nummer || '—';
  }

  /* ── Validierung ── */
  function validieren() {
    const e = {};
    if (!einsatzdatum)  e.einsatzdatum  = 'Einsatzdatum ist erforderlich.';
    if (!einsatzbeginn) e.einsatzbeginn = 'Einsatzbeginn ist erforderlich.';
    setFehler(e);
    return Object.keys(e).length === 0;
  }

  /* ── Speichern ── */
  async function speichern(weiter = false) {
    if (!validieren()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    setApiErr('');
    setErfolg(false);

    try {
      /* Bestehende Meta-Felder erhalten, neue überschreiben */
      const neuesMeta = {
        ...meta,
        notdienst,
        planungs_datum:  einsatzdatum,
        planungs_beginn: einsatzbeginn,
        planungs_dauer:  einsatzdauer || null,
        planungsnotiz:   planungsnotiz.trim() || null,
      };

      const neuerStatus = notdienst ? 'Notdienst' : 'Geplant';

      const { error } = await supabase
        .from('auftraege')
        .update({
          datum:   einsatzdatum,
          status:  neuerStatus,
          notizen: JSON.stringify(neuesMeta),
        })
        .eq('id', auftragId)
        .eq('company_id', companyId);

      if (error) throw error;

      /* Lokalen State aktualisieren */
      setMeta(neuesMeta);
      setAuftrag(prev => ({ ...prev, datum: einsatzdatum, status: neuerStatus }));

      if (weiter) {
        router.push(`/dashboard/auftraege/zuweisung?id=${auftragId}`);
        return;
      }

      setErfolg(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setApiErr(err.message ?? 'Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      if (!weiter) setSaving(false);
    }
  }

  /* ─────────────── Render: Ladezustände ─────────────── */
  if (ladeStatus === 'loading') return <Skeleton />;

  if (ladeStatus === 'forbidden') return (
    <div className="bg-white rounded-2xl border border-red-100 p-10 text-center max-w-xl mx-auto">
      <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <Svg d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          cls="w-5 h-5 text-red-400" />
      </div>
      <p className="text-sm font-semibold text-gray-800 mb-1">Kein Zugriff</p>
      <p className="text-xs text-gray-400">
        Du hast keine Berechtigung, Aufträge zu planen.
      </p>
      <button onClick={() => router.push('/dashboard/auftraege')}
        className="mt-4 text-xs text-blue-500 hover:underline">
        ← Zurück zur Übersicht
      </button>
    </div>
  );

  if (ladeStatus === 'not_found') return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-xl mx-auto">
      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <Svg d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          cls="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-800 mb-1">Auftrag nicht gefunden</p>
      <p className="text-xs text-gray-400">
        Der Auftrag existiert nicht oder wurde gelöscht.
      </p>
      <button onClick={() => router.push('/dashboard/auftraege')}
        className="mt-4 text-xs text-blue-500 hover:underline">
        ← Zurück zur Übersicht
      </button>
    </div>
  );

  if (ladeStatus === 'error') return (
    <div className="bg-white rounded-2xl border border-red-100 p-10 text-center max-w-xl mx-auto">
      <p className="text-sm font-semibold text-red-600 mb-1">Fehler beim Laden</p>
      <p className="text-xs text-gray-400">
        Bitte Seite neu laden oder Support kontaktieren.
      </p>
    </div>
  );

  /* ─────────────── Render: Hauptseite ─────────────── */
  const hatFehler = Object.keys(fehler).length > 0;
  const ap        = ansprechpartner(kunde);

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ─── Seitenkopf ─── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Auftrag planen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plane den Einsatztermin und bereite den Auftrag für die Ressourcenzuweisung vor.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => speichern(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 border border-blue-200
              text-blue-600 bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100
              transition disabled:opacity-50"
          >
            {saving
              ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
              : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            }
            Planung speichern
          </button>
          <button
            type="button"
            onClick={() => speichern(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white
              rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving
              ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
              : <Svg d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            }
            Speichern & Ressourcen einteilen
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/auftraege/${auftragId}`)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200
              rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition disabled:opacity-40"
          >
            <Svg d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" cls="w-3.5 h-3.5" />
            Zurück zum Auftrag
          </button>
        </div>
      </div>

      {/* ─── Erfolgsmeldung ─── */}
      {erfolg && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100
          rounded-xl px-4 py-3">
          <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            cls="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-xs font-medium text-green-700">
            Auftrag erfolgreich geplant.
          </p>
          <button
            onClick={() => router.push(`/dashboard/auftraege/zuweisung?id=${auftragId}`)}
            className="ml-auto flex items-center gap-1 text-xs text-green-600
              font-semibold hover:underline whitespace-nowrap"
          >
            Ressourcen einteilen
            <Svg d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" cls="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── API-Fehler ─── */}
      {apiErr && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100
          rounded-xl px-4 py-3">
          <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            cls="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{apiErr}</p>
        </div>
      )}

      {/* ─── Validierungsfehler-Banner ─── */}
      {hatFehler && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100
          rounded-xl px-4 py-3">
          <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            cls="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Bitte alle Pflichtfelder ausfüllen, bevor du fortfährst.
          </p>
        </div>
      )}

      {/* ─── BEREICH 0: Auftragsdetails (nur lesbar) ─── */}
      <SectionCard
        icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        title="Auftragsdetails"
        badge="Nur lesbar"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <InfoPill label="Auftragsnummer"   value={auftragNummer()} />
          <InfoPill label="Auftragsart"      value={auftrag?.titel} />
          <InfoPill label="Kunde"            value={kundeAnzeigeName(kunde)} />
          {ap && <InfoPill label="Ansprechpartner" value={ap} />}
          <InfoPill label="Einsatzort"       value={auftrag?.adresse} />
          {auftrag?.beschreibung && (
            <div className="col-span-2 sm:col-span-3">
              <InfoPill label="Problembeschreibung" value={auftrag.beschreibung} />
            </div>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-gray-50 flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            Aktueller Status:
          </span>
          <StatusBadge status={auftrag?.status} />
        </div>
      </SectionCard>

      {/* ─── BEREICH 1: Terminplanung ─── */}
      <SectionCard
        icon="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        title="Terminplanung"
        badge="Pflichtfelder"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Einsatzdatum */}
          <div>
            <Label htmlFor="einsatzdatum" required>Einsatzdatum</Label>
            <input
              type="date"
              id="einsatzdatum"
              value={einsatzdatum}
              onChange={e => {
                setEinsatzdatum(e.target.value);
                setFehler(p => ({ ...p, einsatzdatum: '' }));
              }}
              className={inp(fehler.einsatzdatum
                ? 'border-red-300 bg-red-50 focus:ring-red-400'
                : 'border-gray-200'
              )}
            />
            <FieldError msg={fehler.einsatzdatum} />
          </div>

          {/* Einsatzbeginn */}
          <div>
            <Label htmlFor="einsatzbeginn" required>Einsatzbeginn</Label>
            <input
              type="time"
              id="einsatzbeginn"
              value={einsatzbeginn}
              onChange={e => {
                setEinsatzbeginn(e.target.value);
                setFehler(p => ({ ...p, einsatzbeginn: '' }));
              }}
              className={inp(fehler.einsatzbeginn
                ? 'border-red-300 bg-red-50 focus:ring-red-400'
                : 'border-gray-200'
              )}
            />
            <FieldError msg={fehler.einsatzbeginn} />
          </div>

          {/* Geschätzte Einsatzdauer */}
          <div>
            <Label htmlFor="einsatzdauer">Geschätzte Einsatzdauer</Label>
            <select
              id="einsatzdauer"
              value={einsatzdauer}
              onChange={e => setEinsatzdauer(e.target.value)}
              className={inp('border-gray-200 cursor-pointer')}
            >
              <option value="">Keine Angabe</option>
              <option value="30 Minuten">30 Minuten</option>
     .          <option value="1 Stunde">1 Stunde</option>
              <option value="1,5 Stunden">1,5 Stunden</option>
              <option value="2 Stunden">2 Stunden</option>
              <option value="3 Stunden">3 Stunden</option>
              <option value="4 Stunden">4 Stunden</option>
              <option value="5 Stunden">5 Stunden</option>
              <option value="6 Stunden">6 Stunden (halber Tag)</option>
              <option value="8 Stunden">8 Stunden (ganzer Tag)</option>
              <option value="Mehrere Tage">Mehrere Tage</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* ─── BEREICH 2: Notdienst ─── */}
      <SectionCard
        icon="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        title="Notdienst"
      >
        <label className="flex items-start gap-3 cursor-pointer group select-none">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              id="notdienst"
              checked={notdienst}
              onChange={e => setNotdienst(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition
              ${notdienst
                ? 'bg-orange-500 border-orange-500'
                : 'border-gray-300 bg-white group-hover:border-orange-400'
              }`}>
              {notdienst && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Notdiensteinsatz</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Dieser Auftrag wird als Notdiensteinsatz gekennzeichnet und
              erhält eine entsprechende Markierung in der Übersicht.
            </p>
          </div>
        </label>

        {notdienst && (
          <div className="mt-4 flex items-center gap-2 bg-orange-50 border border-orange-100
            rounded-xl px-3 py-2.5">
            <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              cls="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="text-xs text-orange-700 font-medium">
              Notdiensteinsatz aktiv — Auftrag wird entsprechend gekennzeichnet.
            </span>
          </div>
        )}
      </SectionCard>

      {/* ─── BEREICH 3: Planungsnotiz ─── */}
      <SectionCard
        icon="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3aC3.746 3.746 2.25 5.14 2.25 6.741v6.018z"
        title="Planungsnotiz"
      >
        <Label htmlFor="planungsnotiz">
          Interne Notiz für Disposition und Techniker
        </Label>
        <textarea
          id="planungsnotiz"
          rows={4}
          value={planungsnotiz}
          onChange={e => setPlanungsnotiz(e.target.value)}
          placeholder={
            'z.B. Kunde nur vormittags erreichbar · ' +
            'Zugang über Hinterhof · ' +
            'Schlüssel liegt beim Hausmeister'
          }
          className={inp('border-gray-200 resize-none')}
        />
        <p className="mt-1.5 text-xs text-gray-400">
          Diese Notiz ist intern snd für die Disposition sowie alle zugewiesenen
          Techniker sichtbar.
        </p>
      </SectionCard>

      {/* ─── Unterer Aktionsbereich ─── */}
      <div className="flex items-center justify-between gap-3 pt-2 pb-8 flex-wrap">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/auftraege/${auftragId}`)}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600
            transition disabled:opacity-40"
        >
          <Svg d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" cls="w-4 h-4" />
          Zurück zum Auftrag
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => speichern(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 border border-blue-200
              text-blue-600 bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100
              transition disabled:opacity-50"
          >
            {saving
              ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
              : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            }
            Planung speichern
          </button>
          <button
            type="button"
            onClick={() => speichern(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white
              rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving
              ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
              : <Svg d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            }
            Speichern & Ressourcen einteilen
          </button>
        </div>
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Export mit Suspense-Boundary (Next.js 14 — useSearchParams)
───────────────────────────────────────────────────────────── */
export default function AuftragPlanen() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AuftragPlanenInner />
    </Suspense>
  );
}
