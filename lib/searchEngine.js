// lib/searchEngine.js
// OS-004 Command Palette — Search Engine
// Keine 'use client' Direktive — reine Utility-Funktion

const BADGE_COLOR_MAP = {
  offen:         'bg-yellow-100 text-yellow-800',
  in_bearbeitung:'bg-blue-100 text-blue-800',
  abgeschlossen: 'bg-green-100 text-green-800',
  bezahlt:       'bg-green-100 text-green-800',
  ueberfaellig:  'bg-red-100 text-red-800',
  entwurf:       'bg-gray-100 text-gray-800',
  gesendet:      'bg-blue-100 text-blue-800',
  angenommen:    'bg-green-100 text-green-800',
  abgelehnt:     'bg-red-100 text-red-800',
  aktiv:         'bg-green-100 text-green-800',
  inaktiv:       'bg-gray-100 text-gray-800',
};

function getBadgeColor(value) {
  return BADGE_COLOR_MAP[value?.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
}

export async function searchAll(supabaseClient, companyId, query, options = { limit: 5 }) {
  const limit = options.limit ?? 5;
  const q = query?.trim();
  if (!q) return [];

  try {
    const [
      { data: auftraege },
      { data: kunden },
      { data: angebote },
      { data: rechnungen },
      { data: fahrzeuge },
      { data: mitarbeiter },
    ] = await Promise.all([
      supabaseClient
        .from('auftraege')
        .select('id, nummer, titel, status, prioritaet, datum')
        .eq('company_id', companyId)
        .ilike('titel', `%${q}%`)
        .limit(limit),
      supabaseClient
        .from('kunden')
        .select('id, name, firmenname, telefon')
        .eq('company_id', companyId)
        .or(`name.ilike.%${q}%,firmenname.ilike.%${q}%`)
        .limit(limit),
      supabaseClient
        .from('angebote')
        .select('id, angebotsnummer, status, datum, kunden(name)')
        .eq('company_id', companyId)
        .ilike('angebotsnummer', `%${q}%`)
        .limit(limit),
      supabaseClient
        .from('rechnungen')
        .select('id, rechnungsnummer, status, datum, kunden(name)')
        .eq('company_id', companyId)
        .ilike('rechnungsnummer', `%${q}%`)
        .limit(limit),
      supabaseClient
        .from('fahrzeuge')
        .select('id, kennzeichen, bezeichnung, zustand')
        .eq('company_id', companyId)
        .or(`kennzeichen.ilike.%${q}%,bezeichnung.ilike.%${q}%`)
        .limit(limit),
      supabaseClient
        .from('company_members')
        .select('id, full_name, email, role')
        .eq('company_id', companyId)
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(limit),
    ]);

    const results = [];

    for (const a of auftraege ?? []) {
      results.push({
        id: `auftrag_${a.id}`,
        type: 'auftrag',
        title: a.titel ?? `Auftrag #${a.nummer}`,
        subtitle: a.nummer ? `#${a.nummer}` : '',
        category: 'AUFTRÄGE',
        icon: 'Wrench',
        link: `/dashboard/auftraege/${a.id}`,
        badge: a.status ?? null,
        badgeColor: a.status ? getBadgeColor(a.status) : null,
      });
    }

    for (const k of kunden ?? []) {
      results.push({
        id: `kunde_${k.id}`,
        type: 'kunde',
        title: k.firmenname ?? k.name ?? 'Kunde',
        subtitle: k.telefon ?? k.name ?? '',
        category: 'KUNDEN',
        icon: 'Users',
        link: `/dashboard/kunden/${k.id}`,
        badge: null,
        badgeColor: null,
      });
    }

    for (const a of angebote ?? []) {
      results.push({
        id: `angebot_${a.id}`,
        type: 'angebot',
        title: `Angebot ${a.angebotsnummer ?? ''}`.trim(),
        subtitle: a.kunden?.name ?? (a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : ''),
        category: 'ANGEBOTE',
        icon: 'FileCheck',
        link: `/dashboard/angebote/${a.id}`,
        badge: a.status ?? null,
        badgeColor: a.status ? getBadgeColor(a.status) : null,
      });
    }

    for (const r of rechnungen ?? []) {
      results.push({
        id: `rechnung_${r.id}`,
        type: 'rechnung',
        title: `Rechnung ${r.rechnungsnummer ?? ''}`.trim(),
        subtitle: r.kunden?.name ?? (r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : ''),
        category: 'RECHNUNGEN',
        icon: 'FileText',
        link: `/dashboard/rechnungen/${r.id}`,
        badge: r.status ?? null,
        badgeColor: r.status ? getBadgeColor(r.status) : null,
      });
    }

    for (const f of fahrzeuge ?? []) {
      results.push({
        id: `fahrzeug_${f.id}`,
        type: 'fahrzeug',
        title: f.kennzeichen ?? f.bezeichnung ?? 'Fahrzeug',
        subtitle: f.bezeichnung ?? '',
        category: 'FAHRZEUGE',
        icon: 'Truck',
        link: `/dashboard/fahrzeuge/${f.id}`,
        badge: f.zustand ?? null,
        badgeColor: f.zustand ? getBadgeColor(f.zustand) : null,
      });
    }

    for (const m of mitarbeiter ?? []) {
      results.push({
        id: `mitarbeiter_${m.id}`,
        type: 'mitarbeiter',
        title: m.full_name ?? m.email ?? 'Mitarbeiter',
        subtitle: m.email ?? '',
        category: 'MITARBEITER',
        icon: 'User',
        link: '/dashboard/einstellungen/team',
        badge: m.role ?? null,
        badgeColor: m.role ? 'bg-purple-100 text-purple-800' : null,
      });
    }

    return results;
  } catch (err) {
    console.error('[searchEngine] searchAll:', err);
    return [];
  }
}

export function getGlobalActions() {
  return [
    { id: 'new-auftrag',     type: 'action',     title: 'Neuer Auftrag',     subtitle: 'Auftrag erstellen',        category: 'AKTIONEN',   icon: 'PlusCircle',    link: '/dashboard/auftraege/neu',  badge: null, badgeColor: null, shortcut: null },
    { id: 'new-kunde',       type: 'action',     title: 'Neuer Kunde',       subtitle: 'Kunden anlegen',           category: 'AKTIONEN',   icon: 'PlusCircle',    link: '/dashboard/kunden/neu',     badge: null, badgeColor: null, shortcut: null },
    { id: 'new-angebot',     type: 'action',     title: 'Neues Angebot',     subtitle: 'Angebot erstellen',        category: 'AKTIONEN',   icon: 'PlusCircle',    link: '/dashboard/angebote/neu',   badge: null, badgeColor: null, shortcut: null },
    { id: 'new-rechnung',    type: 'action',     title: 'Neue Rechnung',     subtitle: 'Rechnung erstellen',       category: 'AKTIONEN',   icon: 'PlusCircle',    link: '/dashboard/rechnungen/neu', badge: null, badgeColor: null, shortcut: null },
    { id: 'goto-executive',  type: 'navigation', title: 'Executive Center',  subtitle: 'Unternehmens-Cockpit',     category: 'NAVIGATION', icon: 'LayoutDashboard', link: '/dashboard',              badge: null, badgeColor: null, shortcut: null },
    { id: 'goto-finance',    type: 'navigation', title: 'Finanzen',          subtitle: 'Übersicht & Auswertungen', category: 'NAVIGATION', icon: 'CreditCard',    link: '/dashboard/finanzen',       badge: null, badgeColor: null, shortcut: null },
    { id: 'goto-operations', type: 'navigation', title: 'Disposition',       subtitle: 'Einsatzplanung & Karte',   category: 'NAVIGATION', icon: 'Map',           link: '/dashboard/disposition',    badge: null, badgeColor: null, shortcut: null },
    { id: 'goto-mein-tag',   type: 'navigation', title: 'Mein Tag',          subtitle: 'Persönliche Übersicht',    category: 'NAVIGATION', icon: 'User',          link: '/dashboard/mein-tag',       badge: null, badgeColor: null, shortcut: null },
    { id: 'goto-auftraege',  type: 'navigation', title: 'Aufträge',          subtitle: 'Alle Aufträge verwalten',  category: 'NAVIGATION', icon: 'Wrench',        link: '/dashboard/auftraege',      badge: null, badgeColor: null, shortcut: null },
    { id: 'goto-kunden',     type: 'navigation', title: 'Kunden',            subtitle: 'Kundenverwaltung',         category: 'NAVIGATION', icon: 'Users',         link: '/dashboard/kunden',         badge: null, badgeColor: null, shortcut: null },
    { id: 'goto-rechnungen', type: 'navigation', title: 'Rechnungen',        subtitle: 'Rechnungsverwaltung',      category: 'NAVIGATION', icon: 'FileText',      link: '/dashboard/rechnungen',     badge: null, badgeColor: null, shortcut: null },
    { id: 'goto-angebote',   type: 'navigation', title: 'Angebote',          subtitle: 'Angebotsverwaltung',       category: 'NAVIGATION', icon: 'FileCheck',     link: '/dashboard/angebote',       badge: null, badgeColor: null, shortcut: null },
    { id: 'goto-fahrzeuge',  type: 'navigation', title: 'Fahrzeuge',         subtitle: 'Fuhrparkverwaltung',       category: 'NAVIGATION', icon: 'Truck',         link: '/dashboard/fahrzeuge',      badge: null, badgeColor: null, shortcut: null },
  ];
}
