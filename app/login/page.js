'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]                     = useState('');
  const [passwort, setPasswort]               = useState('');
  const [zeigen, setZeigen]                   = useState(false);
  const [angemeldetBleiben, setAngemeldetBleiben] = useState(true);
  const [fehler, setFehler]                   = useState('');
  const [laden, setLaden]                     = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard-v2');
    });
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setFehler('');
    setLaden(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: passwort,
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setFehler('Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.');
      } else {
        setFehler('E-Mail oder Passwort falsch. Bitte erneut versuchen.');
      }
    } else {
      if (!angemeldetBleiben) {
        localStorage.removeItem('sb-ighqrqzespmvafkkqxeu-auth-token');
      }
      router.push('/dashboard-v2');
    }
    setLaden(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">

      {/* Logo top-left */}
      <div className="absolute top-0 left-0 right-0 px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">KP</span>
          </div>
          <span className="text-white font-bold text-xl">KanalPro</span>
        </Link>
      </div>

      <div className="w-full max-w-sm">

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Willkommen zurück</h1>
          <p className="text-blue-200 text-sm">Melden Sie sich in Ihrem Konto an</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-4" noValidate>

            {fehler && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {fehler}
              </div>
            )}

            {/* E-Mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="max@musterfirma.de"
                autoComplete="email"
              />
            </div>

            {/* Passwort */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Passwort</label>
                <Link
                  href="/passwort-vergessen"
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={zeigen ? 'text' : 'password'}
                  required
                  value={passwort}
                  onChange={e => setPasswort(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setZeigen(z => !z)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  <EyeIcon open={zeigen} />
                </button>
              </div>
            </div>

            {/* Angemeldet bleiben */}
            <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
              <div
                onClick={() => setAngemeldetBleiben(a => !a)}
                className={`w-5 h-5 rounded flex items-center justify-center border-2 transition flex-shrink-0 ${
                  angemeldetBleiben
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {angemeldetBleiben && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-600">Angemeldet bleiben</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={laden}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/20 mt-2"
            >
              {laden ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Wird angemeldet…
                </span>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
