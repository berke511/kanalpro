// lib/subscription.js
// Zentrale Plan-Helper & Feature-Gating-Logik für KanalPro

// ─── Plan-Definitionen ────────────────────────────────────────────────────────
export const PLAN_FEATURES = {
  basic: {
    name: 'Basic',
    kunden: true,
    kundenLimit: 10,
    auftraege: true,
    auftraegeLimit: 20,
    rechnungen: false,
    einsatzplanung: false,
    objekte: false,
    berichte: false,
    mitarbeiter: false,
    fahrzeuge: false,
  },
  enterprise: {
    name: 'Enterprise',
    kunden: true,
    kundenLimit: Infinity,
    auftraege: true,
    auftraegeLimit: Infinity,
    rechnungen: true,
    einsatzplanung: true,
    objekte: true,
    berichte: true,
    mitarbeiter: true,
    fahrzeuge: true,
  },
};

// ─── getPlanFeatures ──────────────────────────────────────────────────────────
// Gibt die Feature-Konfiguration für einen Plan zurück
export function getPlanFeatures(plan) {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
}

// ─── canAccess ────────────────────────────────────────────────────────────────
// Prüft, ob ein Feature für einen Plan freigeschaltet ist
export function canAccess(plan, feature) {
  const features = getPlanFeatures(plan);
  return !!features[feature];
}

// ─── getSubscriptionStatus ────────────────────────────────────────────────────
// Gibt den aktuellen Abo-Status zurück (inkl. Trial-Berechnung)
export function getSubscriptionStatus(abo) {
  if (!abo) {
    return {
      status: 'free',
      plan: 'basic',
      daysLeft: 0,
      isTrialActive: false,
      isExpired: false,
      isPaid: false,
    };
  }

  const now = new Date();
  const trialEnd = abo.trial_end ? new Date(abo.trial_end) : null;
  const isTrialActive = abo.status === 'trial' && trialEnd && trialEnd > now;
  const isExpired = abo.status === 'trial' && trialEnd && trialEnd <= now;
  const daysLeft = isTrialActive
    ? Math.ceil((trialEnd - now) / 86400000)
    : 0;

  return {
    status: abo.status,
    plan: abo.plan || 'basic',
    daysLeft,
    isTrialActive,
    isExpired,
    isPaid: abo.status === 'paid',
    trialEnd,
  };
}

// ─── checkAndDowngrade ────────────────────────────────────────────────────────
// Prüft ob die Trial-Periode abgelaufen ist und stuft automatisch auf basic herab.
// Gibt das (ggf. aktualisierte) abo-Objekt zurück.
export async function checkAndDowngrade(supabase, userId) {
  const { data: abo } = await supabase
    .from('abonnements')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!abo) return null;

  const now = new Date();
  const trialEnd = abo.trial_end ? new Date(abo.trial_end) : null;

  // Trial abgelaufen → auf basic herabstufen
  if (abo.status === 'trial' && trialEnd && trialEnd <= now) {
    await supabase
      .from('abonnements')
      .update({ status: 'free', plan: 'basic' })
      .eq('user_id', userId);
    return { ...abo, status: 'free', plan: 'basic' };
  }

  return abo;
}
