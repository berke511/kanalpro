'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import {
  ExternalLink, FileText, Receipt, AlertTriangle,
  ChevronRight, ChevronLeft, Plus, Calendar, Pencil,
  User, Truck,
} from 'lucide-react';

const STUNDEN = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const STATUS_CONFIG = {
  offen: { label: 'Offen', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  abgeschlossen: { label: 'Abgeschlossen', cls: 'bg-green-100 text-green-700 border-green-200' },
};

const PRIORITAET_DOT = {
  notfall: 'bg-red-500',
  hoch: 'bg-orange-500',
  normal: 'bg-blue-400',
  niedrig: 'bg-gray-400',
};

const STATUS_FILTER_OPTS = [
  { key: 'alle', label: 'Alle' },
  { key: 'offen', label: 'Offen' },
  { key: 'in_bearbeitung', label: 'In Bearbeitung' },
  { key: 'abgeschlossen', label: 'Abgeschlossen' },
  { key: 'notdienst', label: 'Notdienst' },
  { key: 'hoch', label: 'Hohe Priorität' },
];

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function today() { return new Date().toISOString().split('T')[0]; }
function morgen() { return addDays(today(), 1); }

function timeToMin(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function zeitOverlap(a, b) {
  const aS = timeToMin(a.uhrzeit);
  const bS = timeToMin(b.uhrzeit);
  if (aS === null || bS === null) return true;
  const aE = aS + (a.dauer_minuten ?? 60);
  const bE = bS + (b.dauer_minuten ?? 60);
  return aS < bE && bS < aE;
}

export default function Tagesplanung() {
  const router = useRouter();
  const [modalOffen, setModalOffen] = useState(false);
  const [einsaetze, setEinsaetze] = useState([]);
  const [laden, setLaden] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [gewaehlterTag, setGewaehlterTag] = useState(today());
  const [statusFilter, setStatusFilter] = useState('alle');
  const [technikerFilter, setTechnikerFilter] = useState('');
  const [fahrzeugFilter, setFahrzeugFilter] = useState('');
  const [mitarbeiterListe, setMitarbeiterListe] = useState([]);
  const [fahrzeugListe, setFahrzeugListe] = useState([]);
  const [hatFahrzeugSpalte, setHatFahrzeugSpalte] = useState(false);
  const [dokumentiertIds, setDokumentiertIds] = useState(new Set());
  const [offeneAuftraege, setOffeneAuftraege] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [modalLaden, setModalLaden] = useState(false);
  const [ausgewaehlterAuftrag, setAusgewaehlterAuftrag] = useState('');
  const [einsatzUhrzeit, setEinsatzUhrzeit] = useState('');
  const [einsatzDauer, setEinsatzDauer] = useState('');
  const [ausgewaehlterTechniker, setAusgewaehlterTechniker] = useState('');
  const [speichernLaeuft, setSpeichernLaeuft] = useState(false);
  const [modalFehler, setModalFehler] = useState('');
  const [editModalOffen, setEditModalOffen] = useState(false);
  const [editEinsatz, setEditEinsatz] = useState(null);
  const [editUhrzeit, setEditUhrzeit] = useState('');
  const [editDauer, setEditDauer] = useState('');
  const [editTechniker, setEditTechniker] = useState('');
  const [editFahrzeug, setEditFahrzeug] = useState('');
  const [editSpeichernLaeuft, setEditSpeichernLaeuft] = useState(false);
  const [editFehler, setEditFehler] = useState('');
  const [editMitarbeiter, setEditMitarbeiter] = useState([]);
  const [editMitarbeiterLaden, setEditMitarbeiterLaden] = useState(false);

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
        supabase.from('fahrzeuge').select('id, kennzeichen, marke, modell').eq('company_id', companyId).order('kennzeichen'),
      ]);
      setMitarbeiterListe(members ?? []);
      setFahrzeugListe(fz ?? []);
      const { data, error } = await supabase
        .from('auftraege')
        .select('id, titel, status, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, fahrzeug_id, datum, mitarbeiter:techniker_id(vorname, nachname), kunden:kunde_id(name, firmenname)')
        .eq('company_id', companyId).eq('datum', gewaehlterTag).order('uhrzeit', { ascending: true, nullsFirst: false });
      if (!error) {
        const rows = data ?? [];
        setEinsaetze(rows);
        if (rows.length > 0) setHatFahrzeugSpalte(true);
        const auftragIds = rows.map(r => r.id);
        if (auftragIds.length > 0) {
          const { data: dokData } = await supabase.from('einsatz_dokumentation').select('auftrag_id').in('auftrag_id', auftragIds).eq('company_id', companyId);
          setDokumentiertIds(new Set((dokData ?? []).map(d => d.auftrag_id)));
        } else { setDokumentiertIds(new Set()); }
      } else {
        const { data: data2 } = await supabase
          .from('auftraege')
          .select('id, titel, status, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, datum, mitarbeiter:techniker_id(vorname, nachname), kunden:kunde_id(name, firmenname)')
          .eq('company_id', companyId).eq('datum', gewaehlterTag).order('uhrzeit', { ascending: true, nullsFirst: false });
        setEinsaetze(data2 ?? []);
        setHatFahrzeugSpalte(false);
      }
      setLaden(false);
    };
    load();
  }, [companyId, gewaehlterTag]);

  const konflikte = useMemo(() => {
    const tMap = {}, fMap = {};
    for (const e of einsaetze) {
      if (e.techniker_id) (tMap[e.techniker_id] = tMap[e.techniker_id] ?? []).push(e);
      if (e.fahrzeug_id) (fMap[e.fahrzeug_id] = fMap[e.fahrzeug_id] ?? []).push(e);
    }
    const techKonflikte = [];
    for (const [id, liste] of Object.entries(tMap)) {
      for (let i = 0; i < liste.length; i++) for (let j = i+1; j < liste.length; j++) {
        if (zeitOverlap(liste[i], liste[j])) {
          const m = liste[i].mitarbeiter;
          techKonflikte.push({ name: m ? `${m.vorname} ${m.nachname}` : id, einsaetze: [liste[i], liste[j]] });
        }
      }
    }
    const fzKonflikte = [];
    for (const [id, liste] of Object.entries(fMap)) {
      for (let i = 0; i < liste.length; i++) for (let j = i+1; j < liste.length; j++) {
        if (zeitOverlap(liste[i], liste[j])) {
          const fz = fahrzeugListe.find(f => f.id === id);
          fzKonflikte.push({ name: fz ? fz.kennzeichen : id, einsaetze: [liste[i], liste[j]] });
        }
      }
    }
    return { techniker: techKonflikte, fahrzeuge: fzKonflikte };
  }, [einsaetze, fahrzeugListe]);

  const gefilterteEinsaetze = useMemo(() => einsaetze.filter(e => {
    if (statusFilter === 'offen' && e.status !== 'offen') return false;
    if (statusFilter === 'in_bearbeitung' && e.status !== 'in_bearbeitung') return false;
    if (statusFilter === 'abgeschlossen' && e.status !== 'abgeschlossen') return false;
    if (statusFilter === 'notdienst' && e.prioritaet !== 'notfall') return false;
    if (statusFilter === 'hoch' && e.prioritaet !== 'hoch') return false;
    if (technikerFilter && e.techniker_id !== technikerFilter) return false;
    if (fahrzeugFilter && e.fahrzeug_id !== fahrzeugFilter) return false;
    return true;
  }), [einsaetze, statusFilter, technikerFilter, fahrzeugFilter]);

  function einsatzFarbe(e) {
    const h = today();
    if (e.datum && e.datum < h && e.status !== 'abgeschlossen') return 'bg-red-50 border-red-200 text-red-700';
    if (e.prioritaet === 'notfall') return 'bg-orange-50 border-orange-200 text-orange-700';
    if (e.prioritaet === 'hoch') return 'bg-amber-50 border-amber-200 text-amber-700';
    return (STATUS_CONFIG[e.status] ?? STATUS_CONFIG.offen).cls;
  }

  async function modalOeffnen() {
    setModalOffen(true); setAusgewaehlterAuftrag(''); setEinsatzUhrzeit(''); setEinsatzDauer(''); setAusgewaehlterTechniker(''); setModalFehler('');
    if (!companyId) return;
    setModalLaden(true);
    const [{ data: auftraege }, { data: members }] = await Promise.all([
      supabase.from('auftraege').select('id, titel, status, kunden:kunde_id(name, firmenname)').eq('company_id', companyId).not('status','eq','abgeschlossen').order('titel'),
      supabase.from('company_members').select('id, vorname, nachname, role').eq('company_id', companyId).eq('is_active', true).order('nachname'),
    ]);
    setOffeneAuftraege(auftraege ?? []); setMitarbeiter(members ?? []); setModalLaden(false);
  }

  async function einsatzBearbeiten(einsatz) {
    setEditEinsatz(einsatz); setEditUhrzeit(einsatz.uhrzeit ? einsatz.uhrzeit.slice(0,5) : ''); setEditDauer(einsatz.dauer_minuten ? String(einsatz.dauer_minuten) : '');
    setEditTechniker(einsatz.techniker_id ?? ''); setEditFahrzeug(einsatz.fahrzeug_id ?? ''); setEditFehler(''); setEditModalOffen(true);
    if (!companyId) return;
    setEditMitarbeiterLaden(true);
    const { data: members } = await supabase.from('company_members').select('id, vorname, nachname, role').eq('company_id', companyId).eq('is_active', true).order('nachname');
    setEditMitarbeiter(members ?? []); setEditMitarbeiterLaden(false);
  }

  async function reloadEinsaetze() {
    const { data } = await supabase.from('auftraege')
      .select('id, titel, status, uhrzeit, dauer_minuten, prioritaet, adresse, techniker_id, fahrzeug_id, datum, mitarbeiter:techniker_id(vorname, nachname), kunden:kunde_id(name, firmenname)')
      .eq('company_id', companyId).eq('datum', gewaehlterTag).order('uhrzeit', { ascending: true, nullsFirst: false });
    setEinsaetze(data ?? []);
  }

  async function einsatzSpeichern() {
    if (!ausgewaehlterAuftrag) { setModalFehler('Bitte einen Auftrag auswählen.'); return; }
    setSpeichernLaeuft(true); setModalFehler('');
    const update = { datum: gewaehlterTag, ...(einsatzUhrzeit ? { uhrzeit: einsatzUhrzeit } : {}), ...(einsatzDauer ? { dauer_minuten: parseInt(einsatzDauer) } : {}), ...(ausgewaehlterTechniker ? { techniker_id: ausgewaehlterTechniker } : {}) };
    const { error } = await supabase.from('auftraege').update(update).eq('id', ausgewaehlterAuftrag).eq('company_id', companyId);
    if (error) { setModalFehler('Fehler: ' + error.message); setSpeichernLaeuft(false); return; }
    setSpeichernLaeuft(false); setModalOffen(false); await reloadEinsaetze();
  }

  async function editEinsatzSpeichern() {
    if (!editEinsatz) return;
    setEditSpeichernLaeuft(true); setEditFehler('');
    const update = { uhrzeit: editUhrzeit || null, dauer_minuten: editDauer ? parseInt(editDauer) : null, techniker_id: editTechniker || null, ...(hatFahrzeugSpalte ? { fahrzeug_id: editFahrzeug || null } : {}) };
    const { error } = await supabase.from('auftraege').update(update).eq('id', editEinsatz.id).eq('company_id', companyId);
    if (error) { setEditFehler('Fehler: ' + error.message); setEditSpeichernLaeuft(false); return; }
    setEditSpeichernLaeuft(false); setEditModalOffen(false); await reloadEinsaetze();
  }

  const datumText = new Date(gewaehlterTag + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const byStunde = {};
  for (const e of gefilterteEinsaetze) {
    if (e.uhrzeit) { const h = parseInt(e.uhrzeit.split(':')[0], 10); (byStunde[h] = byStunde[h] ?? []).push(e); }
  }
  const ohneUhrzeit = gefilterteEinsaetze.filter(e => !e.uhrzeit);
  const hatFilter = statusFilter !== 'alle' || technikerFilter || fahrzeugFilter;
  const alleKonflikte = [...konflikte.techniker, ...konflikte.fahrzeuge];

  function EinsatzKarte({ e, compact = false }) {
    const farbe = einsatzFarbe(e);
    const tech = e.mitarbeiter ? `${e.mitarbeiter.vorname} ${e.mitarbeiter.nachname}` : null;
    const istUeberfaellig = e.datum && e.datum < today() && e.status !== 'abgeschlossen';
    const fehltBericht = e.status === 'abgeschlossen' && !dokumentiertIds.has(e.id);
    const fz = hatFahrzeugSpalte && e.fahrzeug_id ? fahrzeugListe.find(f => f.id === e.fahrzeug_id) : null;
    return (
      <div className={`flex items-start gap-2 px-2 py-1.5 rounded-lg border text-xs cursor-pointer hover:opacity-90 transition ${farbe} ${istUeberfaellig ? 'ring-1 ring-red-400' : ''}`}>
        {e.prioritaet && <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${PRIORITAET_DOT[e.prioritaet] ?? 'bg-gray-400'}`} />}
        <div className="flex-1 min-w-0" onClick={() => einsatzBearbeiten(e)}>
          {!compact && e.uhrzeit && <span className="font-medium mr-1">{e.uhrzeit.slice(0,5)}</span>}
          <span className="font-medium">{e.titel}</span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {tech && <span className="opacity-75 flex items-center gap-0.5"><User size={10} /> {tech}</span>}
            {fz && <span className="opacity-75 flex items-center gap-0.5"><Truck size={10} /> {fz.kennzeichen}</span>}
            {e.dauer_minuten && <span className="opacity-75">{e.dauer_minuten} Min.</span>}
            {istUeberfaellig && <span className="text-red-600 font-semibold">Überfällig</span>}
            {fehltBericht && <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-1 py-0.5 rounded text-xs font-medium">Bericht fehlt</span>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0" onClick={ev => ev.stopPropagation()}>
          <Link href={`/dashboard/auftraege/${e.id}`} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Auftrag öffnen"><ExternalLink size={11} /></Link>
          <Link href={`/dashboard/auftraege/einsatzbericht?id=${e.id}`} className="p-1 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition" title="Einsatzbericht"><FileText size={11} /></Link>
          <Link href="/dashboard/rechnungen/neu" className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title="Rechnung erstellen"><Receipt size={11} /></Link>
          <button onClick={() => einsatzBearbeiten(e)} className="p-1 rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition" title="Bearbeiten"><Pencil size={11} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tagesplanung</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plane und verwalte alle Einssätze für den gewählten Tag.</p>
        </div>
        <button onClick={modalOeffnen} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shrink-0"><Plus size={16} />Einsatz planen</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setGewaehlterTag(prev => addDays(prev,-1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-600"><ChevronLeft size={16} /></button>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{datumText}</span>
        <button onClick={() => setGewaehlterTag(prev => addDays(prev,1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-600"><ChevronRight size={16} /></button>
        {gewaehlterTag !== today() && <button onClick={() => setGewaehlterTag(today())} className="ml-1 px-2.5 py-1 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 font-medium transition">Heute</button>}
        {gewaehlterTag !== morgen() && <button onClick={() => setGewaehlterTag(morgen())} className="px-2.5 py-1 text-xs text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 font-medium transition">Morgen</button>}
      </div>
      {alleKonflikte.length > 0 && (
        <div className="space-y-2">
          {konflikte.techniker.map((k,i) => <div key={`t-${i}`} className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertTriangle size={16} className="shrink-0 mt-0.5" /><span><strong>Techniker-Konflikt:</strong> {k.name} ist gleichzeitig in mehreren Einssätzen eingeplant ({k.einsaetze.map(e=>e.titel).join(' & ')}).</span></div>)}
          {konflikte.fahrzeuge.map((k,i) => <div key={`f-${i}`} className="flex items-start gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700"><AlertTriangle size={16} className="shrink-0 mt-0.5" /><span><strong>Fahrzeug-Konflikt:</strong> {k.name} ist gleichzeitig in mehreren Einssätzen eingeplant ({k.einsaetze.map(e=>e.titel).join(' & ')}).</span></div>)}
        </div>
      )}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTER_OPTS.map(opt => <button key={opt.key} onClick={() => setStatusFilter(opt.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter===opt.key?'bg-blue-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{opt.label}</button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {mitarbeiterListe.length > 0 && <select value={technikerFilter} onChange={e => setTechnikerFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"><option value="">Alle Techniker</option>{mitarbeiterListe.map(m => <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}</select>}
          {hatFahrzeugSpalte && fahrzeugListe.length > 0 && <select value={fahrzeugFilter} onChange={e => setFahrzeugFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"><option value="">Alle Fahrzeuge</option>{fahrzeugListe.map(f => <option key={f.id} value={f.id}>{f.kennzeichen}{f.marke ? ` – ${f.marke}` : ''}</option>)}</select>}
          {hatFilter && <button onClick={() => { setStatusFilter('alle'); setTechnikerFilter(''); setFahrzeugFilter(''); }} className="px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition">Filter zurücksetzen</button>}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Tagesansicht</span>
          <span className="text-xs text-gray-400">{laden ? 'Lädt…' : `${gefilterteEinsaetze.length} / ${einsaetze.length} Einssätze`}</span>
        </div>
        {laden ? <div className="flex items-center justify-center py-16"><p className="text-sm text-gray-400">Wird geladen…</p></div>
        : einsaetze.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Calendar size={28} className="text-gray-300 mb-4" />
            <p className="text-sm font-medium text-gray-500">Keine Einssätze für diesen Tag geplant.</p>
            <button onClick={modalOeffnen} className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"><Plus size={16} />Einsatz planen</button>
          </div>
        ) : gefilterteEinsaetze.length === 0 ? (
          <div className="flex items-center justify-center py-12"><p className="text-sm text-gray-400">Keine Einssätze entsprechen dem aktuellen Filter.</p></div>
        ) : (
          <div className="px-6 py-4">
            {ohneUhrzeit.length > 0 && <div className="mb-4"><p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Ohne Uhrzeit</p><div className="space-y-2">{ohneUhrzeit.map(e => <EinsatzKarte key={e.id} e={e} compact />)}</div></div>}
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Zeitraster</p>
            <div className="space-y-px">{STUNDEN.map(h => { const se = byStunde[h] ?? []; return <div key={h} className="flex items-start gap-4 group"><span className="text-xs text-gray-300 w-10 shrink-0 text-right py-2.5">{String(h).padStart(2,'0')}:00</span><div className="flex-1 min-h-10 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition p-1 space-y-1">{se.map(e => <EinsatzKarte key={e.id} e={e} />)}</div></div>; })}</div>
          </div>
        )}
      </div>
      {modalOffen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"><div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><Calendar size={20} className="text-blue-600" /></div><div><h2 className="text-sm font-semibold text-gray-900">Einsatz planen</h2><p className="text-xs text-gray-400 mt-0.5">{datumText}</p></div></div>{modalLaden ? <p className="text-sm text-gray-400 py-8 text-center">Wird geladen…</p> : <div className="space-y-4"><div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Auftrag <span className="text-red-400">*</span></label>{offeneAuftraege.length===0?<p className="text-xs text-gray-400 italic">Keine offenen Aufträge.</p>:<select value={ausgewaehlterAuftrag} onChange={e=>setAusgewaehlterAuftrag(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">– Auftrag wählen –</option>{offeneAuftraege.map(a=><option key={a.id} value={a.id}>{a.titel}{a.kunden?(a.kunden.firmenname||a.kunden.name)?` – ${a.kunden.firmenname||a.kunden.name}`:'' :''}</option>)}</select>}</div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Uhrzeit</label><input type="time" value={einsatzUhrzeit} onChange={e=>setEinsatzUhrzeit(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dauer (Min.)</label><input type="number" min="0" step="15" value={einsatzDauer} onChange={e=>setEinsatzDauer(e.target.value)} placeholder="90" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div><div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Techniker</label><select value={ausgewaehlterTechniker} onChange={e=>setAusgewaehlterTechniker(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option value="">– Kein Techniker –</option>{mitarbeiter.map(m=><option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}</select></div>{modalFehler&&<p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{modalFehler}</p>}<div className="flex gap-2"><button onClick={()=>setModalOffen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Abbrechen</button><button onClick={einsatzSpeichern} disabled={speichernLaeuft||!ausgewaehlterAuftrag} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">{speichernLaeuft?'Speichert…':'Einsatz planen'}</button></div></div>}</div></div>}
      {editModalOffen && editEinsatz && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"><div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0"><Pencil size={20} className="text-orange-500" /></div><div className="flex-1 min-w-0"><h2 className="text-sm font-semibold text-gray-900 truncate">{editEinsatz.titel}</h2><p className="text-xs text-gray-400 mt-0.5">{datumText}</p></div></div>{editMitarbeiterLaden?<p className="text-sm text-gray-400 py-8 text-center">Wird geladen…</p>:<div className="space-y-4"><div className="flex flex-wrap gap-2"><Link href={`/dashboard/auftraege/${editEinsatz.id}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition"><ExternalLink size={12} /> Auftrag öffnen</Link><Link href={`/dashboard/auftraege/einsatzbericht?id=${editEinsatz.id}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition"><FileText size={12} /> Einsatzbericht</Link><Link href="/dashboard/rechnungen/neu" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition"><Receipt size={12} /> Rechnung erstellen</Link></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Uhrzeit</label><input type="time" value={editUhrzeit} onChange={e=>setEditUhrzeit(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div><div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dauer (Min.)</label><input type="number" min="0" step="15" value={editDauer} onChange={e=>setEditDauer(e.target.value)} placeholder="90" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div></div><div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Techniker</label><select value={editTechniker} onChange={e=>setEditTechniker(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"><option value="">– Kein Techniker –</option>{editMitarbeiter.map(m=><option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>)}</select></div>{hatFahrzeugSpalte&&fahrzeugListe.length>0&&<div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fahrzeug</label><select value={editFahrzeug} onChange={e=>setEditFahrzeug(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"><option value="">– Kein Fahrzeug –</option>{fahrzeugListe.map(f=><option key={f.id} value={f.id}>{f.kennzeichen}{f.marke?` – ${f.marke}`:''}</option>)}</select></div>}{editFehler&&<p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{editFehler}</p>}<div className="flex gap-2"><button onClick={()=>setEditModalOffen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Abbrechen</button><button onClick={editEinsatzSpeichern} disabled={editSpeichernLaeuft} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">{editSpeichernLaeuft?'Speichert…':'Änderungen speichern'}</button></div></div>}</div></div>}
    </div>
  );
}
