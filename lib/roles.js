import { createClient } from '@/lib/supabase/client';

// ─── Rollen-Definition ───────────────────────────────────────────────────────

export const ROLES = {
  INHABER:       'inhaber',
  ADMINISTRATOR: 'administrator',
  DISPONENT:     'disponent',
  BUERO:         'buero',
  TECHNIKER:     'techniker',
  FAHRER:        'fahrer',
};

export const ROLE_LABELS = {
  inhaber:       'Inhaber',
  administrator: 'Administrator',
  disponent:     'Disponent',
  buero:         'Büro',
  techniker:     'Techniker',
  fahrer:        'Fahrer',
};

export const ROLE_COLORS = {
  inhaber:       'bg-purple-100 text-purple-800',
  administrator: 'bg-blue-100 text-blue-800',
  disponent:     'bg-cyan-100 text-cyan-800',
  buero:         'bg-green-100 text-green-800',
  techniker:     'bg-yellow-100 text-yellow-800',
  fahrer:        'bg-gray-100 text-gray-800',
};

// Rang: höher = mehr Rechte
const ROLE_RANK = {
  inhaber:       6,
  administrator: 5,
  disponent:     4,
  buero:         3,
  techniker:     2,
  fahrer:        1,
};

// ─── Berechtigungsmatrix ─────────────────────────────────────────────────────

export const PERMISSIONS = {
  // Unternehmen
  'company.edit':          ['inhaber', 'administrator'],
  'company.delete':        ['inhaber'],
  'company.billing':       ['inhaber'],

  // Benutzerverwaltung
  'members.view':          ['inhaber', 'administrator', 'disponent', 'buero'],
  'members.invite':        ['inhaber', 'administrator'],
  'members.edit':          ['inhaber', 'administrator'],
  'members.delete':        ['inhaber'],

  // Kunden
  'kunden.view':           ['inhaber', 'administrator', 'disponent', 'buero', 'techniker'],
  'kunden.create':         ['inhaber', 'administrator', 'disponent', 'buero'],
  'kunden.edit':           ['inhaber', 'administrator', 'disponent', 'buero'],
  'kunden.delete':         ['inhaber', 'administrator'],

  // Aufträge
  'auftraege.view':        ['inhaber', 'administrator', 'disponent', 'buero', 'techniker', 'fahrer'],
  'auftraege.create':      ['inhaber', 'administrator', 'disponent', 'buero'],
  'auftraege.edit':        ['inhaber', 'administrator', 'disponent', 'buero', 'techniker'],
  'auftraege.delete':      ['inhaber', 'administrator', 'disponent'],
  'auftraege.assign':      ['inhaber', 'administrator', 'disponent'],

  // Einsatzplanung / Disposition
  'disposition.view':      ['inhaber', 'administrator', 'disponent', 'buero'],
  'disposition.edit':      ['inhaber', 'administrator', 'disponent'],

  // Rechnungen
  'rechnungen.view':       ['inhaber', 'administrator', 'buero'],
  'rechnungen.create':     ['inhaber', 'administrator', 'buero'],
  'rechnungen.edit':       ['inhaber', 'administrator', 'buero'],
  'rechnungen.delete':     ['inhaber', 'administrator'],

  // Digitaler Zwilling / Infrastruktur
  'infrastruktur.view':    ['inhaber', 'administrator', 'disponent', 'buero', 'techniker'],
  'infrastruktur.edit':    ['inhaber', 'administrator', 'techniker'],

  // Fahrzeuge
  'fahrzeuge.view':        ['inhaber', 'administrator', 'disponent', 'techniker', 'fahrer'],
  'fahrzeuge.edit':        ['inhaber', 'administrator', 'disponent'],

  // Maschinen
  'maschinen.view':        ['inhaber', 'administrator', 'disponent', 'techniker'],
  'maschinen.edit':        ['inhaber', 'administrator', 'disponent'],

  // Dokumente
  'dokumente.view':        ['inhaber', 'administrator', 'disponent', 'buero', 'techniker'],
  'dokumente.upload':      ['inhaber', 'administrator', 'disponent', 'buero', 'techniker'],
  'dokumente.delete':      ['inhaber', 'administrator'],

  // Einstellungen
  'einstellungen.view':    ['inhaber', 'administrator', 'buero'],
  'einstellungen.edit':    ['inhaber', 'administrator'],

  // Reports / Auswertungen
  'reports.view':          ['inhaber', 'administrator', 'buero'],
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

export function roleHasPermission(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function hasMinRole(userRole, minRole) {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

export function getPermissionsForRole(role) {
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([permission]) => permission);
}

// ─── Supabase-Hooks ───────────────────────────────────────────────────────────

export async function getMyCompanyAndRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { companyId: null, role: null, member: null };

  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, role, vorname, nachname, avatar_url')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!member) return { companyId: null, role: null, member: null };

  return {
    companyId: member.company_id,
    role: member.role,
    member,
  };
}

export async function currentUserCan(permission) {
  const { role } = await getMyCompanyAndRole();
  if (!role) return false;
  return roleHasPermission(role, permission);
}
