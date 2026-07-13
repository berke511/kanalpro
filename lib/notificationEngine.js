// lib/notificationEngine.js
// OS-002 Notification Engine — KanalPro
// Shared utility — no 'use client'. Works in both Server Components and client hooks.

/**
 * Notification data model:
 * {
 *   id:        string,    // e.g. "rechnung_123_ueberfaellig"
 *   title:     string,    // short headline
 *   message:   string,    // detail text
 *   priority:  'critical' | 'warning' | 'info' | 'success',
 *   icon:      string,    // Lucide icon name
 *   color:     string,    // Tailwind class e.g. 'text-red-500'
 *   bgColor:   string,    // e.g. 'bg-red-50'
 *   timestamp: string,    // ISO 8601
 *   link:      string,    // e.g. '/dashboard/rechnungen/123'
 *   source:    string,    // table name
 *   read:      boolean,   // always false (no persistent read-state without DB schema)
 * }
 */

/**
 * Returns priority level for a notification item.
 * @param {object} item
 * @returns {'critical' | 'warning' | 'info' | 'success'}
 */
export function getNotificationPriority(item) {
  return item.priority ?? 'info';
}

/**
 * Groups notifications into heute / gestern / aelter buckets.
 * @param {object[]} items
 * @returns {{ heute: object[], gestern: object[], aelter: object[] }}
 */
export function groupNotifications(items) {
  const now          = new Date();
  const heuteStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const gesternStart = new Date(heuteStart.getTime() - 86400000);

  const heute   = [];
  const gestern = [];
  const aelter  = [];

  for (const item of items) {
    const ts = new Date(item.timestamp);
    if (isNaN(ts.getTime())) { aelter.push(item); continue; }
    if (ts >= heuteStart)   { heute.push(item);   continue; }
    if (ts >= gesternStart) { gestern.push(item);  continue; }
    aelter.push(item);
  }

  return { heute, gestern, aelter };
}

/**
 * Stub — marks a notification as read (no persistent state without DB schema).
 * @param {string} _id
 * @returns {Promise<void>}
 */
export async function markAsRead(_id) {
  return Promise.resolve();
}

/**
 * Returns only unread notifications (used for badge count).
 * @param {object} supabaseClient
 * @param {string} companyId
 * @returns {Promise<object[]>}
 */
export async function getUnreadNotifications(supabaseClient, companyId) {
  const all = await getNotifications(supabaseClient, companyId, { limit: 100 });
  return all.filter(n => !n.read);
}

/**
 * Fetches all notification-worthy events from the DB and maps them onto
 * the Notification data model. All 10 sources run in parallel via Promise.all.
 *
 * @param {object} supabaseClient
 * @param {string} companyId
 * @param {{ limit?: number }} options
 * @returns {Promise<object[]>} sorted DESC by timestamp, sliced to limit
 */
