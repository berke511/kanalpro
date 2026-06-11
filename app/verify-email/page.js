'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [status, setStatus] = useState('warten'); // warten | gesendet | fehler
  const [laden, setLaden] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleResend() {
    if (!email || laden || countdown > 0) return;
    setLaden(true);
    setStatus('warten');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setStatus('gesendet');
      setCountdown(60);
    } catch {
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
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">KP</span>
          </div>
          <span className="text-white font-bold text-xl">KanalPro</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">

        {/* Icon */}
        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Bitte bestätigen Sie Ihre E-Mail
        </h1>
        <p className="text-gray-500 text-sm mb-1">
          Wir haben eine Bestätigungs-E-Mail gesendet an:
        </p>
        {email && (
          <p className="font-semibold text-gray-800 text-sm mb-6 bg-gray-50 rounded-xl px-4 py-2 inline-block">
            {email}
          </p>
        )}

        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren
          und loszulegen.
        </p>

        {/* Steps */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left space-y-3">
          {[
            { num: 1, text: 'Öffnen Sie Ihr E-Mail-Postfach' },
            { num: 2, text: 'Suchen Sie die E-Mail von KanalPro' },
            { num: 3, text: 'Klicken Sie auf „E-Mail bestätigen"' },
          ].map(s => (
            <div key={s.num} className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {s.num}
              </div>
              <span className="text-gray-700 text-sm">{s.text}</span>
            </div>
          ))}
        </div>

        {/* Resend */}
        <div className="space-y-3">
          {status === 'gesendet' && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
              ✓ E-Mail wurde erneut gesendet.
            </div>
          )}
          {status === 'fehler' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              Fehler beim Senden. Bitte versuchen Sie es erneut.
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={laden || countdown > 0}
            className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {laden
              ? 'Wird gesendet…'
              : countdown > 0
              ? `Erneut senden in ${countdown}s`
              : 'E-Mail erneut senden'}
          </button>

          {!emailParam && (
            <div className="mt-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ihre E-Mail-Adresse"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Bereits bestätigt?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Jetzt anmelden
          </Link>
        </p>

        <p className="text-xs text-gray-400 mt-2">
          Probleme?{' '}
          <a href="mailto:info@kanalpro.de" className="text-blue-600 hover:underline">
            info@kanalpro.de
          </a>
        </p>
      </div>
    </div>
  );
}
