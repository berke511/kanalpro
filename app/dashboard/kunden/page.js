'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus, getPlan } from '@/lib/subscription';

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
  const [planInfo, setPlanInfo] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const abo = await checkAndDowngrade(supabase, user.id);
    const sub = getSubscriptionStatus(abo);
    const plan = getPlan(sub.plan);
    const limit = plan.limits.kunden;
    const { data } = await supabase
      .from('kunden')
      .select('*, auftraege(id, datum, status)')
      .order('name');
    setKunden(data ?? []);
    const count = (data ?? []).length;
    const isLimited = limit != null && limit !== Infinity;
    const atLimit = isLimited && count >= limit;
    const nearLimit = isLimited && !atLimit && count >= Math.floor(limit * 0.8);
    setPlanInfo({ planId: sub.plan, limit, count, atLimit, nearLimit });
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
          <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
          <p className="text-gray-500 mt-1">{kunden.length} Kunden gesamt</p>
        </div>
        {planInfo?.atLimit ? (
          <Link href="/dashboard/billing"
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm flex items-center gap-1.5 border border-red-100">
            Limit erreicht
          </Link>
        ) : (
          <Link href="/dashboard/kunden/neu"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
            + Neuer Kunde
          </Link>
        )}
      </div>

      {planInfo?.atLimit && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <span>Limit erreicht: {planInfo.count}/{planInfo.limit} Kunden (Starter-Plan)</span>
          <Link href="/dashboard/billing" className="ml-4 font-semibold underline shrink-0">Upgrade →</Link>
        </div>
      )}
      {planInfo?.nearLimit && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
          <span>{planInfo.count}/{planInfo.limit} Kunden genutzt — bald voll</span>
          <Link href="/dashboard/billing" className="ml-4 font-semibold underline shrink-0">Upgrade →</Link>
        </div>
      )}

      {/* A-Z Register */}
      <div className="flex flex-wrap gap-1 mb-5">
        <button onClick={() => setBuchstabe(null)}
          className={`px-2.5 h-7 rounded-lg text-xs font-bold transition ${!buchstabe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          Alle
        </button>
        {ALPHABET.map(b => (
          <button key={b} onClick={() => vorhandeneBuchstaben.has(b) && setBuchstabe(buchstabe === b ? null : b)}
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
        <p className="text-gray-400">Wird geladen...</p>
      ) : gefiltert.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          
          <p className="font-medium">Keine Kunden{buchstabe ? ` mit „${buchstabe}"` : ''}</p>
          {!buchstabe && <p className="text-sm mt-1">Lege deinen ersten Kunden an.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
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
                    className="hover:bg-gray-50 cursor-pointer transition">
                    <td className="px-5 py-3">
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
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {k.telefon && (
                          <a href={'tel:' + k.telefon} onClick={e => e.stopPropagation()}
                            className="block text-blue-600 hover:underline text-xs">{k.telefon}</a>
                        )}
                        {k.email && (
                          <a href={'mailto:' + k.email} onClick={e => e.stopPropagation()}
                            className="block text-gray-400 hover:text-gray-600 text-xs truncate max-w-40">{k.email}</a>
                        )}
                        {!i.telefon && !k.email && <span className="text-gray-300 text-xs">–</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                        {k.auftraege?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {letzter?.datum ? new Date(letzter.datum).toLocaleDateString('de-DE') : '–'}
                    </td>
                    <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
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
                        <div className="flex items-center gap-1 justify-end">
                          <Link href={'/dashboard/kunden/' + k.id} onClick={e => e.stopPropagation()}
                            className="text-xs px-2 py-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
                            Bearbeiten
                          </Link>
                          <button onClick={() => { setLoeschenId(k.id); setLoeschenBestaetigt(false); }}
                            className="text-xs px-2 py-1 rounded text-gray-300 hover:bg-red-50 hover:text-red-500 transition">
                            ×
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
