'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Building2, User, FileText, Wrench, X, Plus } from 'lucide-react';
import supabase from '@/lib/supabase';
import { EmptyState } from '@/components/ui/KanalProUI';

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

  const gefiltert = buchstabe
    ? kunden.filter(k => {
        const n = k.kundentyp === 'firma' && k.firmenname ? k.firmenname : k.name;
        return n.toUpperCase().startsWith(buchstabe);
      })
    : kunden;

  const vorhandeneBuchstaben = new Set(kunden.map(k => {
    const n = k.kundentyp === 'firma' && k.firmenname ? k.firmenname : k.name;
    return n[0]?.toUpperCase();
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kunden</h1>
          <p className="text-sm text-gray-500 mt-0.5">{kunden.length} Kunden gesamt</p>
        </div>
        <Link
          href="/dashboard/kunden/neu"
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden="true" />
          Neuer Kunde
        </Link>
      </div>

      {/* A-Z Register */}
      <div className="flex flex-wrap gap-1 mb-5">
        <button
          onClick={() => setBuchstabe(null)}
          className={`px-2.5 h-8 rounded-md text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
            !buchstabe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Alle
        </button>
        {ALPHABET.map(b => (
          <button
            key={b}
            onClick={() => vorhandeneBuchstaben.has(b) && setBuchstabe(buchstabe === b ? null : b)}
            disabled={!vorhandeneBuchstaben.has(b)}
            className={`w-8 h-8 rounded-md text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
              buchstabe === b
                ? 'bg-blue-600 text-white'
                : vorhandeneBuchstaben.has(b)
                ? 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                : 'bg-gray-50 text-gray-300 cursor-default'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {laden ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="w-9 h-9 bg-gray-100 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={Users}
          title={`Keine Kunden${buchstabe ? ` mit â${buchstabe}"` : ''}`}
          description={!buchstabe ? 'Lege deinen ersten Kunden an.' : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-10">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Kontakt</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">AuftrÃ¤ge</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Letzter Einsatz</th>
                <th className="px-5 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gefiltert.map(k => {
                const anzeigeName = k.kundentyp === 'firma' && k.firmenname ? k.firmenname : k.name;
                const sortiert = (k.auftraege ?? []).slice().sort((a, b) => new Date(b.datum ?? 0) - new Date(a.datum ?? 0));
                const letzter = sortiert[0];
                return (
                  <tr
                    key={k.id}
                    onClick={() => router.push('/dashboard/kunden/' + k.id)}
                    className="group cursor-pointer hover:bg-gray-50 transition-colors"
                  >
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
                            <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${k.kundentyp === 'firma' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-500'}`}>
                              {k.kundentyp === 'firma'
                                ? <><Building2 size={10} aria-hidden="true" /> Firma</>
                                : <><User size={10} aria-hidden="true" /> Privat</>}
                            </span>
                            {k.ist_vertragskunde && (
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                                <FileText size={10} aria-hidden="true" /> Vertrag
                              </span>
                            )}
                            {k.ist_wartungskunde && (
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-medium">
                                <Wrench size={10} aria-hidden="true" /> Wartung
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {k.telefon && (
                          <a href={'tel:' + k.telefon} onClick={e => e.stopPropagation()}
                            className="block text-blue-600 hover:underline text-xs">
                            {k.telefon}
                          </a>
                        )}
                        {k.email && (
                          <a href={'mailto:' + k.email} onClick={e => e.stopPropagation()}
                            className="block text-gray-400 hover:text-gray-600 text-xs truncate max-w-40">
                            {k.email}
                          </a>
                        )}
                        {!k.telefon && !k.email && <span className="text-gray-300 text-xs">â</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                        {k.auftraege?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell">
                      {letzter?.datum ? new Date(letzter.datum).toLocaleDateString('de-DE') : 'â'}
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      {loeschenId === k.id ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs text-red-600 font-medium">LÃ¶schen?</span>
                          <button
                            onClick={() => handleDelete(k.id)}
                            className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                              loeschenBestaetigt
                                ? 'bg-red-600 text-white focus-visible:ring-red-500'
                                : 'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500'
                            }`}
                          >
                            {loeschenBestaetigt ? 'EndgÃ¼ltig' : 'Ja'}
                          </button>
                          <button
                            onClick={() => { setLoeschenId(null); setLoeschenBestaetigt(false); }}
                            className="text-xs px-2.5 py-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1"
                          >
                            Nein
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={'/dashboard/kunden/' + k.id}
                            onClick={e => e.stopPropagation()}
                            className="text-xs px-2.5 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                          >
                            Bearbeiten
                          </Link>
                          <button
                            onClick={() => { setLoeschenId(k.id); setLoeschenBestaetigt(false); }}
                            className="p-1.5 rounded-md text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
                            aria-label="Kunden lÃ¶schen"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </div>
      2               )}
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
