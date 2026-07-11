'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, ClipboardList, Users, FileText, Receipt,
  Calendar, Map, Truck, CheckSquare, UserCheck, Car, Package,
  Settings, Menu, X, Search, LogOut, Moon, Sun, Zap,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus, canAccess } from '@/lib/subscription';
import { hasMinRole } from '@/lib/roles';
import TrialBanner from '@/components/TrialBanner';
import { NavGroupLabel, NavItem, OfflineBanner } from '@/components/ui/KanalProUI';

// ── Breadcrumb-Mapping ──────────────────────────────────────────────────────
const BREADCRUMB_MAP = {
  dashboard: 'Dashboard',
  auftraege: 'Aufträge',
  kunden: 'Kunden',
  angebote: 'Angebote',
  rechnungen: 'Rechnungen',
  disposition: 'Disposition',
  tagesplanung: 'Tagesplanung',
  routenplanung: 'Routenplanung',
  fahrzeugplanung: 'Fahrzeugplanung',
  tagesabschluss: 'Tagesabschluss',
  techniker: 'Techniker',
  fahrzeuge: 'Fahrzeuge',
  material: 'Material',
  einstellungen: 'Einstellungen',
  neu: 'Neu',
};

function getBreadcrumb(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.map(p => BREADCRUMB_MAP[p] || p).join(' / ');
}

// ── Navigation ───────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'ÜBERSICHT',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exactMatch: true },
    ],
  },
  {
    label: 'KERNPROZESSE',
    items: [
      { href: '/dashboard/auftraege', label: 'Aufträge', icon: ClipboardList },
      { href: '/dashboard/kunden', label: 'Kunden', icon: Users },
      { href: '/dashboard/angebote', label: 'Angebote', icon: FileText },
      { href: '/dashboard/rechnungen', label: 'Rechnungen', icon: Receipt, feature: 'rechnungen' },
    ],
  },
  {
    label: 'DISPOSITION',
    items: [
      { href: '/dashboard/disposition/tagesplanung', label: 'Tagesplanung', icon: Calendar },
      { href: '/dashboard/disposition/routenplanung', label: 'Routenplanung', icon: Map },
      { href: '/dashboard/disposition/fahrzeugplanung', label: 'Fahrzeugplanung', icon: Truck },
      { href: '/dashboard/disposition/tagesabschluss', label: 'Tagesabschluss', icon: CheckSquare },
    ],
  },
  {
    label: 'RESSOURCEN',
    items: [
      { href: '/dashboard/techniker', label: 'Techniker', icon: UserCheck },
      { href: '/dashboard/fahrzeuge', label: 'Fahrzeuge', icon: Car },
      { href: '/dashboard/material', label: 'Material', icon: Package },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { href: '/dashboard/einstellungen', label: 'Einstellungen', icon: Settings },
    ],
  },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [abo, setAbo] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Sidebar schließen bei Routenwechsel (Mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Body-Scroll sperren wenn Mobile Sidebar offen
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Online/Offline Detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const u = session.user;
      setUser(u);

      // Abo laden + ggf. Trial automatisch herabstufen
      let aboData = await checkAndDowngrade(supabase, u.id);
      if (!aboData) {
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
    }
    load();
  }, [router]);

  async function handleLogout() {
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

  // Avatar: erste 2 Buchstaben der E-Mail
  const avatarInitials = user.email?.slice(0, 2).toUpperCase() ?? '??';
  const shortEmail = user.email?.length > 24 ? user.email.slice(0, 24) + '…' : user.email;

  // Sidebar-Inhalt (wiederverwendet für Desktop & Mobile-Drawer)
  function SidebarContent() {
    return (
      <>
        {/* Logo – gleiche Höhe wie Topbar (h-14) */}
        <div className="px-4 h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="font-bold text-base text-gray-900 dark:text-white">KanalPro</span>
          </div>
          {/* Schließen-Button nur auf Mobile */}
          <button
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            onClick={() => setSidebarOpen(false)}
            aria-label="Menü schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <NavGroupLabel>{group.label}</NavGroupLabel>
              {group.items.map((item) => {
                const locked = item.feature && !canAccess(plan, item.feature);
                if (item.minRole && userRole && !hasMinRole(userRole, item.minRole)) return null;
                const isActive = item.exactMatch
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <NavItem
                    key={item.href}
                    href={locked ? '/dashboard/billing' : item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActive}
                  />
                );
              })}
            </div>
          ))}
        </nav>

        {/* Nutzer-Abschnitt (unten) */}
        <div className="px-2 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          {(isTrialActive || plan === 'starter') && !sub.isPaid && (
            <Link
              href="/dashboard/billing"
              className="flex items-center justify-center gap-1.5 px-3 py-2 mb-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              <Zap size={12} className="shrink-0" />
              Upgrade – ab 29 €/Monat
            </Link>
          )}
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-lg">
            <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shrink-0">
              <span className="text-blue-700 dark:text-blue-300 text-xs font-bold">{avatarInitials}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">{shortEmail}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition"
          >
            <LogOut size={15} className="shrink-0" />
            Abmelden
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">

      {/* Offline Banner */}
      <OfflineBanner show={!isOnline} />

      {/* ── Trial-Banner ──────────────────────────────────────────────────── */}
      <TrialBanner
        daysLeft={daysLeft}
        isTrialActive={isTrialActive}
        isExpired={isExpired}
        plan={plan}
        upgradeHref="/dashboard/billing"
      />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Mobile Overlay ──────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col
            transform transition-transform duration-200 ease-in-out
            md:relative md:translate-x-0 md:w-56
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <SidebarContent />
        </aside>

        {/* ── Hauptbereich: Topbar + Content ──────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Topbar */}
          <header className="h-14 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-20 flex items-center px-4 gap-3 shrink-0">

            {/* Hamburger (nur Mobile) */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menü öffnen"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <div className="flex-1 text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
              {getBreadcrumb(pathname)}
            </div>

            {/* OmniSearch (Desktop) */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-400 dark:text-gray-500 w-48 cursor-text select-none">
              <Search size={14} className="shrink-0" />
              <span>Suchen …</span>
            </div>

            {/* Dark-Mode Toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Dark Mode umschalten"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Avatar */}
            <div
              className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0 cursor-default"
              title={user.email}
            >
              <span className="text-white text-xs font-bold">{avatarInitials}</span>
            </div>
          </header>

          {/* Seiteninhalt */}
          <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
