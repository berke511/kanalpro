'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles';
import { PLANS } from '@/lib/plans';
import StorageBar from '@/components/StorageBar';
import TabNav from '@/components/ui/TabNav';
import { PageHeader, PrimaryButton } from '@/components/ui/KanalProUI';
import { CheckCircle, LogOut } from 'lucide-react';

const INVITABLE_ROLES = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'disponent',     label: 'Disponent'     },
  { value: 'buero',         label: 'Büro'           },
  { value: 'techniker',     label: 'Techniker'      },
  { value: 'fahrer',        label: 'Fahrer'         },
];

const EINSTELLUNGEN_TABS = [
  { id: 'team',   label: 'Team'              },
  { id: 'firma',  label: 'Firmendaten'        },
  { id: 'konto',  label: 'Konto & Sicherheit' },
  { id: 'rollen', label: 'Rollen & Rechte'    },
];

export default function Einstellungen() {
  const router = useRouter();

  // Tab
  const [activeTab, setActiveTab] = useState('team');

  // Auth & Konto
  const [user, setUser] = useState(null);

  // Team
  const [myMember, setMyMember] = useState(null);
  const [company, setCompany] = useState(null);
  const [members, setMembers] = useState([]);
  const [einladungen, setEinladungen] = useState([]);
  const [abo, setAbo] = useState(null);
  const [ladenTeam, setLadenTeam] = useState(true);

  // Passwort
  const [neuesPasswort, setNeuesPasswort] = useState('');
  const [bestaetigung, setBestaetigung] = useState('');
  const [passStatus, setPassStatus] = useState('');
  const [passError, setPassError] = useState('');
  const [passLaden, setPassLaden] = useState(false);

  // Einladungs-Modal
  const [showModal, setShowModal] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('techniker');
  const [invLaden, setInvLaden] = useState(false);
  const [invError, setInvError] = useState('');
  const [invSuccess, setInvSuccess] = useState('');

  // Computed
  const plan = abo?.plan || 'starter';
  const nutzerLimit = PLANS[plan]?.limits?.nutzer || 1;
  const nutzerCount = members.length;
  const canManage = myMember?.role === 'inhaber' || myMember?.role === 'administrator';
  const canInvite = canManage && plan !== 'starter' && nutzerCount < nutzerLimit;

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: member } = await supabase
        .from('company_members')
        .select('*, companies(id, name, logo_url)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!member) { setLadenTeam(false); return; }
      setMyMember(member);
      setCompany(member.companies);

      const companyId = member.company_id;

      const { data: allMembers } = await supabase
        .from('company_members')
        .select('id, user_id, role, vorname, nachname, email, created_at')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at');
      setMembers(allMembers || []);

      const { data: invs } = await supabase
        .from('einladungen')
        .select('id, email, role, erstellt_am, laeuft_ab_am')
        .eq('company_id', companyId)
        .eq('angenommen', false)
        .gt('laeuft_ab_am', new Date().toISOString())
        .order('erstellt_am', { ascending: false });
      setEinladungen(invs || []);

      const { data: aboData } = await supabase
        .from('abonnements')
        .select('plan, status')
        .eq('company_id', companyId)
        .single();
      setAbo(aboData);

      setLadenTeam(false);
    }
    init();
  }, []);

  // ─── Passwort ändern ──────────────────────────────────────────────────────
  async function handlePasswort(e) {
    e.preventDefault();
    setPassError(''); setPassStatus('');
    if (neuesPasswort !== bestaetigung) { setPassError('Passwörter stimmen nicht überein.'); return; }
    if (neuesPasswort.length < 6) { setPassError('Mindestens 6 Zeichen erforderlich.'); return; }
    setPassLaden(true);
    const { error } = await supabase.auth.updateUser({ password: neuesPasswort });
    if (error) setPassError('Fehler beim Ändern.');
    else { setPassStatus('Passwort erfolgreich geändert!'); setNeuesPasswort(''); setBestaetigung(''); }
    setPassLaden(false);
  }

  // ─── Abmelden ──────────────────────────────────────────────────────────────
  async function handleAbmelden() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // ─── Einladung senden ──────────────────────────────────────────────────────
  async function handleEinladen(e) {
    e.preventDefault();
    setInvError(''); setInvSuccess(''); setInvLaden(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/nutzer-einladen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: invEmail,
          role: invRole,
          company_id: myMember.company_id,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInvError(json.error || 'Fehler beim Einladen.');
      } else {
        setInvSuccess(`Einladung an ${invEmail} gesendet!`);
        setInvEmail(''); setInvRole('techniker');
        const { data: invs } = await supabase
          .from('einladungen')
          .select('id, email, role, erstellt_am, laeuft_ab_am')
          .eq('company_id', myMember.company_id)
          .eq('angenommen', false)
          .gt('laeuft_ab_am', new Date().toISOString())
          .order('erstellt_am', { ascending: false });
        setEinladungen(invs || []);
        setTimeout(() => { setShowModal(false); setInvSuccess(''); }, 2500);
      }
    } catch {
      setInvError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    }
    setInvLaden(false);
  }

  // ─── Mitglied entfernen ────────────────────────────────────────────────────
  async function handleEntfernen(memberId, name) {
    if (!confirm(`${name} wirklich aus dem Team entfernen?`)) return;
    const { error } = await supabase
      .from('company_members')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', memberId);
    if (!error) setMembers(prev => prev.filter(m => m.id !== memberId));
  }

  // ─── Rolle ändern ─────────────────────────────────────────────────────────
  async function handleRolleAendern(memberId, neueRolle) {
    const { error } = await supabase
      .from('company_members')
      .update({ role: neueRolle, updated_at: new Date().toISOString() })
      .eq('id', memberId);
    if (!error) setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: neueRolle } : m));
  }

  // ─── Einladung zurückziehen ────────────────────────────────────────────────
  async function handleEinladungZurueckziehen(invId) {
    if (!confirm('Einladung zurückziehen?')) return;
    await supabase
      .from('einladungen')
      .update({ angenommen: true, angenommen_am: new Date().toISOString() })
      .eq('id', invId);
    setEinladungen(prev => prev.filter(i => i.id !== invId));
  }

  const memberName = (m) =>
    [m.vorname, m.nachname].filter(Boolean).join(' ') || m.email || 'Unbekannt';

  const limitColor = nutzerCount >= nutzerLimit
    ? 'text-red-600 bg-red-50'
    : nutzerCount >= nutzerLimit * 0.8
    ? 'text-orange-600 bg-orange-50'
    : 'text-green-700 bg-green-50';

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-3xl pb-10">

      {/* ── Header ── */}
      <PageHeader
        title="Einstellungen"
        subtitle="Konto, Team und App-Einstellungen verwalten."
      />

      {/* ── Tab-Navigation ── */}
      <TabNav
        id="einstellungen-tabs"
        tabs={EINSTELLUNGEN_TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        label="Einstellungsnavigation"
        className="mb-5"
      />

      {/* ── Tab: Team ── */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">Team</h2>
              {!ladenTeam && company && (
                <p className="text-xs text-gray-400 mt-0.5">{company.name}</p>
              )}
            </div>
            {!ladenTeam && (
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${limitColor}`}>
                  {nutzerCount} / {nutzerLimit} Nutzer
                </span>
                {canInvite && (
                  <PrimaryButton className="text-xs" onClick={()=>{setShowModal(true);setInvError('');setInvSuccess('');}}>+ Einladen</PrimaryButton>                )}
                {canManage && plan === 'starter' && (
                  <button
                    onClick={() => router.push('/dashboard/billing')}
                    className="px-3.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition"
                  >
                    Upgrade
                  </button>
                )}
                {canManage && plan !== 'starter' && nutzerCount >= nutzerLimit && (
                  <button
                    onClick={() => router.push('/dashboard/billing')}
                    className="px-3.5 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-200 transition"
                  >
                    Limit erreicht
                  </button>
                )}
              </div>
            )}
          </div>

          {ladenTeam ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(m => {
                const isMe = m.user_id === user?.id;
                const isInhaber = m.role === 'inhaber';
                const showActions = canManage && !isInhaber && !isMe;
                const availableRoles = INVITABLE_ROLES.filter(
                  r => myMember?.role === 'inhaber' || r.value !== 'administrator'
                );
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-blue-700 font-bold text-sm">
                        {(m.vorname?.[0] || m.email?.[0] || '?').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {memberName(m)} {isMe && <span className="text-gray-400 font-normal">(ich)</span>}
                      </p>
                      {m.email && (
                        <p className="text-xs text-gray-400 truncate">{m.email}</p>
                      )}
                    </div>
                    {showActions ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={m.role}
                          onChange={e => handleRolleAendern(m.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {availableRoles.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        {myMember?.role === 'inhaber' && (
                          <button
                            onClick={() => handleEntfernen(m.id, memberName(m))}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                            title="Aus Team entfernen"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${ROLE_COLORS[m.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABELS[m.role] || m.role}
                      </span>
                    )}
                  </div>
                );
              })}

              {members.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Keine Teammitglieder.</p>
              )}

              {einladungen.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Ausstehende Einladungen
                  </p>
                  {einladungen.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl mb-1.5">
                      <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                        <p className="text-xs text-gray-400">
                          {ROLE_LABELS[inv.role] || inv.role} · läuft ab {new Date(inv.laeuft_ab_am).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => handleEinladungZurueckziehen(inv.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition shrink-0"
                          title="Einladung zurückziehen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {plan === 'starter' && canManage && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-700">
                    Im <strong>Starter-Plan</strong> können keine weiteren Nutzer hinzugefügt werden.{' '}
                    <button onClick={() => router.push('/dashboard/billing')} className="underline font-semibold">
                      Plan upgraden →
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Firmendaten ── */}
      {activeTab === 'firma' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-5">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Firmendaten</h3>
              <p className="text-sm text-gray-500 mt-1">Verwalte Firmenname, Adresse und Unternehmensdaten.</p>
            </div>
            <PrimaryButton onClick={()=>router.push('/dashboard/einstellungen/firmendaten')}>Firmendaten öffnen</PrimaryButton>          </div>
        </div>
      )}

      {/* ── Tab: Konto & Sicherheit ── */}
      {activeTab === 'konto' && (
        <div className="space-y-5">

          {/* Konto-Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Konto</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-blue-600 font-bold text-lg">
                  {user?.email?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user?.email}</p>
                <p className="text-sm text-gray-400">
                  Registriert seit {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('de-DE')
                    : '–'}
                </p>
              </div>
            </div>
          </div>

          {/* Speicher */}
          <StorageBar />

          {/* Passwort ändern */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Passwort ändern</h2>
            <form onSubmit={handlePasswort} className="space-y-3">
              {passError && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{passError}</div>
              )}
              {passStatus && (
                <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2"><CheckCircle size={16} /> {passStatus}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
                <input
                  type="password" value={neuesPasswort}
                  onChange={e => setNeuesPasswort(e.target.value)}
                  minLength={6} placeholder="Mindestens 6 Zeichen"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
                <input
                  type="password" value={bestaetigung}
                  onChange={e => setBestaetigung(e.target.value)}
                  placeholder="Wiederholen"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <PrimaryButton type="submit" disabled={passLaden||!neuesPasswort}>{passLaden?'Wird geändert...':'Passwort ändern'}</PrimaryButton>            </form>
          </div>

          {/* Abmelden */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-3">Sitzung beenden</h2>
            <button
              onClick={handleAbmelden}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm flex items-center gap-2"
            >
              <LogOut size={18} /> Abmelden
            </button>
          </div>

        </div>
      )}

      {/* ── Tab: Rollen & Rechte ── */}
      {activeTab === 'rollen' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-5">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Rollen &amp; Rechte</h3>
              <p className="text-sm text-gray-500 mt-1">Verwalte Benutzerrollen und Berechtigungen für dein Unternehmen.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/einstellungen/rollen')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition bg-purple-600 hover:bg-purple-700"
            >
              Rollen &amp; Rechte öffnen
            </button>
          </div>
        </div>
      )}

      {/* ── App-Info (immer sichtbar) ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">App-Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Status</span>
            <span className="bg-yellow-50 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">Beta</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Datenbank</span>
            <span className="text-green-600 font-medium">&#9679; Verbunden</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Region</span>
            <span className="text-gray-700">EU Frankfurt (DSGVO-konform)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Domain</span>
            <span className="text-gray-700">kanalpro.de</span>
          </div>
        </div>
      </div>

      {/* ── Einladungs-Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-900 text-lg">Teammitglied einladen</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEinladen} className="space-y-4">
              {invError && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{invError}</div>
              )}
              {invSuccess && (
                <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">{invSuccess}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail-Adresse</label>
                <input
                  type="email"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  required
                  placeholder="mitarbeiter@beispiel.de"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rolle</label>
                <select
                  value={invRole}
                  onChange={e => setInvRole(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {INVITABLE_ROLES
                    .filter(r => myMember?.role === 'inhaber' || r.value !== 'administrator')
                    .map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  Die Person erhält eine E-Mail mit einem Einladungslink (7 Tage gültig).
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition text-sm"
                >
                  Abbrechen
                </button>
                <PrimaryButton type="submit" disabled={invLaden||!invEmail} className="flex-1">{invLaden?'Wird gesendet…':'Einladung senden'}</PrimaryButton>              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
