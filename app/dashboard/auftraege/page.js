'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { ClipboardList, ExternalLink, FileText, Receipt, AlertTriangle, User, Truck, Pencil, X } from 'lucide-react';
import {
  PageHeader, FilterBar, FilterButton, FilterSelect,
  Table, TableRow, TableCell, StatusBadge, WarningBadge, EmptyState,
} from '@/components/ui/KanalProUI';

const QUICK_FILTER_OPTS = [
  { key: 'alle',          label: 'Alle' },
  { key: 'heute',         label: 'Heute' },
  { key: 'morgen',        label: 'Morgen' },
  { key: 'diese_woche',   label: 'Diese Woche' },
  { key: 'offen',         label: 'Offen' },
  { key: 'in_bearbeitung',label: 'In Bearbeitung' },
  { key: 'abgeschlossen', label: 'Abgeschlossen' },
  { key: 'notdienst',     label: 'Notdienst' },
  { key: 'hoch',          label: 'Hohe Priorität' },
];

function todayStr()  { return new Date().toISOString().split('T')[0]; }
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
  if (a.datum && a.datum < h && a.status !== 'abgeschlossen') return 'bg-red-50 hover:bg-red-100';
  if (a.prioritaet === 'notfall') return 'bg-orange-50 hover:bg-orange-100';
  if (a.prioritaet === 'hoch')   return 'bg-amber-50 hover:bg-amber-100';
  return 'hover:bg-blue-50';
}

