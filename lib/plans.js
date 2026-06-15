export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    emoji: '🌱',
    preis: 0,
    jahresPreis: 0,
    buchbar: true,
    zielgruppe: ['Interessenten', 'Einzelpersonen'],
    beschreibung: 'Zum Ausprobieren',
    limits: {
      nutzer: 1,
      kunden: 50,
      auftraege: 100,
      fahrzeuge: 0,
      geraete: 0,
      maschinen: 0,
      speicher_mb: 100,
      daten_tage: 30,
    },
    features: {
      crm_basis: true,
      auftraege_basis: true,
      dashboard: true,
      mobile_app: false,
      angebote: false,
      einsatzberichte: false,
      basis_disposition: false,
      kundenverwaltung: false,
      mitarbeiter: false,
      fahrzeuge_verwaltung: false,
      maschinen_verwaltung: false,
      rechnungen: false,
      mahnungen: false,
      dokumente: false,
      berichte: false,
      chat: false,
      erweiterte_disposition: false,
      teams: false,
      erweiterte_rollen: false,
      erweiterte_auswertungen: false,
      api: false,
    },
    featureListe: [
      '1 Benutzer',
      'Bis 50 Kunden',
      'Bis 100 Aufträge',
      '100 MB Speicher',
      '30 Tage Datenspeicherung',
      'CRM Basis',
      'Aufträge Basis',
      'Dashboard',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    emoji: '⭐',
    preis: 79,
    jahresPreis: 869,
    buchbar: true,
    zielgruppe: ['1–5 Mitarbeiter', 'Kleine Betriebe'],
    beschreibung: 'Für kleine Betriebe',
    limits: {
      nutzer: 3,
      kunden: 1000,
      auftraege: 5000,
      fahrzeuge: 5,
      geraete: 10,
      maschinen: 0,
      speicher_mb: 2048,
      daten_tage: null,
    },
    features: {
      crm_basis: true,
      auftraege_basis: true,
      dashboard: true,
      mobile_app: true,
      angebote: true,
      einsatzberichte: true,
      basis_disposition: true,
      kundenverwaltung: true,
      mitarbeiter: false,
      fahrzeuge_verwaltung: false,
      maschinen_verwaltung: false,
      rechnungen: false,
      mahnungen: false,
      dokumente: false,
      berichte: false,
      chat: false,
      erweiterte_disposition: false,
      teams: false,
      erweiterte_rollen: false,
      erweiterte_auswertungen: false,
      api: false,
    },
    featureListe: [
      'Bis 3 Benutzer',
      'Bis 1.000 Kunden',
      'Bis 5.000 Aufträge',
      'Bis 5 Fahrzeuge',
      'Bis 10 Geräte',
      '2 GB Speicher',
      'CRM & Kundenverwaltung',
      'Aufträge & Mobile App',
      'Angebote',
      'Einsatzberichte',
      'Basis-Disposition',
    ],
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    emoji: '👑',
    preis: 129,
    jahresPreis: 1419,
    buchbar: true,
    zielgruppe: ['5–15 Mitarbeiter', 'Wachsende Unternehmen'],
    beschreibung: 'Für wachsende Unternehmen',
    limits: {
      nutzer: 10,
      kunden: 5000,
      auftraege: 25000,
      fahrzeuge: 20,
      geraete: 50,
      maschinen: 50,
      speicher_mb: 5120,
      daten_tage: null,
    },
    features: {
      crm_basis: true,
      auftraege_basis: true,
      dashboard: true,
      mobile_app: true,
      angebote: true,
      einsatzberichte: true,
      basis_disposition: true,
      kundenverwaltung: true,
      mitarbeiter: true,
      fahrzeuge_verwaltung: true,
      maschinen_verwaltung: true,
      rechnungen: true,
      mahnungen: true,
      dokumente: true,
      berichte: true,
      chat: true,
      erweiterte_disposition: true,
      teams: false,
      erweiterte_rollen: false,
      erweiterte_auswertungen: false,
      api: false,
    },
    featureListe: [
      'Bis 10 Benutzer',
      'Bis 5.000 Kunden',
      'Bis 25.000 Aufträge',
      'Bis 20 Fahrzeuge',
      'Bis 50 Geräte & Maschinen',
      '5 GB Speicher',
      'Alles aus Pro',
      'Mitarbeiterverwaltung',
      'Fahrzeug- & Maschinenverwaltung',
      'Rechnungen & Mahnungen',
      'Dokumentenmanagement',
      'Berichte & Interner Chat',
      'Erweiterte Disposition',
    ],
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    emoji: '🏆',
    preis: 289,
    jahresPreis: 3179,
    buchbar: true,
    zielgruppe: ['15–25 Mitarbeiter', 'Etablierte Betriebe'],
    beschreibung: 'Für etablierte Rohr- und Kanalunternehmen',
    limits: {
      nutzer: 25,
      kunden: 10000,
      auftraege: 50000,
      fahrzeuge: 50,
      geraete: 100,
      maschinen: 100,
      speicher_mb: 10240,
      daten_tage: null,
    },
    features: {
      crm_basis: true,
      auftraege_basis: true,
      dashboard: true,
      mobile_app: true,
      angebote: true,
      einsatzberichte: true,
      basis_disposition: true,
      kundenverwaltung: true,
      mitarbeiter: true,
      fahrzeuge_verwaltung: true,
      maschinen_verwaltung: true,
      rechnungen: true,
      mahnungen: true,
      dokumente: true,
      berichte: true,
      chat: true,
      erweiterte_disposition: true,
      teams: true,
      erweiterte_rollen: true,
      erweiterte_auswertungen: true,
      api: false,
    },
    featureListe: [
      'Bis 25 Benutzer',
      'Bis 10.000 Kunden',
      'Bis 50.000 Aufträge',
      'Bis 50 Fahrzeuge',
      'Bis 100 Geräte & Maschinen',
      '10 GB Speicher',
      'Alles aus Professional',
      'Mehrere Teams',
      'Erweiterte Rollen & Rechte',
      'Erweiterte Auswertungen',
    ],
  },
};

export const PLAN_ORDER = ['starter', 'pro', 'professional', 'enterprise'];

export function getPlan(planId) {
  return PLANS[planId] || PLANS.starter;
}

export function isFeatureAvailable(planId, feature) {
  const plan = getPlan(planId);
  return plan.features[feature] === true;
}

export function isWithinLimits(planId, resource, currentCount) {
  const plan = getPlan(planId);
  const limit = plan.limits[resource];
  if (limit === null || limit === Infinity) return true;
  return currentCount < limit;
}

// Alias: canAccess = isFeatureAvailable
export function canAccess(planId, feature) {
  const plan = getPlan(planId);
  return plan.features[feature] === true;
}

// isAtLimit — true wenn das Limit erreicht/überschritten ist
export function isAtLimit(planId, resource, currentCount) {
  const plan = getPlan(planId);
  const limit = plan.limits[resource];
  if (limit === null || limit === Infinity) return false;
  return currentCount >= limit;
}

// isPlanHigher — true wenn planA höherwertiger als planB ist
export function isPlanHigher(planA, planB) {
  return PLAN_ORDER.indexOf(planA) > PLAN_ORDER.indexOf(planB);
}

// formatPreis — Preisformatierung
export function formatPreis(preis, period = 'monat') {
  if (preis === 0) return 'Kostenlos';
  if (period === 'jahr') return `${preis} €/Jahr`;
  return `${preis} €/Monat`;
}
