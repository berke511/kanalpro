'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Users, Search, Trash2, ExternalLink, X } from 'lucide-react';
import {
  PageHeader, FilterButton, FilterBar,
  Table, TableRow, TableCell, TableSkeleton, TableCheckbox, TableActions,
  EmptyState, IconButton, PrimaryButton, DangerButton,
} from '@/components/ui/KanalProUI';

// Geplante Spalten-Konfiguration (noch nicht funktional â vorbereitet fuer PX-004)
// const COLUMN_CONFIG = [
//   { key: 'name',    label: 'Kunde',         sortable: true,  visible: true },
//   { key: 'kontakt', label: 'Kontakt',        sortable: false, visible: true },
//   { key: 'auftraege', label: 'Auftraege',    sortable: true,  visible: true },
//   { key: 'letzter', label: 'Letzter Einsatz',sortable: true,  visible: true },
// ];

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
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { load(); }, []);

  async function load() {
    setLaden(true);
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

  function anzeigeName(k) {
    return k.kundentyp === 'firma' && k.firmenname ? k.firmenname : k.name;
  }

  const vorhandeneBuchstaben = new Set(kunden.map(k => anzeigeName(k)[0]?.toUpperCase()));

  const gefiltert = kunden.filter(k => {
    const n = anzeigeName(k);
    if (buchstabe && !n.toUpperCase().startsWith(buchstabe)) return false;
    if (suche) {
      const s = suche.toLowerCase();
      const treffer =
        n.toLowerCase().includes(s) ||
        (k.email ?? '').toLowerCase().includes(s) ||
        (k.telefon ?? '').toLowerCase().includes(s);
      if (!treffer) return false;
    }
    return true;
  });

  // Massenauswahl
  const alleGewaehlt = gefiltert.length > 0 && gefiltert.every(k => selectedIds.has(k.id));
  const teilGewaehlt = gefiltert.some(k => selectedIds.has(k.id)) && !alleGewaehlt;

  function toggleAlle() {
    if (alleGewaehlt) {
      setSelectedIds(prev => { const n = new Set(prev); gefiltert.forEach(k => n.delete(k.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); gefiltert.forEach(k => n.add(k.id)); return n; });
    }
  }

  function toggleEiner(id) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kunden"
        subtitle={`${kunden.length} Kunden gesamt`}
        action={
          <Link href="/dashboard/kunden/neu"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
            + Neuer Kunde
          </Link>
        }
      />

      {/* Suchleiste */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          placeholder="Suchen..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        {suche && (
          <button onClick={() => setSuche('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* A-Z Register */}
      <FilterBar>
        <FilterButton label="Alle" active={!buchstabe} onClick={() => setBuchstabe(null)} />
        {ALPHABET.map(b => (
          <FilterButton
            key={b}
            label={b}
            active={buchstabe === b}
            onClick={() => vorhandeneBuchstaben.has(b) ? setBuchstabe(buchstabe === b ? null : b) : undefined}
          />
        ))}
      </FilterBar>

      {/* Bulk-Action-Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm">
          <span className="font-medium text-blue-700 dark:text-blue-300">{selectedIds.size} ausgewaehlt</span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            Auswahl aufheben
          </button>
          {/* Platzhalter-Aktionen */}
          <div className="ml-auto flex gap-2">
            <button className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition">
              Exportieren
            </button>
          </div>
        </div>
      )}

      {/* Inhaltsbereich */}
      {laden ? (
        <TableSkeleton rows={6} cols={4} />
      ) : gefiltert.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <EmptyState
            icon={Users}
            title={buchstabe || suche ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}
            description={buchstabe || suche ? 'Versuche andere Filter oder Suchbegriffe.' : 'Lege deinen ersten Kunden an.'}
            action={(!buchstabe && !suche) ? () => router.push('/dashboard/kunden/neu') : undefined}
            actionLabel="Neuer Kunde"
          />
        </div>
      ) : (
        <>
          {/* Desktop-Tabelle (md und groesser) */}
          <div className="hidden md:block">
            <Table headers={['', 'Kunde', 'Kontakt', 'Auftraege', 'Letzter Einsatz', '']}>
              {/* Kopf-Checkbox */}
              <tr className="bg-transparent">
                <td className="pl-3 pr-0 py-1 w-10">
                  <TableCheckbox
                    checked={alleGewaehlt}
                    indeterminate={teilGewaehlt}
                    onChange={toggleAlle}
                  />
                </td>
                <td colSpan={5} />
              </tr>
              {gefiltert.map(k => {
                const name = anzeigeName(k);
                const sortiert = (k.auftraege ?? []).slice().sort((a, b) => new Date(b.datum ?? 0) - new Date(a.datum ?? 0));
                const letzter = sortiert[0];
                const isSelected = selectedIds.has(k.id);
                return (
                  <TableRow
                    key={k.id}
                    onClick={() => router.push('/dashboard/kunden/' + k.id)}
                    className={isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  >
                    <TableCell className="pl-3 pr-0 w-10" >
                      <div onClick={e => { e.stopPropagation(); toggleEiner(k.id); }}>
                        <TableCheckbox
                          checked={isSelected}
                          onChange={() => toggleEiner(k.id)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${farbeVonName(name)}`}>
                          {initialen(name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{name}</p>
                          {k.kundentyp === 'firma' && k.name && (
                            <p className="text-xs text-gray-400">{k.name}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`]ext-xs px-1.5 py-0.5 rounded font-medium ${k.kundentyp === 'firma' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-500'}`}>
                             {k.kundentyp === 'firma' ? 'Firma' : 'Privat'}
                            </span>
                            {k.ist_vertragskunde && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Vertrag</span>}
                            {k.ist_wartungsiunde && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-medium">Wartung</span>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {k.telefon && (
                          <a href={'tel:' + k.telefon} onClick={e => e.stopPropagation()}
                            className="block text-blue-600 hover:underline text-xs">{k.telefon}</a>
                        )}
                        {k.email && (
                          <a href={'mailto:' + k.email} onClick={e => e.stopPropagation()}
                            className="block text-gray-400 hover:text-gray-600 text-xs truncate max-w-40">{k.email}</a>
                        )}
                        {!k.telefon && !k.email && <span className="text-gray-300 text-xs">â</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold">
                        {k.auftraege?.length ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      {letzter?.datum ? new Date(letzter.datum).toLocaleDateString('de-DE') : 'â'}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      {loeschenId === k.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-red-600">Loeschen?</span>
                          <button onClick={() => handleDelete(k.id)}
                            className={`text-xs px-2 py-1 rounded transition ${loeschenBestaetigt ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                            {loeschenBestaetigt ? 'Endgueltig' : 'Ja'}
                          </button>
                          <button onClick={() => { setLoeschenId(null); setLoeschenBestaetigt(false); }}
                            className="text-xs px-2 py-1 rounded text-gray-400 hover:bg-gray-100">
                            Nein
                          </button>
                        </div>
                      ) : (
                        <TableActions>
                          <Link href={'/dashboard/kunden/' + k.id} onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                            <ExternalLink size={14} />
                          </Link>
                          <button onClick={() => { setLoeschenId(k.id); setLoeschenBestaetigt(false); }}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bv-red-50 transition">
                            <Trash2 size={14} />
                          </button>
                        </TableActions>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
          </div>

          {/* Mobile Card-Ansicht (kleiner als md) */}
          <div className="md:hidden space-y-3">
            {gefiltert.map(k => {
              const name = anzeigeName(k);
              const sortiert = (k.auftraege ?? []).slice().sort((a, b) => new Date(b.datum ?? 0) - new Date(a.datum ?? 0));
              const letzter = sortiert[0];
              return (
                <div
                  key={k.id}
                  onClick={() => router.push('/dashboard/kunden/' + k.id)}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 cursor-pointer hover:border-blue-100 dark:hover:border-blue-800 transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${farbeVonName(name)}`}>
                      {initialen(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${k.kundentyp === 'firma' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-500'}`}>
                          {k.kundentyp === 'firma' ? 'Firma' : 'Privat'}
                        </span>
                        {k.ist_vertragskunde && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Vertrag</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    {k.telefon && <p>{k.telefon}</p>}
                    {k.email && <p className="truncate">{k.email}</p>}
                    <p>{k.auftraege?.length ?? 0} Auftraege{letzter?.datum ? ` Â· Letzter: ${new Date(letzter.datum).toLocaleDateString('de-DE')}` : ''}</p>
                  </div>
                  <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                    <Link href={'/dashboard/kunden/' + k.id}
                      className="flex-1 text-center py-2 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition">
                      Oeffnen
                    </Link>
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