export default function Auftraege() {
  const router = useRouter();
  const [auftraege, setAuftraege] = useState([]);
  const [laden, setLaden] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [filter, setFilter] = useState('alle');
  const [technikerFilter, setTechnikerFilter] = useState('');
  const [fahrzeugFilter, setFahrzeugFilter] = useState('');
  const [mitarbeiterListe, setMitarbeiterListe] = useState([]);
  const [fahrzeugListe, setFahrzeugListe] = useState([]);
  const [hatFahrzeugSpalte, setHatFahrzeugSpalte] = useState(false);
  const [dokumentiertIds, setDokumentiertIds] = useState(new Set());
  const [wechselId, setWechselId] = useState(null);
  const [wechselTech, setWechselTech] = useState('');
  const [wechselFz, setWechselFz] = useState('');
  const [wechselLaeuft, setWechselLaeuft] = useState(false);

  useEffect(() => {
    async function loadCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      setCompanyId(data?.company_id ?? null);
    }
    loadCompany();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLaden(true);
      const [{ data: members }, { data: fz }] = await Promise.all([
        supabase.from('company_members').select('id, vorname, nachname').eq('company_id', companyId).eq('is_active', true).order('nachname'),
        supabase.from('fahrzeuge').select('id, kennzeichen, marke').eq('company_id', companyId).order('kennzeichen'),
      ]);
      setMitarbeiterListe(members ?? []);
      setFahrzeugListe(fz ?? []);
      const { data, error } = await supabase
        .from('auftraege')
        .select('id, titel, status, datum, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, fahrzeug_id, kunden:kunde_id(name, firmenname), mitarbeiter:techniker_id(vorname, nachname)')
        .eq('company_id', companyId)
        .order('datum', { ascending: false, nullsFirst: false });
      if (!error) {
        const rows = data ?? [];
        setAuftraege(rows);
        setHatFahrzeugSpalte(true);
        const ids = rows.map(r => r.id);
        if (ids.length > 0) {
          const { data: dok } = await supabase.from('einsatz_dokumentation').select('auftrag_id').in('auftrag_id', ids).eq('company_id', companyId);
          setDokumentiertIds(new Set((dok ?? []).map(d => d.auftrag_id)));
        } else { setDokumentiertIds(new Set()); }
      } else {
        const { data: data2 } = await supabase
          .from('auftraege')
          .select('id, titel, status, datum, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, kunden:kunde_id(name, firmenname), mitarbeiter:techniker_id(vorname, nachname)')
          .eq('company_id', companyId)
          .order('datum', { ascending: false, nullsFirst: false });
        setAuftraege(data2 ?? []);
        setHatFahrzeugSpalte(false);
      }
      setLaden(false);
    };
    load();
  }, [companyId]);

  const konflikte = useMemo(() => {
    const tMap = {}, fMap = {};
    for (const a of auftraege) {
      if (a.techniker_id) { const key = a.datum+'-'+a.techniker_id; (tMap[key]=tMap[key]??[]).push(a); }
      if (a.fahrzeug_id)  { const key = a.datum+'-'+a.fahrzeug_id;  (fMap[key]=fMap[key]??[]).push(a); }
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
      if (filter==='heute'          && a.datum!==h)              return false;
      if (filter==='morgen'         && a.datum!==m)              return false;
      if (filter==='diese_woche'    && (a.datum<ws||a.datum>we)) return false;
      if (filter==='offen'          && a.status!=='offen')        return false;
      if (filter==='in_bearbeitung' && a.status!=='in_bearbeitung') return false;
      if (filter==='abgeschlossen'  && a.status!=='abgeschlossen')  return false;
      if (filter==='notdienst'      && a.prioritaet!=='notfall')    return false;
      if (filter==='hoch'           && a.prioritaet!=='hoch')       return false;
      if (technikerFilter && a.techniker_id!==technikerFilter) return false;
      if (fahrzeugFilter  && a.fahrzeug_id!==fahrzeugFilter)   return false;
      return true;
    });
  }, [auftraege, filter, technikerFilter, fahrzeugFilter]);

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

  const alleKonflikte = [...konflikte.techniker, ...konflikte.fahrzeuge];
  const hatFilter = filter!=='alle'||technikerFilter||fahrzeugFilter;

  // Dynamische Tabellenköpfe
  const tableHeaders = [
    'Titel', 'Kunde', 'Datum', 'Status', 'Techniker',
    ...(hatFahrzeugSpalte ? ['Fahrzeug'] : []),
    '',
  ];

  // Optionen für FilterSelect
  const technikerOptionen = [
    { value: '', label: 'Alle Techniker' },
    ...mitarbeiterListe.map(m => ({ value: m.id, label: `${m.vorname} ${m.nachname}` })),
  ];
  const fahrzeugOptionen = [
    { value: '', label: 'Alle Fahrzeuge' },
    ...fahrzeugListe.map(f => ({ value: f.id, label: f.kennzeichen + (f.marke ? ` – ${f.marke}` : '') })),
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────── */}
      <PageHeader
        title="Aufträge"
        subtitle={laden ? '…' : `${gefiltert.length} / ${auftraege.length} Aufträge`}
        action={
          <Link href="/dashboard/auftraege/erstellen"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
            + Neuer Auftrag
          </Link>
        }
      />

      {/* ── Konfliktwarnungen ─────────────────────────────────────────── */}
      {alleKonflikte.length > 0 && (
        <div className="space-y-2">
          {konflikte.techniker.map((k, i) => (
            <div key={'t'+i} className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span><strong>Techniker-Konflikt:</strong> {k.name} ist am selben Tag doppelt eingeplant ({k.auftraege.map(a=>a.titel).join(' & ')}).</span>
            </div>
          ))}
          {konflikte.fahrzeuge.map((k, i) => (
            <div key={'f'+i} className="flex items-start gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span><strong>Fahrzeug-Konflikt:</strong> {k.name} ist am selben Tag doppelt eingeplant ({k.auftraege.map(a=>a.titel).join(' & ')}).</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <FilterBar>
          {QUICK_FILTER_OPTS.map(f => (
            <FilterButton key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />
          ))}
        </FilterBar>
        <FilterBar>
          {mitarbeiterListe.length > 0 && (
            <FilterSelect
              label="Techniker"
              value={technikerFilter}
              onChange={e => setTechnikerFilter(e.target.value)}
              options={technikerOptionen}
            />
          )}
          {hatFahrzeugSpalte && fahrzeugListe.length > 0 && (
            <FilterSelect
              label="Fahrzeug"
              value={fahrzeugFilter}
              onChange={e => setFahrzeugFilter(e.target.value)}
              options={fahrzeugOptionen}
            />
          )}
          {hatFilter && (
            <button
              onClick={() => { setFilter('alle'); setTechnikerFilter(''); setFahrzeugFilter(''); }}
              className="px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
            >
              <X size={12} />Filter zurücksetzen
            </button>
          )}
        </FilterBar>
      </div>

      {/* ── Inhalt ────────────────────────────────────────────── */}
      {laden ? (
        <p className="text-sm text-gray-400">Wird geladen…</p>
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={auftraege.length === 0 ? 'Keine Aufträge vorhanden.' : 'Keine Aufträge entsprechen dem Filter.'}
        />
      ) : (
        <Table headers={tableHeaders}>
          {gefiltert.map(a => {
            const farbe = rowFarbe(a);
            const fehltBericht = a.status === 'abgeschlossen' && !dokumentiertIds.has(a.id);
            const tech = a.mitarbeiter ? a.mitarbeiter.vorname + ' ' + a.mitarbeiter.nachname : null;
            const fz = hatFahrzeugSpalte && a.fahrzeug_id ? fahrzeugListe.find(f => f.id === a.fahrzeug_id) : null;
            const istWechsel = wechselId === a.id;
            return (
              <TableRow key={a.id} className={farbe}>
                <TableCell className="font-medium text-gray-900" >
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
                  {a.kunden ? (a.kunden.firmenname || a.kunden.name) : '–'}
                </TableCell>
                <TableCell onClick={() => router.push('/dashboard/auftraege/' + a.id)}>
                  {a.datum ? new Date(a.datum + 'T00:00:00').toLocaleDateString('de-DE') : '–'}
                  {a.uhrzeit && <span className="ml-1 text-gray-400 text-xs">{a.uhrzeit.slice(0,5)}</span>}
                </TableCell>
                <TableCell onClick={() => router.push('/dashboard/auftraege/' + a.id)}>
                  <StatusBadge status={a.status} />
                </TableCell>
                <td className="px-5 py-3">
                  {istWechsel ? (
                    <select value={wechselTech} onChange={e => setWechselTech(e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                      <option value="">– kein –</option>
                      {mitarbeiterListe.map(m => <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}
                    </select>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-1 text-xs">
                      {tech ? <><User size={11} className="text-gray-400" />{tech}</> : <span className="text-gray-300">–</span>}
                    </span>
                  )}
                </td>
                {hatFahrzeugSpalte && (
                  <td className="px-5 py-3">
                    {istWechsel ? (
                      <select value={wechselFz} onChange={e => setWechselFz(e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                        <option value="">– kein –</option>
                        {fahrzeugListe.map(f => <option key={f.id} value={f.id}>{f.kennzeichen}</option>)}
                      </select>
                    ) : (
                      <span className="text-gray-500 flex items-center gap-1 text-xs">
                        {fz ? <><Truck size={11} className="text-gray-400" />{fz.kennzeichen}</> : <span className="text-gray-300">–</span>}
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
                          {wechselLaeuft ? '…' : 'OK'}
                        </button>
                        <button onClick={() => setWechselId(null)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href={'/dashboard/auftraege/' + a.id} onClick={e => e.stopPropagation()}
                          className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Auftrag öffnen">
                          <ExternalLink size={13} />
                        </Link>
                        <Link href={'/dashboard/auftraege/einsatzbericht?id=' + a.id} onClick={e => e.stopPropagation()}
                          className="p-1 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition" title="Einsatzbericht">
                          <FileText size={13} />
                        </Link>
                        <Link href="/dashboard/rechnungen/neu" onClick={e => e.stopPropagation()}
                          className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title="Rechnung erstellen">
                          <Receipt size={13} />
                        </Link>
                        <button title="Techniker / Fahrzeug wechseln"
                          onClick={e => { e.stopPropagation(); setWechselId(a.id); setWechselTech(a.techniker_id ?? ''); setWechselFz(a.fahrzeug_id ?? ''); }}
                          className="p-1 rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition">
                          <Pencil size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </TableRow>
            );
          })}
        </Table>
      )}
    </div>
  );
}
