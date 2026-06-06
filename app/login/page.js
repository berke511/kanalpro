'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);
  async function handleLogin(e) {
    e.preventDefault();
    setFehler('');
    setLaden(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
    if (error) { setFehler('E-Mail oder Passwort falsch.'); } else { router.push('/dashboard'); }
    setLaden(false);
  }
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><Link href="/"><span className="font-bold text-2xl">KanalPro</span></Link></div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="max@firma.de" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label><input type="password" required value={passwort} onChange={e=>setPasswort(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <button type="submit" disabled={laden} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60">{laden ? 'Laden...' : 'Anmelden'}</button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">Noch kein Konto? <Link href="/register" className="text-blue-600 font-medium">Registrieren</Link></p>
        </div>
      </div>
    </div>
  );
}
