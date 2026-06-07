'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail]             = useState('');
  const [passwort, setPasswort]       = useState('');
  const [angemeldetBleiben, setAngemeldetBleiben] = useState(true);
  const [fehler, setFehler]           = useState('');
  const [laden, setLaden]             = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setFehler('');
    setLaden(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });

    if (error) {
      setFehler('E-Mail oder Passwort falsch. Bitte erneut versuchen.');
    } else {
      // Wenn "Angemeldet bleiben" nicht aktiv: Session wird beim Schließen des Browsers gelöscht
      if (!angemeldetBleiben) {
        sessionStorage.setItem('tempLogin', '1');
      } else {
        sessionStorage.removeItem('tempLogin');
      }
      router.push('/dashboard');
    }
    setLaden(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">K</span>
            </div>
            <span className="font-bold text-2xl text-gray-900">KanalPro</span>
          </Link>
          <p className="text-gray-500 mt-2">Willkommen zurück</p>
        </div>

        {/* Formular */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {fehler && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="max@musterfirma.de" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
              <input type="password" required value={passwort} onChange={e => setPasswort(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••" />
            </div>

            {/* Angemeldet bleiben */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setAngemeldetBleiben(!angemeldetBleiben)}
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition ${
                    angemeldetBleiben
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white'
                  }`}>
                  {angemeldetBleiben && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-600">Angemeldet bleiben</span>
              </label>
            </div>

            <button type="submit" disabled={laden}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 mt-2">
              {laden ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Noch kein Konto?{' '}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">
              Kostenlos registrieren
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}