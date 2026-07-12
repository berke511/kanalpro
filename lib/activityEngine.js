// lib/activityEngine.js
// OS-001 Global Activity Engine — KanalPro
// Shared utility — no 'use client'. Works in both Server Components and client hooks.

const ICON_MAP = {
  auftrag_erstellt:       { icon: 'Wrench',        color: 'text-blue-500'   },
  auftrag_geplant:        { icon: 'Wrench',        color: 'text-blue-400'   },
  auftrag_in_bearbeitung: { icon: 'Wrench',        color: 'text-blue-600'   },
  auftrag_abgeschlossen:  { icon: 'CheckCircle',   color: 'text-green-500'  },
  rechnung_erstellt:      { icon: 'FileText',      color: 'text-purple-500' },
  rechnung_gesendet:      { icon: 'FileText',      color: 'text-blue-500'   },
  rechnung_bezahlt:       { icon: 'CreditCard',    color: 'text-green-600'  },
  angebot_erstellt:       { icon: 'FileCheck',     color: 'text-orange-500' },
  angebot_angenommen:     { icon: 'FileCheck',     color: 'text-green-500'  },
  angebot_abgelehnt:      { icon: 'FileCheck',     color: 'text-red-500'    },
  kunde_angelegt:         { icon: 'User',          color: 'text-gray-500'   },
  notdienst:              { icon: 'AlertTriangle', color: 'text-red-500'    },
  einsatz_dokumentiert:   { icon: 'ClipboardList', color: 'text-blue-400'   },
};

function getIconConfig(type) {
  return ICON_MAP[type] ?? { icon: 'Activity', color: 'text-gray-400' };
}

// ─── Mapper Functions ───────────────────────────────────────────────────────

function mapAuftrag(a) {
  const s = a.status ?? '';
  let type = 'auftrag_erstellt';
  let ts   = a.erstellt_am ?? a.created_at ?? new Date().toISOString();

  if (s === 'abgeschlossen' || s === 'Abgeschlossen') {
    type = 'auftrag_abgeschlossen';
    ts   = a.einsatzdatum ?? a.datum ?? ts;
  } else if (s === 'in_bearbeitung' || s === 'In Arbeit') {
    type = 'auftrag_in_bearbeitung';
    ts   = a.einsatzdatum ?? a.datum ?? ts;
  } else if (s === 'Geplant' || s === 'Zugewiesen') {
    type = 'auftrag_geplant';
    ts   = a.einsatzdatum ?? a.datum ?? ts;
  }

  const { icon, color } = getIconConfig(type);
  const nr   = a.nummer ? `#${a.nummer}` : '';
  const verb = type === 'auftrag_abgeschlossen' ? 'abgeschlossen'
    : type === 'auftrag_geplant'        ? 'geplant'
    : type === 'auftrag_in_bearbeitung' ? 'in Bearbeitung'
    : 'erstellt';

  return {
    id:          `auftrag_${a.id}`,
    type,
    title:       `Auftrag ${nr} ${verb}`.trim(),
    description: a.titel ?? '',
    timestamp:   ts,
    entity:      'auftraege',
    entityId:    String(a.id),
    status:      s,
    icon,
    color,
    link:        `/dashboard/auftraege/${a.id}`,
    source:      'auftraege',
  };
}

function mapRechnung(r) {
  let type = 'rechnung_erstellt';
  let ts   = r.erstellt_am ?? r.datum ?? new Date().toISOString();

  if (r.status === 'bezahlt') {
    type = 'rechnung_bezahlt';
    ts   = r.bezahlt_am ?? r.datum ?? ts;
  } else if (r.status === 'gesendet') {
    type = 'rechnung_gesendet';
    ts   = r.datum ?? ts;
  }

  const { icon, color } = getIconConfig(type);
  const verb = type === 'rechnung_bezahlt'  ? 'bezahlt'
    : type === 'rechnung_gesendet' ? 'gesendet'
    : 'erstellt';

  return {
    id:          `rechnung_${r.id}`,
    type,
    title:       `Rechnung ${r.rechnungsnummer ?? ''} ${verb}`.trim(),
    description: r.kunden?.name ?? '',
    timestamp:   ts,
    entity:      'rechnungen',
    entityId:    String(r.id),
    status:      r.status ?? '',
    icon,
    color,
    link:        `/dashboard/rechnungen/${r.id}`,
    source:      'rechnungen',
  };
}

