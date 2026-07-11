'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { ClipboardList, ExternalLink, FileText, Receipt, AlertTriangle, User, Truck, Pencil, X, Search, Plus, RefreshCw, LayoutDashboard } from 'lucide-react';
import {
  PageHeader, FilterBar, FilterButton, FilterSelect,
  Table, TableRow, TableCell, TableSkeleton, TableCheckbox, TableActions,
  StatusBadge, WarningBadge, EmptyState, MobileCommandBar,
} from '@/components/ui/KanalProUI';

const QUICK_FILTER_OPTS = [
  { key: 'alle', label: 'Alle' },
  { key: 'heute', label: 'Heute' },
  { key: 'morgen', label: 'Morgen' },
  { key: 'diese_woche', label: 'Diese Woche' },
  { key: 'offen', label: 'Offen' },
  { key: 'in_bearbeitung', label: 'In Bearbeitung' },
  { key: 'abgeschlossen', label: 'Abgeschlossen' },
  { key: 'notdienst', label: 'Notdienst' },
  { key: 'hoch', label: 'Hoche Priorität' },
];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function morgenStr() { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; }
function wocheStart(){ const d = new Date(); d.setDate(d.getDate() - ((d.getDay()||7)-1)); return d.toISOString().split('T')[0]; }
function wocheEnde() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay()||7)-1) + 6); return d.toISOString().split('T')[0]; }
function timeToMin(t){ if (!t) return null; const [h,m] = t.split(':').map(Number); return h*60+m; }
function zeitOverlap(a, b) {
  const aS=timeToMin(a.uhrzeit), bS=timeToMin(b.uhrzeit);
  if (aS===null||bS===null) return true;
  return aS < bS+(b.dauer_minuten??60) && bS < aS+(a.dauer_minuten??60);
}
function rowFarbe(a) {
  const h = todayStr();
  if (a.datum && a.datum < h && a.status !== 'abgeschlossen') return 'bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20';
  if (a.prioritaet === 'notfall') return 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/10 dark:hover:bg-orange-900/20';
  if (a.prioritaet === 'hoch') return 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/20';
  return 'hover:bg-blue-50 dark:hover:bg-blue-900/10';
}

