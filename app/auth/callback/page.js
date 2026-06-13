'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verarbeitung'); // verarbeitung | fehler

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') || 'signup';

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (token_hash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash, type });
          if (error) throw error;
        } else {
          // No code or token — might be a hash-based redirect (older flow)
          // Supabase client auto-detects from URL hash
          await new Promise(r => setTimeout(r, 800));
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Keine Session gefunden');
        }

        // Redirect based on type
        if (type === 'recovery') {
          router.replace('/passwort-zuruecksetzen');
        } else {
          router.replace('/onboarding');
        }
      } catch {
        setStatus('fehler');
      }
    }

    handleCallback();
  }, []);

  if (status === 'fehler') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link ungültig oder abgelaufen</h2>
          <p className="text-gray-500 text-sm mb-6">
            Der Bestätigungslink ist nicht mehr gültig. Bitte fordern Sie einen neuen Link an.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/verify-email"
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition text-center block"
            >
              Neuen Bestätigungs-Link anfordern
            </a>
            <a
              href="/passwort-vergessen"
              className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition text-center block"
            >
              Passwort-Reset-Link anfordern
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Wird bestätigt…</h2>
        <p className="text-gray-500 text-sm">Bitte einen Moment warten.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Wird bestätigt…</h2>
          <p className="text-gray-500 text-sm">Bitte einen Moment warten.</p>
        </div>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
