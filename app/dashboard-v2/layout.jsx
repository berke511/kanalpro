'use client';

const navItems = [
  'Dashboard', 'Kunden', 'Auftraege', 'Angebote', 'Rechnungen',
  'Finanzen', 'Disposition', 'Fahrzeuge', 'Mitarbeiter', 'Einstellungen'
];

export default function DashboardV2Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <span className="text-sm font-bold text-gray-900">KanalPro V3</span>
        </div>
        <nav className="p-2">
          {navItems.map(function(item) {
            return (
              <div key={item} className="flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                {item}
              </div>
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
