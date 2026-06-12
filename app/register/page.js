'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const UNTERNEHMENSARTEN = [
  'Rohrreinigung',
  'Rohr- und Kanalservice',
  'Kanalservice',
  'Kanalinspektion',
  'Kanalsanierung',
  'Kommunaler Entwässerungsbetrieb',
  'Zweckverband',
  'Ingenieurbüro',
  'Sonstiges',
];

const UNTERNEHMENSGROESSEN = [
  { value: '1',     label: '1 Mitarbeiter' },
  { value: '2-5',   label: '2–5 Mitarbeiter' },
  { value: '6-10',  label: '6–10 Mitarbeiter' },
  { value: '11-25', label: '11–25 Mitarbeiter' },
  { value: '26-50', label: '26–50 Mitarbeiter' },
  { value: '51-100',label: '51–100 Mitarbeiter' },
  { value: '100+',  label: 'Über 100 Mitarbeiter' },
];

const TAETIGKEITSBEREICHE = [
  'Privatkunden',
  'Gewerbekunden',
  'Hausverwaltungen',
  'Kommunen',
  'Industrie',
];

const LEISTUNGEN = [
  { id: 'rohrreinigung',    label: 'Rohrreinigung',          icon: '🔧' },
  { id: 'kanalreinigung',   label: 'Kanalreinigung',         icon: '🏗' },
  { id: 'tv_inspektion',    label: 'TV-Inspektion',          icon: '📷' },
  { id: 'dichtheitspruefung', label: 'Dichtheitsprüfung',    icon: '🔍' },
  { id: 'kanalortung',      label: 'Kanalortung',            icon: '📡' },
  { id: 'kanalsanierung',   label: 'Kanalsanierung',         icon: '🏚' },
  { id: 'hebeanlagen',      label: 'Hebeanlagen',            icon: '⬆' },
  { id: 'pumpentechnik',    label: 'Pumpentechnik',          icon: '💧' },
  { id: 'fettabscheider',   label: 'Fettabscheider',         icon: '🧴' },
  { id: 'oelabscheider',    label: 'Ölabscheider',           icon: '🛢' },
  { id: 'notdienst',        label: 'Notdienst',              icon: '🚨' },
  { id: 'kommunal',         label: 'Kommunale Unterhaltung', icon: '🏛' },
];

const FEATURES = [
  'Kundenverwaltung & Auftragsmanagement',
  'Mitarbeiterplanung & Disposition',
  'Fahrzeug- & Maschinenverwaltung',
  'Einsatzplanung & Navigation',
  'Digitale Dokumentation & Berichte',
];

const BADGES = [
  { icon: '💳', text: 'Keine Kreditkarte' },
  { icon: '⚡', text: 'Sofort einsatzbereit' },
  { icon: '🔒', text: 'DSGVO-konform' },
  { icon: '🛡', text: 'Server in Deutschland' },
];

function getPasswordStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)               s++;
  if (pw.length >= 12)              s++;
  if (/[A-Z]/.test(pw))            s++;
  if (/[0-9]/.test(pw))            s++;
  if (/[^A-Za-z0-9]/.test(pw))    s++;
  return s;
}

