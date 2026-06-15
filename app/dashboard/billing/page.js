'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus } from '@/lib/subscription';
import { PLANS, PLAN_ORDER } from '@/lib/plans';

// Hilfs-Komponente: Plan-Karte
function PlanCard({ plan, isAktuell, isTrialing, onWaehlen }) {
  const hervorheben = plan.id === 'professional' && !isAktuell;

  return (
    <div
      className={`relative bg-white rounded-2xl p-7 border-2 flex flex-col transition ${
        isAktuell
          ? 'border-blue-500 shadow-lg shadow-blue-100'
          : hervorheben
          ? 'border-blue-300 shadow-md'
          : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      {isAktuell && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
          {isTrialing ? 'AKTUELLE TESTPHASE' : 'DEIN PLAN'}
        </span>
      )}
      {hervorheben && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
          EMPFOHLEN
        </span>
      )}

      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{plan.emoji}</span>
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">{plan.beschreibung}</p>

      <div className="mb-5">
        <span className="text-3xl font-bold text-gray-900">
          {plan.preis === 0 ? 'Kostenlos' : plan.preis + ' €'}
        </span>
        {plan.preis > 0 && <span className="text-gray-400 text-sm ml-1">/Monat</span>}
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.featureListe.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-green-500 mt-0.5 shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {isAktuell ? (
        <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-blue-50 text-blue-700">
          {isTrialing ? '🎉 Kostenlose Testphase' : '✅ Aktiver Plan'}
        </div>
      ) : (
        <button
          onClick={() => onWaehlen(plan.id)}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
            hervorheben
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : plan.preis === 0
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {plan.name} wählen
        </button>
      )}
    </div>
  );
}

// Hauptseite
export default function BillingPage() {
  const router = useRouter();
  const [abo, setAbo] = useState(null);
  const [laden, setLaden] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fehler, setFehler] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      const aboData = await checkAndDowngrade(supabase, user.id);
      setAbo(aboData);
      setLaden(false);
    }
    load();
  }, [router]);

  const sub = getSubscriptionStatus(abo);
  const { isTrialActive, isExpired, daysLeft, plan, isPaid } = sub;

  async function handlePlanWaehlen(planId) {
    if (planId === 'starter') {
      setModal(planId);
      return;
    }
    // Bezahlte Pläne → Stripe Checkout
    if (!process.env.NEXT_PUBLIC_STRIPE_ENABLED) {
      alert('Online-Zahlung wird demnächst freigeschaltet.\nKontakt: support@kanalpro.de');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId: currentUser.id, email: currentUser.email }),
      });
      const { url, error } = await res.json();
      if (url) window.location.href = url;
      else throw new Error(error || 'Checkout Fehler');
    } catch (e) {
      setFehler('Zahlung konnte nicht gestartet werden: ' + e.message);
      setSaving(false);
    }
  }

  async function handleBestaetigen() {
    if (!modal || !currentUser) return;
    setSaving(true);
    setFehler(null);
    try {
      const { error } = await supabase
        .from('abonnements')
        .update({
          plan: modal,
          status: 'aktiv',
          aktualisiert_am: new Date().toISOString(),
        })
        .eq('user_id', currentUser.id);
      if (error) throw error;

      await fetch('/api/plan-bestaetigung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          plan: modal,
          planName: PLANS[modal]?.name,
        }),
      });

      router.push('/dashboard?plan=' + modal);
    } catch (e) {
      setFehler('Fehler beim Speichern. Bitte versuche es erneut.');
      setSaving(false);
    }
  }

  if (laden)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Lädt…</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <span className="font-bold text-lg">KanalPro</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Zurück</Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Dein Abonnement</h1>
          <p className="text-gray-500 mt-2">
            {isTrialActive
              ? `Testphase läuft noch ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'}`
              : isPaid
              ? 'Dein Plan ist aktiv'
              : 'Wähle einen Plan für KanalPro'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {PLAN_ORDER.map(planId => (
            <PlanCard
              key={planId}
              plan={PLANS[planId]}
              isAktuell={plan === planId}
              isTrialing={isTrialActive && plan === planId}
              onWaehlen={handlePlanWaehlen}
            />
          ))}
        </div>

        {isExpired && (
          <p className="text-center text-sm text-red-500 mt-4">
            ⚠️ Deine Testphase ist abgelaufen — wähle einen Plan um fortzufahren.
          </p>
        )}

        <p className="text-center text-gray-400 text-xs mt-8">
          🔒 Sichere Zahlung · Jederzeit kündbar · DSGVO-konform · Made in Germany
        </p>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {PLANS[modal]?.emoji} {PLANS[modal]?.name} aktivieren
            </h2>
            <p className="text-gray-500 text-sm mb-2">
              {modal === 'starter'
                ? 'Du wechselst auf den kostenlosen Starter-Plan.'
                : `Du wechselst auf ${PLANS[modal]?.name} für ${PLANS[modal]?.preis} €/Monat.`}
            </p>
            {modal === 'starter' && (
              <p className="text-amber-600 text-sm mb-4">
                ⚠️ Einige Funktionen werden eingeschränkt (1 Benutzer, 50 Kunden, 100 Aufträge).
              </p>
            )}
            {fehler && <p className="text-red-500 text-sm mb-4">{fehler}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setModal(null); setFehler(null); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleBestaetigen}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                disabled={saving}
              >
                {saving ? 'Wird gespeichert…' : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}