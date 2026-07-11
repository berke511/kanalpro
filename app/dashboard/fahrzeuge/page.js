'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Truck, Search, X, ExternalLink, Plus } from 'lucide-react';
import {
  PageHeader, FilterBar, FilterButton,
  Table, TableRow, TableCell, TableSkeleton, TableCheckbox, TableActions,
  EmptyState, IconButton,
} from '@/components/ui/KanalProUI';

// Geplante Spalten-Konfiguration (noch nicht funktional â vorbereitet fuer PX-004)
// const COLUMN_CONFIG = [
//   { key: 'kennzeichen', label: 'Kennzeichen', sortable: true,  visible: true },
//   { key: 'typ',         label: 'Typ',         sortable: false, visible: true },
//   { key: 'fahrzeug',    label: 'Marke/Modell',sortable: false, visible: true },
//   { key: 'zustand',     label: 'Zustand',     sortable: false, visible: true },
// ];

const ZUSTAND_COLORS = {
  aktiv:         'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  wartung:       'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  reserviert:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ausser_betrieb:'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const ZUSTAND_LABELS = {
  aktiv:         'Aktiv',
  wartung:       'Wartung',
  reserviert:    'Reserviert',
  ausser_betrieb:'Ausser Betrieb',
};

const TYP_LABELS = {
  pkw:              'PKW',
  lkw:              'LKW',
  transporter:      'Transporter',
  kleintransporter: 'Kleintransporter',
  anhaenger:        'Anhaenger',
  sonstiges:        'Sonstiges',
};

const ZUSTAND_FILTER = [
  { key: 'alle',          label: 'Alle'           },
  { key: 'aktiv',         label: 'Aktiv'          },
  { key: 'wartung',       label: 'Wartung'        },
  { key: 'reserviert',    label: 'Reserviert'     },
  { key: 'ausser_betrieb',label: 'Ausser Betrieb' },
];

