'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

function getPasswordStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const PW_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];
const PW_LABELS = ['', 'Sehr schwach', 'Schwach', 'Mittel', 'Stark', 'Sehr stark'];
const PW_TEXT   = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600', 'text-emerald-600'];

export default function PasswortZuruecksetzenPage() {
  const router = useRouter();
  const [passwort, setPasswort]   = useState('');
  const [passwort2, setPasswort2] = useState('');
  const [zeigen, setZeigen]       = useState(false);
  const [zeigen2, setZeigen2]     = useState(false);
  const [fehler, setFehler]       = useState('');
  const [laden, setLaden]         = useState(false);
  const [status, setStatus]       = useState('form'); // form | erfolg | kein_zugang
  const [checking, setChecking]   = useState(true);

  // Verify the user has a valid recovery session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setStatus('kein_zugang');
      }
      setChecking(false);
    });
  }, []);

  const strength = getPasswordStrength(passwort);

  async function handleSubmit(e) {
    e.preventDefault();
    setFehler('');

    if (passwort.length < 8) {
      return setFehler('Passwort muss mindestens 8 Zeichen haben.');
    }
    if (!/[A-Z]/.test(passwort)) {
      return setFehler('Passwort muss mindestens einen Großbuchstaben enthalten.');
    }
    if (!/[0-9]/.test(passwort)) {
      return setFehler('Passwort muss mindestens eine Zahl enthalten.');
    }
    if (passwort !== passwort2) {
      return setFehler('Passwörter stimmen nicht überein.');
    }

    setLaden(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwort });
      if (error) throw error;
      setStatus('erfolg');
    } catch (err) {
      setFehler(err.message || 'Fehler beim Zurücksetzen. Bitte erneut versuchen.');
    } finally {
      setLaden(false);
    }
  }

  // Loading
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // No valid session
  if (status === 'kein_zugang') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link abgelaufen</h2>
          <p className="text-gray-500 text-sm mb-6">
            Dieser Reset-Link ist nicht mehr gültig. Bitte fordern Sie einen neuen an.
          </p>
          <Link
            href="/passwort-vergessen"
            className="block w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition text-center"
          >
            Neuen Reset-Link anfordern
          </Link>
        </div>
      </div>
    );
  }

  // Success
  if (status === 'erfolg') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Passwort geändert</h2>
          <p className="text-gray-500 text-sm mb-8">
            Ihr Passwort wurde erfolgreich gesetzt. Sie können sich jetzt anmelden.
          </p>
          <Link
            href="/login"
            className="block w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition text-center shadow-lg shadow-blue-500/20"
          >
            Jetzt anmelden
          </Link>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">KP</span>
          </div>
          <span className="text-white font-bold text-xl">KanalPro</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">

        {/* Icon */}
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Neues Passwort vergeben</h1>
        <p className="text-gray-500 text-sm mb-7">
          Bitte wählen Sie ein sicheres Passwort für Ihr Konto.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Passwort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Neues Passwort
            </label>
            <div className="relative">
              <input
                type={zeigen ? 'text' : 'password'}
                value={passwort}
                onChange={e => setPasswort(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setZeigen(z => !z)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {zeigen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Strength indicator */}
            {passwort && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        i <= strength ? PW_COLORS[strength] : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${PW_TEXT[strength]}`}>
                  {PW_LABELS[strength]}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              Mind. 8 Zeichen, 1 Großbuchstabe, 1 Zahl
            </p>
          </div>

          {/* Passwort 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Passwort bestätigen
            </label>
            <div className="relative">
              <input
                type={zeigen2 ? 'text' : 'password'}
                value={passwort2}
                onChange={e => setPasswort2(e.target.value)}
                placeholder="Passwort wiederholen"
                className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 transition ${
                  passwort2 && passwort !== passwort2
                    ? 'border-red-300 focus:ring-red-400'
                    : passwort2 && passwort === passwort2
                    ? 'border-green-300 focus:ring-green-400'
                    : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setZeigen2(z => !z)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {zeigen2 ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              {/* Match indicator */}
              {passwort2 && passwort === passwort2 && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            {passwort2 && passwort !== passwort2 && (
              <p className="text-red-500 text-xs mt-1">Passwörter stimmen nicht überein</p>
            )}
          </div>

          {fehler && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              {fehler}
            </div>
          )}

          <button
            type="submit"
            disabled={laden || !passwort || !passwort2}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/20"
          >
            {laden ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Wird gespeichert…
              </span>
            ) : (
              'Passwort speichern'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
