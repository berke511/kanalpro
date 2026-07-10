X'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import supabase from '@/lib/supabase';

const PRIORITAET_CONFIG = {
  notfall: { label: 'Notfall', color: '#ef4444', badge: 'bg-red-100 text-red-700 border-red-200' },
  hoch:    { label: 'Hoch',    color: '#f97316', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  normal:  { label: 'Normal',  color: '#3b82f6', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  niedrig: { label: 'Niedrig', color: '#94a3b8', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const STATUS_CONFIG = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-100 text-green-700 border-green-200' },
  geplant:        { label: 'Geplant',        cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  storniert:      { label: 'Storniert',      cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const geocodeCache = {};

async function geocodeAddress(address) {
  if (!address) return null;
  if (geocodeCache[address] !== undefined) return geocodeCache[address];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=de,at,ch`,
      { headers: { 'Accept-Language': 'de' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache[address] = result;
      return result;
    }
  } catch (_) {}
  geocodeCache[address] = null;
  return null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function MapPinIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function FilterIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  );
}

function NavigationIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function TruckIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function ExternalLinkIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function ClipboardIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

export default function RoutenplanungLive() {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersMapRef = useRef({});

  const [companyId, setCompanyId] = useState(null);
  const [laden, setLaden] = useState(true);
  const [einsaetze, setEinsaetze] = useState([]);
  const [geokodiert, setGeokodiert] = useState({});
  const [leafletReady, setLeafletReady] = useState(false);

  const [datumFilter, setDatumFilter] = useState(new Date().toISOString().split('T')[0]);
  const [technikerFilter, setTechnikerFilter] = useState('');
  const [fahrzeugFilter, setFahrzeugFilter] = useState('');
  const [prioritaetFilter, setPrioritaetFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [alleTechniker, setAlleTechniker] = useState([]);
  const [alleFahrzeuge, setAlleFahrzeuge] = useState([]);

  const [editingTechniker, setEditingTechniker] = useState(null);
  const [editingFahrzeug, setEditingFahrzeug] = useState(null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (window.L) { setLeafletReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || leafletMapRef.current) return;
    const L = window.L;
    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([51.165, 10.451], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    leafletMapRef.current = map;
  }, [leafletReady]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      setCompanyId(data?.company_id ?? null);
    }
    load();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    async function loadDropdowns() {
      const [{ data: tech }, { data: fzg }] = await Promise.all([
        supabase.from('company_members').select('id, vorname, nachname').eq('company_id', companyId).eq('is_active', true).order('nachname'),
        supabase.from('fahrzeuge').select('id, kennzeichen, typ').eq('company_id', companyId).order('kennzeichen'),
      ]);
      setAlleTechniker(tech ?? []);
      setAlleFahrzeuge(fzg ?? []);
    }
    loadDropdowns();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    async function loadEinsaetze() {
      setLaden(true);
      setGeokodiert({});
      let query = supabase
        .from('auftraege')
        .select(`id, titel, status, datum, uhrzeit, adresse, prioritaet, dauer_minuten,
          techniker:techniker_id(id, vorname, nachname),
          fahrzeug:fahrzeug_id(id, kennzeichen, typ),
          kunde:kunde_id(id, name, firmenname, adresse)`)
        .eq('company_id', companyId)
        .eq('datum', datumFilter)
        .order('uhrzeit', { ascending: true, nullsFirst: false });
      if (technikerFilter) query = query.eq('techniker_id', technikerFilter);
      if (fahrzeugFilter)  query = query.eq('fahrzeug_id', fahrzeugFilter);
      if (prioritaetFilter) query = query.eq('prioritaet', prioritaetFilter);
      if (statusFilter)    query = query.eq('status', statusFilter);
      const { data } = await query;
      setEinsaetze(data ?? []);
      setLaden(false);
    }
    loadEinsaetze();
  }, [companyId, datumFilter, technikerFilter, fahrzeugFilter, prioritaetFilter, statusFilter]);

  useEffect(() => {
    if (einsaetze.length === 0) return;
    let cancelled = false;
    async function geocodeAll() {
      for (const e of einsaetze) {
        if (cancelled) break;
        const addr = e.adresse || e.kunde?.adresse;
        if (!addr || geokodiert[e.id] !== undefined) continue;
        const coords = await geocodeAddress(addr);
        if (!cancelled) setGeokodiert(prev => ({ ...prev, [e.id]: coords }));
        await sleep(120);
      }
    }
    geocodeAll();
    return () => { cancelled = true; };
  }, [einsaetze]);

  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;
    const L = window.L;
    const map = leafletMapRef.current;
    Object.values(markersMapRef.current).forEach(m => m.remove());
    markersMapRef.current = {};
    const bounds = [];
    einsaetze.forEach(e => {
      const coords = geokodiert[e.id];
      if (!coords) return;
      const prio = e.prioritaet || 'normal';
      const color = PRIORITAET_CONFIG[prio]?.color ?? '#3b82f6';
      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px rgba(0,0,0,.45)"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -12],
      });
      const techName  = e.techniker ? `${e.techniker.vorname} ${e.techniker.nachname}` : '\u2014';
      const kundeName = e.kunde ? (e.kunde.firmenname || e.kunde.name || '\u2014') : '\u2014';
      const adresse   = e.adresse || e.kunde?.adresse || '\u2014';
      const uhrzeit   = e.uhrzeit ? e.uhrzeit.slice(0, 5) : '\u2014';
      const prioLabel = PRIORITAET_CONFIG[prio]?.label ?? prio;
      const statusLabel = STATUS_CONFIG[e.status]?.label ?? e.status;
      const mapsUrl   = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
      const popupHtml = `<div style="min-width:210px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#111;border-bottom:1px solid #f0f0f0;padding-bottom:6px">${e.titel}</div>
        <div style="color:#555;margin-bottom:2px"><b>Kunde:</b> ${kundeName}</div>
        <div style="color:#555;margin-bottom:2px"><b>Adresse:</b> ${adresse}</div>
        <div style="color:#555;margin-bottom:2px"><b>Uhrzeit:</b> ${uhrzeit}</div>
        <div style="color:#555;margin-bottom:2px"><b>Techniker:</b> ${techName}</div>
        <div style="color:#555;margin-bottom:2px"><b>Fahrzeug:</b> ${e.fahrzeug?.kennzeichen ?? '\u2014'}</div>
        <div style="color:#555;margin-bottom:10px"><b>Priorit\u00e4t:</b> ${prioLabel}\u00a0\u00a0<b>Status:</b> ${statusLabel}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <a href="/dashboard/auftraege/${e.id}" style="padding:5px 10px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600">Auftrag</a>
          <a href="/dashboard/auftraege/einsatzbericht?id=${e.id}" style="padding:5px 10px;background:#6366f1;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600">Bericht</a>
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="padding:5px 10px;background:#10b981;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600">Navigation</a>
        </div></div>`;
      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map).bindPopup(popupHtml, { maxWidth: 300, minWidth: 220 });
      markersMapRef.current[e.id] = marker;
      bounds.push([coords.lat, coords.lng]);
    });
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [geokodiert, einsaetze]);

  const flyToMarker = useCallback((id) => {
    const coords = geokodiert[id];
    if (!coords || !leafletMapRef.current) return;
    leafletMapRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 0.8 });
    setTimeout(() => { markersMapRef.current[id]?.openPopup(); }, 900);
  }, [geokodiert]);

  async function updateTechniker(auftragId, technikerId) {
    setSavingId(auftragId);
    await supabase.from('auftraege').update({ techniker_id: technikerId || null }).eq('id', auftragId);
    setSavingId(null);
    setEditingTechniker(null);
    setEinsaetze(prev => prev.map(e => {
      if (e.id !== auftragId) return e;
      const tech = alleTechniker.find(t => t.id === technikerId);
      return { ...e, techniker: tech ? { id: tech.id, vorname: tech.vorname, nachname: tech.nachname } : null };
    }));
  }

  async function updateFahrzeug(auftragId, fahrzeugId) {
    setSavingId(auftragId);
    await supabase.from('auftraege').update({ fahrzeug_id: fahrzeugId || null }).eq('id', auftragId);
    setSavingId(null);
    setEditingFahrzeug(null);
    setEinsaetze(prev => prev.map(e => {
      if (e.id !== auftragId) return e;
      const fzg = alleFahrzeuge.find(f => f.id === fahrzeugId);
      return { ...e, fahrzeug: fzg ? { id: fzg.id, kennzeichen: fzg.kennzeichen, typ: fzg.typ } : null };
    }));
  }

  const datumText = new Date(datumFilter + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const geocodiertCount = Object.values(geokodiert).filter(Boolean).length;
  const filteredCount = einsaetze.length;
  const istHeute = datumFilter === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Routenplanung Live</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{datumText}{istHeute ? ' \u2014 Heute' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {!laden && geocodiertCount < filteredCount && filteredCount > 0 && (
            <span className="text-xs text-amber-500">{geocodiertCount}/{filteredCount} Adressen geocodiert</span>
          )}
          {laden && <span className="text-xs text-gray-400">Wird geladen\u2026</span>}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <FilterIcon className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <div className="flex gap-1">
            <input type="date" value={datumFilter} onChange={e => setDatumFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            {!istHeute && (
              <button onClick={() => setDatumFilter(new Date().toISOString().split('T')[0])}
                className="px-2 py-1 text-xs text-blue-600 hover:underline font-medium">Heute</button>
            )}
          </div>
          <select value={technikerFilter} onChange={e => setTechnikerFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <option value="">Alle Techniker</option>
            {alleTechniker.map(t => <option key={t.id} value={t.id}>{t.vorname} {t.nachname}</option>)}
          </select>
          <select value={fahrzeugFilter} onChange={e => setFahrzeugFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <option value="">Alle Fahrzeuge</option>
            {alleFahrzeuge.map(f => <option key={f.id} value={f.id}>{f.kennzeichen}{f.typ ? ` (${f.typ})` : ''}</option>)}
          </select>
          <select value={prioritaetFilter} onChange={e => setPrioritaetFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <option value="">Alle Priorit\u00e4ten</option>
            {Object.entries(PRIORITAET_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <option value="">Alle Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 flex items-center gap-2 flex-wrap">
            <MapPinIcon className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Kartenansicht</span>
            <div className="ml-auto flex items-center gap-3 flex-wrap">
              {Object.entries(PRIORITAET_CONFIG).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: v.color }} />
                  {v.label}
                </span>
              ))}
            </div>
          </div>
          <div ref={mapContainerRef} style={{ height: '440px', width: '100%' }} />
        </div>

        <div className="lg:w-96 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 shrink-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Einsatzliste ({filteredCount})</span>
          </div>
          {laden ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-400">Wird geladen\u2026</p>
            </div>
          ) : einsaetze.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <MapPinIcon className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">Keine Eins\u00e4tze f\u00fcr diesen Tag.</p>
              <p className="text-xs text-gray-400 mt-1">Filter anpassen oder anderes Datum w\u00e4hlen.</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1" style={{ maxHeight: '440px' }}>
              {einsaetze.map((e) => {
                const prio  = e.prioritaet || 'normal';
                const pCfg  = PRIORITAET_CONFIG[prio] ?? PRIORITAET_CONFIG.normal;
                const sCfg  = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.offen;
                const techName  = e.techniker ? `${e.techniker.vorname} ${e.techniker.nachname}` : null;
                const kundeName = e.kunde ? (e.kunde.firmenname || e.kunde.name) : null;
                const adresse   = e.adresse || e.kunde?.adresse;
                const hasCoords = !!(geokodiert[e.id]);
                return (
                  <div key={e.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div onClick={() => flyToMarker(e.id)}
                      className={`px-4 pt-3 pb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition select-none ${!hasCoords ? 'opacity-70' : ''}`}>
                      <div className="flex items-start gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: pCfg.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{e.titel}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${sCfg.cls}`}>{sCfg.label}</span>
                          </div>
                          {kundeName && <p className="text-xs text-gray-500 mt-0.5 truncate">{kundeName}</p>}
                          {adresse && <p className="text-xs text-gray-400 truncate mt-0.5">{adresse}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            {e.uhrzeit && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <ClockIcon className="w-3 h-3" />{e.uhrzeit.slice(0, 5)}
                              </span>
                            )}
                            {!hasCoords && adresse && <span className="text-xs text-amber-500">Geocoding\u2026</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        {editingTechniker === e.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <select autoFocus defaultValue={e.techniker?.id ?? ''} disabled={savingId === e.id}
                              onChange={async ev => await updateTechniker(e.id, ev.target.value)}
                              className="flex-1 text-xs px-2 py-1 border border-blue-300 rounded-lg focus:outline-none bg-white dark:bg-gray-800">
                              <option value="">\u2014 Kein Techniker \u2014</option>
                              {alleTechniker.map(t => <option key={t.id} value={t.id}>{t.vorname} {t.nachname}</option>)}
                            </select>
                            <button onClick={() => setEditingTechniker(null)} className="text-xs text-gray-400 px-1">\u2715</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingTechniker(e.id); setEditingFahrzeug(null); }}
                            className="text-xs text-left hover:text-blue-600 transition truncate">
                            {techName ? <span className="text-gray-600 dark:text-gray-300">{techName}</span>
                              : <span className="text-gray-300 italic">Techniker zuweisen</span>}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <TruckIcon className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        {editingFahrzeug === e.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <select autoFocus defaultValue={e.fahrzeug?.id ?? ''} disabled={savingId === e.id}
                              onChange={async ev => await updateFahrzeug(e.id, ev.target.value)}
                              className="flex-1 text-xs px-2 py-1 border border-blue-300 rounded-lg focus:outline-none bg-white dark:bg-gray-800">
                              <option value="">\u2014 Kein Fahrzeug \u2014</option>
                              {alleFahrzeuge.map(f => <option key={f.id} value={f.id}>{f.kennzeichen}{f.typ ? ` \u2013 ${f.typ}` : ''}</option>)}
                            </select>
                            <button onClick={() => setEditingFahrzeug(null)} className="text-xs text-gray-400 px-1">\u2715</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingFahrzeug(e.id); setEditingTechniker(null); }}
                            className="text-xs text-left hover:text-blue-600 transition truncate">
                            {e.fahrzeug?.kennzeichen
                              ? <span className="text-gray-600 dark:text-gray-300">{e.fahrzeug.kennzeichen}{e.fahrzeug.typ ? ` \u2013 ${e.fahrzeug.typ}` : ''}</span>
                              : <span className="text-gray-300 italic">Fahrzeug zuweisen</span>}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <a href={`/dashboard/auftraege/${e.id}`}
                          className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 text-xs rounded-lg hover:bg-blue-50 hover:text-blue-600 transition">
                          <ExternalLinkIcon className="w-3 h-3" />Auftrag</a>
                        <a href={`/dashboard/auftraege/einsatzbericht?id=${e.id}`}
                          className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 text-xs rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition">
                          <ClipboardIcon className="w-3 h-3" />Bericht</a>
                        {adresse && (
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 text-xs rounded-lg hover:bg-green-50 hover:text-green-600 transition">
                            <NavigationIcon className="w-3 h-3" />Navi</a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
      }'use client';
import { useState } from 'react';

const STATUS_CONFIG = {
  aktiv:         { label: 'Aktiv',   cls: 'bg-green-50 text-green-700 border-green-100'  },
  geplant:       { label: 'Geplant', cls: 'bg-blue-50 text-blue-700 border-blue-100'     },
  pausiert:      { label: 'Pausiert',cls: 'bg-amber-50 text-amber-700 border-amber-100'  },
  abgeschlossen: { label: 'Fertig',  cls: 'bg-gray-100 text-gray-500 border-gray-200'    },
};

const BEISPIEL_ROUTEN = [
  { id: 1, fahrer: 'Max Kellner', fahrzeug: 'B-KP 1', ziel: 'Musterstraße 12, Berlin', status: 'aktiv',    entfernung: '14 km', dauer: '22 min' },
  { id: 2, fahrer: 'Sara Klein',  fahrzeug: 'B-KP 3', ziel: 'Hauptallee 5, Berlin',    status: 'geplant',  entfernung: '8 km',  dauer: '15 min' },
  { id: 3, fahrer: 'Tim Haupt',   fahrzeug: 'B-KP 2', ziel: 'Parkweg 3, Potsdam',      status: 'pausiert', entfernung: '31 km', dauer: '40 min' },
];

function MapIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function LocationIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function TruckIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function SignalIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export default function RoutenplanungLiveStatus() {
  const [modalOffen, setModalOffen] = useState(false);
  const [zeigePlatzhalter, setZeigePlatzhalter] = useState(false);

  const routen = [];

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Routenplanung & Live-Status</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Behalte Einsätze, Fahrten und Live-Status deiner Teams im Blick.
          </p>
        </div>
        <button
          onClick={() => setModalOffen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Route planen
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Aktive Routen',    wert: '—', farbe: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', dot: 'bg-green-500' },
          { label: 'Geplante Routen',  wert: '—', farbe: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-100',  dot: 'bg-blue-500'  },
          { label: 'Fahrzeuge aktiv',  wert: '—', farbe: 'text-gray-700',  bg: 'bg-white',    border: 'border-gray-100',  dot: null           },
          { label: 'Ø Fahrzeit heute', wert: '—', farbe: 'text-gray-400',  bg: 'bg-gray-50',  border: 'border-gray-100',  dot: null           },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} px-4 py-3 flex flex-col gap-1`}>
            <div className="flex items-center gap-1.5">
              {k.dot && <span className={`w-1.5 h-1.5 rounded-full ${k.dot} animate-pulse`} />}
              <span className="text-xs text-gray-400">{k.label}</span>
            </div>
            <span className={`text-2xl font-bold ${k.farbe}`}>{k.wert}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">Live-Kartenansicht</span>
          </div>
          <span className="text-xs text-gray-400">GPS-Integration folgt in Kürze</span>
        </div>
        <div className="relative bg-gray-50 h-52 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center">
              <MapIcon className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-400">Kartenansicht nicht verfügbar</p>
            <p className="text-xs text-gray-300">Live-GPS-Tracking wird in einer kommenden Version integriert.</p>
          </div>
          <div className="absolute top-8 left-16 w-3 h-3 bg-blue-400 rounded-full opacity-50 shadow" />
          <div className="absolute top-20 right-24 w-3 h-3 bg-green-400 rounded-full opacity-50 shadow" />
          <div className="absolute bottom-10 left-32 w-3 h-3 bg-amber-400 rounded-full opacity-50 shadow" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Aktuelle Routen</span>
          <button
            onClick={() => setZeigePlatzhalter(v => !v)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            {zeigePlatzhalter ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
          </button>
        </div>

        {routen.length === 0 && !zeigePlatzhalter ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <LocationIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              Noch keine aktiven Routen vorhanden.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf „Route planen", um die erste Route zu erstellen.
            </p>
            <button
              onClick={() => setModalOffen(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Route planen
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {BEISPIEL_ROUTEN.map((route) => {
              const cfg = STATUS_CONFIG[route.status] ?? STATUS_CONFIG.geplant;
              return (
                <div key={route.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <TruckIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{route.fahrer}</p>
                      <span className="text-xs text-gray-300">·</span>
                      <p className="text-xs text-gray-400">{route.fahrzeug}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{route.ziel}</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-xs font-medium text-gray-600">{route.entfernung}</span>
                    <span className="text-xs text-gray-400">{route.dauer}</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(route.ziel)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition shrink-0"
                  >
                    <LocationIcon className="w-3.5 h-3.5" />
                    Navi
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <SignalIcon className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          Die vollständige Routenplanung mit Live-GPS-Tracking, automatischer Routenoptimierung
          und Echtzeit-Status wird in einer kommenden Version verfügbar sein.
        </p>
      </div>

      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <MapIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Route planen</h2>
                <p className="text-xs text-gray-400 mt-0.5">Funktion wird bald verfügbar sein.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Die Routenplanung mit GPS-Integration wird in einer kommenden Version
              vollständig implementiert.
            </p>
            <button
              onClick={() => setModalOffen(false)}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