function EyeIcon({ open }) {
  if (open) return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SpinIcon() {
  return (
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

function Label({ htmlFor, children, optional }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {optional && <span className="ml-1 text-gray-400 font-normal text-xs">(optional)</span>}
    </label>
  );
}

function SectionHeading({ children }) {
  return (
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
      <span className="flex-1 h-px bg-gray-100" />
      {children}
      <span className="flex-1 h-px bg-gray-100" />
    </h3>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [schritt, setSchritt]   = useState(1);
  const [laden, setLaden]       = useState(false);
  const [fehler, setFehler]     = useState('');
  const [leistungen, setLeistungen] = useState([]);
  const [zeigen, setZeigen]     = useState(false);
  const [zeigen2, setZeigen2]   = useState(false);

  const [form, setForm] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    firmenname: '',
    unternehmensart: '',
    unternehmensgroesse: '',
    taetigkeitsbereiche: [],
    passwort: '',
    passwort2: '',
    agb: false,
    datenschutz: false,
    newsletter: false,
  });
  const [errors, setErrors] = useState({});

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  }

  function toggleTaetigkeit(t) {
    setForm(f => ({
      ...f,
      taetigkeitsbereiche: f.taetigkeitsbereiche.includes(t)
        ? f.taetigkeitsbereiche.filter(x => x !== t)
        : [...f.taetigkeitsbereiche, t],
    }));
  }

  function toggleLeistung(id) {
    setLeistungen(l =>
      l.includes(id) ? l.filter(x => x !== id) : [...l, id]
    );
  }

  function validate() {
    const e = {};
    if (!form.vorname.trim())  e.vorname  = 'Pflichtfeld';
    if (!form.nachname.trim()) e.nachname = 'Pflichtfeld';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Gültige E-Mail erforderlich';
    if (!form.telefon.trim())  e.telefon  = 'Pflichtfeld';
    if (!form.firmenname.trim()) e.firmenname = 'Pflichtfeld';
    if (form.passwort.length < 8)
      e.passwort = 'Mindestens 8 Zeichen erforderlich';
    else if (!/[A-Z]/.test(form.passwort))
      e.passwort = 'Mindestens 1 Großbuchstabe erforderlich';
    else if (!/[0-9]/.test(form.passwort))
      e.passwort = 'Mindestens 1 Zahl erforderlich';
    if (form.passwort !== form.passwort2)
      e.passwort2 = 'Passwörter stimmen nicht überein';
    if (!form.agb)        e.agb        = true;
    if (!form.datenschutz) e.datenschutz = true;
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLaden(true);
    setFehler('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.passwort,
        options: {
          data: {
            vorname:             form.vorname,
            nachname:            form.nachname,
            firmenname:          form.firmenname,
            telefon:             form.telefon,
            unternehmensart:     form.unternehmensart,
            unternehmensgroesse: form.unternehmensgroesse,
            taetigkeitsbereiche: form.taetigkeitsbereiche,
            newsletter:          form.newsletter,
          },
        },
      });
      if (error) throw error;

      if (data.user) {
        const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();

        // Welcome-E-Mail senden (fire & forget)
        fetch('/api/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:       form.email,
            vorname:     form.vorname,
            firmenname:  form.firmenname,
            typ:         'trial',
            trialEnd,
          }),
        }).catch(() => {});

        // Keine Session → E-Mail-Bestätigung erforderlich
        if (!data.session) {
          router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
          return;
        }

        // Session vorhanden → Company-ID holen und Trial anlegen
        const { data: memberData } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', data.user.id)
          .single();

        await supabase.from('abonnements').upsert({
          user_id:     data.user.id,
          company_id:  memberData?.company_id,
          status:      'trial',
          plan:        'enterprise',
          trial_start: new Date().toISOString(),
          trial_end:   trialEnd,
        });
      }
      setSchritt(2);
    } catch (err) {
      setFehler(err.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setLaden(false);
    }
  }

  async function handleOnboarding() {
    if (leistungen.length === 0) return;
    setLaden(true);
    try {
      await supabase.auth.updateUser({ data: { leistungen } });
    } catch (_) {}
    setLaden(false);
    router.push('/onboarding');
  }

  const pwStrength    = getPasswordStrength(form.passwort);
  const pwColors      = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];
  const pwLabels      = ['', 'Sehr schwach', 'Schwach', 'Mittel', 'Stark', 'Sehr stark'];
  const pwTextColors  = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600', 'text-emerald-600'];

  // ─── SCHRITT 2: LEISTUNGEN-ONBOARDING ───────────────────────────
  if (schritt === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8">

          {/* Success header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Willkommen bei KanalPro!</h2>
            <p className="text-gray-500 text-sm mb-1">
              Ihr Konto wurde erfolgreich erstellt. Ein letzter Schritt:
            </p>
            <p className="text-gray-700 font-medium">
              Welche Leistungen bietet Ihr Unternehmen an?
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Diese Auswahl bestimmt, welche Module in Ihrer Software aktiviert werden.
            </p>
          </div>

          {/* Leistungen grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {LEISTUNGEN.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => toggleLeistung(l.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  leistungen.includes(l.id)
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="text-2xl">{l.icon}</span>
                <span className="text-center text-xs leading-tight">{l.label}</span>
              </button>
            ))}
          </div>

          {leistungen.length === 0 && (
            <p className="text-center text-xs text-amber-600 mb-4">
              Bitte wählen Sie mindestens eine Leistung aus.
            </p>
          )}

          <button
            type="button"
            onClick={handleOnboarding}
            disabled={laden || leistungen.length === 0}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
          >
            {laden ? (
              <span className="flex items-center justify-center gap-2">
                <SpinIcon /> Wird gespeichert...
              </span>
            ) : (
              'Weiter zur Einrichtung →'
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            Diese Einstellung kann jederzeit in den Einstellungen geändert werden.
          </p>
        </div>
      </div>
    );
  }

  // ─── SCHRITT 1: REGISTRIERUNGSFORMULAR ──────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">

      {/* Navbar */}
      <header className="px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">KP</span>
            </div>
            <span className="text-white font-bold text-xl">KanalPro</span>
          </Link>
          <Link href="/login" className="text-blue-300 hover:text-white text-sm transition">
            Bereits registriert?{' '}
            <span className="underline font-medium">Anmelden</span>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* ── LEFT: Hero ──────────────────────────────────────── */}
          <div className="lg:sticky lg:top-12">

            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-blue-200 text-sm font-medium">
                14 Tage kostenlos testen
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
              Die Betriebssoftware für{' '}
              <span className="text-blue-400">Rohr- und Kanalservice</span>
            </h1>

            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Kunden, Mitarbeiter, Fahrzeuge und Maschinen –
              alles zentral verwaltet. Entwickelt für den Kanal- und Rohrleitungsbetrieb.
            </p>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3 mb-10">
              {BADGES.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <span className="text-xl">{b.icon}</span>
                  <span className="text-gray-200 text-sm font-medium">{b.text}</span>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-300">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon />
                  </div>
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Formular ─────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 lg:p-8">

            <h2 className="text-2xl font-bold text-gray-900 mb-1">Konto erstellen</h2>
            <p className="text-gray-500 text-sm mb-7">
              Nur für Unternehmen — kein Zugang für Endkunden.
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">

              {/* ── Ansprechpartner ─────────────────────────── */}
              <div>
                <SectionHeading>Ansprechpartner</SectionHeading>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="vorname">Vorname</Label>
                    <input
                      id="vorname"
                      type="text"
                      placeholder="Max"
                      value={form.vorname}
                      onChange={e => setField('vorname', e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        errors.vorname ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    <FieldError msg={errors.vorname} />
                  </div>
                  <div>
                    <Label htmlFor="nachname">Nachname</Label>
                    <input
                      id="nachname"
                      type="text"
     0                placeholder="Mustermann"
                      value={form.nachname}
                      onChange={e => setField('nachname', e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        errors.nachname ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    <FieldError msg={errors.nachname} />
                  </div>
                </div>

                <div className="mt-3">
             0    <Label htmlFor="email">Geschäftliche E-Mail</Label>
                  <input
                    id="email"
                    type="email"
   0                placeholder="max@musterfirma.de"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    autoComplete="email"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`}
 0                />
                  <FieldError msg={errors.email} />
                </div>

                <div className="mt-3">
               0  <Label htmlFor="telefon">Telefon</Label>
                  <input
                    id="telefon"
                    type="tel"
                 0  placeholder="+49 123 456789"
                    value={form.telefon}
                    onChange={e => setField('telefon', e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      errors.telefon ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  <FieldError msg={errors.telefon} />
                </div>
              </div>

              {/* ── Unternehmen ─────────────────────────────── */}
              <div>
                <SectionHeading>Unternehmen</SectionHeading>

                <div>
                  <Label htmlFor="firmenname">Firmenname</Label>
                  <input
                    id="firmenname"
                    type="text"
                    placeholder="Muster GmbH"
                    value={form.firmenname}
                    onChange={e => setField('firmenname', e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      errors.firmenname ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  <FieldError msg={errors.firmenname} />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label htmlFor="unternehmensart" optional>Unternehmensart</Label>
                    <select
                      id="unternehmensart"
                      value={form.unternehmensart}
                      onChange={e => setField('unternehmensart', e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition border-gray-200 ${
                        !form.unternehmensart ? 'text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      <option value="">Bitte wählen</option>
                      {UNTERNEHMENSARTEN.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="unternehmensgroesse" optional>Unternehmensgröße</Label>
                    <select
                      id="unternehmensgroesse"
                      value={form.unternehmensgroesse}
                      onChange={e => setField('unternehmensgroesse', e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition border-gray-200 ${
                        !form.unternehmensgroesse ? 'text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      <option value="">Mitarbeiteranzahl</option>
                      {UNTERNEHMENSGROESSEN.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tätigkeitsbereiche */}
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1.5">
                    Tätigkeitsbereiche{' '}
                    <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TAETIGKEITSBEREICHE.map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => toggleTaetigkeit(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          form.taetigkeitsbereiche.includes(t)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Passwort ─────────────────────────────────── */}
              <div>
                <SectionHeading>Passwort</SectionHeading>

                <div>
                  <Label htmlFor="passwort">Passwort</Label>
                  <div className="relative">
                    <input
                      id="passwort"
                      type={zeigen ? 'text' : 'password'}
                      placeholder="Mindestens 8 Zeichen"
                      value={form.passwort}
                      onChange={e => setField('passwort', e.target.value)}
                      autoComplete="new-password"
                      className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        errors.passwort ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setZeigen(z => !z)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                      aria-label={zeigen ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    >
                      <EyeIcon open={zeigen} />
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {form.passwort && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              i <= pwStrength ? pwColors[pwStrength] : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${pwTextColors[pwStrength]}`}>
                        {pwLabels[pwStrength]}
                      </p>
                    </div>
                  )}
                  <FieldError msg={errors.passwort} />
                  <p className="text-xs text-gray-400 mt-1">
                    Mind. 8 Zeichen, 1 Großbuchstabe, 1 Zahl
                  </p>
                </div>

                <div className="mt-3">
                  <Label htmlFor="passwort2">Passwort bestätigen</Label>
                  <div className="relative">
                    <input
                      id="passwort2"
                      type={zeigen2 ? 'text' : 'password'}
                      placeholder="Passwort wiederholen"
                      value={form.passwort2}
                      onChange={e => setField('passwort2', e.target.value)}
                      autoComplete="new-password"
                      className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 transition ${
                        form.passwort2 && form.passwort !== form.passwort2
                          ? 'border-red-300 focus:ring-red-400'
                          : form.passwort2 && form.passwort === form.passwort2
                          ? 'border-green-300 focus:ring-green-400'
                          : errors.passwort2
                          ? 'border-red-400 bg-red-50 focus:ring-red-400'
                          : 'border-gray-200 focus:ring-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setZeigen2(z => !z)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                      aria-label={zeigen2 ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    >
                      <EyeIcon open={zeigen2} />
                    </button>
                    {form.passwort2 && form.passwort === form.passwort2 && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <FieldError msg={errors.passwort2} />
                </div>
              </div>

              {/* ── Rechtliches ──────────────────────────────── */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.agb}
                      onChange={e => setField('agb', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    />
                    <span className={`text-xs ${errors.agb ? 'text-red-600' : 'text-gray-600'}`}>
                      Ich akzeptiere die{' '}
                      <a href="/agb" target="_blank" className="text-blue-600 hover:underline">
                        Allgemeinen Geschäftsbedingungen
                      </a>{' '}
                      *
                    </span>
                  </label>
                  {errors.agb && (
                    <p className="text-red-500 text-xs mt-0.5 ml-7">Pflichtfeld</p>
                  )}
                </div>

                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.datenschutz}
                      onChange={e => setField('datenschutz', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    />
                    <span className={`text-xs ${errors.datenschutz ? 'text-red-600' : 'text-gray-600'}`}>
                      Ich habe die{' '}
                      <a href="/datenschutz" target="_blank" className="text-blue-600 hover:underline">
                        Datenschutzerklärung
                      </a>{' '}
                      gelesen und akzeptiert *
                    </span>
                  </label>
                  {errors.datenschutz && (
                    <p className="text-red-500 text-xs mt-0.5 ml-7">Pflichtfeld</p>
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
           �     <input
                    type="checkbox"
                    checked={form.newsletter}
                    onChange={e => setField('newsletter', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span className="text-xs text-gray-600">
                    Produktupdates und Neuigkeiten per E-Mail erhalten{' '}
                    <span className="text-gray-400">(optional)</span>
                  </span>
                </label>
              </div>

              {/* Globale Fehlermeldung */}
              {fehler && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                  {fehler}
                </div>
              )}

              {/* Submit */}
              <button
           �   type="submit"
                disabled={laden}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
              >
                {laden ? (
                  <span className="flex items-center justify-center gap-2">
                    <SpinIcon /> Registrierung läuft...
                  </span>
                ) : (
                  'Kostenlos 14 Tage testen →'
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Keine Kreditkarte erforderlich. Kein Risiko.
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
