'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ─────────────────────────────────────────────────────────────
   Konstanten
───────────────────────────────────────────────────────────── */
const AUFTRAGSARTEN = [
  'Rohrreinigung',
  'TV-Inspektion',
  'Dichtheitsprüfung',
  'Notdienst',
  'Wartung',
  'Sanierung',
  'Sonstiges',
];

function genNummer() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(10000 + Math.random() * 90000));
  return `AUF-${year}-${rand}`;
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
      <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-3 h-3 shrink-0" />
      {msg}
    </p>
  );
}

function inp(extra = '') {
  return `w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 placeholder-gray-300
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white ${extra}`;
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
          <span className="ml-auto text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
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
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || <span className="text-gray-300 italic">—</span>}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse max-w-3xl">
      <div className="h-8 bg-gray-100 rounded-xl w-48 mb-6" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 h-36" />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hauptkomponente
───────────────────────────────────────────────────────────── */
export default function AuftragErstellen() {
  const router = useRouter();
  const containerRef = useRef(null);

  // Auth
  const [companyId,  setCompanyId]  = useState(null);
  const [userId,     setUserId]     = useState(null);
  const [ladeStatus, setLadeStatus] = useState('loading'); // loading | ready | error

  // Kundensuche
  const [suchText,       setSuchText]       = useState('');
  const [suchergebnisse, setSuchergebnisse] = useState([]);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [suchLaden,      setSuchLaden]      = useState(false);
  const [selectedKunde,  setSelectedKunde]  = useState(null);

  // Objekte / Einsatzorte
  const [objekte,        setObjekte]        = useState([]);
  const [objekteLaden,   setObjekteLaden]   = useState(false);
  const [selectedObjekt, setSelectedObjekt] = useState(null);
  const [manuelleAdr,    setManuelleAdr]    = useState('');

  // Formular
  const [auftragsart,  setAuftragsart]  = useState('');
  const [termin,       setTermin]       = useState('');
  const [uhrzeit,      setUhrzeit]      = useState('');
  const [notdienst,    setNotdienst]    = useState(false);
  const [beschreibung, setBeschreibung] = useState('');
  const [intNotiz,     setIntNotiz]     = useState('');
  const [nummer]                        = useState(genNummer);

  // UI
  const [fehler, setFehler] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');

  /* ── Auth + Company laden ── */
  useEffect(() => {
    async function init() {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) { router.push('/login'); return; }
        setUserId(user.id);

        const { data: member } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!member) { setLadeStatus('error'); return; }
        setCompanyId(member.company_id);
        setLadeStatus('ready');
      } catch {
        setLadeStatus('error');
      }
    }
    init();
  }, [router]);

  /* ── Live-Suche mit Debounce ── */
  useEffect(() => {
    if (!companyId || suchText.trim().length < 1) {
      setSuchergebnisse([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSuchLaden(true);
      const q = `%${suchText.trim()}%`;
      const { data } = await supabase
        .from('kunden')
        .select('id, name, firmenname, firma, kundentyp, telefon, email, adresse, rechnung_strasse, rechnung_plz, rechnung_ort, rechnungsadresse_abweichend')
        .eq('company_id', companyId)
        .or(`name.ilike.${q},firmenname.ilike.${q},firma.ilike.${q},adresse.ilike.${q}`)
        .limit(10);
      setSuchergebnisse(data ?? []);
      setShowDropdown(true);
      setSuchLaden(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [suchText, companyId]);

  /* ── Klick außerhalb → Dropdown schließen ── */
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Helpers ── */
  function kundeAnzeigeName(k) {
    if (!k) return '';
    if (k.kundentyp === 'firma') return k.firmenname || k.firma || k.name;
    return k.name;
  }

  function kundeRechnungsadresse(k) {
    if (!k) return '';
    if (k.rechnungsadresse_abweichend && (k.rechnung_strasse || k.rechnung_ort)) {
      return [k.rechnung_strasse, k.rechnung_plz, k.rechnung_ort].filter(Boolean).join(', ');
    }
    return k.adresse ?? '';
  }

  /* ── Kunde auswählen → Objekte laden ── */
  async function onKundeWaehlen(k) {
    setSelectedKunde(k);
    setSuchText(kundeAnzeigeName(k));
    setShowDropdown(false);
    setFehler(prev => ({ ...prev, kunde: '', einsatzort: '' }));
    setSelectedObjekt(null);
    setManuelleAdr('');

    setObjekteLaden(true);
    const { data: obs } = await supabase
      .from('objekte')
      .select('id, bezeichnung, adresse')
      .eq('kunde_id', k.id)
      .eq('company_id', companyId)
      .order('bezeichnung');
    const liste = obs ?? [];
    setObjekte(liste);
    setObjekteLaden(false);

    if (liste.length === 1) {
      setSelectedObjekt(liste[0]);
      setManuelleAdr(liste[0].adresse ?? '');
    }
  }

  function kundeZuruecksetzen() {
    setSelectedKunde(null);
    setSuchText('');
    setSuchergebnisse([]);
    setObjekte([]);
    setSelectedObjekt(null);
    setManuelleAdr('');
  }

  /* ── Validierung ── */
  function validieren() {
    const e = {};
    if (!selectedKunde)       e.kunde        = 'Bitte einen Kunden auswählen.';
    if (!auftragsart)         e.auftragsart  = 'Auftragsart ist erforderlich.';
    if (!beschreibung.trim()) e.beschreibung = 'Bitte eine Problembeschreibung eingeben.';
    if (!selectedObjekt && !manuelleAdr.trim())
                               e.einsatzort   = 'Bitte einen Einsatzort angeben.';
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

    try {
      const metaDaten = {
        nummer,
        uhrzeit:       uhrzeit || null,
        notdienst,
        interne_notiz: intNotiz.trim() || null,
      };

      const einsatzAdr = selectedObjekt
        ? `${selectedObjekt.bezeichnung}${selectedObjekt.adresse ? ' – ' + selectedObjekt.adresse : ''}`
        : manuelleAdr.trim();

      const payload = {
        company_id:   companyId,
        user_id:      userId,
        kunde_id:     selectedKunde.id,
        objekt_id:    selectedObjekt?.id ?? null,
        titel:        auftragsart,
        beschreibung: beschreibung.trim(),
        status:       'offen',
        datum:        termin || null,
        adresse:      einsatzAdr || null,
        notizen:      JSON.stringify(metaDaten),
      };

      const { data: neuer, error } = await supabase
        .from('auftraege')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;

      if (weiter) {
        router.push(`/dashboard/auftraege/${neuer.id}`);
      } else {
        router.push('/dashboard/auftraege');
      }
    } catch (err) {
      setApiErr(err.message ?? 'Fehler beim Speichern. Bitte versuche es erneut.');
      setSaving(false);
    }
  }

  /* ─────────────── Render ─────────────── */
  if (ladeStatus === 'loading') return <Skeleton />;

  if (ladeStatus === 'error') return (
    <div className="bg-white rounded-2xl border border-red-100 p-10 text-center max-w-xl">
      <p className="text-sm font-semibold text-red-600 mb-1">Fehler beim Laden</p>
      <p className="text-xs text-gray-400">Bitte Seite neu laden oder Support kontaktieren.</p>
    </div>
  );

  const hatFehler = Object.keys(fehler).length > 0;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ─── Seitenkopf ─── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Neuer Auftrag</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Erstelle einen neuen Auftrag und bereite ihn für die Einsatzplanung vor.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => speichern(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 border border-blue-200 text-blue-600 bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50"
          >
            {saving
              ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
              : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            }
            Auftrag speichern
          </button>
          <button
            type="button"
            onClick={() => speichern(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving
              ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
              : <Svg d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            }
            Speichern & zur Einsatzplanung
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/auftraege')}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition"
          >
            Abbrechen
          </button>
        </div>
      </div>

      {/* ─── Fehlermeldungen ─── */}
      {apiErr && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{apiErr}</p>
        </div>
      )}
      {hatFehler && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">Bitte alle Pflichtfelder ausfüllen, bevor du fortfährst.</p>
        </div>
      )}

      {/* ─── BEREICH 1: Kunde ─── */}
      <SectionCard
        icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        title="Kunde"
        badge="Pflichtfeld"
      >
        {!selectedKunde ? (
          <div ref={containerRef}>
            <Label htmlFor="kundensuche" required>Kunde suchen</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                {suchLaden
                  ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 text-gray-400 animate-spin" />
                  : <Svg d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" cls="w-4 h-4 text-gray-400" />
                }
              </div>
              <input
                id="kundensuche"
                type="text"
                value={suchText}
                onChange={e => setSuchText(e.target.value)}
                placeholder="Firmenname, Name oder Ort eingeben …"
                autoComplete="off"
                className={inp(`pl-9 ${fehler.kunde ? 'border-red-300' : 'border-gray-200'}`)}
              />

              {/* Suchdropdown */}
              {showDropdown && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  {suchergebnisse.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Svg d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" cls="w-5 h-5 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-500 mb-3">Kein Kunde gefunden.</p>
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/kunden/neu')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                      >
                        <Svg d="M12 4.5v15m7.5-7.5h-15" cls="w-3.5 h-3.5" />
                        Neuen Kunden anlegen
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                      {suchergebnisse.map(k => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => onKundeWaehlen(k)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                            {kundeAnzeigeName(k).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{kundeAnzeigeName(k)}</p>
                            {k.adresse && <p className="text-xs text-gray-400 truncate">{k.adresse}</p>}
                          </div>
                          {k.kundentyp === 'firma' && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 shrink-0">
                              Firma
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <FieldError msg={fehler.kunde} />
            <p className="mt-2 text-xs text-gray-400">
              Kunden nicht gefunden?{' '}
              <button type="button" onClick={() => router.push('/dashboard/kunden/neu')}
                className="text-blue-500 hover:underline font-medium">
                + Neuen Kunden anlegen
              </button>
            </p>
          </div>
        ) : (
          /* ── Ausgewählter Kunde ── */
          <div>
            <div className="flex items-start gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-100 mb-5">
              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                {kundeAnzeigeName(selectedKunde).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{kundeAnzeigeName(selectedKunde)}</p>
                {selectedKunde.adresse && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{selectedKunde.adresse}</p>
                )}
              </div>
              <button type="button" onClick={kundeZuruecksetzen}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white transition shrink-0"
                title="Kunden ändern">
                <Svg d="M6 18L18 6M6 6l12 12" cls="w-4 h-4" />
              </button>
            </div>

            {/* Kundendaten (schreibgeschützt) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoPill label="Name / Firma" value={kundeAnzeigeName(selectedKunde)} />
              <InfoPill label="Telefon"      value={selectedKunde.telefon} />
              <InfoPill label="E-Mail"       value={selectedKunde.email} />
            </div>
            {kundeRechnungsadresse(selectedKunde) && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <InfoPill label="Rechnungsadresse" value={kundeRechnungsadresse(selectedKunde)} />
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* ─── BEREICH 2: Einsatzort ─── */}
      {selectedKunde && (
        <SectionCard
          icon="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          title="Einsatzort"
          badge="Pflichtfeld"
        >
          {objekteLaden ? (
            <div className="h-10 bg-gray-50 rounded-xl animate-pulse" />
          ) : objekte.length > 0 ? (
            <div>
              <Label htmlFor="objekt" required>
                {objekte.length === 1 ? 'Einsatzort (automatisch ausgewählt)' : 'Einsatzort wählen'}
              </Label>
              <select
                id="objekt"
                value={selectedObjekt?.id ?? ''}
                onChange={e => {
                  const obj = objekte.find(o => o.id === e.target.value) ?? null;
                  setSelectedObjekt(obj);
                  setManuelleAdr(obj?.adresse ?? '');
                  setFehler(prev => ({ ...prev, einsatzort: '' }));
                }}
                className={inp(fehler.einsatzort ? 'border-red-300' : 'border-gray-200')}
              >
                {objekte.length > 1 && <option value="">— Objekt wählen —</option>}
                {objekte.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.bezeichnung}{o.adresse ? ` – ${o.adresse}` : ''}
                  </option>
                ))}
              </select>
              <FieldError msg={fehler.einsatzort} />
            </div>
          ) : (
            <div>
              <Label htmlFor="manuelleAdr" required>Einsatzadresse</Label>
              <input
                id="manuelleAdr"
                type="text"
                value={manuelleAdr}
                onChange={e => {
                  setManuelleAdr(e.target.value);
                  setFehler(prev => ({ ...prev, einsatzort: '' }));
                }}
                placeholder="z. B. Musterstraße 12, 12345 Berlin"
                className={inp(fehler.einsatzort ? 'border-red-300' : 'border-gray-200')}
              />
              <FieldError msg={fehler.einsatzort} />
              <p className="mt-1.5 text-xs text-gray-400">
                Kein Objekt für diesen Kunden angelegt.{' '}
                <button type="button" onClick={() => router.push(`/dashboard/kunden/${selectedKunde.id}`)}
                  className="text-blue-500 hover:underline">
                  Objekt anlegen →
                </button>
              </p>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── BEREICH 3: Auftragsinformationen ─── */}
      <SectionCard
        icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
        title="Auftragsinformationen"
      >
        {/* Auto-Felder */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Auftragsnummer</p>
            <p className="text-sm font-mono font-semibold text-gray-700">{nummer}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Erstellt am</p>
            <p className="text-sm font-semibold text-gray-700">{new Date().toLocaleDateString('de-DE')}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <p className="text-sm font-semibold text-blue-700">Neu</p>
            </div>
          </div>
        </div>

        {/* Auftragsart */}
        <div>
          <Label htmlFor="auftragsart" required>Auftragsart</Label>
          <select
            id="auftragsart"
            value={auftragsart}
            onChange={e => {
              setAuftragsart(e.target.value);
              setFehler(prev => ({ ...prev, auftragsart: '' }));
            }}
            className={inp(fehler.auftragsart ? 'border-red-300' : 'border-gray-200')}
          >
            <option value="">— Bitte wählen —</option>
            {AUFTRAGSARTEN.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <FieldError msg={fehler.auftragsart} />
        </div>
      </SectionCard>

      {/* ─── BEREICH 4: Einsatzplanung ─── */}
      <SectionCard
        icon="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        title="Einsatzplanung"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <Label htmlFor="termin">Wunschtermin</Label>
            <input id="termin" type="date" value={termin}
              onChange={e => setTermin(e.target.value)}
              className={inp('border-gray-200')} />
          </div>
          <div>
            <Label htmlFor="uhrzeit">Gewünschte Uhrzeit</Label>
            <input id="uhrzeit" type="time" value={uhrzeit}
              onChange={e => setUhrzeit(e.target.value)}
              className={inp('border-gray-200')} />
          </div>
        </div>

        {/* Notdienst */}
        <button
          type="button"
          onClick={() => setNotdienst(v => !v)}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition ${
            notdienst
              ? 'border-red-200 bg-red-50'
              : 'border-gray-100 bg-gray-50 hover:border-gray-200'
          }`}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
            notdienst ? 'bg-red-500 border-red-500' : 'border-gray-300'
          }`}>
            {notdienst && <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-3 h-3 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${notdienst ? 'text-red-700' : 'text-gray-700'}`}>
              Notdienst
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Auftrag erhält Notdienst-Status und höchste Bearbeitungspriorität
            </p>
          </div>
          {notdienst && (
            <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full shrink-0">
              AKTIV
            </span>
          )}
        </button>
      </SectionCard>

      {/* ─── BEREICH 5: Problembeschreibung ─── */}
      <SectionCard
        icon="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        title="Problembeschreibung"
        badge="Pflichtfeld"
      >
        <Label htmlFor="beschreibung" required>Beschreibung des Problems / Auftrags</Label>
        <textarea
          id="beschreibung"
          rows={5}
          value={beschreibung}
          onChange={e => {
            setBeschreibung(e.target.value);
            setFehler(prev => ({ ...prev, beschreibung: '' }));
          }}
          placeholder="z. B. Rohrleitung in der Küche verstopft. Wasser läuft nicht mehr ab. Letzter Service vor 2 Jahren …"
          className={inp(`${fehler.beschreibung ? 'border-red-300' : 'border-gray-200'} resize-none`)}
        />
        <FieldError msg={fehler.beschreibung} />
      </SectionCard>

      {/* ─── BEREICH 6: Interne Notiz ─── */}
      <SectionCard
        icon="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        title="Interne Notiz"
      >
        <Label htmlFor="intNotiz">Notiz für internes Team</Label>
        <textarea
          id="intNotiz"
          rows={3}
          value={intNotiz}
          onChange={e => setIntNotiz(e.target.value)}
          placeholder="Nur intern sichtbar – z. B. Besonderheiten, Vorgeschichte, Hinweise für den Techniker …"
          className={inp('border-gray-200 resize-none')}
        />
        <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
          <Svg d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" cls="w-3 h-3" />
          Nicht im Kundendokument — nur intern sichtbar
        </p>
      </SectionCard>

      {/* ─── Aktionsleiste unten ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push('/dashboard/auftraege')}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50 sm:w-auto w-full"
        >
          Abbrechen
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => speichern(false)}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-600 bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50 sm:w-auto w-full"
        >
          {saving
            ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
            : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          }
          Auftrag speichern
        </button>

        <button
          type="button"
          onClick={() => speichern(true)}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-50 sm:w-auto w-full"
        >
          {saving
            ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
            : <Svg d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          }
          Speichern & zur Einsatzplanung
        </button>
      </div>

    </div>
  );
}