function mapAngebot(a) {
  let type = 'angebot_erstellt';
  const ts = a.erstellt_am ?? a.datum ?? new Date().toISOString();

  if (a.status === 'angenommen')  type = 'angebot_angenommen';
  else if (a.status === 'abgelehnt') type = 'angebot_abgelehnt';

  const { icon, color } = getIconConfig(type);
  const verb = type === 'angebot_angenommen' ? 'angenommen'
    : type === 'angebot_abgelehnt' ? 'abgelehnt'
    : 'erstellt';

  return {
    id:          `angebot_${a.id}`,
    type,
    title:       `Angebot ${a.angebotsnummer ?? ''} ${verb}`.trim(),
    description: a.kunden?.name ?? '',
    timestamp:   ts,
    entity:      'angebote',
    entityId:    String(a.id),
    status:      a.status ?? '',
    icon,
    color,
    link:        `/dashboard/angebote/${a.id}`,
    source:      'angebote',
  };
}

function mapKunde(k) {
  const { icon, color } = getIconConfig('kunde_angelegt');
  const ts   = k.erstellt_am ?? k.created_at ?? new Date().toISOString();
  const name = k.firmenname ?? k.name ?? '';

  return {
    id:          `kunde_${k.id}`,
    type:        'kunde_angelegt',
    title:       `Kunde ${name} angelegt`.trim(),
    description: k.kundentyp === 'firma' ? 'Firma' : 'Privatkunde',
    timestamp:   ts,
    entity:      'kunden',
    entityId:    String(k.id),
    status:      k.kundentyp ?? '',
    icon,
    color,
    link:        `/dashboard/kunden/${k.id}`,
    source:      'kunden',
  };
}

function mapEinsatzDoku(d) {
  const { icon, color } = getIconConfig('einsatz_dokumentiert');
  const ts = d.arbeit_ende ?? d.arbeit_start ?? d.erstellt_am ?? new Date().toISOString();

  return {
    id:          `doku_${d.id}`,
    type:        'einsatz_dokumentiert',
    title:       'Einsatz dokumentiert',
    description: d.durchgefuehrte_arbeiten ?? '',
    timestamp:   ts,
    entity:      'einsatz_dokumentation',
    entityId:    String(d.id),
    status:      'dokumentiert',
    icon,
    color,
    link:        d.auftrag_id ? `/dashboard/auftraege/${d.auftrag_id}` : '#',
    source:      'einsatz_dokumentation',
  };
}

