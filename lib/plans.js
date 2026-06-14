// lib/plans.js — Plan-Definitionen & Feature-Gating für KanalPro

export const PLANS = {
  // Starter = automatischer Fallback nach Trial-Ablauf — NICHT kaufbar
  // Neue Nutzer: 14 Tage Enterprise Trial → danach automatisch Starter (kostenlos, eingeschränkt)
  starter: {
    id: 'starter',
    name: 'Starter',
    preis: 0,
    jahresPreis: null,
    buchbar: false, // Nicht im Upgrade-Flow anzeigen — wird automatisch zugewiesen
    beschreibung: 'Kostenlos nach Trial — eingeschränkte Features',
    highlight: false,
    limits: {
      nutzer: 1,
      fahrzeuge: 5,
      dokumente: 20,
    },
    features: {
      kunden: true,
      auftraege: true,
      rechnungen: false,
      einsatzplanung: false,
      objekte: false,
      berichte: false,
      mitarbeiter: false,
      fahrzeuge: false,
      api: false,
    },
    featureListe: [
      '1 Nutzer',
      '5 Fahrzeuge',
      '20 Dokumente',
      'Kunden & Aufträge (nur Ansicht)',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    preis: 79,
    jahresPreis: 869, // 79 × 11 Monate — 1 Monat gratis
    buchbar: true,
    beschreibung: 'Für wachsende KMU',
    highlight: true,
    limits: {
      nutzer: 10,
      fahrzeuge: 50,
      dokumente: 500,
    },
    features: {
      kunden: true,
      auftraege: true,
      rechnungen: true,
      einsatzplanung: true,
      objekte: true,
      berichte: false,
      mitarbeiter: true,
      fahrzeuge: true,
      api: false,
    },
    featureListe: [
      '10 Nutzer',
      '50 Fahrzeuge / Maschinen',
      '500 Dokumente',
      'Kunden & Aufträge',
      'Rechnungen',
      'Einsatzplanung',
      'Fuhrparkverwaltung',
      'Objekte & Infrastruktur',
      'Prioritäts-Support',
    ],
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    preis: 129,
    jahresPreis: 1419, // 129 × 11 Monate — 1 Monat gratis
    buchbar: true,
    beschreibung: 'Für mittelgroße Unternehmen',
    highlight: false,
    limits: {
      nutzer: 50,
      fahrzeuge: 200,
      dokumente: Infinity,
    },
    features: {
      kunden: true,
      auftraege: true,
      rechnungen: true,
      einsatzplanung: true,
      objekte: true,
      berichte: true,
      mitarbeiter: true,
      fahrzeuge: true,
      api: false,
    },
    featureListe: [
      '50 Nutzer',
      '200 Fahrzeuge / Maschinen',
      'Unbegrenzte Dokumente',
      'Alles aus Pro',
      'Berichte & Auswertungen',
      'Wartungsverträge & Erinnerungen',
      'Telefon-Support',
    ],
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    preis: 249,
    jahresPreis: 2739, // 249 × 11 Monate — 1 Monat gratis
    buchbar: true,
    beschreibung: 'Für große Unternehmen & Konzerne',
    highlight: false,
    limits: {
      nutzer: Infinity,
      fahrzeuge: Infinity,
      dokumente: Infinity,
    },
    features: {
      kunden: true,
      auftraege: true,
      rechnungen: true,
      einsatzplanung: true,
      objekte: true,
      berichte: true,
      mitarbeiter: true,
      fahrzeuge: true,
      api: true,
    },
    featureListe: [
      'Unbegrenzte Nutzer',
      'Unbegrenzte Fahrzeuge',
      'Unbegrenzte Dokumente',
      'Alles aus Professional',
      'API-Zugang',
      'Individuelles Onboarding',
      'Dedizierter Account Manager',
      'SLA-Garantie',
    ],
  },
};

// Buchbare Pläne im Upgrade-Flow (Starter = automatisch, nicht kaufbar)
export const ACTIVE_PLANS = ['pro', 'professional', 'enterprise'];

// Reihenfolge für Plan-Vergleiche (Starter bleibt für DB-Kompatibilität)
export const PLAN_ORDER = ['starter', 'pro', 'professional', 'enterprise'];

// Gibt Plan-Objekt zurück (Fallback: starter)
export function getPlan(planId) {
  return PLANS[planId] || PLANS.starter;
}

// Prüft ob ein Feature im Plan freigeschaltet ist
export function canAccess(planId, feature) {
  const plan = getPlan(planId);
  return !!plan.features[feature];
}

// Prüft ob ein Limit erreicht wurde
export function isAtLimit(planId, dimension, currentCount) {
  const plan = getPlan(planId);
  const limit = plan.limits[dimension];
  if (limit === Infinity) return false;
  return currentCount >= limit;
}

// Ist planA höher als planB?
export function isPlanHigher(planA, planB) {
  return PLAN_ORDER.indexOf(planA) > PLAN_ORDER.indexOf(planB);
}

// Formatierter Monatspreis
export function formatPreis(planId) {
  const plan = getPlan(planId);
  if (plan.preis === 0) return 'Kostenlos';
  return `${plan.preis} €/Monat`;
}

// Formatierter Jahrespreis (1 Monat gratis)
export function formatJahresPreis(planId) {
  const plan = getPlan(planId);
  if (!plan.jahresPreis) return null;
  return `${plan.jahresPreis} €/Jahr`;
}
