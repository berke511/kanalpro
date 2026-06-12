// lib/subscription.js
// Abo-Helper & Feature-Gating für KanalPro

export { canAccess, getPlan, isAtLimit, isPlanHigher, formatPreis } from '@/lib/plans';

// ─── getSubscriptionStatus ────────────────────────────────────────────────────
// Gibt den aktuellen Abo-Status zurück (inkl. Trial-Berechnung)
export function getSubscriptionStatus(abo) {
  if (!abo) {
    return {
      status: 'free',
      plan: 'starter',
      daysLeft: 0,
      isTrialActive: false,
      isExpired: false,
      isPaid: false,
      trialEnd: null,
    };
  }

  const now = new Date();
  const trialEnd = abo.trial_end ? new Date(abo.trial_end) : null;
  const isTrialActive = abo.status === 'trial' && trialEnd && trialEnd > now;
  const isExpired =
    abo.status === 'abgelaufen' ||
    (abo.status === 'trial' && trialEnd && trialEnd <= now);
  const daysLeft = isTrialActive
    ? Math.ceil((trialEnd - now) / 86400000)
    : 0;

  return {
    status: abo.status,
    plan: abo.plan || 'starter',
    daysLeft,
    isTrialActive,
    isExpired,
    isPaid: abo.status === 'aktiv',
    trialEnd,
  };
}

// ─── checkAndDowngrade ────────────────────────────────────────────────────────
// Prüft ob die Trial-Periode abgelaufen ist und stuft auf starter herab.
export async function checkAndDowngrade(supabase, userId) {
  const { data: abo } = await supabase
    .from('abonnements')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!abo) return null;

  const now = new Date();
  const trialEnd = abo.trial_end ? new Date(abo.trial_end) : null;

  if (abo.status === 'trial' && trialEnd && trialEnd <= now) {
    await supabase
      .from('abonnements')
      .update({
        status: 'abgelaufen',
        plan: 'starter',
        aktualisiert_am: now.toISOString(),
      })
      .eq('user_id', userId);
    return { ...abo, status: 'abgelaufen', plan: 'starter' };
  }

  return abo;
}

// ─── getAboByCompany ──────────────────────────────────────────────────────────
// Lädt das Abonnement einer company_id
export async function getAboByCompany(supabase, companyId) {
  const { data } = await supabase
    .from('abonnements')
    .select('*')
    .eq('company_id', companyId)
    .single();
  return data;
}