function sortDesc(activities) {
  return activities
    .filter(a => Boolean(a.timestamp))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Unified company-wide activity timeline.
 * Sources: auftraege, rechnungen, angebote, kunden — all via Promise.all.
 *
 * @param {object}   supabaseClient
 * @param {string}   companyId
 * @param {{ limit?: number, types?: string[] }} options
 * @returns {Promise<Activity[]>}  sorted DESC by timestamp
 */
export async function getActivities(supabaseClient, companyId, options = {}) {
  const limit = options.limit ?? 20;
  try {
    const [
      { data: auftraege  },
      { data: rechnungen },
      { data: angebote   },
      { data: kunden     },
    ] = await Promise.all([
      supabaseClient
        .from('auftraege')
        .select('id, titel, status, datum, erstellt_am, created_at, einsatzdatum, nummer')
        .eq('company_id', companyId)
        .order('erstellt_am', { ascending: false })
        .limit(limit),
      supabaseClient
        .from('rechnungen')
        .select('id, rechnungsnummer, status, datum, erstellt_am, bezahlt_am, kunden(name)')
        .eq('company_id', companyId)
        .order('erstellt_am', { ascending: false })
        .limit(limit),
      supabaseClient
        .from('angebote')
        .select('id, angebotsnummer, status, datum, erstellt_am, kunden(name)')
        .eq('company_id', companyId)
        .order('erstellt_am', { ascending: false })
        .limit(limit),
      supabaseClient
        .from('kunden')
        .select('id, name, firmenname, kundentyp, erstellt_am, created_at')
        .eq('company_id', companyId)
        .order('erstellt_am', { ascending: false })
        .limit(limit),
    ]);

    let activities = [
      ...(auftraege  ?? []).map(mapAuftrag),
      ...(rechnungen ?? []).map(mapRechnung),
      ...(angebote   ?? []).map(mapAngebot),
      ...(kunden     ?? []).map(mapKunde),
    ];

    if (options.types?.length) {
      activities = activities.filter(a => options.types.includes(a.type));
    }

    return sortDesc(activities).slice(0, limit);
  } catch (err) {
    console.error('[ActivityEngine] getActivities:', err);
    return [];
  }
}

/**
 * Activity timeline scoped to a single customer.
 * Sources: auftraege (kunde_id), rechnungen (kunde_id), angebote (kunden_id).
 *
 * @param {object} supabaseClient
 * @param {string} customerId
 * @param {string} companyId
 * @returns {Promise<Activity[]>}
 */
export async function getCustomerActivities(supabaseClient, customerId, companyId) {
  try {
    const [
      { data: auftraege  },
      { data: rechnungen },
      { data: angebote   },
    ] = await Promise.all([
      supabaseClient
        .from('auftraege')
        .select('id, titel, status, datum, erstellt_am, created_at, einsatzdatum, nummer')
        .eq('kunde_id', customerId)
        .eq('company_id', companyId)
        .order('erstellt_am', { ascending: false }),
      supabaseClient
        .from('rechnungen')
        .select('id, rechnungsnummer, status, datum, erstellt_am, bezahlt_am')
        .eq('kunde_id', customerId)
        .order('erstellt_am', { ascending: false }),
      supabaseClient
        .from('angebote')
        .select('id, angebotsnummer, status, datum, erstellt_am')
        .eq('kunden_id', customerId)
        .order('erstellt_am', { ascending: false }),
    ]);

    const activities = [
      ...(auftraege  ?? []).map(mapAuftrag),
      ...(rechnungen ?? []).map(mapRechnung),
      ...(angebote   ?? []).map(mapAngebot),
    ];

    return sortDesc(activities);
  } catch (err) {
    console.error('[ActivityEngine] getCustomerActivities:', err);
    return [];
  }
}

/**
 * Activity timeline for a single work order.
 * Sources: the auftrag itself, linked rechnungen (auftrag_id), einsatz_dokumentation (auftrag_id).
 *
 * @param {object} supabaseClient
 * @param {string} orderId
 * @param {string} companyId
 * @returns {Promise<Activity[]>}
 */
export async function getOrderActivities(supabaseClient, orderId, companyId) {
  try {
    const [
      { data: auftrag        },
      { data: rechnungen     },
      { data: dokumentationen },
    ] = await Promise.all([
      supabaseClient
        .from('auftraege')
        .select('id, titel, status, datum, erstellt_am, created_at, einsatzdatum, nummer')
        .eq('id', orderId)
        .single(),
      supabaseClient
        .from('rechnungen')
        .select('id, rechnungsnummer, status, datum, erstellt_am, bezahlt_am')
        .eq('auftrag_id', orderId)
        .order('erstellt_am', { ascending: false }),
      supabaseClient
        .from('einsatz_dokumentation')
        .select('id, auftrag_id, durchgefuehrte_arbeiten, arbeit_start, arbeit_ende, erstellt_am')
        .eq('auftrag_id', orderId)
        .order('erstellt_am', { ascending: false }),
    ]);

    const activities = [
      ...(auftrag         ? [mapAuftrag(auftrag)] : []),
      ...(rechnungen      ?? []).map(mapRechnung),
      ...(dokumentationen ?? []).map(mapEinsatzDoku),
    ];

    return sortDesc(activities);
  } catch (err) {
    console.error('[ActivityEngine] getOrderActivities:', err);
    return [];
  }
}

/**
 * Activity timeline for a single technician.
 * Sources: auftraege where techniker_id = technicianId.
 *
 * @param {object} supabaseClient
 * @param {string} technicianId
 * @param {string} companyId
 * @returns {Promise<Activity[]>}
 */
export async function getTechnicianActivities(supabaseClient, technicianId, companyId) {
  try {
    const { data: auftraege } = await supabaseClient
      .from('auftraege')
      .select('id, titel, status, datum, erstellt_am, created_at, einsatzdatum, nummer')
      .eq('techniker_id', technicianId)
      .eq('company_id', companyId)
      .order('einsatzdatum', { ascending: false });

    return sortDesc((auftraege ?? []).map(mapAuftrag));
  } catch (err) {
    console.error('[ActivityEngine] getTechnicianActivities:', err);
    return [];
  }
}
