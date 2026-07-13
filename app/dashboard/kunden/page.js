'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, UserPlus, Users, ChevronRight, Trash2 } from 'lucide-react';
import supabase from '@/lib/supabase';
import {
  PageHeader,
  EmptyState,
  FilterBar,
  FilterButton,
  GhostButton,
  DangerButton,
  PrimaryButton,
} from '@/components/ui/KanalProUI';

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
  const [suche, setSuche] = useState('');
  const [typFilter, setTypFilter] = useState('alle');

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

  function anzeigeNameVon(k) {
    return k.kundentyp === 'firma' && k.firmenname ? k.firmenname : k.name;
  }

  const gefiltertKunden = kunden
    .filter(k => typFilter === 'alle' || k.kundentyp === typFilter)
    .filter(k => {
      if (!suche) return true;
      const n = anzeigeNameVon(k).toLowerCase();
      const s = suche.toLowerCase();
      return n.includes(s) || (k.email ?? '').toLowerCase().includes(s) || (k.telefon ?? '').includes(s);
    })
    .filter(k => {
      if (!buchstabe) return true;
      return anzeigeNameVon(k).toUpperCase().startsWith(buchstabe);
    });

  const vorhandeneBuchstaben = new Set(kunden.map(k => anzeigeNameVon(k)[0]?.toUpperCase()));

  if (laden) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-7 w-32 bg-gray-100 rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-1/4 animate-pulse" />
              </div>
              <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Kunden"
        subtitle={`${kunden.length} Kunden gesamt`}
        action={
          <Link href="/dashboard/kunden/neu">
            <PrimaryButton className="inline-flex items-center gap-2">
              <UserPlus size={16} />
              Neuer Kunde
            </PrimaryButton>
          </Link>
        }
      />

      {/* Suche + Filter-Tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={suche}
            onChange={e => setSuche(e.target.value)}
            placeholder="Kunden suchen..."
            className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
        </div>
        <FilterBar>
          {[
            { key: 'alle', label: 'Alle' },
            { key: 'firma', label: 'Firma' },
            { key: 'privat', label: 'Privat' },
          ].map(({ key, label }) => (
            <FilterButton key={key} label={label} active={typFilter === key} onClick={() => setTypFilter(key)} />
          ))}
        </FilterBar>
      </div>

      {/* A-Z Register */}
      <div className="flex flex-wrap gap-1 mb-4">
        <FilterButton label="Alle" active={!buchstabe} onClick={() => setBuchstabe(null)} />
        {ALPHABET.map(b => (
          <button
            key={b}
            type="button"
            onClick={() => vorhandeneBuchstaben.has(b) && setBuchstabe(buchstabe === b ? null : b)}
            className={`w-8 h-8 rounded-md text-xs font-medium transition border ${
              buchstabe === b
                ? 'bg-blue-600 text-white border-blue-600'
                : vorhandeneBuchstaben.has(b)
                ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                : 'bg-white text-gray-300 border-gray-100 cursor-default'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {gefiltertKunden.length === 0 ? (
        <EmptyState
          icon={Users}
          title={suche || buchstabe || typFilter !== 'alle' ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}
          description={
            suche || buchstabe || typFilter !== 'alle'
              ? 'Passe die Filter an oder suche anders.'
              : 'Lege jetzt deinen ersten Kunden an.'
          }
          action={!suche && !buchstabe && typFilter === 'alle' ? () => router.push('/dashboard/kunden/neu') : undefined}
          actionLabel={!suche && !buchstabe && typFilter === 'alle' ? 'Ersten Kunden anlegen' : undefined}
        />
      ) : (
        <>
          {/* Desktop-Tabelle */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Kunde</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Kontakt</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Typ</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Auftraege</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Letzter Einsatz</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {gefiltertKunden.map(k => {
                  const anzeigeName = anzeigeNameVon(k);
                  const sortiert = (k.auftraege ?? []).slice().sort((a, b) => new Date(b.datum ?? 0) - new Date(a.datum ?? 0));
                  const letzter = sortiert[0];
                  return (
                    <tr
                      key={k.id}
                      onClick={() => router.push('/dashboard/kunden/' + k.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {initialen(anzeigeName)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{anzeigeName}</p>
                            {k.kundentyp === 'firma' && k.name && (
                              <p className="text-xs text-gray-400">{k.name}</p>
                            )}
                            {(k.ist_vertragskunde || k.ist_wartungskunde) && (
                              <div className="flex gap-1 mt-0.5">
                                {k.ist_vertragskunde && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Vertrag</span>
                                )}
                                {k.ist_wartungskunde && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-medium">Wartung</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {k.telefon && (
                            <a href={'tel:' + k.telefon} onClick={e => e.stopPropagation()}
                              className="block text-blue-600 hover:underline text-xs">{k.telefon}</a>
                          )}
                          {k.email && (
                            <a href={'mailto:' + k.email} onClick={e => e.stopPropagation()}
                              className="block text-gray-400 hover:text-gray-600 text-xs truncate max-w-[160px]">{k.email}</a>
                          )}
                          {!k.telefon && !k.email && <span className="text-gray-300 text-xs">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          k.kundentyp === 'firma'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {k.kundentyp === 'firma' ? 'Firma' : 'Privat'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                          {k.auftraege?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                        {letzter?.datum ? new Date(letzter.datum).toLocaleDateString('de-DE') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        {loeschenId === k.id ? (
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs text-red-600">Loeschen?</span>
                            <DangerButton
                              onClick={() => handleDelete(k.id)}
                              className="!text-xs !px-2 !py-1 !min-h-0"
                            >
                              {loeschenBestaetigt ? 'Endgueltig' : 'Ja'}
                            </DangerButton>
                            <GhostButton
                              onClick={() => { setLoeschenId(null); setLoeschenBestaetigt(false); }}
                              className="!text-xs !px-2 !py-1 !min-h-0"
                            >
                              Nein
                            </GhostButton>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              onClick={() => { setLoeschenId(k.id); setLoeschenBestaetigt(false); }}
                              className="p-1.5 rounded text-gray-300 hover:bg-red-50 hover:text-red-500 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                            <button
                              onClick={() => router.push('/dashboard/kunden/' + k.id)}
                              className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                            >
                              <ChevronRight size={14} />
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

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {gefiltertKunden.map(k => {
              const anzeigeName = anzeigeNameVon(k);
              return (
                <div
                  key={k.id}
                  onClick={() => router.push('/dashboard/kunden/' + k.id)}
                  className="rounded-xl border border-gray-100 shadow-sm p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                      {initialen(anzeigeName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900 truncate">{anzeigeName}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            k.kundentyp === 'firma' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {k.kundentyp === 'firma' ? 'Firma' : 'Privat'}
                          </span>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {k.email && <p className="text-xs text-gray-500 truncate">{k.email}</p>}
                        {k.telefon && <p className="text-xs text-gray-500">{k.telefon}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
