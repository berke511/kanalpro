'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

var navItems = [
  { label: 'Dashboard', href: '/dashboard-v2' },
  { label: 'Kunden', href: '/dashboard-v2/kunden' },
  { label: 'Auftraege', href: '/dashboard-v2/auftraege' },
  { label: 'Angebote', href: '/dashboard-v2/angebote' },
  { label: 'Rechnungen', href: '/dashboard-v2/rechnungen' },
  { label: 'Finanzen', href: '/dashboard-v2/finanzen' },
  { label: 'Disposition', href: '/dashboard-v2/disposition' },
  { label: 'Fahrzeuge', href: '/dashboard-v2/fahrzeuge' },
  { label: 'Mitarbeiter', href: '/dashboard-v2/mitarbeiter' },
  { label: 'Einstellungen', href: '/dashboard-v2/einstellungen' },
];

export default function DashboardV2Layout({ children }) {
  var pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <span className="text-sm font-bold text-gray-900">KanalPro V3</span>
        </div>
        <nav className="p-2">
          {navItems.map(function(item) {
            var isActive = pathname === item.href || (item.href !== '/dashboard-v2' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={'flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100' + (isActive ? ' bg-gray-100 font-medium' : '')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
          <div className="flex h-14 items-center px-6">
            <span className="text-sm text-gray-500">KanalPro V3</span>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
