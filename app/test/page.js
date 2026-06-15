'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const SZENARIEN = [
  // === TRIAL ===
  {
    id: 'trial-aktiv',
    label: 'Enterprise Trial — aktiv',
    sub: '10 Tage verbleibend (von 14)',
    emoji: '🟢',
    gruppe: 'Trial',
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
    label: 'Enterprise Trial — läuft ab',
    sub: '2 Tage verbleibend (Banner wird rot)',
    emoji: '🟠',
    gruppe: 'Trial',
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
    label: 'Enterprise Trial — abgelaufen',
    sub: 'Vor 6 Tagen abgelaufen → automatisch Starter (kostenlos)',
    emoji: '🔴',
    gruppe: 'Trial',
    farbe: 'bg-red-50 border-red-200 hover:border-red-400',
    badge: 'bg-red-100 text-red-800',
    data: {
      plan: 'starter', status: 'aktiv',
      trial_start: () => new Date(Date.now() - 20*86400000).toISOString(),
      trial_end:   () => new Date(Date.now() - 6*86400000).toISOString(),
    }
  },
  // === PAID PLANS ===
  {
    id: 'pro',
    label: 'Plan: Pro',
    sub: '79 €/Monat — Bis 5 Nutzer · Bis 10 Fahrzeuge · Bis 10 Geräte · 2 GB',
    emoji: '⭐',
    gruppe: 'Bezahlte Pläne',
    farbe: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    badge: 'bg-purple-100 text-purple-800',
    data: {
      plan: 'pro', status: 'aktiv',
      trial_start: () => new Date(Date.now() - 30*86400000).toISOString(),
      trial_end:   () => new Date(Date.now() - 16*86400000).toISOString(),
    }
  },
  {
    id: 'professional',
    label: 'Plan: Professional',
    sub: '129 €/Monat — 20 Nutzer · 5 GB · Rechnungen, DATEV, Chat',
    emoji: '💎',
    gruppe: 'Bezahlte Pläne',
    farbe: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
    badge: 'bg-indigo-100 text-indigo-800',
    data: {
      plan: 'professional', status: 'aktiv',
      trial_start: () => new Date(Date.now() - 30*86400000).toISOString(),
      trial_end:   () => new Date(Date.now() - 16*86400000).toISOString(),
    }
  },
  {
    id: 'enterprise',
    label: 'Plan: Enterprise',
    sub: '289 €/Monat — Bis 25 Nutzer · Voller Zugang · Teams, Erweiterte Rollen & Auswertungen',
    emoji: '🚀',
    gruppe: 'Bezahlte Pläne',
    farbe: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
    badge: 'bg-yellow-100 text-yellow-800',
    data: {
      plan: 'enterprise', status: 'aktiv',
      trial_start: () => new Date(Date.now() - 30*86400000).toISOString(),
      trial_end:   () => new Date(Date.now() - 16*86400000).toISOString(),
    }
  },
];

const SCHNELLLINKS = [
  { gruppe: 'Dashboard', links: [
    ['Dashboard', '/dashboard'],
    ['Kunden', '/dashboard/kunden'],
    ['Rechnungen', '/dashboard/rechnungen'],
    ['Aufträge', '/dashboard/auftraege'],
    ['Einstellungen', '/dashboard/einstellungen'],
    ['Billing / Abo', '/dashboard/billing'],
    ['Upgrade', '/dashboard/upgrade'],
  ]},
  { gruppe: 'Auth-Seiten', links: [
    ['Login', '/login'],
    ['Registrierung', '/register'],
    ['Onboarding', '/onboarding'],
    ['E-Mail bestätigen', '/verify-email'],
    ['Passwort vergessen', '/passwort-vergessen'],
    ['Passwort zurücksetzen', '/passwort-zuruecksetzen'],
    ['Auth Callback', '/auth/callback'],
  ]},
];

const PLAN_INFO = [
  { name: 'Starter', preis: 'Kostenlos', color: 'bg-gray-100 text-gray-600', features: '1 Nutzer · 50 Kunden · 100 Aufträge · 100 MB · 30 Tage' },
  { name: 'Pro', preis: '79 €/Mo', color: 'bg-purple-100 text-purple-800', features: 'Bis 3 Nutzer · Bis 5 Fahrzeuge · Bis 10 Geräte · 2 GB · CRM, Angebote, Mobile App, Basis-Disposition · Jahresabo: 869 €' },
  { name: 'Professional', preis: '129 €/Mo', color: 'bg-indigo-100 text-indigo-800', features: 'Bis 10 Nutzer · Bis 20 Fahrzeuge · 5 GB · Rechnungen, Mahnungen, Dokumente, Berichte, Chat · Jahresabo: 1.419 €' },
  { name: 'Enterprise', preis: '289 €/Mo', color: 'bg-yellow-100 text-yellow-800', features: 'Bis 25 Nutzer · Bis 50 Fahrzeuge · 10 GB · Teams, Erweiterte Rollen, Erweiterte Auswertungen · Jahresabo: 3.179 €' },
];

