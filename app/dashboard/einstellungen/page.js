'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const APP_VERSION = '1.4.0';
const VERSION_HISTORY = [
  { version: '1.4.0', datum: '06.06.2026', beschreibung: 'Rechnungen-Tabs, Firmendaten in Rechnungen, App-Einstellungen' },
  { version: '1.3.0', datum: '06.06.2026', beschreibung: 'Korrekte Umlaute, Landing Page aktualisiert' },
  { version: '1.2.0', datum: '06.06.2026', beschreibung: 'Einstellungen & Firmendaten für Rechnungs-PDFs' },
  { version: '1.1.0', datum: '06.06.2026', beschreibung: 'E-Rechnungen mit PDF-Export' },
  { version: '1.0.0', datum: '06.06.2026', beschreibung: 'MVP Launch: Kunden, Aufträge, Dashboard' },
];

export default function Einstellungen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [neuesPasswort, setNeuesPasswort] = useState('');
  const [bestaetigung, setBestaetigung] = useState('');
  const [status, setStatus] = useState('');
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);
  const [changelog, setChangelog] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)); }, []);

  async function handlePasswort(e) {
    e.preventDefault(); setFehler(''); setStatus('');
    if (neuesPasswort !== bestaetigung) { setFehler('Passwörter stimmen nicht überein.'); return; }
    if (neuesPasswort.length < 6) { setFehler('Mindestens 6 Zeichen erforderlich.'); return; }
    setLaden(true);
    const { error } = await supabase.auth.updateUser({ password: neuesPasswort });
    if (error) { setFehler('Fehler beim Ändern.'); }
    else { setStatus('Passwort erfolgreich geändert!'); setNeuesPasswort(''); setBestaetigung(''); }
    setLaden(false);
  }

  async function handleAbmelden() { await supabase.auth.signOut(); router.push('/login'); }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-500 mt-1">Konto & App-Einstellungen</p>
      </div>

      <div className="space-y-5">
        {/* Konto */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Konto</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">{user?.email?.[0]?.toUpperCase() ?? '?'}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.email}</p>
              <p className="text-sm text-gray-400">Registriert seit {user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : '–'}</p>
            </div>
          </div>
        </div>

        {/* Passwort */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Passwort ändern</h2>
          <form onSubmit={handlePasswort} className="space-y-3">
            {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
            {status && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">✅ {status}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
              <input type="password" value={neuesPasswort} onChange={e => setNeuesPasswort(e.target.value)} minLength={6} placeholder="Mindestens 6 Zeichen" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
              <input type="password" value={bestaetigung} onChange={e => setBestaetigung(e.target.value)} placeholder="Wiederholen" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={laden || !neuesPasswort} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm">
              {laden ? 'Wird geändert...' : 'Passwort ändern'}
            </button>
          </form>
        </div>

        {/* App-Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-3">App-Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Version</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">v{APP_VERSION}</span>
                <button onClick={() => setChangelog(!changelog)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  {changelog ? 'Ausblenden' : 'Changelog'}
                </button>
              </div>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Datenbank</span><span className="text-green-600 font-medium">● Verbunden</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Region</span><span className="text-gray-700">EU Frankfurt (DSGVO-konform)</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="text-gray-700">kanalpro.de</span></div>
          </div>

          {changelog && (
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
              {VERSION_HISTORY.map(v => (
                <div key={v.version} className="flex gap-3 text-sm">
                  <span className="font-mono text-blue-600 font-medium w-14 shrink-0">v{v.version}</span>
                  <div>
                    <span className="text-gray-400 text-xs">{v.datum} · </span>
                    <span className="text-gray-600">{v.beschreibung}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Abmelden */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-3">Sitzung beenden</h2>
          <button onClick={handleAbmelden} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm">🚪 Abmelden</button>
        </div>
      </div>
    </div>
  );
}