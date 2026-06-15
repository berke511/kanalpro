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
    setTimeout(() => router.push('/dashboard'), 2500);
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
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Einladung ungøltig</h1>
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
          <div className="text-5xl mb-4">✅</div>
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
            <span className="text-3xl">🔧</span>
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
              {laden ? 'Wird angenommen…' : '✅ Einladung annehmen'}
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