export async function getNotifications(supabaseClient, companyId, options = {}) {
  const limit  = options.limit ?? 50;
  const now    = new Date();
  const heute  = now.toISOString().split('T')[0];
  const vor24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const vor48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  try {
    const [
      { data: notfallOhneT    },
      { data: fahrzAusser     },
      { data: auftrUeberfaellig },
      { data: rechnUeberfaellig },
      { data: angAbgelaufen   },
      { data: auftrOhneTechn  },
      { data: neueAuftraege   },
      { data: neueKunden      },
      { data: bezahltRech     },
      { data: angenommAng     },
    ] = await Promise.all([

      // CRITICAL 1: Notfall-Auftraege ohne Techniker, nicht abgeschlossen
      supabaseClient
        .from('auftraege')
        .select('id, titel, nummer, datum, erstellt_am')
        .eq('company_id', companyId)
        .eq('prioritaet', 'notfall')
        .neq('status', 'abgeschlossen')
        .is('techniker_id', null)
        .limit(20),

      // CRITICAL 2: Fahrzeuge ausser Betrieb
      supabaseClient
        .from('fahrzeuge')
        .select('id, kennzeichen, bezeichnung, updated_at, erstellt_am')
        .eq('company_id', companyId)
        .eq('zustand', 'ausser_betrieb')
        .limit(20),

      // WARNING 1: Ueberfaellige Auftraege (datum < heute, nicht abgeschlossen)
      supabaseClient
        .from('auftraege')
        .select('id, titel, nummer, datum, erstellt_am')
        .eq('company_id', companyId)
        .lt('datum', heute)
        .neq('status', 'abgeschlossen')
        .not('datum', 'is', null)
        .limit(20),

      // WARNING 2: Ueberfaellige Rechnungen
      supabaseClient
        .from('rechnungen')
        .select('id, rechnungsnummer, faelligkeitsdatum, erstellt_am, kunden(name)')
        .eq('company_id', companyId)
        .eq('status', 'gesendet')
        .lt('faelligkeitsdatum', heute)
        .not('faelligkeitsdatum', 'is', null)
        .limit(20),

      // WARNING 3: Abgelaufene Angebote
      supabaseClient
        .from('angebote')
        .select('id, angebotsnummer, gueltig_bis, erstellt_am, kunden(name)')
        .eq('company_id', companyId)
        .eq('status', 'gesendet')
        .lt('gueltig_bis', heute)
        .not('gueltig_bis', 'is', null)
        .limit(20),

      // WARNING 4: Offene Auftraege ohne Techniker
      supabaseClient
        .from('auftraege')
        .select('id, titel, nummer, erstellt_am')
        .eq('company_id', companyId)
        .eq('status', 'offen')
        .is('techniker_id', null)
        .limit(20),

      // INFO 1: Neue Auftraege (letzte 24 h)
      supabaseClient
        .from('auftraege')
        .select('id, titel, nummer, erstellt_am')
        .eq('company_id', companyId)
        .gte('erstellt_am', vor24h)
        .order('erstellt_am', { ascending: false })
        .limit(10),

      // INFO 2: Neue Kunden (letzte 24 h)
      supabaseClient
        .from('kunden')
        .select('id, name, firmenname, erstellt_am')
        .eq('company_id', companyId)
        .gte('erstellt_am', vor24h)
        .order('erstellt_am', { ascending: false })
        .limit(10),

      // SUCCESS 1: Bezahlte Rechnungen (letzte 48 h)
      supabaseClient
        .from('rechnungen')
        .select('id, rechnungsnummer, bezahlt_am, erstellt_am, kunden(name)')
        .eq('company_id', companyId)
        .eq('status', 'bezahlt')
        .gte('bezahlt_am', vor48h)
        .not('bezahlt_am', 'is', null)
        .order('bezahlt_am', { ascending: false })
        .limit(10),

      // SUCCESS 2: Angenommene Angebote (letzte 48 h)
      supabaseClient
        .from('angebote')
        .select('id, angebotsnummer, erstellt_am, kunden(name)')
        .eq('company_id', companyId)
        .eq('status', 'angenommen')
        .gte('erstellt_am', vor48h)
        .order('erstellt_am', { ascending: false })
        .limit(10),
    ]);

    const notifications = [];

    // CRITICAL: Notdienst unbesetzt
    for (const a of (notfallOhneT ?? [])) {
      const nr = a.nummer ? `#${a.nummer}` : (a.titel ?? '');
      notifications.push({
        id:        `notfall_unbesetzt_${a.id}`,
        title:     'Notdienst unbesetzt',
        message:   `Auftrag ${nr} — kein Techniker zugewiesen`,
        priority:  'critical',
        icon:      'AlertTriangle',
        color:     'text-red-600',
        bgColor:   'bg-red-50',
        timestamp: a.datum ?? a.erstellt_am ?? now.toISOString(),
        link:      `/dashboard/auftraege/${a.id}`,
        source:    'auftraege',
        read:      false,
      });
    }

    // CRITICAL: Fahrzeug ausser Betrieb
    for (const f of (fahrzAusser ?? [])) {
      notifications.push({
        id:        `fahrzeug_ausser_betrieb_${f.id}`,
        title:     'Fahrzeug außer Betrieb',
        message:   f.bezeichnung ?? f.kennzeichen ?? 'Unbekanntes Fahrzeug',
        priority:  'critical',
        icon:      'AlertTriangle',
        color:     'text-red-600',
        bgColor:   'bg-red-50',
        timestamp: f.updated_at ?? f.erstellt_am ?? now.toISOString(),
        link:      '/dashboard/fahrzeuge',
        source:    'fahrzeuge',
        read:      false,
      });
    }

    // WARNING: Einsatz ueberfaellig
    for (const a of (auftrUeberfaellig ?? [])) {
      const nr   = a.nummer ? `#${a.nummer}` : (a.titel ?? '');
      const date = a.datum
        ? new Date(a.datum).toLocaleDateString('de-DE')
        : '?';
      notifications.push({
        id:        `auftrag_ueberfaellig_${a.id}`,
        title:     'Einsatz überfällig',
        message:   `Auftrag ${nr} — war für ${date} geplant`,
        priority:  'warning',
        icon:      'AlertCircle',
        color:     'text-amber-600',
        bgColor:   'bg-amber-50',
        timestamp: a.datum ?? a.erstellt_am ?? now.toISOString(),
        link:      `/dashboard/auftraege/${a.id}`,
        source:    'auftraege',
        read:      false,
      });
    }

    // WARNING: Rechnung ueberfaellig
    for (const r of (rechnUeberfaellig ?? [])) {
      const date = r.faelligkeitsdatum
        ? new Date(r.faelligkeitsdatum).toLocaleDateString('de-DE')
        : '?';
      notifications.push({
        id:        `rechnung_ueberfaellig_${r.id}`,
        title:     'Rechnung überfällig',
        message:   `${r.rechnungsnummer ?? '–'} — ${r.kunden?.name ?? 'Unbekannter Kunde'} — fällig seit ${date}`,
        priority:  'warning',
        icon:      'AlertCircle',
        color:     'text-amber-600',
        bgColor:   'bg-amber-50',
        timestamp: r.faelligkeitsdatum ?? r.erstellt_am ?? now.toISOString(),
        link:      `/dashboard/rechnungen/${r.id}`,
        source:    'rechnungen',
        read:      false,
      });
    }

    // WARNING: Angebot abgelaufen
    for (const a of (angAbgelaufen ?? [])) {
      const date = a.gueltig_bis
        ? new Date(a.gueltig_bis).toLocaleDateString('de-DE')
        : '?';
      notifications.push({
        id:        `angebot_abgelaufen_${a.id}`,
        title:     'Angebot abgelaufen',
        message:   `${a.angebotsnummer ?? '–'} — ${a.kunden?.name ?? 'Unbekannter Kunde'} — abgelaufen am ${date}`,
        priority:  'warning',
        icon:      'AlertCircle',
        color:     'text-amber-600',
        bgColor:   'bg-amber-50',
        timestamp: a.gueltig_bis ?? a.erstellt_am ?? now.toISOString(),
        link:      `/dashboard/angebote/${a.id}`,
        source:    'angebote',
        read:      false,
      });
    }

    // WARNING: Auftrag ohne Techniker (deduplicate with CRITICAL-1)
    const criticalIds = new Set((notfallOhneT ?? []).map(a => String(a.id)));
    for (const a of (auftrOhneTechn ?? [])) {
      if (criticalIds.has(String(a.id))) continue;
      const nr = a.nummer ? `#${a.nummer}` : (a.titel ?? '');
      notifications.push({
        id:        `auftrag_ohne_techniker_${a.id}`,
        title:     'Auftrag ohne Techniker',
        message:   `Auftrag ${nr} ist noch keinem Techniker zugewiesen`,
        priority:  'warning',
        icon:      'AlertCircle',
        color:     'text-amber-600',
        bgColor:   'bg-amber-50',
        timestamp: a.erstellt_am ?? now.toISOString(),
        link:      `/dashboard/auftraege/${a.id}`,
        source:    'auftraege',
        read:      false,
      });
    }

    // INFO: Neuer Auftrag
    for (const a of (neueAuftraege ?? [])) {
      const nr = a.nummer ? `#${a.nummer}` : (a.titel ?? '');
      notifications.push({
        id:        `neuer_auftrag_${a.id}`,
        title:     'Neuer Auftrag',
        message:   `Auftrag ${nr} wurde erstellt`,
        priority:  'info',
        icon:      'Info',
        color:     'text-blue-600',
        bgColor:   'bg-blue-50',
        timestamp: a.erstellt_am ?? now.toISOString(),
        link:      `/dashboard/auftraege/${a.id}`,
        source:    'auftraege',
        read:      false,
      });
    }

    // INFO: Neuer Kunde
    for (const k of (neueKunden ?? [])) {
      const name = k.firmenname ?? k.name ?? 'Unbekannt';
      notifications.push({
        id:        `neuer_kunde_${k.id}`,
        title:     'Neuer Kunde',
        message:   `${name} wurde angelegt`,
        priority:  'info',
        icon:      'Info',
        color:     'text-blue-600',
        bgColor:   'bg-blue-50',
        timestamp: k.erstellt_am ?? now.toISOString(),
        link:      `/dashboard/kunden/${k.id}`,
        source:    'kunden',
        read:      false,
      });
    }

    // SUCCESS: Zahlung eingegangen
    for (const r of (bezahltRech ?? [])) {
      notifications.push({
        id:        `zahlung_eingegangen_${r.id}`,
        title:     'Zahlung eingegangen',
        message:   `Rechnung ${r.rechnungsnummer ?? '–'} — ${r.kunden?.name ?? ''} wurde bezahlt`,
        priority:  'success',
        icon:      'CheckCircle',
        color:     'text-green-600',
        bgColor:   'bg-green-50',
        timestamp: r.bezahlt_am ?? r.erstellt_am ?? now.toISOString(),
        link:      `/dashboard/rechnungen/${r.id}`,
        source:    'rechnungen',
        read:      false,
      });
    }

    // SUCCESS: Angebot angenommen
    for (const a of (angenommAng ?? [])) {
      notifications.push({
        id:        `angebot_angenommen_${a.id}`,
        title:     'Angebot angenommen',
        message:   `Angebot ${a.angebotsnummer ?? '–'} — ${a.kunden?.name ?? ''} wurde angenommen`,
        priority:  'success',
        icon:      'CheckCircle',
        color:     'text-green-600',
        bgColor:   'bg-green-50',
        timestamp: a.erstellt_am ?? now.toISOString(),
        link:      `/dashboard/angebote/${a.id}`,
        source:    'angebote',
        read:      false,
      });
    }

    // Sort DESC by timestamp, apply limit
    return notifications
      .filter(n => Boolean(n.timestamp))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

  } catch (err) {
    console.error('[NotificationEngine] getNotifications:', err);
    return [];
  }
}