export default function TestSzenarien() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [aktiv, setAktiv] = useState(null);
  const [abo, setAbo] = useState(null);
  const [laden, setLaden] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user);
      supabase.from('abonnements').select('*').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setAbo(data);
            setAktiv(data.plan + '-' + data.status);
          }
        });
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
    setAbo({ plan: d.plan, status: d.status, trial_end: d.trial_end() });
    setMsg('✓ Szenario aktiviert — Dashboard neu laden um den TrialBanner zu sehen');
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Wird geladen...</p>
    </div>
  );

  const gruppen = [...new Set(SZENARIEN.map(s => s.gruppe))];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Founder Mode · kanalpro.de/test</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Test-Dashboard</h1>
          <p className="text-gray-500 mt-1">Abo-Szenarien testen, alle Seiten aufrufen, System-Status prüfen.</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-gray-400">Eingeloggt als: <strong>{user.email}</strong></span>
            {abo && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                abo.plan === 'enterprise' ? 'bg-yellow-100 text-yellow-800' :
                abo.plan === 'professional' ? 'bg-indigo-100 text-indigo-800' :
                abo.plan === 'pro' ? 'bg-purple-100 text-purple-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {abo.plan?.toUpperCase()} · {abo.status}
              </span>
            )}
          </div>
        </div>

        {/* Abo-Szenarien */}
        {gruppen.map(gruppe => (
          <div key={gruppe}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">{gruppe}</h2>
            <div className="space-y-3">
              {SZENARIEN.filter(s => s.gruppe === gruppe).map(sz => (
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
          </div>
        ))}

        {msg && (
          <div className="p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium">
            {msg}
          </div>
        )}

        {/* Plan-Übersicht */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Abo-System Übersicht</h2>
          <div className="grid grid-cols-2 gap-3">
            {PLAN_INFO.map(p => (
              <div key={p.name} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.color}`}>{p.name}</span>
                  <span className="text-xs font-semibold text-gray-700">{p.preis}</span>
                </div>
                <p className="text-xs text-gray-500">{p.features}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            💡 Neue Kunden erhalten automatisch 14 Tage Enterprise Trial. Nach Ablauf: automatische Rückstufung auf <strong>Starter</strong> (kostenlos, eingeschränkt). Starter ist <em>nicht</em> buchbar — Upgrade direkt auf Pro, Professional oder Enterprise.
          </div>
        </div>

        {/* Schnell-Links */}
        {SCHNELLLINKS.map(gruppe => (
          <div key={gruppe.gruppe} className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">{gruppe.gruppe}</h2>
            <div className="grid grid-cols-2 gap-2">
              {gruppe.links.map(([label, href]) => (
                <a key={href} href={href}
                  className="text-sm px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-blue-600 hover:text-blue-800 transition text-center">
                  {label}
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* System-Features */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Implementierte Features</h2>
          <div className="space-y-2">
            {[
              { ok: true, text: 'Abo-System: Pro 79€ / Professional 129€ / Enterprise 289€ (+ Jahresabo mit 1 Monat gratis)' },
              { ok: true, text: '14-Tage Enterprise Trial → automatisch Starter (kostenlos) nach Ablauf' },
              { ok: true, text: 'TrialBanner im Dashboard (grün → orange → rot)' },
              { ok: true, text: 'Billing-Seite unter /dashboard/billing' },
              { ok: true, text: 'Upgrade-Seite mit Plan-Vergleich' },
              { ok: true, text: 'Rollen-System: Owner / Admin / Mitarbeiter / Viewer' },
              { ok: true, text: 'Welcome-E-Mail bei Registrierung (Trial + Paid)' },
              { ok: true, text: 'Auth-Flow: Registrierung → E-Mail bestätigen → Onboarding' },
              { ok: true, text: 'Passwort vergessen / zurücksetzen' },
              { ok: true, text: 'Auth Callback mit Suspense-Boundary' },
              { ok: true, text: 'E-Mail-Bestätigung mit Suspense-Boundary' },
              { ok: true, text: 'Supabase RLS-Policies für alle Tabellen' },
              { ok: true, text: 'Auto-Company-Erstellung bei Registrierung (Trigger)' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 pb-6">Diese Seite ist nur für dich sichtbar · kanalpro.de/test</p>
      </div>
    </div>
  );
}
