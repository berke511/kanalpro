'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function Konto() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [laden, setLaden] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLaden(false);
    }
    load();
  }, []);

  async function handlePasswortReset() {
    if (!user) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) { setMsg('Fehler: ' + error.message); return; }
    setMsg('Passwort-Reset-E-Mail wurde gesendet.');
  }

  async function handleAbmelden() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (laden) return <div className="p-8 text-center text-gray-400 text-sm">Lädt…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Konto</h1>
          <p className="text-sm text-gray-500 mt-0.5">Deine Konto-Einstellungen</p>
        </div>
        <Link href="/dashboard/einstellungen" className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          ← Einstellungen
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">E-Mail-Adresse</p>
          <p className="text-sm text-gray-900 mt-1">{user?.email ?? '–'}</p>
        </div>
        <hr className="border-gray-100" />
        {msg && <p className="text-sm text-blue-600">{msg}</p>}
        <div className="space-y-2">
          <button
            onClick={handlePasswortReset}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition text-left"
          >
            Passwort zurücksetzen
          </button>
          <button
            onClick={handleAbmelden}
            className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition text-left"
          >
            Abmelden
          </button>
        </div>
      </div>
    </div>
  );
}
