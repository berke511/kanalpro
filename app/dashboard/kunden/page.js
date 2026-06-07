'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const avatarFarben = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-red-100 text-red-700',
  'bg-yellow-100 text-yellow-700',
];

function avatarFarbe(name) {
  const code = (name || 'A').charCodeAt(0);
  return avatarFarben[code % avatarFarben.length];
}

function initialen(name, firma) {
  const teile = (name || '').trim().split(' ');
  if (teile.length >= 2) return (teile[0][0] + teile[teile.length - 1][0]).toUpperCase();
  return (name || '?')[0].toUpperCase();
}

export default function Kunden() {
  const router = useRouter();
  const [kunden, setKunden] = useState([]);
  const [suche, setSuche] = useState('');
  const [aktiverBuchstabe, setAktiverBuchstabe] = useState('Alle');
  const [laden, setLaden] = useState(true);
  const [loeschenId, setLoeschenId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: k } = await supabase
        .from('kunden')
        .select('*, auftraege(id, datum, status)')
        .eq('user_id', user.id)
        .order('name');
      setKunden(k ?? []);
      setLaden(false);
    }
    load();
  }, []);

  async function handleLoeschen(id) {
    await supabase.from('kunden').delete().eq('id', id);
    setKunden(kunden.filter(k => k.id !== id));
    setLoeschenId(null);
  }

  // Aktive Buchstaben ermitteln
  const aktiveBuchstaben = new Set(kunden.map(k => (k.name || '')[0]?.toUpperCase()).filter(Boolean));

  // Filter anwenden
  let gefiltert = kunden;
  if (suche) {
    gefiltert = gefiltert.filter(k =>
      `${k.name} ${k.firma} ${k.telefon} ${k.email}`.toLowerCase().includes(suche.toLowerCase())
    );
  }
  if (aktiverBuchstabe !== 'Alle') {
    gefiltert = gefiltert.filter(k => (k.name || '')[0]?.toUpperCase() === aktiverBuchstabe);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
          <p className="text-gray-500 mt-1">{kunden.length} Kunden gesamt</p>
        </div>
        <Link href="/dashboard/kunden/neu"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
          + Neuer Kunde
        </Link>
      </div>

      {/* Suche */}
      <input type="text" placeholder="🔍  Suche nach Name, Firma, Telefon..."
        value={suche} onChange={e => { setSuche(e.target.value); setAktiverBuchstabe('Alle'); }}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />

      {/* A-Z Register */}
      <div className="flex flex-wrap gap-1 mb-6">
        <button
          onClick={() => setAktiverBuchstabe('Alle')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            aktiverBuchstabe === 'Alle'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}>
          Alle
        </button>
        {ALPHABET.map(b => {
          const aktiv = aktiveBuchstaben.has(b);
          const ausgewaehlt = aktiverBuchstabe === b;
          return (
            <button key={b}
              onClick={() => aktiv && setAktiverBuchstabe(ausgewaehlt ? 'Alle' : b)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                ausgewaehlt
                  ? 'bg-blue-600 text-white'
                  : aktiv
                    ? 'bg-white border border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-200 cursor-pointer'
                    : 'text-gray-200 cursor-default'
              }`}>
              {b}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {laden ? (
        <p className="text-gray-400">Wird geladen...</p>
      ) : gefiltert.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium">{suche || aktiverBuchstabe !== 'Alle' ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}</p>
          <p className="text-sm mt-1">{suche || aktiverBuchstabe !== 'Alle' ? 'Versuche eine andere Suche.' : 'Lege deinen ersten Kunden an.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Aufträge</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Letzter Auftrag</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kontakt</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gefiltert.map(k => {
                const auftraege = k.auftraege ?? [];
                const letzterAuftrag = auftraege.sort((a, b) => new Date(b.datum||0) - new Date(a.datum||0))[0];
                const istLoeschen = loeschenId === k.id;

                return (
                  <tr key={k.id} className="hover:bg-gray-50 transition">
                    {/* Avatar + Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/dashboard/kunden/" + k.id)}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarFarbe(k.name)}`}>
                          {initialen(k.name, k.firma)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{k.name}</p>
                          {k.firma && <p className="text-xs text-gray-400 mt-0.5">{k.firma}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Aufträge */}
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        auftraege.length > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {auftraege.length} {auftraege.length === 1 ? 'Auftrag' : 'Aufträge'}
                      </span>
                    </td>

                    {/* Letzter Auftrag */}
                    <td className="px-5 py-3 text-gray-500 text-sm">
                      {letzterAuftrag?.datum
                        ? new Date(letzterAuftrag.datum).toLocaleDateString('de-DE')
                        : <span className="text-gray-300">–</span>}
                    </td>

                    {/* Kontakt */}
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        {k.telefon && (
                          <a href={"tel:" + k.telefon}
                            onClick={e => e.stopPropagation()}
                            className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                            📞 {k.telefon}
                          </a>
                        )}
                        {k.email && (
                          <a href={"mailto:" + k.email}
                            onClick={e => e.stopPropagation()}
                            className="text-blue-600 hover:underline text-xs flex items-center gap-1 truncate max-w-[160px]">
                            ✉️ {k.email}
                          </a>
                        )}
                        {!k.telefon && !k.email && <span className="text-gray-300 text-xs">–</span>}
                      </div>
                    </td>

                    {/* Aktionen */}
                    <td className="px-5 py-3 text-right">
                      {!istLoeschen ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push("/dashboard/kunden/" + k.id)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition">
                            Bearbeiten
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setLoeschenId(k.id); }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600 transition">
                            Löschen
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium">Wirklich löschen?</span>
                          <button onClick={() => handleLoeschen(k.id)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition">
                            Ja
                          </button>
                          <button onClick={() => setLoeschenId(null)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                            Nein
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}