// lib/plans.js — Plan-Definitionen & Feature-Gating für KanalPro

export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    preis: 29,
    beschreibung: 'Für Einzelunternehmer und kleine Betriebe',
    highlight: false,
    limits: {
      nutzer: 2,
      fahrzeuge: 10,
      dokumente: 50,
    },
    features: {
      kunden: true,
      auftraege: true,
      rechnungen: true,
      einsatzplanung: false,
      objekte: false,
      berichte: false,
      mitarbeiter: false,
      fahrzeuge: false,
      api: false,
    },
    featureListe: [
      '2 Nutzer',
      '10 Fahrzeuge / Maschinen',
      '50 Dokumente',
      'Kunden & Aufträge',
      'Rechnungen',
      'E-Mail-Support',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    preis: 59,
    beschreibung: 'Für wachsende Betriebe',
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
      'Alles aus Starter',
      'Einsatzplanung',
      'Fuhrparkverwaltung',
      'Objekte & Infrastruktur',
      'Prioritäts-Support',
    ],
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    preis: 99,
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
    preis: null, // Auf Anfrage
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

// Reihenfolge für Vergleiche
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

// Formatierter Preis
export function formatPreis(planId) {
  const plan = getPlan(planId);
  if (plan.preis === null) return 'Auf Anfrage';
  return `${plan.preis} €/Monat`;
}
