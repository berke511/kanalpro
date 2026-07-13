'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

function farbeVonName(name) {
  const farben = ['bg-blue-500','bg-green-500','bg-purple-500','bg-pink-500','bg-orange-500','bg-teal-500','bg-indigo-500','bg-red-500'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return farben[sum % farben.length];
}

function initialen(name) {
  const teile = name.trim().split(' ');
  if (teile.length >= 2) return (teile[0][0] + teile[teile.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function Kunden() {
  const router = useRouter();
  const [kunden, setKunden] = useState([]);
  const [laden, setLaden] = useState(true);
  const [buchstabe, setBuchstabe] = useState(null);
  const [suche, setSuche] = useState('');
  const [loeschenId, setLoeschenId] = useState(null);
  const [loeschenBestaetigt, setLoeschenBestaetigt] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('kunden')
      .select('*, auftraege(id, datum, status)')
      .eq('user_id', user.id)
      .order('name');
    setKunden(data ?? []);
    setLaden(false);
  }

  async function handleDelete(id) {
    if (!loeschenBestaetigt) { setLoeschenBestaetigt(true); return; }
    await supabase.from('kunden').delete().eq('id', id);
    setLoeschenId(null);
    setLoeschenBestaetigt(false);
    load();
  }

  const gefiltert = kunden.filter(k => {
    const n = k.kundentyp === 'firma' && k.firmenname ? k.firmenname : k.name;
    if (buchstabe && !n.toUpperCase().startsWith(buchstabe)) return false;
    if (suche && !n.toLowerCase().includes(suche.toLowerCase()) &&
        !(k.email ?? '').toLowerCase().includes(suche.toLowerCase())) return false;
    return true;
  });

  const vorhandeneBuchstaben = new Set(kunden.map(k => {
    const n = k.kundentyp === 'firma' && k.firmenname ? k.firmenname : k.name;
    return n[0]?.toUpperCase();
  }));

  return (
    <div className="max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kunden</h1>
          <p className="text-sm text-gray-500 mt-1">{kunden.length} Kunden gesamt</p>
        </div>
        <Link href="/dashboard/kunden/neu"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
          + Neuer Kunde
        </Link>
      </div>

      {/* Suchfeld */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Kunden suchen…"
          value={suche}
          onChange={e => { setSuche(e.target.value); setBuchstabe(null); }}
          className="h-10 w-full max-w-sm text-sm rounded-lg border border-gray-200 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* A-Z Register */}
      <div className="flex flex-wrap gap-1 mb-5">
        <button onClick={() => { setBuchstabe(null); setSuche(''); }}
          className={`px-2.5 h-7 rounded-lg text-xs font-bold transition ${!buchstabe && !suche ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          Alle
        </button>
        {ALPHABET.map(b => (
          <button key={b} onClick={() => { if (vorhandeneBuchstaben.has(b)) { setSuche(''); setBuchstabe(buchstabe === b ? null : b); }}}
            className={`w-7 h-7 rounded-md text-xs font-bold transition ${
              buchstabe === b ? 'bg-blue-600 text-white' :
              vorhandeneBuchstaben.has(b) ? 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700' :
              'bg-gray-50 text-gray-300 cursor-default'
            }`}>
            {b}
          </button>
        ))}
      </div>

      {laden ? (
        <p className="text-gray-400 text-sm">Wird geladen...</p>
      ) : gefiltert.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">Keine Kunden{buchstabe ? ` mit „${buchstabe}“` : suche ? ` für „${suche}“` : ''}</p>
          {!buchstabe && !suche && <p className="text-sm mt-1">Lege deinen ersten Kunden an.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm z-10">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Kontakt</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Aufträge</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">Letzter Einsatz</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gefiltert.map(k => {
                const anzeigeName = k.kundentyp === 'firma' && k.firmenname ? k.firmenname : k.name;
                const sortiert = (k.auftraege ?? []).slice().sort((a, b) => new Date(b.datum ?? 0) - new Date(a.datum ?? 0));
                const letzter = sortiert[0];
                return (
                  <tr key={k.id} onClick={() => router.push('/dashboard/kunden/' + k.id)}
                    className="group hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${farbeVonName(anzeigeName)}`}>
                          {initialen(anzeigeName)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{anzeigeName}</p>
                          {k.kundentyp === 'firma' && k.name && (
                            <p className="text-xs text-gray-400">{k.name}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${k.kundentyp === 'firma' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-500'}`}>
                              {k.kundentyp === 'firma' ? 'Firma' : 'Privat'}
                            </span>
                            {k.ist_vertragskunde && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Vertrag</span>}
                            {k.ist_wartungskunde && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-medium">Wartung</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {k.telefon && (
                          <a href={'tel:' + k.telefon} onClick={e => e.stopPropagation()}
                            className="block text-blue-600 hover:underline text-xs">{k.telefon}</a>
                        )}
                        {k.email && (
                          <a href={'mailto:' + k.email} onClick={e => e.stopPropagation()}
                            className="block text-gray-400 hover:text-gray-600 text-xs truncate max-w-40">{k.email}</a>
                        )}
                        {!k.telefon && !k.email && <span className="text-gray-300 text-xs">–</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                        {k.auftraege?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell">
                      {letzter?.datum ? new Date(letzter.datum).toLocaleDateString('de-DE') : '–'}
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      {loeschenId === k.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-red-600">Löschen?</span>
                          <button onClick={() => handleDelete(k.id)}
                            className={`text-xs px-2 py-1 rounded transition ${loeschenBestaetigt ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                            {loeschenBestaetigt ? 'Endgültig' : 'Ja'}
                          </button>
                          <button onClick={() => { setLoeschenId(null); setLoeschenBestaetigt(false); }}
                            className="text-xs px-2 py-1 rounded text-gray-400 hover:bg-gray-100">
                            Nein
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Link href={'/dashboard/kunden/' + k.id} onClick={e => e.stopPropagation()}
                            className="text-xs px-2 py-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
                            Bearbeiten
                          </Link>
                          <button onClick={() => { setLoeschenId(k.id); setLoeschenBestaetigt(false); }}
                            className="text-xs px-2 py-1 rounded text-gray-300 hover:bg-red-50 hover:text-red-500 transition">
                            ✕
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
