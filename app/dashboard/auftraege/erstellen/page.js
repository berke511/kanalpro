'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ─────────────────────────────────────────────────────────────
   Konstanten
───────────────────────────────────────────────────────────── */
const AUFTRAGSTYPEN = [
  'TV-Inspektion / Kamerabefahrung',
  'Kanalreinigung',
  'Hochdruckreinigung',
  'Dichtheitsprüfung (§ 61a LWG)',
  'Kanalreparatur',
  'Kanalsanierung (Inliner)',
  'Hausanschluss',
  'Notdienst / Entstörung',
  'Beratung / Begutachtung',
  'Sonstiges',
];

const PRIORITAETEN = ['Niedrig', 'Mittel', 'Hoch'];

const PRIO_FARBEN = {
  Niedrig: 'bg-gray-100 text-gray-600 border-gray-200',
  Mittel:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  Hoch:    'bg-red-50 text-red-600 border-red-200',
};

const LEER = {
  typ: '',
  prioritaet: 'Mittel',
  kunden_id: '',
  ansprechpartner: '',
  telefon: '',
  email: '',
  strasse: '',
  plz: '',
  ort: '',
  zusatz: '',
  zugang: '',
  einsatzdatum: '',
  startzeit: '',
  dauer: '',
  mitarbeiter_id: '',
  fahrzeug_id: '',
  beschreibung: '',
  notizen: '',
};

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
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-600 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function Field({ error, children }) {
  return (
    <div>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inp(extra = '') {
  return `w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${extra}`;
}

function SectionCard({ iconD, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
          <Svg d={iconD} cls="w-3.5 h-3.5 text-blue-500" />
        </div>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 h-40" />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Auftragsnummer generieren  (Sprint 2: DB-Sequenz)
───────────────────────────────────────────────────────────── */
function genNummer() {
  const jahr = new Date().getFullYear();
  const rnd  = String(Math.floor(Math.random() * 9000) + 1000);
  return `AUF-${jahr}-${rnd}`;
}

/* ─────────────────────────────────────────────────────────────
   Hauptkomponente
───────────────────────────────────────────────────────────── */
export default function AuftragErstellen() {
  const router = useRouter();

  const [companyId,   setCompanyId]   = useState(null);
  const [kunden,      setKunden]      = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [fahrzeuge,   setFahrzeuge]   = useState([]);
  const [ladeStatus,  setLadeStatus]  = useState('loading'); // loading | ready | error

  const [form,   setForm]   = useState(LEER);
  const [fehler, setFehler] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');

  /* ── Stammdaten laden ── */
  useEffect(() => {
    async function laden() {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) { router.push('/login'); return; }

        const { data: member } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!member) { setLadeStatus('error'); return; }
        const cid = member.company_id;
        setCompanyId(cid);

        const [
          { data: k },
          { data: m },
          { data: f },
        ] = await Promise.all([
          supabase.from('kunden').select('id, name, firmenname, kundentyp, ansprechpartner, telefon, email').order('name'),
          supabase.from('mitarbeiter').select('id, vorname, nachname').eq('company_id', cid).order('nachname'),
          supabase.from('fahrzeuge').select('id, kennzeichen, marke, modell').eq('company_id', cid).order('kennzeichen'),
        ]);

        setKunden(k ?? []);
        setMitarbeiter(m ?? []);
        setFahrzeuge(f ?? []);
        setLadeStatus('ready');
      } catch {
        setLadeStatus('error');
      }
    }
    laden();
  }, [router]);

  /* ── Formfeld-Handler ── */
  const set = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setFehler(prev => ({ ...prev, [key]: '' }));
  }, []);

  /* ── Kunde wählen → Kontaktdaten vorausfüllen ── */
  function onKundeWaehlen(id) {
    set('kunden_id', id);
    if (!id) return;
    const k = kunden.find(k => k.id === id);
    if (!k) return;
    set('ansprechpartner', k.ansprechpartner ?? '');
    set('telefon',         k.telefon         ?? '');
    set('email',           k.email           ?? '');
  }

  /* ── Validierung ── */
  function validieren() {
    const e = {};
    if (!form.typ)           e.typ          = 'Auftragstyp ist erforderlich.';
    if (!form.kunden_id)     e.kunden_id    = 'Bitte einen Kunden auswählen.';
    if (!form.einsatzdatum)  e.einsatzdatum = 'Einsatzdatum ist erforderlich.';
    if (!form.beschreibung?.trim()) e.beschreibung = 'Bitte eine Problembeschreibung eingeben.';
    setFehler(e);
    return Object.keys(e).length === 0;
  }

  /* ── Speichern ── */
  async function speichern(status = 'Neu') {
    if (!validieren()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    setApiErr('');
    try {
      const payload = {
        company_id:        companyId,
        nummer:            genNummer(),
        typ:               form.typ,
        prioritaet:        form.prioritaet,
        status,
        kunden_id:         form.kunden_id    || null,
        ansprechpartner:   form.ansprechpartner.trim() || null,
        telefon:           form.telefon.trim()          || null,
        email:             form.email.trim()            || null,
        einsatzort_strasse: form.strasse.trim()         || null,
        einsatzort_plz:    form.plz.trim()              || null,
        einsatzort_ort:    form.ort.trim()              || null,
        einsatzort_zusatz: form.zusatz.trim()           || null,
        zugangsinformationen: form.zugang.trim()        || null,
        einsatzdatum:      form.einsatzdatum            || null,
        startzeit:         form.startzeit               || null,
        dauer_stunden:     form.dauer ? parseFloat(form.dauer) : null,
        mitarbeiter_id:    form.mitarbeiter_id          || null,
        fahrzeug_id:       form.fahrzeug_id             || null,
        beschreibung:      form.beschreibung.trim()     || null,
        interne_notizen:   form.notizen.trim()          || null,
      };

      const { data: neuerAuftrag, error } = await supabase.from('auftraege').insert(payload).select('id').single();
      if (error) throw error;
      router.push(`/dashboard/auftraege/${neuerAuftrag.id}`);
    } catch (e) {
      setApiErr(e.message ?? 'Fehler beim Speichern. Bitte versuche es erneut.');
      setSaving(false);
    }
  }

  /* ── Render ── */
  if (ladeStatus === 'loading') return <Skeleton />;

  if (ladeStatus === 'error') return (
    <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
      <p className="text-sm font-semibold text-red-600 mb-1">Fehler beim Laden</p>
      <p className="text-xs text-gray-400">Bitte Seite neu laden oder Support kontaktieren.</p>
    </div>
  );

  const kundenName = (k) =>
    k.kundentyp === 'firma' && k.firmenname ? k.firmenname : k.name;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Neuer Auftrag</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Fülle alle Pflichtfelder aus, um den Auftrag zu erstellen.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/auftraege')}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition shrink-0"
        >
          <Svg d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" cls="w-3.5 h-3.5" />
          Zurück
        </button>
      </div>

      {/* ── API-Fehler ── */}
      {apiErr && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{apiErr}</p>
        </div>
      )}

      {/* ── 1. Auftragstyp & Priorität ── */}
      <SectionCard
        iconD="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
        title="Auftragsinformationen"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field error={fehler.typ}>
            <Label htmlFor="typ" required>Auftragstyp</Label>
            <select id="typ" value={form.typ} onChange={e => set('typ', e.target.value)}
              className={inp(fehler.typ ? 'border-red-300' : 'border-gray-200')}>
              <option value="">— Bitte wählen —</option>
              {AUFTRAGSTYPEN.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field>
            <Label>Priorität</Label>
            <div className="flex gap-2 pt-0.5">
              {PRIORITAETEN.map(p => (
                <button key={p} type="button" onClick={() => set('prioritaet', p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition
                    ${form.prioritaet === p
                      ? PRIO_FARBEN[p] + ' ring-2 ring-offset-1 ring-blue-400'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}>
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* ── 2. Kundendaten ── */}
      <SectionCard
        iconD="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        title="Kundendaten"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <Field error={fehler.kunden_id}>
            <Label htmlFor="kunden_id" required>Kunde</Label>
            <select id="kunden_id" value={form.kunden_id} onChange={e => onKundeWaehlen(e.target.value)}
              className={inp(fehler.kunden_id ? 'border-red-300' : 'border-gray-200')}>
              <option value="">— Bitte wählen —</option>
              {kunden.map(k => (
                <option key={k.id} value={k.id}>{kundenName(k)}</option>
              ))}
            </select>
          </Field>

          <Field>
            <Label htmlFor="ansprechpartner">Ansprechpartner</Label>
            <input id="ansprechpartner" type="text" value={form.ansprechpartner}
              onChange={e => set('ansprechpartner', e.target.value)}
              placeholder="Name des Ansprechpartners"
              className={inp('border-gray-200')} />
          </Field>

          <Field>
            <Label htmlFor="telefon">Telefon</Label>
            <input id="telefon" type="tel" value={form.telefon}
              onChange={e => set('telefon', e.target.value)}
              placeholder="+49 30 1234567"
              className={inp('border-gray-200')} />
          </Field>

          <Field>
            <Label htmlFor="email">E-Mail</Label>
            <input id="email" type="email" value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="kontakt@kunde.de"
              className={inp('border-gray-200')} />
          </Field>

        </div>
      </SectionCard>

      {/* ── 3. Einsatzort ── */}
      <SectionCard
        iconD="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
        title="Einsatzort"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="sm:col-span-2">
            <Field>
              <Label htmlFor="strasse">Straße & Hausnummer</Label>
              <input id="strasse" type="text" value={form.strasse}
                onChange={e => set('strasse', e.target.value)}
                placeholder="Musterstraße 12"
                className={inp('border-gray-200')} />
            </Field>
          </div>

          <Field>
            <Label htmlFor="plz">PLZ</Label>
            <input id="plz" type="text" value={form.plz}
              onChange={e => set('plz', e.target.value)}
              placeholder="12345"
              maxLength={5}
              className={inp('border-gray-200')} />
          </Field>

          <Field>
            <Label htmlFor="ort">Ort</Label>
            <input id="ort" type="text" value={form.ort}
              onChange={e => set('ort', e.target.value)}
              placeholder="Berlin"
              className={inp('border-gray-200')} />
          </Field>

          <Field>
            <Label htmlFor="zusatz">Einheit / Stockwerk</Label>
            <input id="zusatz" type="text" value={form.zusatz}
              onChange={e => set('zusatz', e.target.value)}
              placeholder="z. B. EG links, Keller"
              className={inp('border-gray-200')} />
          </Field>

          <Field>
            <Label htmlFor="zugang">Zugangsinformationen</Label>
            <input id="zugang" type="text" value={form.zugang}
              onChange={e => set('zugang', e.target.value)}
              placeholder="z. B. Schlüssel in Büro"
              className={inp('border-gray-200')} />
          </Field>

        </div>
      </SectionCard>

      {/* ── 4. Einsatztermin ── */}
      <SectionCard
        iconD="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        title="Einsatztermin"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <Field error={fehler.einsatzdatum}>
            <Label htmlFor="einsatzdatum" required>Einsatzdatum</Label>
            <input id="einsatzdatum" type="date" value={form.einsatzdatum}
              onChange={e => set('einsatzdatum', e.target.value)}
              className={inp(fehler.einsatzdatum ? 'border-red-300' : 'border-gray-200')} />
          </Field>

          <Field>
            <Label htmlFor="startzeit">Startzeit</Label>
            <input id="startzeit" type="time" value={form.startzeit}
              onChange={e => set('startzeit', e.target.value)}
              className={inp('border-gray-200')} />
          </Field>

          <Field>
            <Label htmlFor="dauer">Geschätzte Dauer (Std.)</Label>
            <input id="dauer" type="number" min="0.5" max="24" step="0.5" value={form.dauer}
              onChange={e => set('dauer', e.target.value)}
              placeholder="z. B. 2"
              className={inp('border-gray-200')} />
          </Field>

        </div>
      </SectionCard>

      {/* ── 5. Ressourcen ── */}
      <SectionCard
        iconD="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6"
        title="Ressourcen"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <Field>
            <Label htmlFor="mitarbeiter_id">Mitarbeiter</Label>
            <select id="mitarbeiter_id" value={form.mitarbeiter_id}
              onChange={e => set('mitarbeiter_id', e.target.value)}
              className={inp('border-gray-200')}>
              <option value="">— Noch nicht zugewiesen —</option>
              {mitarbeiter.map(m => (
                <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>
              ))}
            </select>
          </Field>

          <Field>
            <Label htmlFor="fahrzeug_id">Fahrzeug</Label>
            <select id="fahrzeug_id" value={form.fahrzeug_id}
              onChange={e => set('fahrzeug_id', e.target.value)}
              className={inp('border-gray-200')}>
              <option value="">— Noch nicht zugewiesen —</option>
              {fahrzeuge.map(f => (
                <option key={f.id} value={f.id}>
                  {f.kennzeichen}{f.marke ? ` · ${f.marke}` : ''}{f.modell ? ` ${f.modell}` : ''}
                </option>
              ))}
            </select>
          </Field>

        </div>
      </SectionCard>

      {/* ── 6. Beschreibung ── */}
      <SectionCard
        iconD="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        title="Beschreibung"
      >
        <div className="space-y-4">

          <Field error={fehler.beschreibung}>
            <Label htmlFor="beschreibung" required>Problembeschreibung</Label>
            <textarea id="beschreibung" rows={4} value={form.beschreibung}
              onChange={e => set('beschreibung', e.target.value)}
              placeholder="Beschreibe das Problem oder den Auftrag so detailliert wie möglich …"
              className={inp(fehler.beschreibung ? 'border-red-300 resize-none' : 'border-gray-200 resize-none')} />
          </Field>

          <Field>
            <Label htmlFor="notizen">Interne Notizen</Label>
            <textarea id="notizen" rows={3} value={form.notizen}
              onChange={e => set('notizen', e.target.value)}
              placeholder="Nur intern sichtbar – z. B. Besonderheiten, Vorgeschichte …"
              className={inp('border-gray-200 resize-none')} />
          </Field>

        </div>
      </SectionCard>

      {/* ── Aktionsleiste ── */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

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
          onClick={() => speichern('Neu')}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-600 bg-blue-50 rounded-xl text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50 sm:w-auto w-full"
        >
          {saving
            ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
            : <Svg d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          }
          Als Entwurf speichern
        </button>

        <button
          type="button"
          onClick={() => speichern('Geplant')}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-50 sm:w-auto w-full"
        >
          {saving
            ? <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4 animate-spin" />
            : <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          }
          Auftrag erstellen
        </button>

      </div>

    </div>
  );
}
