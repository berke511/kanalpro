'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, FileText, DollarSign, Settings,
  Search, LogOut, Truck, Calendar, AlertTriangle, Zap,
  ScrollText, TrendingUp, Car, UserCheck, MoreHorizontal,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import NotificationCenter from '@/components/ui/NotificationCenter';
import ConnectionStatus from '@/components/ui/ConnectionStatus';
import RealtimeSyncProvider from '@/components/providers/RealtimeSyncProvider';
import { CommandPaletteProvider, useCommandPalette } from '@/hooks/useCommandPalette';
import CommandPalette from '@/components/ui/CommandPalette';

const navLinks = [
  { href: '/dashboard',               label: 'Übersicht',    icon: LayoutDashboard },
  { href: '/dashboard/kunden',        label: 'Kunden',       icon: Users           },
  { href: '/dashboard/auftraege',     label: 'Aufträge',     icon: FileText        },
  { href: '/dashboard/angebote',      label: 'Angebote',     icon: ScrollText      },
  { href: '/dashboard/rechnungen',    label: 'Rechnungen',   icon: DollarSign      },
  { href: '/dashboard/finanzen',      label: 'Finanzen',     icon: TrendingUp      },
  { href: '/dashboard/disposition',   label: 'Disposition',  icon: Truck           },
  { href: '/dashboard/mein-tag',      label: 'Mein Tag',     icon: Calendar        },
  { href: '/dashboard/fahrzeuge',     label: 'Fahrzeuge',    icon: Car             },
  { href: '/dashboard/mitarbeiter',   label: 'Mitarbeiter',  icon: UserCheck       },
  { href: '/dashboard/einstellungen', label: 'Einstellungen',icon: Settings        },
];

const mobileBottomNav = [
  { href: '/dashboard',             label: 'Übersicht',   icon: LayoutDashboard },
  { href: '/dashboard/auftraege',   label: 'Aufträge',    icon: FileText        },
  { href: '/dashboard/kunden',      label: 'Kunden',      icon: Users           },
  { href: '/dashboard/disposition', label: 'Disposition', icon: Truck           },
];

function DashboardShell({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { open } = useCommandPalette();

  const [user,      setUser]      = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [abo,       setAbo]       = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', u.id)
        .single();
      setCompanyId(memberData?.company_id ?? null);

      const { data: a } = await supabase
        .from('abonnements')
        .select('*')
        .eq('user_id', u.id)
        .single();
      if (!a) {
        const { data: neu } = await supabase
          .from('abonnements')
          .insert({ user_id: u.id })
          .select()
          .single();
        setAbo(neu);
      } else {
        setAbo(a);
      }

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

  function trialTage() {
    if (!abo?.trial_end) return 30;
    const diff = new Date(abo.trial_end) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const tage       = trialTage();
  const trialLauft = abo?.status === 'trial';
  const abgelaufen = trialLauft && tage === 0;
  const warnung    = trialLauft && tage <= 7 && tage > 0;

  if (!user) return null;

  if (abgelaufen && pathname !== '/dashboard/upgrade') {
    router.push('/dashboard/upgrade');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Trial-Banner */}
      {trialLauft && tage > 0 && (
        <div className={`px-6 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-3 ${warnung ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
          <span className="flex items-center gap-1.5">
            {warnung && <AlertTriangle size={14} aria-hidden="true" />}
            Noch {tage} {tage === 1 ? 'Tag' : 'Tage'} kostenlose Testphase
          </span>
          <Link href="/dashboard/upgrade"
            className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-50 transition">
            Jetzt upgraden
          </Link>
        </div>
      )}

      <div className="flex flex-1">

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col shrink-0">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg text-gray-900">KanalPro</span>
            </div>
          </div>

          {/* Search Trigger */}
          <div className="px-4 pt-4">
            <button
              type="button"
              onClick={open}
              className="flex items-center gap-2 w-full px-3 h-9 rounded-lg text-sm text-gray-500 hover:bg-gray-50 border border-gray-200 transition"
            >
              <Search size={14} aria-hidden="true" />
              <span>Suchen...</span>
              <kbd className="ml-auto text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navLinks.map((link) => {
              const NavIcon = link.icon;
              return (
                <Link key={link.href} href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                  <NavIcon className="h-5 w-5 shrink-0" aria-hidden="true" />{link.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-gray-100">
            {trialLauft && (
              <Link href="/dashboard/upgrade"
                className="flex items-center justify-center gap-2 px-3 py-2 mb-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">
                <Zap size={12} aria-hidden="true" />
                Upgrade — ab 29 €/Monat
              </Link>
            )}
            <p className="text-xs text-gray-400 px-3 mb-2 truncate">{user.email}</p>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition">
              <LogOut className="h-5 w-5" aria-hidden="true" />
              Abmelden
            </button>
          </div>
        </aside>

        {/* Right column: Topbar + Main */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Mobile Header */}
          <header className="flex md:hidden items-center justify-between px-4 h-14 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">K</span>
              </div>
              <span className="font-bold text-base text-gray-900">KanalPro</span>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionStatus />
              <NotificationCenter companyId={companyId} />
            </div>
          </header>

          {/* Desktop Topbar */}
          <header className="hidden md:flex items-center justify-between px-6 h-16 bg-white border-b border-gray-100 shrink-0">
            <div />
            <div className="flex items-center gap-3">
              <ConnectionStatus />
              <NotificationCenter companyId={companyId} />
              {user?.email && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-blue-700 font-semibold text-sm select-none">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 pb-24 md:pb-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex md:hidden">
        {mobileBottomNav.map((item) => {
          const ItemIcon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[56px] gap-1 transition ${
                isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}>
              <ItemIcon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {}}
          className="flex-1 flex flex-col items-center justify-center min-h-[56px] gap-1 text-gray-400 hover:text-gray-600 transition"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Mehr</span>
        </button>
      </nav>

      {/* Command Palette */}
      <CommandPalette companyId={companyId} />
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <CommandPaletteProvider>
      <RealtimeSyncProvider>
        <DashboardShell>{children}</DashboardShell>
      </RealtimeSyncProvider>
    </CommandPaletteProvider>
  );
}
