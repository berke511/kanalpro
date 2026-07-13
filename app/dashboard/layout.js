'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import {
  Home, Users, ClipboardList, Receipt, Settings,
  LogOut, Zap,
} from 'lucide-react';

const navLinks = [
  { href: '/dashboard',               label: 'Übersicht',     icon: Home          },
  { href: '/dashboard/kunden',        label: 'Kunden',        icon: Users         },
  { href: '/dashboard/auftraege',     label: 'Aufträge',      icon: ClipboardList },
  { href: '/dashboard/rechnungen',    label: 'Rechnungen',    icon: Receipt       },
  { href: '/dashboard/einstellungen', label: 'Einstellungen', icon: Settings      },
];

export default function DashboardLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [abo,  setAbo]  = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      const { data: a } = await supabase.from('abonnements').select('*').eq('user_id', u.id).single();
      if (!a) {
        const { data: neu } = await supabase.from('abonnements').insert({ user_id: u.id }).select().single();
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
  const trialLäuft = abo?.status === 'trial';
  const abgelaufen = trialLäuft && tage === 0;
  const warnung    = trialLäuft && tage <= 7 && tage > 0;

  if (!user) return null;

  if (abgelaufen && pathname !== '/dashboard/upgrade') {
    router.push('/dashboard/upgrade');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Trial-Banner */}
      {trialLäuft && tage > 0 && (
        <div className={`px-4 md:px-6 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-3 ${warnung ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
          <span>
            {warnung ? 'Noch ' : 'Noch '}{tage} {tage === 1 ? 'Tag' : 'Tage'} kostenlose Testphase
          </span>
          <Link href="/dashboard/upgrade"
            className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-50 transition">
            Jetzt upgraden
          </Link>
        </div>
      )}

      {/* Mobile-Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">K</span>
          </div>
          <span className="font-bold text-base text-gray-900">KanalPro</span>
        </div>
        {trialLäuft && (
          <Link href="/dashboard/upgrade"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition">
            <Zap size={12} /> Upgrade
          </Link>
        )}
      </header>

      <div className="flex flex-1 min-h-0">

        {/* Desktop-Sidebar */}
        <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col shrink-0">
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg text-gray-900">KanalPro</span>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navLinks.map((link) => {
              const Icon   = link.icon;
              const active = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link key={link.href} href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                  <Icon size={16} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-gray-100">
            {trialLäuft && (
              <Link href="/dashboard/upgrade"
                className="flex items-center justify-center gap-2 px-3 py-2 mb-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">
                <Zap size={12} /> Upgrade — ab 29 €/Monat
              </Link>
            )}
            <p className="text-xs text-gray-400 px-3 mb-2 truncate">{user.email}</p>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition">
              <LogOut size={16} /> Abmelden
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto px-4 py-4 md:p-8">{children}</main>

      </div>

      {/* Mobile-Bottom-Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-inset-bottom">
        <div className="flex items-stretch">
          {navLinks.map((link) => {
            const Icon   = link.icon;
            const active = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link key={link.href} href={link.href}
                className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-[10px] font-medium transition min-h-[56px] ${
                  active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}>
                <Icon size={20} />
                <span className="leading-tight">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
