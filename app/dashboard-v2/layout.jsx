'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, LogOut,
  LayoutDashboard, Sun, Users, ClipboardList, Briefcase,
  Truck, Calendar, Receipt, TrendingUp, AlertTriangle,
  Wrench, Package, User, UserCog, Settings, CreditCard, Zap, Navigation,
} from 'lucide-react';
import supabase from '@/lib/supabase';

var navGroups = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard-v2', icon: LayoutDashboard },
      { label: 'Mein Tag', href: '/dashboard-v2/mein-tag', icon: Sun },
    ],
  },
  {
    label: 'Vertrieb',
    items: [
      { label: 'Kunden', href: '/dashboard-v2/kunden', icon: Users },
      { label: 'Angebote', href: '/dashboard-v2/angebote', icon: ClipboardList },
      { label: 'Auftraege', href: '/dashboard-v2/auftraege', icon: Briefcase },
    ],
  },
  {
    label: 'Planung',
    items: [
      { label: 'Disposition', href: '/dashboard-v2/disposition', icon: Navigation },
      { label: 'Einsatzplanung', href: '/dashboard-v2/einsatzplanung', icon: Calendar },
    ],
  },
  {
    label: 'Finanzen',
    items: [
      { label: 'Rechnungen', href: '/dashboard-v2/rechnungen', icon: Receipt },
      { label: 'Finanzen', href: '/dashboard-v2/finanzen', icon: TrendingUp },
      { label: 'Mahnungen', href: '/dashboard-v2/mahnungen', icon: AlertTriangle },
    ],
  },
  {
    label: 'Ressourcen',
    items: [
      { label: 'Fahrzeuge', href: '/dashboard-v2/fahrzeuge', icon: Truck },
      { label: 'Maschinen', href: '/dashboard-v2/maschinen', icon: Wrench },
      { label: 'Material', href: '/dashboard-v2/material', icon: Package },
      { label: 'Mitarbeiter', href: '/dashboard-v2/mitarbeiter', icon: User },
      { label: 'Techniker', href: '/dashboard-v2/techniker', icon: UserCog },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Einstellungen', href: '/dashboard-v2/einstellungen', icon: Settings },
      { label: 'Billing', href: '/dashboard-v2/billing', icon: CreditCard },
      { label: 'Upgrade', href: '/dashboard-v2/upgrade', icon: Zap },
    ],
  },
];

function getPageTitle(pathname) {
  for (var g = 0; g < navGroups.length; g++) {
    for (var i = 0; i < navGroups[g].items.length; i++) {
      if (navGroups[g].items[i].href === pathname) {
        return navGroups[g].items[i].label;
      }
    }
  }
  return 'KanalPro';
}

export default function DashboardV2Layout({ children }) {
  var pathname = usePathname();
  var router = useRouter();
  var [sidebarOffen, setSidebarOffen] = useState(false);
  var pageTitle = getPageTitle(pathname);

  async function handleAbmelden() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {sidebarOffen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={function() { setSidebarOffen(false); }}
          aria-hidden="true"
        />
      )}
      <aside className={
        'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-200 ease-in-out md:static md:translate-x-0' +
        (sidebarOffen ? ' translate-x-0' : ' -translate-x-full md:translate-x-0')
      }>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600">
              <span className="text-xs font-bold text-white">KP</span>
            </div>
            <span className="text-sm font-bold text-slate-900">KanalPro</span>
          </div>
          <button
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors md:hidden"
            onClick={function() { setSidebarOffen(false); }}
            aria-label="Sidebar schliessen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
          {navGroups.map(function(group, gi) {
            return (
              <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
                {group.label && (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {group.label}
                  </p>
                )}
                {group.items.map(function(item) {
                  var isActive = pathname === item.href || (item.href !== '/dashboard-v2' && pathname.startsWith(item.href));
                  var Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={function() { setSidebarOffen(false); }}
                      className={
                        'flex min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ' +
                        (isActive
                          ? 'bg-primary-50 font-semibold text-primary-700'
                          : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                      }
                    >
                      <Icon className={'h-4 w-4 flex-shrink-0 ' + (isActive ? 'text-primary-600' : 'text-slate-400')} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={handleAbmelden}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0 text-slate-400" />
            Abmelden
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors md:hidden"
              onClick={function() { setSidebarOffen(true); }}
              aria-label="Menu oeffnen"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="flex-1 text-base font-semibold text-slate-900">{pageTitle}</h1>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
