'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function RegistrierenPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [firmenname, setFirmenname] = useState('');
  const [fehler, setFehler] = useState('');
  const [erfolg, setErfolg] = useState(false);
  const [laden, setLaden] = useState(false);

  async function handleRegistrierung(e) {
    e.preventDefault();
    setFehler('');
    setLaden(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: passwort,
      options: { data: { firmenname: firmenname.trim() } },
    });
    if (error) { setFehler(error.message); } else { setErfolg(true); }
    setLaden(false);
  }

  if (erfolg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Bestätigung erforderlich</h2>
            <p className="text-gray-500 text-sm mb-6">Bitte bestätigen Sie Ihre E-Mail-Adresse <strong>{email}</strong>.</p>
            <Link href="/login" className="inline-block w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition text-center">Zum Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="absolute top-0 left-0 right-0 px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">KP</span>
          </div>
          <span className="text-white font-bold text-xl">KanalPro</span>
        </Link>
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Konto erstellen</h1>
          <p className="text-blue-200 text-sm">14 Tage kostenlos testen</p>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleRegistrierung} className="space-y-4" noValidate>
            {fehler && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{fehler}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Firmenname</label>
              <input type="text" required value={firmenname} onChange={e => setFirmenname(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Muster Kanalservice GmbH" autoComplete="organization" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="max@musterfirma.de" autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Passwort</label>
              <input type="password" required minLength={8} value={passwort} onChange={e => setPasswort(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Mindestens 8 Zeichen" autoComplete="new-password" />
            </div>
            <button type="submit" disabled={laden} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/20 mt-2">
              {laden ? 'Wird registriert…' : 'Kostenlos registrieren'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">Bereits registriert? <Link href="/login" className="text-blue-600 font-medium hover:underline">Anmelden</Link></p>
        </div>
      </div>
    </div>
  );
      }
