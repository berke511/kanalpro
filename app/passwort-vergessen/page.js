'use client';
import { useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('form'); // form | gesendet | fehler
  const [laden, setLaden] = useState(false);
  const [fehlerMsg, setFehlerMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLaden(true);
    setFehlerMsg('');
    try {
      const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;
      setStatus('gesendet');
    } catch (err) {
      setFehlerMsg(err.message || 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.');
      setStatus('fehler');
    } finally {
      setLaden(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-x�h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">KP</span>
          </div>
          <span className="text-white font-bold text-xl">KanalPro</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">

        {status === 'gesendet' ? (
          /* ─── SUCCESS STATE ─────────────────────── */
          <div className="text-center">
            <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">E-Mail gesendet</h2>
            <p className="text-gray-500 text-sm mb-1">
              Wir haben einen Reset-Link gesendet an:
            </p>
            <p className="font-semibold text-gray-800 text-sm bg-gray-50 rounded-xl px-4 py-2 inline-block mb-6">
              {email}
            </p>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Klicken Sie auf den Link in der E-Mail, um ein neues Passwort zu vergeben.
              Der Link ist 60 Minuten gültig.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-xs text-left mb-6">
              <strong>Kein Link erhalten?</strong> Bitte prüfen Sie auch Ihren Spam-Ordner.
            </div>
            <Link
              href="/login"
              className="block w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition text-center"
            >
              Zurück zur Anmeldung
            </Link>
          </div>
        ) : (
          /* ─── FORM STATE ────────────────────────── */
          <>
            {/* Back link */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-gray-500 text-sm hover:text-gray-700 transition mb-6"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Zurück zur Anmeldung
            </Link>

            {/* Icon */}
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Passwort vergessen?</h1>
            <p className="text-gray-500 text-sm mb-8">
              Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link,
              um Ihr Passwort zurückzusetzen.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {status === 'fehler' && fehlerMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                  {fehlerMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={laden || !email.trim()}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/20"
              >
                {laden ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Wird gesendet…
                  </span>
                ) : (
                  'Reset-Link senden'
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Noch kein Konto?{' '}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                Kostenlos registrieren
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
