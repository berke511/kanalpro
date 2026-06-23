'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles';
import { PLANS } from '@/lib/plans';
import StorageBar from '@/components/StorageBar';

const INVITABLE_ROLES = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'disponent', label: 'Disponent' },
  { value: 'buero', label: 'Büro' },
  { value: 'techniker', label: 'Techniker' },
  { value: 'fahrer', label: 'Fahrer' },
];

export default function Einstellungen() {
  const router = useRouter();

  // Auth & Konto
  const [user, setUser] = useState(null);

  // Team
  const [myMember, setMyMember] = useState(null);
  const [company, setCompany] = useState(null);
  const [members, setMembers] = useState([]);
  const [einladungen, setEinladungen] = useState([]);
  const [abo, setAbo] = useState(null);
  const [ladenTeam, setLadenTeam] = useState(true);

  // Logo
  const [logoUrl, setLogoUrl]         = useState(null);
  const [logoLaden, setLogoLaden]     = useState(false);
  const [logoStatus, setLogoStatus]   = useState('');
  const [logoError, setLogoError]     = useState('');
  const logoInputRef                  = useRef(null);

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

      // My membership (includes company data)
      const { data: member } = await supabase
        .from('company_members')
        .select('*, companies(id, name, logo_url)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!member) { setLadenTeam(false); return; }
      setMyMember(member);
      setCompany(member.companies);
      setLogoUrl(member.companies?.logo_url ?? null);

      const companyId = member.company_id;

      // All active members
      const { data: allMembers } = await supabase
        .from('company_members')
        .select('id, user_id, role, vorname, nachname, email, created_at')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at');
      setMembers(allMembers || []);

      // Pending invitations
      const { data: invs } = await supabase
        .from('einladungen')
        .select('id, email, role, erstellt_am, laeuft_ab_am')
        .eq('company_id', companyId)
        .eq('angenommen', false)
        .gt('laeuft_ab_am', new Date().toISOString())
        .order('erstellt_am', { ascending: false });
      setEinladungen(invs || []);

      // Subscription
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

  // ─── Logo hochladen ────────────────────────────────────────────────────────
  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      setLogoError('Nur JPG, PNG, SVG oder WebP erlaubt.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Datei zu groß (max. 2 MB).');
      return;
    }
    setLogoError(''); setLogoStatus(''); setLogoLaden(true);
    try {
      const companyId = myMember?.company_id;
      if (!companyId) throw new Error('Keine Firma gefunden.');
      const ext = file.type === 'image/svg+xml' ? 'svg'
        : file.type === 'image/png' ? 'png'
        : file.type === 'image/webp' ? 'webp'
        : 'jpg';
      const path = `${companyId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      const newUrl = urlData.publicUrl + '?t=' + Date.now();
      const { error: dbErr } = await supabase
        .from('companies')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', companyId);
      if (dbErr) throw dbErr;
      setLogoUrl(newUrl);
      setLogoStatus('Logo erfolgreich gespeichert!');
    } catch (err) {
      setLogoError('Fehler beim Upload: ' + (err.message ?? 'Unbekannt'));
    }
    setLogoLaden(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  async function handleLogoEntfernen() {
    if (!confirm('Logo wirklich entfernen?')) return;
    setLogoError(''); setLogoStatus(''); setLogoLaden(true);
    try {
      const companyId = myMember?.company_id;
      await supabase.from('companies').update({ logo_url: null }).eq('id', companyId);
      setLogoUrl(null);
      setLogoStatus('Logo entfernt.');
    } catch (err) {
      setLogoError('Fehler beim Entfernen.');
    }
    setLogoLaden(false);
  }

  // ─── Passwort ändern ───────────────────────────────────────────────────────
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
        // Refresh pending invitations
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

  // ─── Nutzer-Limit Badge ────────────────────────────────────────────────────
  const limitColor = nutzerCount >= nutzerLimit
    ? 'text-red-600 bg-red-50'
    : nutzerCount >= nutzerLimit * 0.8
    ? 'text-orange-600 bg-orange-50'
    : 'text-green-700 bg-green-50';

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-500 mt-1">Konto & App-Einstellungen</p>
      </div>

      <div className="space-y-5">

        {/* ══ FIRMENDATEN ═══════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Firmendaten</h2>

          {/* Logo-Bereich */}
          <div className="mb-1">
            <p className="text-sm font-medium text-gray-700 mb-3">Firmenlogo</p>

            {/* Vorschau */}
            {logoUrl ? (
              <div className="mb-3 flex items-center gap-4">
                <div className="w-28 h-16 border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="Firmenlogo"
                    className="max-w-full max-h-full object-contain p-1"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoLaden}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    Logo ersetzen
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoEntfernen}
                    disabled={logoLaden}
                    className="px-3.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition"
                  >
                    Logo entfernen
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="cursor-pointer w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition"
                >
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Logo hochladen</p>
                  <p className="text-xs text-gray-400">JPG, PNG, SVG oder WebP · max. 2 MB</p>
                </div>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />

            {/* Status-Meldungen */}
            {logoLaden && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                Wird hochgeladen…
              </div>
            )}
            {logoStatus && !logoLaden && (
              <p className="text-sm text-green-600">{logoStatus}</p>
            )}
            {logoError && (
              <p className="text-sm text-red-600">{logoError}</p>
            )}
          </div>
        </div>

        {/* ══ TEAM ══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">Team</h2>
              {!ladenTeam && company && (
                <p className="text-xs text-gray-400 mt-0.5">{company.name}</p>
              )}
            </div>
            {!ladenTeam && (
              <div className="flex items-center gap-2">
                {/* Nutzer-Limit-Badge */}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${limitColor}`}>
                  {nutzerCount} / {nutzerLimit} Nutzer
                </span>
                {/* Einladen-Button */}
                {canInvite && (
                  <button
                    onClick={() => { setShowModal(true); setInvError(''); setInvSuccess(''); }}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                  >
                    + Einladen
                  </button>
                )}
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
              {/* Member list */}
              {members.map(m => {
                const isMe = m.user_id === user?.id;
                const isInhaber = m.role === 'inhaber';
                const showActions = canManage && !isInhaber && !isMe;
                const availableRoles = INVITABLE_ROLES.filter(
                  r => myMember?.role === 'inhaber' || r.value !== 'administrator'
                );

                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    {/* Avatar */}
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-blue-700 font-bold text-sm">
                        {(m.vorname?.[0] || m.email?.[0] || '?').toUpperCase()}
                      </span>
                    </div>

                    {/* Name + Email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {memberName(m)} {isMe && <span className="text-gray-400 font-normal">(ich)</span>}
                      </p>
                      {m.email && (
                        <p className="text-xs text-gray-400 truncate">{m.email}</p>
                      )}
                    </div>

                    {/* Actions or Role Badge */}
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

              {/* Pending Invitations */}
              {einladungen.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Ausstehende Einladungen
                  </p>
                  {einladungen.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl mb-1.5">
                      <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                        
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

              {/* Plan info for starter */}
              {plan === 'starter' && canManage && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-700">
                    Im <strong>Starter-Plan</strong> können keine weiteren Nutzer hinzugefügt werden.
                    <button onClick={() => router.push('/dashboard/billing')} className="ml-1 underline font-semibold">Plan upgraden →</button>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ KONTO ══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
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

        {/* ══ SPEICHER ═══════════════════════════════════════════════════════ */}
        <StorageBar />

        {/* ══ PASSWORT ═══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Passwort ändern</h2>
          <form onSubmit={handlePasswort} className="space-y-3">
            {passError && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{passError}</div>
            )}
            {passStatus && (
              <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">{passStatus}</div>
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
            <button
              type="submit" disabled={passLaden || !neuesPasswort}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm"
            >
              {passLaden ? 'Wird geändert...' : 'Passwort ändern'}
            </button>
          </form>
        </div>

        {/* ══ APP-INFO ═══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-3">App-Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status</span>
              <span className="bg-yellow-50 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">Beta</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Datenbank</span>
              <span className="text-green-600 font-medium">● Verbunden</span>
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

        {/* ══ ABMELDEN ═══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-3">Sitzung beenden</h2>
          <button
            onClick={handleAbmelden}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            Abmelden
          </button>
        </div>

      </div>

      {/* ══ EINLADUNGS-MODAL ════════════════════════════════════════════════ */}
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
                <button
                  type="submit"
                  disabled={invLaden || !invEmail}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                >
                  {invLaden ? 'Wird gesendet…' : 'Einladung senden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
