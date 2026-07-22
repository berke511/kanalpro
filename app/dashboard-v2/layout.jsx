'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

var navItems = [
  { label: 'Dashboard', href: '/dashboard-v2' },
  { label: 'Mein Tag', href: '/dashboard-v2/mein-tag' },
  { label: 'Kunden', href: '/dashboard-v2/kunden' },
  { label: 'Angebote', href: '/dashboard-v2/angebote' },
  { label: 'Auftraege', href: '/dashboard-v2/auftraege' },
  { label: 'Disposition', href: '/dashboard-v2/disposition' },
  { label: 'Einsatzplanung', href: '/dashboard-v2/einsatzplanung' },
  { label: 'Rechnungen', href: '/dashboard-v2/rechnungen' },
  { label: 'Finanzen', href: '/dashboard-v2/finanzen' },
  { label: 'Mahnungen', href: '/dashboard-v2/mahnungen' },
  { label: 'Fahrzeuge', href: '/dashboard-v2/fahrzeuge' },
  { label: 'Maschinen', href: '/dashboard-v2/maschinen' },
  { label: 'Material', href: '/dashboard-v2/material' },
  { label: 'Mitarbeiter', href: '/dashboard-v2/mitarbeiter' },
  { label: 'Techniker', href: '/dashboard-v2/techniker' },
  { label: 'Einstellungen', href: '/dashboard-v2/einstellungen' },
  { label: 'Billing', href: '/dashboard-v2/billing' },
  { label: 'Upgrade', href: '/dashboard-v2/upgrade' },
];

export default function DashboardV2Layout({ children }) {
  var pathname = usePathname();
  var [sidebarOffen, setSidebarOffen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {sidebarOffen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={function() { setSidebarOffen(false); }}
          aria-hidden="true"
        />
      )}
      <aside className={
        'fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0' +
        (sidebarOffen ? ' translate-x-0' : ' -translate-x-full md:translate-x-0')
      }>
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
          <span className="text-sm font-bold text-gray-900">KanalPro V3</span>
          <button
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
            onClick={function() { setSidebarOffen(false); }}
            aria-label="Sidebar schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map(function(item) {
            var isActive = pathname === item.href || (item.href !== '/dashboard-v2' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={function() { setSidebarOffen(false); }}
                className={'flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100' + (isActive ? ' bg-gray-100 font-medium' : '')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
              onClick={function() { setSidebarOffen(true); }}
              aria-label="Menø öffnen"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-500">KanalPro V3</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
