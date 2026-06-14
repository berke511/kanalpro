// lib/plans.js — Plan-Definitionen & Feature-Gating für KanalPro

export const PLANS = {
  // Starter = kostenloser Dauerzugang — NICHT kaufbar
  // Zielgruppe: Neugierige, Einzelunternehmer, Testnutzer
  // Ziel: Kunden zum Upgrade bewegen
  // Neue Nutzer: 14 Tage Enterprise Trial → danach automatisch Starter
  starter: {
    id: 'starter',
    name: 'Starter',
    preis: 0,
    jahresPreis: null,
    buchbar: false, // Wird automatisch zugewiesen — nicht im Upgrade-Flow
    zielgruppe: ['Neugierige', 'Einzelunternehmer', 'Testnutzer'],
    beschreibung: 'Kostenlos — für einen ersten Eindruck',
    highlight: false,
    limits: {
      nutzer: 1,
      kunden: 20,
      auftraege: 20,
      speicher_mb: 100,
      daten_tage: 30,   // Daten werden nach 30 Tagen gelöscht
      fahrzeuge: 0,
      maschinen: 0,
    },
    features: {
      kunden: true,
      auftraege: true,
      angebote: false,
      rechnungen: false,
      disposition: false,   // Keine Einsatzplanung
      fahrzeuge: false,
      maschinen: false,
      objekte: false,
      berichte: false,
      mitarbeiter: false,
      api: false,
    },
    einschraenkungen: [
      '1 Benutzer',
      '20 Kunden',
      '20 Aufträge',
      '100 MB Speicher',
      'Daten nur 30 Tage',
      'Keine Disposition',
      'Keine Angebote',
      'Keine Rechnungen',
      'Keine Fahrzeuge',
      'Keine Maschinen',
    ],
    featureListe: [
      '1 Benutzer',
      '20 Kunden & 20 Aufträge',
      '100 MB Speicher',
      'Daten 30 Tage',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    preis: 79,
    jahresPreis: 869, // 79 × 11 Monate — 1 Monat gratis
    buchbar: true,
    zielgruppe: ['Kleine Unternehmen'],
    beschreibung: 'Für kleine Unternehmen',
    highlight: true,
    limits: {
      nutzer: 5,
      fahrzeuge: 10,
      geraete: 10,
      speicher_mb: 10240, // 10 GB
    },
    features: {
      kunden: true,
      auftraege: true,
      angebote: true,
      rechnungen: false,
      disposition: true,        // Basis-Disposition
      fahrzeuge: true,
      geraete: true,
      maschinen: false,
      mobile: true,
      einsatzberichte: true,
      fotos: true,
      unterschriften: false,
      objekte: false,
      berichte: false,
      mitarbeiter: false,
      api: false,
    },
    featureListe: [
      'Bis 5 Benutzer',
      'Bis 10 Fahrzeuge',
      'Bis 10 Geräte',
      '10 GB Speicher',
      'CRM & Kundenverwaltung',
      'Auftragsverwaltung',
      'Mobile App',
      'Angebote',
      'Einsatzberichte',
      'Fotos',
      'Basis-Disposition',
    ],
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    preis: 129,
    jahresPreis: 1419, // 129 × 11 Monate — 1 Monat gratis
    buchbar: true,
    zielgruppe: ['Wachsende Unternehmen', '5–20 Mitarbeiter'],
    beschreibung: 'Für wachsende Unternehmen',
    highlight: false,
    limits: {
      nutzer: 20,
      fahrzeuge: Infinity,
      maschinen: Infinity,
      speicher_mb: 51200, // 50 GB
    },
    features: {
      kunden: true,
      auftraege: true,
      angebote: true,
      rechnungen: true,
      mahnungen: true,
      disposition: true,        // Vollständige Disposition
      fahrzeuge: true,
      maschinen: true,
      mobile: true,
      einsatzberichte: true,
      fotos: true,
      unterschriften: true,
      mitarbeiter: true,
      berichte: true,
      dokumente: true,          // Dokumentenmanagement
      chat: true,               // Interner Chat
      datev: true,              // DATEV Export
      objekte: false,
      api: false,
    },
    featureListe: [
      '20 Benutzer',
      'Unbegrenzte Fahrzeuge & Maschinen',
      '50 GB Speicher',
      'Alles aus Pro',
      'Vollständige Disposition',
      'Mitarbeiterverwaltung',
      'Fahrzeug- & Maschinenverwaltung',
      'Rechnungen & Mahnungen',
      'DATEV Export',
      'Berichte & Auswertungen',
      'Dokumentenmanagement',
      'Interner Chat',
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
