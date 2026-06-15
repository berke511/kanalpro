'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus, canAccess } from '@/lib/subscription';
import { hasMinRole } from '@/lib/roles';
import TrialBanner from '@/components/TrialBanner';

// Nav-Links mit optionalem Feature-Gate und Rollen-Gate
const navLinks = [
  { href: '/dashboard',                        label: 'Übersicht',      icon: '🏠', feature: null, minRole: null },
  { href: '/dashboard/kunden',                 label: 'Kunden',         icon: '👥', feature: null, minRole: null },
  { href: '/dashboard/auftraege',              label: 'Aufträge',       icon: '📋', feature: null, minRole: null },
  { href: '/dashboard/rechnungen',             label: 'Rechnungen',     icon: '🧾', feature: 'rechnungen', minRole: null },
  { href: '/dashboard/einsatzplanung',         label: 'Einsatzplanung', icon: '🗺️', feature: 'einsatzplanung', minRole: null },
  { href: '/dashboard/einstellungen',          label: 'Einstellungen',  icon: '⚙️', feature: null, minRole: null },
  { href: '/dashboard/einstellungen/rollen',   label: 'Rollen & Rechte',icon: '🔐', feature: null, minRole: 'administrator' },
  { href: '/dashboard/billing',                label: 'Abonnement',     icon: '💳', feature: null, minRole: null },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [abo, setAbo] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      // Abo laden + ggf. Trial automatisch herabstufen
      let aboData = await checkAndDowngrade(supabase, u.id);
      if (!aboData) {
        // Noch kein Eintrag → anlegen
        const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();
        const { data: neu } = await supabase
          .from('abonnements')
          .insert({
            user_id: u.id,
            status: 'trial',
            plan: 'enterprise',
            trial_start: new Date().toISOString(),
            trial_end: trialEnd,
          })
          .select()
          .single();
        aboData = neu;
      }
      setAbo(aboData);

      // Rolle laden
      const { data: member } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', u.id)
        .eq('is_active', true)
        .maybeSingle();
      setUserRole(member?.role ?? null);

      if (sessionStorage.getItem('tempLogin') === '1') {
        const fn = () => supabase.auth.signOut();
        window.addEventListener('beforeunload', fn);
        return () => window.removeEventListener('beforeunload', fn);
      }
    }
    load();
  }, [router]);

  async function handleLogout() {
    sessionStorage.removeItem('tempLogin');
    await supabase.auth.signOut();
    router.push('/login');
  }

  const sub = getSubscriptionStatus(abo);
  const { isTrialActive, isExpired, daysLeft, plan } = sub;

  if (!user) return null;

  // Trial abgelaufen → Billing-Seite erzwingen
  if (isExpired && pathname !== '/dashboard/billing' && pathname !== '/dashboard/upgrade') {
    router.push('/dashboard/billing');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Trial-Banner (extrahierte Komponente) ───────────────── */}
      <TrialBanner
        daysLeft={daysLeft}
        isTrialActive={isTrialActive}
        isExpired={isExpired}
        plan={plan}
        upgradeHref="/dashboard/billing"
      />

      <div className="flex flex-1">
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg text-gray-900">KanalPro</span>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navLinks.map((link) => {
              const locked = link.feature && !canAccess(plan, link.feature);
              // Rollen-Gate: Link ausblenden wenn Rolle nicht ausreicht
              if (link.minRole && userRole && !hasMinRole(userRole, link.minRole)) return null;
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

              if (locked) {
                return (
                  <Link
                    key={link.href}
                    href="/dashboard/billing"
                    title="Nicht in deinem aktuellen Plan enthalten"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-50 transition group"
                  >
                    <span className="opacity-60">{link.icon}</span>
                    <span className="flex-1 opacity-60">{link.label}</span>
                    <span className="text-xs opacity-50 group-hover:opacity-80">🔒</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-gray-100">
            {(isTrialActive || plan === 'starter') && !sub.isPaid && (
              <Link
                href="/dashboard/billing"
                className="flex items-center justify-center gap-2 px-3 py-2 mb-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                ⭐ Upgrade — ab 29 €/Monat
              </Link>
            )}
            <p className="text-xs text-gray-400 px-3 mb-2 truncate">{user.email}</p>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition"
            >
              🚪 Abmelden
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
