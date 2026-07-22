'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import { ROLE_LABELS } from '@/lib/roles';

export default function EinladungPage() {
  const { token } = useParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [status, setStatus] = useState('laden'); // laden | bereit | fehler | angenommen
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);

  useEffect(() => {
    async function init() {
      // Get current user (may be null)
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Load invitation details (SELECT policy allows public read)
      const { data: inv, error } = await supabase
        .from('einladungen')
        .select('id, email, role, angenommen, laeuft_ab_am, companies(name)')
        .eq('token', token)
        .single();

      if (error || !inv) {
        setStatus('fehler');
        setFehler('Diese Einladung wurde nicht gefunden.');
        return;
      }

      if (inv.angenommen) {
        setStatus('fehler');
        setFehler('Diese Einladung wurde bereits angenommen.');
        return;
      }

      if (new Date(inv.laeuft_ab_am) < new Date()) {
        setStatus('fehler');
        setFehler('Diese Einladung ist abgelaufen. Bitte bitten Sie den Inhaber, eine neue zu senden.');
        return;
      }

      setInvitation(inv);
      setCompanyName(inv.companies?.name || 'Unbekanntes Unternehmen');
      setStatus('bereit');
    }

    if (token) init();
  }, [token]);

  async function handleAnnehmen() {
    if (!user) {
      router.push(`/login?redirect=/einladung/${token}`);
      return;
    }

    setLaden(true);
    setFehler('');

    const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });

    if (error) {
      setFehler(error.message || 'Fehler beim Annehmen der Einladung.');
      setLaden(false);
      return;
    }

    if (data?.error) {
      setFehler(data.error);
      setLaden(false);
      return;
    }

    setStatus('angenommen');
    setTimeout(() => router.push('/dashboard-v2'), 2500);
  }

  // ─── Ladescreen ──────────────────────────────────────────────────────────────
  if (status === 'laden') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Einladung wird geladen…</p>
        </div>
      </div>
    );
  }

  // ─── Fehler ───────────────────────────────────────────────────────────────────
  if (status === 'fehler') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-red-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Einladung ungültig</h1>
          <p className="text-gray-500 mb-6">{fehler}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  // ─── Angenommen ───────────────────────────────────────────────────────────────
  if (status === 'angenommen') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Willkommen im Team!</h1>
          <p className="text-gray-500">Sie werden zum Dashboard weitergeleitet…</p>
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // ─── Einladung anzeigen ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Team-Einladung</h1>
          <p className="text-gray-500 text-sm mt-1">KanalPro</p>
        </div>

        {/* Invitation Details */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Unternehmen</span>
            <span className="font-semibold text-gray-900">{companyName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Rolle</span>
            <span className="font-medium text-blue-700">{ROLE_LABELS[invitation?.role] || invitation?.role}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Eingeladen als</span>
            <span className="text-sm font-medium text-gray-700">{invitation?.email}</span>
          </div>
        </div>

        {/* Error */}
        {fehler && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{fehler}</div>
        )}

        {/* Action Buttons */}
        {user ? (
          <div>
            <p className="text-xs text-gray-400 text-center mb-4">
              Eingeloggt als: <span className="font-medium text-gray-600">{user.email}</span>
            </p>
            <button
              onClick={handleAnnehmen}
              disabled={laden}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 text-sm"
            >
              {laden ? 'Wird angenommen…' : 'Einladung annehmen'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center mb-1">
              Bitte melden Sie sich an, um die Einladung anzunehmen.
            </p>
            <button
              onClick={() => router.push(`/login?redirect=/einladung/${token}`)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm"
            >
              Anmelden
            </button>
            <button
              onClick={() => router.push(`/registrieren?redirect=/einladung/${token}`)}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition text-sm"
            >
              Neues Konto erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
