'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus } from '@/lib/subscription';
import { canAccess, getPlan, PLAN_ORDER, PLANS } from '@/lib/plans';

// PlanGate — schützt Seiten-Inhalte basierend auf Plan-Feature
// Verwendung: <PlanGate feature="rechnungen">{children}</PlanGate>
export default function PlanGate({ feature, children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'allowed' | 'blocked'
  const [currentPlan, setCurrentPlan] = useState(null);
  const [requiredPlan, setRequiredPlan] = useState(null);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('blocked'); return; }

      const abo = await checkAndDowngrade(supabase, user.id);
      const sub = getSubscriptionStatus(abo);
      const plan = sub.plan || 'starter';
      setCurrentPlan(plan);

      if (canAccess(plan, feature)) {
        setStatus('allowed');
      } else {
        // Finde den niedrigsten Plan, der dieses Feature enthält
        const req = PLAN_ORDER.find(p => PLANS[p]?.features?.[feature] === true);
        setRequiredPlan(req || 'professional');
        setStatus('blocked');
      }
    }
    check();
  }, [feature]);

  if (status === 'loading') {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded-xl w-48" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (status === 'allowed') return children;

  // Feature gesperrt — Upgrade-Prompt anzeigen
  const reqPlanData = PLANS[requiredPlan] || PLANS.professional;
  const currentPlanData = PLANS[currentPlan] || PLANS.starter;

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      <div className="text-5xl mb-5">🔒</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Nicht in deinem Plan enthalten
      </h2>
      <p className="text-gray-500 mb-1">
        Diese Funktion ist ab dem{' '}
        <span className="font-semibold text-blue-700">{reqPlanData.name}-Plan</span>{' '}
        verfügbar.
      </p>
      <p className="text-sm text-gray-400 mb-8">
        Du bist aktuell im{' '}
        <span className="font-medium">{currentPlanData.name}-Plan</span>
        {reqPlanData.preis > 0 && (
          <> — upgrade ab {reqPlanData.preis} €/Monat</>
        )}.
      </p>

      {/* Feature-Liste des required Plans */}
      <div className="bg-blue-50 rounded-2xl p-6 mb-8 max-w-sm w-full text-left">
        <p className="font-semibold text-blue-900 text-sm mb-3">
          Im {reqPlanData.name}-Plan enthalten:
        </p>
        <ul className="space-y-1.5">
          {reqPlanData.featureListe.slice(0, 5).map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-blue-800">
              <span className="text-blue-500">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/dashboard/billing"
        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm shadow-sm"
      >
        ⭐ Jetzt auf {reqPlanData.name} upgraden
      </Link>

      <Link
        href="/dashboard"
        className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition"
      >
        Zurück zur Übersicht
      </Link>
    </div>
  );
}
