'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, ClipboardList, FileText, Receipt, CalendarDays, UserCheck, Truck, Wrench, Package, Settings, AlertTriangle, Sparkles, Zap, LogOut, Menu, X } from 'lucide-react';
import supabase from '@/lib/supabase';

const navGroups = [
{
label: null,
links: [
{ href: '/dashboard', label: 'Übersicht', icon: LayoutDashboard },
],
},
{
label: 'Vertrieb',
links: [
{ href: '/dashboard/kunden', label: 'Kunden', icon: Users },
{ href: '/dashboard/auftraege', label: 'Aufträge', icon: ClipboardList },
{ href: '/dashboard/angebote', label: 'Angebote', icon: FileText },
{ href: '/dashboard/rechnungen', label: 'Rechnungen', icon: Receipt },
],
},
{
label: 'Betrieb',
links: [
{ href: '/dashboard/disposition', label: 'Disposition', icon: CalendarDays },
{ href: '/dashboard/mitarbeiter', label: 'Mitarbeiter', icon: UserCheck },
{ href: '/dashboard/fahrzeuge', label: 'Fahrzeuge', icon: Truck },
{ href: '/dashboard/maschinen', label: 'Maschinen', icon: Wrench },
{ href: '/dashboard/material', label: 'Material', icon: Package },
],
},
{
label: 'Verwaltung',
links: [
{ href: '/dashboard/einstellungen', label: 'Einstellungen', icon: Settings },
],
},
];

export default function DashboardLayout({ children }) {
const router = useRouter();
const pathname = usePathname();
const [user, setUser] = useState(null);
const [abo, setAbo] = useState(null);
const [sidebarOpen, setSidebarOpen] = useState(false);

useEffect(() => {
setSidebarOpen(false);
}, [pathname]);

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

const tage = trialTage();
const trialLäuft = abo?.status === 'trial';
const abgelaufen = trialLäuft && tage === 0;
const warnung = trialLäuft && tage <= 7 && tage > 0;

if (!user) return null;

if (abgelaufen && pathname !== '/dashboard/upgrade') {
router.push('/dashboard/upgrade');
return null;
}

return (
<div className="min-h-screen flex flex-col bg-gray-50">
{/* Trial-Banner */}
{trialLäuft && tage > 0 && (
<div className={`px-4 py-2.5 text-center text-sm font-medium flex flex-wrap items-center justify-center gap-2 ${warnung ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
<span className="flex items-center gap-1.5">
{warnung ? <AlertTriangle size={16} /> : <Sparkles size={16} />} Noch {tage} {tage === 1 ? 'Tag' : 'Tage'} kostenlose Testphase
</span>
<Link href="/dashboard/upgrade"
className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-50 transition">
Jetzt upgraden
</Link>
</div>
)}

<div className="flex flex-1 overflow-hidden">
{/* Mobile overlay */}
{sidebarOpen && (
<div
className="fixed inset-0 z-40 bg-black/40 md:hidden"
onClick={() => setSidebarOpen(false)}
/>
)}

{/* Sidebar */}
<aside className={`w-64 md:w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:translate-x-0 md:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
<div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
<span className="text-white font-bold text-sm">K</span>
</div>
<span className="font-bold text-lg text-gray-900">KanalPro</span>
</div>
<button
className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
onClick={() => setSidebarOpen(false)}
>
<X size={18} />
</button>
</div>

<nav className="flex-1 px-3 py-4 overflow-y-auto">
{navGroups.map((group, gi) => (
<div key={gi} className={gi > 0 ? 'mt-4' : ''}>
{group.label && (
<p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
{group.label}
</p>
)}
<div className="space-y-1">
{group.links.map((link) => (
<Link key={link.href} href={link.href}
className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
pathname === link.href || pathname.startsWith(link.href + '/')
? 'bg-blue-50 text-blue-700'
: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
}`}>
<link.icon size={18} />{link.label}
</Link>
))}
</div>
</div>
))}
</nav>

<div className="px-3 py-4 border-t border-gray-100">
{trialLäuft && (
<Link href="/dashboard/upgrade"
className="flex items-center justify-center gap-2 px-3 py-2 mb-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">
<Zap size={14} /> Upgrade — ab 29 €/Monat
</Link>
)}
<p className="text-xs text-gray-400 px-3 mb-2 truncate">{user.email}</p>
<button onClick={handleLogout}
className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition">
<LogOut size={18} /> Abmelden
</button>
</div>
</aside>

{/* Main content area */}
<div className="flex-1 flex flex-col min-w-0">
{/* Mobile top bar */}
<div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
<button
onClick={() => setSidebarOpen(true)}
className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
aria-label="Menø öffnen"
>
<Menu size={20} />
</button>
<span className="font-bold text-gray-900">KanalPro</span>
</div>
<main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8">{children}</main>
</div>
</div>
</div>
);
}
