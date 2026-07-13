'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import supabase from '@/lib/supabase';
import { CommandPaletteProvider, useCommandPalette } from '@/hooks/useCommandPalette';
import CommandPalette from '@/components/ui/CommandPalette';

const navLinks = [
  { href: '/dashboard',              label: 'Übersicht',    icon: '🏠' },
  { href: '/dashboard/kunden',       label: 'Kunden',       icon: '👥' },
  { href: '/dashboard/auftraege',    label: 'Aufträge',     icon: '📋' },
  { href: '/dashboard/rechnungen',   label: 'Rechnungen',   icon: '🧾' },
  { href: '/dashboard/einstellungen',label: 'Einstellungen',icon: '⚙️' },
];

function DashboardShell({ children, user, companyId, abo, handleLogout }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggle } = useCommandPalette();

  function trialTage() {
    if (!abo?.trial_end) return 30;
    const diff = new Date(abo.trial_end) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const tage = trialTage();
  const trialLäuft = abo?.status === 'trial';
  const abgelaufen = trialLäuft && tage === 0;
  const warnung = trialLäuft && tage <= 7 && tage > 0;

  useEffect(() => {
    if (abgelaufen && pathname !== '/dashboard/upgrade') {
      router.push('/dashboard/upgrade');
    }
  }, [abgelaufen, pathname, router]);

  if (abgelaufen && pathname !== '/dashboard/upgrade') return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {trialLäuft && tage > 0 && (
        <div className={`px-6 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-3 ${warnung ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
          <span>
            {warnung ? '⚠️' : '🎉'} Noch {tage} {tage === 1 ? 'Tag' : 'Tage'} kostenlose Testphase
          </span>
          <Link href="/dashboard/upgrade"
            className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-50 transition">
            Jetzt upgraden
          </Link>
        </div>
      )}

      <div className="flex flex-1">
        <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg text-gray-900">KanalPro</span>
            </div>
          </div>

          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 transition border border-gray-200"
            >
              <Search size={14} className="text-gray-400 shrink-0" />
              <span className="flex-1 text-left text-xs">Suche</span>
              <kbd className="text-xs px-1 py-0.5 bg-white border border-gray-200 rounded text-gray-400">⌘K</kbd>
            </button>
          </div>

          <nav className="flex-1 px-3 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                <span>{link.icon}</span>{link.label}
              </Link>
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-gray-100">
            {trialLäuft && (
              <Link href="/dashboard/upgrade"
                className="flex items-center justify-center gap-2 px-3 py-2 mb-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">
                ⭐ Upgrade — ab 29 €/Monat
              </Link>
            )}
            <p className="text-xs text-gray-400 px-3 mb-2 truncate">{user.email}</p>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition">
              🚪 Abmelden
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>

      <CommandPalette companyId={companyId} />
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [abo, setAbo] = useState(null);
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      const [
        { data: a },
        { data: mem },
      ] = await Promise.all([
        supabase.from('abonnements').select('*').eq('user_id', u.id).single(),
        supabase.from('company_members').select('company_id').eq('user_id', u.id).single(),
      ]);

      if (!a) {
        const { data: neu } = await supabase.from('abonnements').insert({ user_id: u.id }).select().single();
        setAbo(neu);
      } else {
        setAbo(a);
      }

      if (mem?.company_id) setCompanyId(mem.company_id);

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

  if (!user) return null;

  return (
    <CommandPaletteProvider>
      <DashboardShell
        user={user}
        companyId={companyId}
        abo={abo}
        handleLogout={handleLogout}
      >
        {children}
      </DashboardShell>
    </CommandPaletteProvider>
  );
}