export default function FahrzeugePage() {
  const router = useRouter();
  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [zustandFilter, setZustandFilter] = useState('alle');
  const [suche, setSuche] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [neuShown, setNeuShown] = useState(false);
  const [neuForm, setNeuForm] = useState({ kennzeichen: '', marke: '', modell: '', typ: 'transporter', zustand: 'aktiv' });
  const [neuSaving, setNeuSaving] = useState(false);
  const [neuError, setNeuError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      if (!member) return;
      setCompanyId(member.company_id);
      const { data } = await supabase.from('fahrzeuge').select('*').eq('company_id', member.company_id).order('kennzeichen');
      setFahrzeuge(data ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleNeu(e) {
    e.preventDefault();
    setNeuError('');
    if (!neuForm.kennzeichen.trim()) { setNeuError('Kennzeichen ist Pflichtfeld.'); return; }
    setNeuSaving(true);
    const { data: newRow, error } = await supabase
      .from('fahrzeuge')
      .insert({
        company_id: companyId,
        kennzeichen: neuForm.kennzeichen.trim().toUpperCase(),
        marke: neuForm.marke.trim() || null,
        modell: neuForm.modell.trim() || null,
        typ: neuForm.typ || null,
        zustand: neuForm.zustand,
      })
      .select()
      .single();
    setNeuSaving(false);
    if (error) { setNeuError(error.message); return; }
    router.push(`/dashboard/fahrzeuge/${newRow.id}`);
  }

  // Filter-Logik
  const gefiltert = fahrzeuge.filter(f => {
    if (zustandFilter !== 'alle' && f.zustand !== zustandFilter) return false;
    if (suche) {
      const s = suche.toLowerCase();
      const treffer =
        (f.kennzeichen ?? '').toLowerCase().includes(s) ||
        (f.marke ?? '').toLowerCase().includes(s) ||
        (f.modell ?? '').toLowerCase().includes(s);
      if (!treffer) return false;
    }
    return true;
  });

  // Massenauswahl
  const alleGewaehlt = gefiltert.length > 0 && gefiltert.every(f => selectedIds.has(f.id));
  const teilGewaehlt = gefiltert.some(f => selectedIds.has(f.id)) && !alleGewaehlt;

  function toggleAlle() {
    if (alleGewaehlt) {
      setSelectedIds(prev => { const n = new Set(prev); gefiltert.forEach(f => n.delete(f.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); gefiltert.forEach(f => n.add(f.id)); return n; });
    }
  }

  function toggleEiner(id) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Fahrzeuge"
        subtitle={`${fahrzeuge.length} Fahrzeug${fahrzeuge.length !== 1 ? 'e' : ''}`}
        action={
          <button
            type="button"
            onClick={() => setNeuShown(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Neues Fahrzeug
          </button>
        }
      />

      {/* Neu-Formular */}
      {neuShown && (
        <form onSubmit={handleNeu} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Neues Fahrzeug anlegen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kennzeichen <span className="text-red-400">*</span></label>
              <input type="text" required value={neuForm.kennzeichen}
                onChange={e => setNeuForm(f => ({ ...f, kennzeichen: e.target.value }))}
                placeholder="z. B. M-AB 1234"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Marke</label>
              <input type="text" value={neuForm.marke}
                onChange={e => setNeuForm(f => ({ ...f, marke: e.target.value }))}
                placeholder="z. B. Mercedes-Benz"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Modell</label>
              <input type="text" value={neuForm.modell}
                onChange={e => setNeuForm(f => ({ ...f, modell: e.target.value }))}
                placeholder="z. B. Sprinter"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          {neuError && <p className="text-xs text-red-500">{neuError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={neuSaving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
              {neuSaving ? 'Speichert...' : 'Anlegen'}
            </button>
            <button type="button" onClick={() => setNeuShown(false)}
              className="px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Suchleiste + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs w-full">
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
        <FilterBar>
          {ZUSTAND_FILTER.map(f => (
            <FilterButton key={f.key} label={f.label} active={zustandFilter === f.key} onClick={() => setZustandFilter(f.key)} />
          ))}
        </FilterBar>
      </div>

      {/* Bulk-Action-Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm">
          <span className="font-medium text-blue-700 dark:text-blue-300">{selectedIds.size} ausgewaehlt</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-blue-500 hover:text-blue-700 underline">
            Auswahl aufheben
          </button>
          <div className="ml-auto flex gap-2">
            <button className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition">
              Exportieren
            </button>
          </div>
        </div>
      )}

      {/* Inhalt */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : gefiltert.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <EmptyState
            icon={Truck}
            title={fahrzeuge.length === 0 ? 'Noch keine Fahrzeuge' : 'Keine Fahrzeuge gefunden'}
            description={fahrzeuge.length === 0 ? 'Erfasse dein erstes Fahrzeug und verwalte Wartungen, TUeV-Termine und Kilometerstand zentral.' : 'Versuche andere Filter oder Suchbegriffe.'}
            action={fahrzeuge.length === 0 ? () => setNeuShown(true) : undefined}
            actionLabel="Erstes Fahrzeug anlegen"
          />
        </div>
      ) : (
        <>
          {/* Desktop-Tabelle */}
          <div className="hidden md:block">
            <Table headers={['', 'Kennzeichen', 'Typ', 'Marke / Modell', 'Zustand', '']}>
              <tr className="bg-transparent">
                <td className="pl-3 pr-0 py-1 w-10">
                  <TableCheckbox checked={alleGewaehlt} indeterminate={teilGewaehlt} onChange={toggleAlle} />
                </td>
                <td colSpan={5} />
              </tr>
              {gefiltert.map(f => {
                const isSelected = selectedIds.has(f.id);
                return (
                  <TableRow
                    key={f.id}
                    onClick={() => router.push(`/dashboard/fahrzeuge/${f.id}`)}
                    className={isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  >
                    <TableCell className="pl-3 pr-0 w-10">
                      <div onClick={e => { e.stopPropagation(); toggleEiner(f.id); }}>
                        <TableCheckbox checked={isSelected} onChange={() => toggleEiner(f.id)} />
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-gray-900 dark:text-white tracking-wide">
                      {f.kennzeichen}
                    </TableCell>
                    <TableCell className="text-xs">
                      {TYP_LABELS[f.typ] ?? f.typ ?? 'â'}
                    </TableCell>
                    <TableCell>
                      {[f.marke, f.modell].filter(Boolean).join(' ') || 'â'}
                      {f.baujahr ? <span className="text-gray-400 ml-1 text-xs">Â· {f.baujahr}</span> : null}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ZUSTAND_COLORS[f.zustand] ?? 'bg-gray-50 text-gray-500'}`}>
                        {ZUSTAND_LABELS[f.zustand] ?? f.zustand}
                      </span>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <TableActions>
                        <Link href={`/dashboard/fahrzeuge/${f.id}`} onClick={e => e.stopPropagation()}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                          <ExternalLink size={14} />
                        </Link>
                      </TableActions>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
          </div>

          {/* Mobile Card-Ansicht */}
          <div className="md:hidden space-y-3">
            {gefiltert.map(f => (
              <Link
                key={f.id}
                href={`/dashboard/fahrzeuge/${f.id}`}
                className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-4 hover:border-blue-100 dark:hover:border-blue-800 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <Truck size={18} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white text-sm tracking-wide">{f.kennzeichen}</span>
                    {f.typ && <span className="text-xs text-gray-400">{TYP_LABELS[f.typ] ?? f.typ}</span>}
                  </div>
                  {(f.marke || f.modell) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[f.marke, f.modell].filter(Boolean).join(' ')}
                      {f.baujahr ? ` Â· ${f.baujahr}` : ''}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${ZUSTAND_COLORS[f.zustand] ?? 'bg-gray-50 text-gray-500'}`}>
                  {ZUSTAND_LABELS[f.zustand] ?? f.zustand}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
