'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import {
  ROLES, ROLE_LABELS, ROLE_COLORS, PERMISSIONS,
  roleHasPermission, hasMinRole,
} from '@/lib/roles';

// Berechtigungs-Kategorien für Anzeige
const PERM_GROUPS = [
  {
    label: 'Kunden',
    perms: ['kunden.view','kunden.create','kunden.edit','kunden.delete'],
  },
  {
    label: 'Aufträge',
    perms: ['auftraege.view','auftraege.create','auftraege.edit','auftraege.delete','auftraege.assign'],
  },
  {
    label: 'Rechnungen',
    perms: ['rechnungen.view','rechnungen.create','rechnungen.edit','rechnungen.delete'],
  },
  {
    label: 'Einsatzplanung',
    perms: ['disposition.view','disposition.edit'],
  },
  {
    label: 'Fahrzeuge',
    perms: ['fahrzeuge.view','fahrzeuge.edit'],
  },
  {
    label: 'Dokumente',
    perms: ['dokumente.view','dokumente.upload','dokumente.delete'],
  },
  {
    label: 'Unternehmen',
    perms: ['company.edit','company.billing','members.view','members.invite','members.edit','members.delete'],
  },
  {
    label: 'Einstellungen',
    perms: ['einstellungen.view','einstellungen.edit'],
  },
];

const PERM_LABELS = {
  'kunden.view':          'Kunden anzeigen',
  'kunden.create':        'Kunden erstellen',
  'kunden.edit':          'Kunden bearbeiten',
  'kunden.delete':        'Kunden löschen',
  'auftraege.view':       'Aufträge anzeigen',
  'auftraege.create':     'Aufträge erstellen',
  'auftraege.edit':       'Aufträge bearbeiten',
  'auftraege.delete':     'Aufträge löschen',
  'auftraege.assign':     'Aufträge zuweisen',
  'rechnungen.view':      'Rechnungen anzeigen',
  'rechnungen.create':    'Rechnungen erstellen',
  'rechnungen.edit':      'Rechnungen bearbeiten',
  'rechnungen.delete':    'Rechnungen löschen',
  'disposition.view':     'Einsatzplanung anzeigen',
  'disposition.edit':     'Einsatzplanung bearbeiten',
  'fahrzeuge.view':       'Fahrzeuge anzeigen',
  'fahrzeuge.edit':       'Fahrzeuge bearbeiten',
  'dokumente.view':       'Dokumente anzeigen',
  'dokumente.upload':     'Dokumente hochladen',
  'dokumente.delete':     'Dokumente löschen',
  'company.edit':         'Unternehmen bearbeiten',
  'company.billing':      'Abonnement verwalten',
  'members.view':         'Teammitglieder anzeigen',
  'members.invite':       'Mitglieder einladen',
  'members.edit':         'Mitglieder bearbeiten',
  'members.delete':       'Mitglieder entfernen',
  'einstellungen.view':   'Einstellungen anzeigen',
  'einstellungen.edit':   'Einstellungen bearbeiten',
};

const ROLE_DESCRIPTIONS = {
  inhaber:       'Vollzugriff auf alle Bereiche. Kann Abonnement und Billing verwalten.',
  administrator: 'Vollzugriff auf alle Bereiche außer Billing. Kann Team verwalten.',
  disponent:     'Kann Aufträge planen, Mitarbeiter und Fahrzeuge koordinieren.',
  buero:         'Kann Kunden, Aufträge und Rechnungen verwalten.',
  techniker:     'Kann eigene Aufträge und Dokumentation verwalten.',
  fahrer:        'Kann eigene Aufträge anzeigen.',
};

const ROLE_ORDER = ['inhaber', 'administrator', 'disponent', 'buero', 'techniker', 'fahrer'];