export default function Auftraege() {
  const router = useRouter();
  const [auftraege, setAuftraege] = useState([]);
  const [laden, setLaden] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [filter, setFilter] = useState('alle');
  const [technikerFilter, setTechnikerFilter] = useState('');
  const [fahrzeugFilter, setFahrzeugFilter] = useState('');
  const [suche, setSuche] = useState('');
  const [mitarbeiterListe, setMitarbeiterListe] = useState([]);
  const [fahrzeugListe, setFahrzeugListe] = useState([]);
  const [hatFahrzeugSpalte, setHatFahrzeugSpalte] = useState(false);
  const [dokumentiertIds, setDokumentiertIds] = useState(new Set());
  const [wechselId, setWechselId] = useState(null);
  const [wechselTech, setWechselTech] = useState('');
  const [wechselFz, setWechselFz] = useState('');
  const [wechselLaeuft, setWechselLaeuft] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    async function loadCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      setCompanyId(data?.company_id ?? null);
    }
    loadCompany();
  }, []);

  const loadData = async (cId) => {
    setLaden(true);
    const [{ data: members }, { data: fz }] = await Promise.all([
      supabase.from('company_members').select('id, vorname, nachname').eq('company_id', cId).eq('is_active', true).order('nachname'),
      supabase.from('fahrzeuge').select('id, kennzeichen, marke').eq('company_id', cId).order('kennzeichen'),
    ]);
    setMitarbeiterListe(members ?? []);
    setFahrzeugListe(fx ?? []);
    const { data, error } = await supabase
      .from('auftraege')
      .select('id, titel, status, datum, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, fahrzeug_id, kunden:kunde_id(name, firmenname), mitarbeiter:techniker_id(vorname, nachname)')
      .eq('company_id', cId)
      .order('datum', { ascending: false, nullsFirst: false });
    if (!error) {
      const rows = data ?? [];
      setAuftraege(rows);
      setHatFahrzeugSpalte(true);
      const ids = rows.map(r => r.id);
      if (ids.length > 0) {
        const { data: dok } = await supabase.from('einsatz_dokumentation').select('auftrag_id').in('auftrag_id', ids).eq('company_id', cId);
        setDokumentiertIds(new Set((dok ?? []).map(d => d.auftrag_id)));
      } else { setDokumentiertIds(new Set()); }
    } else {
      const { data: data2 } = await supabase
        .from('auftraege')
        .select('id, titel, status, datum, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, kunden:kunde_id(name, firmenname), mitarbeiter:techniker_id(vorname, nachname)')
        .eq('company_id', cId)
        .order('datum', { ascending: false, nullsFirst: false });
      setAuftraege(data2 ?? []);
      setHatFahrzeugSpalte(false);
    }
    setLaden(false);
  };

  useEffect(() => {
    if (!companyId) return;
    loadData(companyId);
  }, [companyId]);

  const konflikte = useMemo(() => {
    const tMap = {}, fMap = {};
    for (const a of auftraege) {
      if (a.techniker_id) { const key = a.datum+'-'+a.techniker_id; (tMap[key]=tMap[key]??[]).push(a); }
      if (a.fahrzeug_id) { const key = a.datum+'-'+a.fahrzeug_id; (fMap[key]=fMap[key]??[]).push(a); }
    }
    const techK = [], fzK = [];
    for (const list of Object.values(tMap)) {
      for (let i=0;i<list.length;i++) for (let j=i+1;j<list.length;j++) {
        if (zeitOverlap(list[i],list[j])) { const m=list[i].mitarbeiter; techK.push({ name: m?m.vorname+' '+m.nachname:list[i].techniker_id, auftraege:[list[i],list[j]] }); }
      }
    }
    for (const list of Object.values(fMap)) {
      for (let i=0;i<list.length;i++) for (let j=i+1;j<list.length;j++) {
        if (zeitOverlap(list[i],list[j])) { const fz=fahrzeugListe.find(f=>f.id===list[i].fahrzeug_id); fzK.push({ name:fz?fz.kennzeichen:list[i].fahrzeug_id, auftraege:[list[i],list[j]] }); }
      }
    }
    return { techniker: techK, fahrzeuge: fzK };
  }, [auftraege, fahrzeugListe]);

  const gefiltert = useMemo(() => {
    const h=todayStr(), m=morgenStr(), ws=wocheStart(), we=wocheEnde();
    return auftraege.filter(a => {
      if (filter==='heute' && a.datum!==h) return false;
      if (filter==='morgen' && a.datum!==m) return false;
      if (filter==='diese_woche' && (a.datum<ws||a.datum>we)) return false;
      if (filter==='offen' && a.status!=='offen') return false;
      if (filter==='in_bearbeitung' && a.status!=='in_bearbeitung') return false;
      if (filter==='abgeschlossen' && a.status!=='abgeschlossen') return false;
      if (filter==='notdienst' && a.prioritaet!=='notfall') return false;
      if (filter==='hoch' && a.prioritaet!=='hoch') return false;
      if (technikerFilter && a.techniker_id!==technikerFilter) return false;
      if (fahrzeugFilter && a.fahrzeug_id!==fahrzeugFilter) return false;
      if (suche) {
        const s = suche.toLowerCase();
        const treffer =
          (a.titel ?? '').toLowerCase().includes(s) ||
          (a.kunden?.name ?? '').toLowerCase().includes(s) ||
          (a.kunden?.firmenname ?? '').toLowerCase().includes(s) ||
          (a.adresse ?? '').toLowerCase().includes(s);
        if (!treffer) return false;
      }
      return true;
    });
  }, [auftraege, filter, technikerFilter, fahrzeugFilter, suche]);

  async function schnellWechsel(auftragId) {
    setWechselLaeuft(true);
    const update = { techniker_id: wechselTech||null };
    if (hatFahrzeugSpalte) update.fahrzeug_id = wechselFz||null;
    const { error } = await supabase.from('auftraege').update(update).eq('id', auftragId).eq('company_id', companyId);
    if (!error) {
      setAuftraege(prev => prev.map(a => {
        if (a.id!==auftragId) return a;
        const neuerTech = mitarbeiterListe.find(m=>m.id===wechselTech)??null;
        return { ...a, techniker_id: wechselTech||null, fahrzeug_id: wechselFz||null, mitarbeiter: neuerTech };
      }));
    }
    setWechselLaeuft(false);
    setWechselId(null);
  }

  const alleGewaehlt = gefiltert.length > 0 && gefiltert.every(a => selectedIds.has(a.id));
  const teilGewaehlt = gefiltert.some(a => selectedIdshas(a.id)) && !alleGewaehlt;

  function toggleAlle() {
    if (alleGewaehlt) {
      setSelectedIds(prev => { const n = new Set(prev); gefiltert.forEach(a => n.delete(a.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); gefiltert.forEach(a => n.add(a.id)); return n; });
    }
  }

  function toggleEiner(id) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const alleKonflikte = [...konflikte.techniker, ...konflikte.fahrzeuge];
  const hatFilter = filter!=='alle'||technikerFilter||fahrzeugFilter||suche;

  const tableHeaders = [
    '', 'Titel', 'Kunde', 'Datum', 'Status', 'Techniker',
    ...(hatFahrzeugSpalte ? ['Fahrzeug'] : []),
    '',
  ];

  const technikerOptionen = [
    { value: '', label: 'Alle Techniker' },
    ...mitarbeiterListe.map(m => ({ value: m.id, label: `${m.vorname} ${m.nachname}` })),
  ];
  const fahrzeugOptionen = [
    { value: '', label: 'Alle Fahrzeuge' },
    ...fahrzeugListe.map(f => ({ value: f.id, label: f.kennzeichen + (f.marke ? ` - ${f.marke}` : '') })),
  ];

  // Mobile Command Bar Actions
  const cmdBarActions = [
    {
      icon: <Search size={20} />,
      label: 'Suchen',
      onClick: () => document.getElementById('auftrag-suche')?.focus(),
      active: !!suche,
    },
    {
      icon: <LayoutDashboard size={20} />,
      label: 'Filter',
      onClick: () => setFilter(filter === 'alle' ? 'heute' : 'alle'),
      active: filter !== 'alle',
    },
    {
      icon: <Plus size={22} />,
      label: 'Neu',
      onClick: () => router.push('/dashboard/auftraege/erstellen'),
      active: false,
    },
    {
      icon: <RefreshCw size={20} />,
      label: 'Refresh',
      onClick: () => companyId && loadData(companyId),
      active: false,
    },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">

      {/* Header */}
      <PageHeader
        title="Aufträge"
        subtitle={laden ? '...' : `${gefiltert.length} / ${auftraege.length} Aufträge`}
        action={
          <Link href="/dashboard/auftraege/erstellen"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition min-h-[48px] flex items-center">
            + Neuer Auftrag
          </Link>
        }
      />

      {/* Konfliktwarnungen */}
      {alleKonflikte.length > 0 && (
        <div className="space-y-2">
          {konflikte.techniker.map((k, i) => (
            <div key={'t'+i} className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span><strong>Techniker-Konflikt:</strong> {k.name} ist am selben Tag doppelt eingeplant ({k.auftraege.map(a=>a.titel).join(' & ')}).</span>
            </div>
          ))}
          {konflikte.fahrzeuge.map((k, i) => (
            <div key={'f'+i} className="flex items-start gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-sm text-orange-700 dark:text-orange-400">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span><strong>Fahrzeug-Konflikt:</strong> {k.name} ist am selben Tag doppelt eingeplant ({k.auftraege.map(a=>a.titel).join(' & ')}).</span>
            </div>
          ))}
        </div>
      )}

      {/* Suchleiste — full-width auf Mobile */}
      <div className="relative w-full md:max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          id="auftrag-suche"
          type="text"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          placeholder="Suchen..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-h-[48px]"
        />
        {suche && (
          <button onClick={() => setSuche('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter — horizontal scroll auf Mobile */}
      <div className="space-y-2">
        <div className="overflow-x-auto pb-1">
          <FilterBar>
            {QUICK_FILTER_OPTS.map(f => (
              <FilterButton key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />
            ))}
          </FilterBar>
        </div>
        <FilterBar>
          {mitarbeiterListe.length > 0 && (
            <FilterSelect label="Techniker" value={technikerFilter} onChange={e => setTechnikerFilter(e.target.value)} options={technikerOptionen} />
          )}
          {hatFahrzeugSpalte && fahrzeugListe.length > 0 && (
            <FilterSelect label="Fahrzeug" value={fahrzeugFilter} onChange={e => setFahrzeugFilter(e.target.value)} options={fahrzeugOptionen} />
          )}
          {hatFilter && (
            <button
              onClick={() => { setFilter('alle'); setTechnikerFilter(''); setFahrzeugFilter(''); setSuche(''); }}
              className="px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1 min-h-[36px]"
            >
              <X size={12} />Filter zurücksetzen
            </button>
          )}
        </FilterBar>
      </div>

      {/* Bulk-Action-Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm">
          <span className="font-medium text-blue-700 dark:text-blue-300">{selectedIds.size} ausgewählt</span>
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
      {laden ? (
        <TableSkeleton rows={7} cols={hatFahrzeugSpalte ? 6 : 5} />
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={auftraege.length === 0 ? 'Keine Aufträge vorhanden.' : 'Keine Aufträge entsprechen dem Filter.'}
        />
      ) : (
        <>
          {/* Desktop-Tabelle */}
          <div className="hidden md:block">
            <Table headers={tableHeaders}>
              <tr className="bg-transparent">
                <td className="pl-3 pr-0 py-1 w-10">
                  <TableCheckbox checked={alleGewaehlt} indeterminate={teilGewaehlt} onChange={toggleAlle} />
                </td>
                <td colSpan={tableHeaders.length - 1} />
              </tr>
              {gefiltert.map(a => {
                const farbe = rowFarbe(a);
                const fehltBericht = a.status === 'abgeschlossen' && !dokumentiertIds.has(a.id);
                const tech = a.mitarbeiter ? a.mitarbeiter.vorname + ' ' + a.mitarbeiter.nachname : null;
                const fz = hatFahrzeugSpalte && a.fahrzeug_id ? fahrzeugListe.find(f => f.id === a.fahrzeug_id) : null;
                const istWechsel = wechselId === a.id;
                const isSelected = selectedIds.has(a.id);
                return (
                  <TableRow key={a.id} className={`group ${farbe} ${isSelected ? 'ring-1 ring-inset ring-blue-400' : ''}`}>
                    <TableCell className="pl-3 pr-0 w-10">
                      <div onClick={e => { e.stopPropagation(); toggleEiner(a.id); }}>
                        <TableCheckbox checked={isSelected} onChange={() => toggleEiner(a.id)} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      <span className="cursor-pointer" onClick={() => router.push('/dashboard/auftraege/' + a.id)}>
                        {a.titel}
                      </span>
                      {fehltBericht && (
                        <span className="ml-2 inline-block">
                          <WarningBadge label="Bericht fehlt" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => router.push('/dashboard/auftraege/' + a.id)}>
                      {a.kunden ? (a.kunden.firmenname || a.kunden.name) : '—'}
                    </TableCell>
                    <TableCell onClick={() => router.push('/dashboard/auftraege/' + a.id)}>
                      {a.datum ? new Date(a.datum + 'T00:00:00').toLocaleDateString('de-DE') : '—'}
                      {a.uhrzeit && <span className="ml-1 text-gray-400 text-xs">{a.uhrzeit.slice(0,5)}</span>}
                    </TableCell>
                    <TableCell onClick={() => router.push('/dashboard/auftraege/' + a.id)}>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <td className="px-5 py-3">
                      {istWechsel ? (
                        <select value={wechselTech} onChange={e => setWechselTech(e.target.value)}
                          className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
                          <option value="">— kein —</option>
                          {mitarbeiterListe.map(m => <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}
                        </select>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-xs">
                          {tech ? <><User size={11} className="text-gray-400" />{tech}</> : <span className="text-gray-300">—</span>}
                        </span>
                      )}
                    </td>
                    {hatFahrzeugSpalte && (
                      <td className="px-5 py-3">
                        {istWechsel ? (
                          <select value={wechselFz} onChange={e => setWechselFz(e.target.value)}
                            className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
                            <option value="">— kein —</option>
                            {fahrzeugListe.map(f => <option key={f.id} value={f.id}>{f.kennzeichen}</option>)}
                          </select>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-xs">
                            {fz ? <><Truck size={11} className="text-gray-400" />{fz.kennzeichen}</> : <span className="text-gray-300">—</span>}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {istWechsel ? (
                          <>
                            <button onClick={() => schnellWechsel(a.id)} disabled={wechselLaeuft}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                              {wechselLaeuft ? '...' : 'OK'}
                            </button>
                            <button onClick={() => setWechselId(null)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <TableActions>
                            <Link href={'/dashboard/auftraege/' + a.id} onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Auftrag öffnen">
                              <ExternalLink size={13} />
                            </Link>
                            <Link href={'/dashboard/auftraege/einsatzbericht?id=' + a.id} onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition" title="Einsatzbericht">
                              <FileText size={13} />
                            </Link>
                            <Link href="/dashboard/rechnungen/neu" onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title="Rechnung erstellen">
                              <Receipt size={13} />
                            </Link>
                            <button title="Techniker / Fahrzeug wechseln"
                              onClick={e => { e.stopPropagation(); setWechselId(a.id); setWechselTech(a.techniker_id ?? ''); setWechselFz(a.fahrzeug_id ?? ''); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition">
                              <Pencil size={13} />
                            </button>
                          </TableActions>
                        )}
                      </div>
                    </td>
                  </TableRow>
                );
              })}
            </Table>
          </div>

          {/* Mobile Card-Ansicht */}
          <div className="md:hidden space-y-3">
            {gefiltert.map(a => {
              const fehltBericht = a.status === 'abgeschlossen' && !dokumentiertIds.has(a.id);
              const tech = a.mitarbeiter ? a.mitarbeiter.vorname + ' ' + a.mitarbeiter.nachname : null;
              const fz = hatFahrzeugSpalte && a.fahrzeug_id ? fahrzeugListe.find(f => f.id === a.fahrzeug_id) : null;
              const h = todayStr();
              const istUeberfaellig = a.datum && a.datum < h && a.status !== 'abgeschlossen';
              return (
                <div
                  key={a.id}
                  onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                  className={`rounded-2xl border p-4 cursor-pointer transition active:scale-[0.99] ${istUeberfaellig ? 'bg-red-50 border-red-100' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-100'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{a.titel}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    {a.kunden && <p>{a.kunden.firmenname || a.kunden.name}</p>}
                    <p>{a.datum ? new Date(a.datum + 'T00:00:00').toLocaleDateString('de-DE') : '—'}{a.uhrzeit ? ' · ' + a.uhrzeit.slice(0,5) : ''}</p>
                    {tech && <p><User size={11} className="inline mr-1" />{tech}</p>}
                    {fz && <p><Truck size={11} className="inline mr-1" />{fz.kennzeichen}</p>}
                  </div>
                  {fehltBericht && (
                    <div className="mt-2">
                      <WarningBadge label="Einsatzbericht fehlt" />
                    </div>
                  )}
                  <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                    <Link href={'/dashboard/auftraege/' + a.id}
                      className="flex-1 text-center py-2.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition min-h-[44px] flex items-center justify-center">
                      Öffnen
                    </Link>
                    <Link href={'/dashboard/auftraege/einsatzbericht?id=' + a.id}
                      className="flex-1 text-center py-2.5 text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 transition min-h-[44px] flex items-center justify-center">
                      Bericht
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Mobile Command Bar */}
      <MobileCommandBar actions={cmdBarActions} />

    </div>
  );
}
