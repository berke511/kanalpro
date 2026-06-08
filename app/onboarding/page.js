'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const SCHRITTE = [
  { id: 1, label: 'Firmendaten', icon: '🏢' },
  { id: 2, label: 'Mitarbeiter', icon: '👷' },
  { id: 3, label: 'Fahrzeug', icon: '🚐' },
  { id: 4, label: 'Kunde', icon: '👥' },
  { id: 5, label: 'Auftrag', icon: '📋' },
];

function SpinIcon() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [schritt, setSchritt] = useState(1);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState('');
  const [user, setUser] = useState(null);
  const [erstellterKundeId, setErstellterKundeId] = useState(null);

  // Firmendaten
  const [firma, setFirma] = useState({
    strasse: '', plz: '', ort: '', telefon: '', website: '',
  });

  // Mitarbeiter
  const [mitarbeiter, setMitarbeiter] = useState({
    vorname: '', nachname: '', rolle: '', telefon: '',
  });

  // Fahrzeug
  const [fahrzeug, setFahrzeug] = useState({
    kennzeichen: '', typ: '', baujahr: '',
  });

  // Kunde
  const [kunde, setKunde] = useState({
    name: '', telefon: '', email: '', adresse: '',
    kundentyp: 'privat', firmenname: '',
  });

  // Auftrag
  const [auftrag, setAuftrag] = useState({
    titel: '', beschreibung: '', datum: '', adresse: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
      // Onboarding bereits abgeschlossen?
      if (u.user_metadata?.onboarding_completed) {
        router.push('/dashboard');
      }
      // Firmendaten aus Registrierung vorausfüllen
      if (u.user_metadata?.firmenname) {
        // Name ist schon bekannt, Adressdaten noch nicht
      }
    });
  }, [router]);

  async function abschliessen() {
    setLaden(true);
    try {
      await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      });
    } catch (_) {}
    setLaden(false);
    router.push('/dashboard');
  }

  // ─── Schritt 1: Firmendaten ───────────────────────────────────────────────
  async function saveFirmendaten(e) {
    e.preventDefault();
    setFehler('');
    if (!firma.ort.trim()) { setFehler('Bitte geben Sie Ihren Ort an.'); return; }
    setLaden(true);
    try {
      await supabase.auth.updateUser({
        data: {
          strasse: firma.strasse,
          plz: firma.plz,
          ort: firma.ort,
          telefon_firma: firma.telefon,
          website: firma.website,
        },
      });
      setSchritt(2);
    } catch (err) {
      setFehler('Fehler beim Speichern. Bitte erneut versuchen.');
    }
    setLaden(false);
  }

  // ─── Schritt 2: Mitarbeiter ───────────────────────────────────────────────
  async function saveMitarbeiter(e) {
    e.preventDefault();
    setFehler('');
    // Schritt überspringen wenn leer
    if (!mitarbeiter.vorname.trim() && !mitarbeiter.nachname.trim()) {
      setSchritt(3);
      return;
    }
    setLaden(true);
    try {
      await supabase.from('mitarbeiter').insert({
        user_id: user.id,
        vorname: mitarbeiter.vorname || null,
        nachname: mitarbeiter.nachname || null,
        rolle: mitarbeiter.rolle || null,
        telefon: mitarbeiter.telefon || null,
      });
    } catch (_) {
      // Tabelle existiert möglicherweise noch nicht – trotzdem weiter
    }
    setLaden(false);
    setSchritt(3);
  }

  // ─── Schritt 3: Fahrzeug ─────────────────────────────────────────────────
  async function saveFahrzeug(e) {
    e.preventDefault();
    setFehler('');
    if (!fahrzeug.kennzeichen.trim()) {
      setSchritt(4);
      return;
    }
    setLaden(true);
    try {
      await supabase.from('fahrzeuge').insert({
        user_id: user.id,
        kennzeichen: fahrzeug.kennzeichen || null,
        typ: fahrzeug.typ || null,
        baujahr: fahrzeug.baujahr ? parseInt(fahrzeug.baujahr) : null,
      });
    } catch (_) {
      // Tabelle existiert möglicherweise noch nicht – trotzdem weiter
    }
    setLaden(false);
    setSchritt(4);
  }

  // ─── Schritt 4: Kunde ─────────────────────────────────────────────────────
  async function saveKunde(e) {
    e.preventDefault();
    setFehler('');
    if (!kunde.name.trim()) {
      setSchritt(5);
      return;
    }
    setLaden(true);
    try {
      const { data, error } = await supabase.from('kunden').insert({
        user_id: user.id,
        name: kunde.name,
        telefon: kunde.telefon || null,
        email: kunde.email || null,
        adresse: kunde.adresse || null,
        kundentyp: kunde.kundentyp,
        firmenname: kunde.kundentyp === 'firma' ? (kunde.firmenname || null) : null,
        rechnungsadresse_abweichend: false,
        ist_vertragskunde: false,
        ist_wartungskunde: false,
      }).select().single();
      if (!error && data) {
        setErstellterKundeId(data.id);
      }
    } catch (_) {}
    setLaden(false);
    setSchritt(5);
  }

  // ─── Schritt 5: Auftrag ───────────────────────────────────────────────────
  async function saveAuftrag(e) {
    e.preventDefault();
    setFehler('');
    if (!auftrag.titel.trim()) {
      await abschliessen();
      return;
    }
    setLaden(true);
    try {
      await supabase.from('auftraege').insert({
        user_id: user.id,
        titel: auftrag.titel,
        beschreibung: auftrag.beschreibung || null,
        adresse: auftrag.adresse || null,
        datum: auftrag.datum || null,
        status: 'offen',
        kunde_id: erstellterKundeId || null,
      });
    } catch (_) {}
    setLaden(false);
    await abschliessen();
  }

  const fortschritt = ((schritt - 1) / (SCHRITTE.length - 1)) * 100;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">KP</span>
            </div>
            <span className="text-white font-bold text-xl">KanalPro</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Willkommen! 🎉</h1>
          <p className="text-blue-200 text-sm">Richten Sie Ihr Konto in wenigen Minuten ein.</p>
        </div>

        {/* Fortschrittsbalken */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            {SCHRITTE.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  schritt > s.id
                    ? 'bg-green-500 text-white'
                    : schritt === s.id
                    ? 'bg-blue-500 text-white ring-4 ring-blue-500/30'
                    : 'bg-white/10 text-white/40'
                }`}>
                  {schritt > s.id ? '✓' : s.id}
                </div>
                {i < SCHRITTE.length - 1 && (
                  <div className={`h-0.5 w-12 sm:w-16 mx-1 transition-all ${
                    schritt > s.id + 1 ? 'bg-green-500' : schritt > s.id ? 'bg-blue-500' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="text-blue-200 text-xs">
              {SCHRITTE[schritt - 1].icon} Schritt {schritt} von {SCHRITTE.length}: {SCHRITTE[schritt - 1].label}
            </span>
          </div>
        </div>

        {/* Karten */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">

          {fehler && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
              {fehler}
            </div>
          )}

          {/* ── Schritt 1: Firmendaten ── */}
          {schritt === 1 && (
            <form onSubmit={saveFirmendaten} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">🏢 Firmendaten vervollständigen</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Diese Daten erscheinen auf Ihren Rechnungen.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Straße & Hausnummer</label>
                <input type="text" value={firma.strasse} onChange={e => setFirma(f => ({ ...f, strasse: e.target.value }))}
                  placeholder="Hauptstraße 42"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                  <input type="text" value={firma.plz} onChange={e => setFirma(f => ({ ...f, plz: e.target.value }))}
                    placeholder="40000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
                  <input type="text" value={firma.ort} onChange={e => setFirma(f => ({ ...f, ort: e.target.value }))}
                    placeholder="Düsseldorf" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon (geschäftlich)</label>
                <input type="tel" value={firma.telefon} onChange={e => setFirma(f => ({ ...f, telefon: e.target.value }))}
                  placeholder="+49 211 123456"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="url" value={firma.website} onChange={e => setFirma(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://www.meinbetrieb.de"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <Buttons laden={laden} onSkip={() => setSchritt(2)} />
            </form>
          )}

          {/* ── Schritt 2: Mitarbeiter ── */}
          {schritt === 2 && (
            <form onSubmit={saveMitarbeiter} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">👷 Ersten Mitarbeiter anlegen</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Tragen Sie Ihren ersten Mitarbeiter ein – oder überspringen Sie diesen Schritt.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <input type="text" value={mitarbeiter.vorname} onChange={e => setMitarbeiter(m => ({ ...m, vorname: e.target.value }))}
                    placeholder="Max"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <input type="text" value={mitarbeiter.nachname} onChange={e => setMitarbeiter(m => ({ ...m, nachname: e.target.value }))}
                    placeholder="Mustermann"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position / Rolle</label>
                <input type="text" value={mitarbeiter.rolle} onChange={e => setMitarbeiter(m => ({ ...m, rolle: e.target.value }))}
                  placeholder="z. B. Kanalreiniger, Fahrer, Disponent"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" value={mitarbeiter.telefon} onChange={e => setMitarbeiter(m => ({ ...m, telefon: e.target.value }))}
                  placeholder="+49 173 1234567"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <Buttons laden={laden} onSkip={() => setSchritt(3)} />
            </form>
          )}

          {/* ── Schritt 3: Fahrzeug ── */}
          {schritt === 3 && (
            <form onSubmit={saveFahrzeug} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">🚐 Erstes Fahrzeug anlegen</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Tragen Sie Ihr erstes Fahrzeug ein – oder überspringen Sie diesen Schritt.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kennzeichen</label>
                <input type="text" value={fahrzeug.kennzeichen} onChange={e => setFahrzeug(f => ({ ...f, kennzeichen: e.target.value }))}
                  placeholder="DU-KP 1234"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fahrzeugtyp</label>
                <select value={fahrzeug.typ} onChange={e => setFahrzeug(f => ({ ...f, typ: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Bitte wählen —</option>
                  <option value="Kanalreinigungsfahrzeug">Kanalreinigungsfahrzeug</option>
                  <option value="Saugspülfahrzeug">Saugspülfahrzeug</option>
                  <option value="TV-Inspektionsfahrzeug">TV-Inspektionsfahrzeug</option>
                  <option value="Kastenwagen">Kastenwagen</option>
                  <option value="Transporter">Transporter</option>
                  <option value="LKW">LKW</option>
                  <option value="PKW">PKW</option>
                  <option value="Sonstiges">Sonstiges</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baujahr <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="number" value={fahrzeug.baujahr} onChange={e => setFahrzeug(f => ({ ...f, baujahr: e.target.value }))}
                  placeholder="2022" min="1980" max={new Date().getFullYear()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <Buttons laden={laden} onSkip={() => setSchritt(4)} />
            </form>
          )}

          {/* ── Schritt 4: Kunde ── */}
          {schritt === 4 && (
            <form onSubmit={saveKunde} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">👥 Ersten Kunden anlegen</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Legen Sie Ihren ersten Kunden an – oder überspringen Sie diesen Schritt.
                </p>
              </div>
              <div className="flex gap-3">
                {[
                  { value: 'privat', label: '👤 Privat' },
                  { value: 'firma', label: '🏢 Firma' },
                ].map(opt => (
                  <label key={opt.value} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition ${
                    kunde.kundentyp === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                    <input type="radio" value={opt.value} checked={kunde.kundentyp === opt.value}
                      onChange={() => setKunde(k => ({ ...k, kundentyp: opt.value }))} className="hidden" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
              {kunde.kundentyp === 'firma' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname</label>
                  <input type="text" value={kunde.firmenname} onChange={e => setKunde(k => ({ ...k, firmenname: e.target.value }))}
                    placeholder="Muster GmbH"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {kunde.kundentyp === 'firma' ? 'Ansprechpartner' : 'Name'}
                </label>
                <input type="text" value={kunde.name} onChange={e => setKunde(k => ({ ...k, name: e.target.value }))}
                  placeholder="Max Mustermann"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="tel" value={kunde.telefon} onChange={e => setKunde(k => ({ ...k, telefon: e.target.value }))}
                    placeholder="+49 211 123456"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                  <input type="email" value={kunde.email} onChange={e => setKunde(k => ({ ...k, email: e.target.value }))}
                    placeholder="max@beispiel.de"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={kunde.adresse} onChange={e => setKunde(k => ({ ...k, adresse: e.target.value }))}
                  placeholder="Musterstraße 1, 40000 Düsseldorf"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <Buttons laden={laden} onSkip={() => setSchritt(5)} />
            </form>
          )}

          {/* ── Schritt 5: Auftrag ── */}
          {schritt === 5 && (
            <form onSubmit={saveAuftrag} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">📋 Ersten Auftrag anlegen</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Legen Sie Ihren ersten Auftrag an – oder überspringen Sie diesen Schritt.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auftragstitel</label>
                <input type="text" value={auftrag.titel} onChange={e => setAuftrag(a => ({ ...a, titel: e.target.value }))}
                  placeholder="z. B. Rohrverstopfung Keller"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input type="date" value={auftrag.datum} onChange={e => setAuftrag(a => ({ ...a, datum: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einsatzort</label>
                  <input type="text" value={auftrag.adresse} onChange={e => setAuftrag(a => ({ ...a, adresse: e.target.value }))}
                    placeholder="Düsseldorf"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={auftrag.beschreibung} onChange={e => setAuftrag(a => ({ ...a, beschreibung: e.target.value }))}
                  rows={3} placeholder="Was muss gemacht werden?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              {erstellterKundeId && (
                <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  ✓ Auftrag wird dem zuvor angelegten Kunden zugewiesen.
                </p>
              )}
              {/* Letzter Schritt – Button-Text anpassen */}
              <div className="flex flex-col gap-2 pt-2">
                <button type="submit" disabled={laden}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                  {laden ? <><SpinIcon /> Wird gespeichert...</> : 'Fertig — Dashboard öffnen 🚀'}
                </button>
                <button type="button" onClick={abschliessen} disabled={laden}
                  className="text-gray-400 hover:text-gray-600 text-sm py-2 transition">
                  Überspringen
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-blue-300/60 text-xs mt-6">
          Sie können alle Daten später in den Einstellungen ändern.
        </p>
      </div>
    </div>
  );
}

// ─── Wiederverwendbare Button-Gruppe ─────────────────────────────────────────
function Buttons({ laden, onSkip }) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <button type="submit" disabled={laden}
        className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
        {laden ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Wird gespeichert...
          </>
        ) : 'Speichern & Weiter →'}
      </button>
      <button type="button" onClick={onSkip} disabled={laden}
        className="text-gray-400 hover:text-gray-600 text-sm py-2 transition">
        Diesen Schritt überspringen
      </button>
    </div>
  );
}