export default function RollenUndRechte() {
  const router = useRouter();
  const [myRole, setMyRole] = useState(null);
  const [myMemberId, setMyMemberId] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [members, setMembers] = useState([]);
  const [laden, setLaden] = useState(true);
  const [saving, setSaving] = useState(null); // member id being saved
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'rechte'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: me } = await supabase
        .from('company_members')
        .select('id, role, company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!me) { router.push('/dashboard'); return; }

      // Nur Inhaber + Administrator dürfen diese Seite sehen
      if (!hasMinRole(me.role, 'administrator')) {
        router.push('/dashboard/einstellungen');
        return;
      }

      setMyRole(me.role);
      setMyMemberId(me.id);
      setCompanyId(me.company_id);

      const { data: allMembers } = await supabase
        .from('company_members')
        .select('id, user_id, vorname, nachname, role, is_active, avatar_url')
        .eq('company_id', me.company_id)
        .eq('is_active', true)
        .order('role');

      setMembers(allMembers ?? []);
      setLaden(false);
    }
    load();
  }, []);

  async function changeRole(memberId, newRole) {
    // Inhaber-Rolle kann nicht vergeben werden (außer vom Inhaber selbst)
    if (newRole === 'inhaber' && myRole !== 'inhaber') return;
    setSaving(memberId);
    await supabase
      .from('company_members')
      .update({ role: newRole })
      .eq('id', memberId)
      .eq('company_id', companyId);

    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    setSaving(null);
  }

  const editableRoles = myRole === 'inhaber'
    ? ROLE_ORDER
    : ROLE_ORDER.filter(r => r !== 'inhaber');

  if (laden) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/einstellungen" className="text-gray-400 hover:text-gray-600 text-sm">← Einstellungen</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Rollen & Rechte</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-7">
        {[
          { key: 'team',   label: 'Team-Rollen' },
          { key: 'rechte', label: 'Berechtigungen' },
          { key: 'rollen', label: 'Rollen-Übersicht' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Team-Rollen ──────────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Teammitglieder & Rollen</h2>
            <p className="text-sm text-gray-400 mt-0.5">Weise jedem Mitglied die passende Rolle zu.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {members.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Keine Mitglieder gefunden</div>
            ) : members.map(m => {
              const name = [m.vorname, m.nachname].filter(Boolean).join(' ') || 'Unbekannt';
              const isSelf = m.id === myMemberId;
              const isInhaber = m.role === 'inhaber';
              const canEdit = !isSelf && !(isInhaber && myRole !== 'inhaber');

              return (
                <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                    {name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">{name}</p>
                      {isSelf && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Du</span>}
                    </div>
                    <span className={`inline-flex mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {!canEdit ? (
                      <span className="text-xs text-gray-400 px-3 py-2">
                        {isSelf ? 'Eigene Rolle' : 'Nicht änderbar'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {saving === m.id && (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        )}
                        <select
                          value={m.role}
                          onChange={e => changeRole(m.id, e.target.value)}
                          disabled={saving === m.id}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        >
                          {editableRoles.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Berechtigungsmatrix ──────────────────────────────────────── */}
      {activeTab === 'rechte' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Berechtigungsmatrix</h2>
            <p className="text-sm text-gray-400 mt-0.5">Übersicht aller Berechtigungen je Rolle. Individuelle Anpassungen folgen.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500 w-56">Berechtigung</th>
                  {ROLE_ORDER.map(r => (
                    <th key={r} className="px-4 py-3 font-medium text-gray-500 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS[r]}`}>
                        {ROLE_LABELS[r]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_GROUPS.map(group => (
                  <>
                    <tr key={`group-${group.label}`} className="bg-gray-50/70">
                      <td colSpan={ROLE_ORDER.length + 1} className="px-6 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {group.label}
                      </td>
                    </tr>
                    {group.perms.map(perm => (
                      <tr key={perm} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-2.5 text-gray-600">
                          {PERM_LABELS[perm] ?? perm}
                        </td>
                        {ROLE_ORDER.map(r => (
                          <td key={r} className="px-4 py-2.5 text-center">
                            {roleHasPermission(r, perm) ? (
                              <span className="text-emerald-500 text-base">✓</span>
                            ) : (
                              <span className="text-gray-200 text-base">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Rollen-Übersicht ─────────────────────────────────────────── */}
      {activeTab === 'rollen' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLE_ORDER.map(r => {
            const count = members.filter(m => m.role === r).length;
            return (
              <div key={r} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-sm font-semibold ${ROLE_COLORS[r]}`}>
                    {ROLE_LABELS[r]}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {count} {count === 1 ? 'Person' : 'Personen'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {ROLE_DESCRIPTIONS[r]}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs text-gray-400 font-medium mb-1.5">Wichtigste Rechte:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(PERMISSIONS)
                      .filter(([, roles]) => roles.includes(r))
                      .slice(0, 4)
                      .map(([perm]) => (
                        <span key={perm} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md">
                          {PERM_LABELS[perm]?.replace(/^.+\s/, '') ?? perm}
                        </span>
                      ))}
                    {Object.entries(PERMISSIONS).filter(([, roles]) => roles.includes(r)).length > 4 && (
                      <span className="text-xs text-gray-400 px-1">+{Object.entries(PERMISSIONS).filter(([, roles]) => roles.includes(r)).length - 4} weitere</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info-Box */}
      <div className="mt-6 px-5 py-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex items-start gap-3">
        <span className="text-lg shrink-0">ℹ️</span>
        <div>
          <p className="font-medium mb-0.5">Rollenbasierte Zugriffskontrolle</p>
          <p className="text-blue-600">Individuelle Anpassung der Berechtigungen pro Rolle folgt in einem nächsten Update. Aktuell gelten die oben gezeigten Standardberechtigungen.</p>
        </div>
      </div>
    </div>
  );
}
