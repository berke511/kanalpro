'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
export default function Register() {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [erfolg, setErfolg] = useState(false);
  const [laden, setLaden] = useState(false);
  async function handleRegister(e) {
    e.preventDefault();
    setFehler('');
    setLaden(true);
    const { error } = await supabase.auth.signUp({ email, password: passwort });
    if (error) { setFehler(error.message); } else { setErfolg(true); }
    setLaden(false);
  }
  if (erfolg) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="bg-white p-8 rounded-2xl text-center"><h2 className="font-bold text-xl mb-2">Fast geschafft!</h2><p className="text-gray-500">Bitte bestaetige deine E-Mail.</p></div></div>);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><Link href="/"><span className="font-bold text-2xl">KanalPro</span></Link></div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="max@firma.de" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label><input type="password" required minLength={6} value={passwort} onChange={e=>setPasswort(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <button type="submit" disabled={laden} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60">{laden ? 'Laden...' : 'Kostenlos registrieren'}</button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">Bereits ein Konto? <Link href="/login" className="text-blue-600 font-medium">Anmelden</Link></p>
        </div>
      </div>
    </div>
  );
}
