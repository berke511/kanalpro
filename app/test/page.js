'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const SZENARIEN = [
  {
    id: 'trial-aktiv',
    label: 'Trial aktiv',
    sub: '10 Tage verbleibend',
    emoji: '🟢',
    farbe: 'bg-green-50 border-green-200 hover:border-green-400',
    badge: 'bg-green-100 text-green-800',
    data: {
      plan: 'enterprise', status: 'trial',
      trial_start: () => new Date(Date.now() - 4*86400000).toISOString(),
      trial_end:   () => new Date(Date.now() + 10*86400000).toISOString(),
    }
  },
  {
    id: 'trial-ablauf',
    label: 'Trial läuft ab',
    sub: '2 Tage verbleibend',
    emoji: '🟠',
    farbe: 'bg-orange-50 border-orange-200 hover:border-orange-400',
    badge: 'bg-orange-100 text-orange-800',
    data: {
      plan: 'enterprise', status: 'trial',
      trial_start: () => new Date(Date.now() - 12*86400000).toISOString(),
      trial_end:   () => new Date(Date.now() + 2*86400000).toISOString(),
    }
  },
  {
    id: 'trial-abgelaufen',
    label: 'Trial abgelaufen',
    sub: 'Vor 6 Tagen abgelaufen',
    emoji: '🔴',
    farbe: 'bg-red-50 border-red-200 hover:border-red-400',
    badge: 'bg-red-100 text-red-800',
    data: {
      plan: 'enterprise', status: 'trial',
      trial_start: () => new Date(Date.now() - 20*86400000).toISOString(),
      trial_end:   () => new Date(Date.now() - 6*86400000).toISOString(),
    }
  },
  {
    id: 'starter',
    label: 'Plan: Starter',
    sub: '29 €/Monat, aktiv',
    emoji: '🔵',
    farbe: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    badge: 'bg-blue-100 text-blue-800',
    data: {
      plan: 'starter', status: 'aktiv',
      trial_start: () => new Date(Date.now() - 30*86400000).toISOString(),
      trial_end:   () => new Date(Date.now() - 16*86400000).toISOString(),
    }
  },
  {
    id: 'pro',
    label: 'Plan: Pro',
    sub: '59 €/Monat, aktiv',
    emoji: '⭐',
    farbe: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    badge: 'bg-purple-100 text-purple-800',
    data: {
      plan: 'pro', status: 'aktiv',
      trial_start: () => new Date(Date.now() - 30*86400000).toISOString(),
      trial_end:   () => new Date(Date.now() - 16*86400000).toISOString(),
    }
  },
];

export default function TestSzenarien() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [aktiv, setAktiv] = useState(null);
  const [laden, setLaden] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user);
      supabase.from('abonnements').select('*').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setAktiv(data.plan + '-' + data.status + '-' + data.trial_end); });
    });
  }, [router]);

  async function aktivieren(sz) {
    setLaden(sz.id);
    setMsg('');
    const d = sz.data;
    const { error } = await supabase.from('abonnements').upsert({
      user_id: user.id,
      plan: d.plan,
      status: d.status,
      trial_start: d.trial_start(),
      trial_end: d.trial_end(),
    }, { onConflict: 'user_id' });
    setLaden(false);
    if (error) { setMsg('Fehler: ' + error.message); return; }
    setAktiv(sz.id);
    setMsg('✓ Szenario aktiviert — Dashboard neu laden um zu sehen');
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Wird geladen...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Founder Mode</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Test-Szenarien</h1>
          <p className="text-gray-500 mt-1">Wechsle zwischen allen Abo-Zuständen für deinen Account — sieh die App aus jeder Perspektive.</p>
          <p className="text-xs text-gray-400 mt-2">Eingeloggt als: {user.email}</p>
        </div>

        {/* Szenarien */}
        <div className="space-y-3">
          {SZENARIEN.map(sz => (
            <button
              key={sz.id}
              onClick={() => aktivieren(sz)}
              disabled={laden === sz.id}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${sz.farbe} ${laden === sz.id ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sz.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{sz.label}</p>
                    <p className="text-sm text-gray-500">{sz.sub}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {aktiv === sz.id && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${sz.badge}`}>AKTIV</span>
                  )}
                  {laden === sz.id
                    ? <span className="text-sm text-gray-400">Wird gesetzt...</span>
                    : <span className="text-sm text-gray-400">→</span>
                  }
                </div>
              </div>
            </button>
          ))}
        </div>

        {msg && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-700">
            {msg}
          </div>
        )}

        {/* Links */}
        <div className="mt-8 p-5 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Schnell-Links zum Testen</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Dashboard', '/dashboard'],
              ['Upgrade-Seite', '/dashboard/upgrade'],
              ['Kunden', '/dashboard/kunden'],
              ['Rechnungen', '/dashboard/rechnungen'],
              ['Einstellungen', '/dashboard/einstellungen'],
              ['Registrierung', '/register'],
            ].map(([label, href]) => (
              <a key={href} href={href}
                className="text-sm px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-blue-600 hover:text-blue-800 transition text-center">
                {label}
              </a>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">Diese Seite ist nur für dich sichtbar · kanalpro.de/test</p>
      </div>
    </div>
  );
}
