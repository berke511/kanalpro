'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

// ── Konstanten ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700 border-blue-200'       },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-100 text-green-700 border-green-200'    },
};
const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const _today = new Date();

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────
function todayDateStr() {
  return [
    _today.getFullYear(),
    String(_today.getMonth() + 1).padStart(2, '0'),
    String(_today.getDate()).padStart(2, '0'),
  ].join('-');
}
function formatSek(s) {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
function formatM(m) { return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`; }

// ── Google Maps Loader (singleton) ───────────────────────────────────────────
let _mapsLoading = false, _mapsCallbacks = [];
function loadGoogleMaps(apiKey) {
  return new Promise(resolve => {
    if (typeof window === 'undefined')      { resolve(false); return; }
    if (window.google?.maps?.Map)           { resolve(true);  return; }
    _mapsCallbacks.push(resolve);
    if (_mapsLoading) return;
    _mapsLoading = true;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    s.onload  = () => { _mapsCallbacks.forEach(cb => cb(true));  _mapsCallbacks = []; };
    s.onerror = () => { _mapsCallbacks.forEach(cb => cb(false)); _mapsCallbacks = []; _mapsLoading = false; };
    document.head.appendChild(s);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// KALENDER-ANSICHT
// ════════════════════════════════════════════════════════════════════════════
function KalenderAnsicht({ auftraege }) {
  const [jahr,  setJahr]  = useState(_today.getFullYear());
  const [monat, setMonat] = useState(_today.getMonth());

  const prevMonat = () => monat === 0  ? (setMonat(11), setJahr(j => j - 1)) : setMonat(m => m - 1);
  const nextMonat = () => monat === 11 ? (setMonat(0),  setJahr(j => j + 1)) : setMonat(m => m + 1);
  const zuHeute   = () => { setJahr(_today.getFullYear()); setMonat(_today.getMonth()); };

  const ersterTag   = new Date(jahr, monat, 1);
  const anzahlTage  = new Date(jahr, monat + 1, 0).getDate();
  const startOffset = (ersterTag.getDay() + 6) % 7;

  const byDate = {};
  for (const a of auftraege) {
    const key = a.datum.slice(0, 10);
    (byDate[key] = byDate[key] ?? []).push(a);
  }

  const todayStr  = todayDateStr();
  const cells     = [...Array(startOffset).fill(null), ...Array.from({ length: anzahlTage }, (_, i) => i + 1)];
  const rest      = (7 - (cells.length % 7)) % 7;
  const allCells  = [...cells, ...Array(rest).fill(null)];

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prevMonat} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600 text-lg">‹</button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{MONATE[monat]} {jahr}</h2>
            {(jahr !== _today.getFullYear() || monat !== _today.getMonth()) && (
              <button onClick={zuHeute} className="text-xs text-blue-600 hover:underline font-medium">Heute</button>
            )}
          </div>
          <button onClick={nextMonat} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600 text-lg">›</button>
        </div>
        {/* Wochentage */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {WOCHENTAGE.map((w, i) => (
            <div key={w} className={`text-center text-xs font-semibold uppercase tracking-wide py-3 ${i >= 5 ? 'text-gray-400' : 'text-gray-500'}`}>{w}</div>
          ))}
        </div>
        {/* Zellen */}
        <div className="grid grid-cols-7">
          {allCells.map((d, i) => {
            if (!d) return <div key={`pad-${i}`} className={`min-h-28 border-r border-b border-gray-100 ${i % 7 >= 5 ? 'bg-gray-50/60' : 'bg-gray-50/30'}`} />;
            const dateStr = [jahr, String(monat + 1).padStart(2, '0'), String(d).padStart(2, '0')].join('-');
            const tags    = byDate[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            const isWE    = i % 7 >= 5;
            return (
              <div key={d} className={`min-h-28 border-r border-b border-gray-100 p-2 ${isWE ? 'bg-amber-50/20' : 'bg-white'}`}>
                <div className={`text-sm font-semibold mb-1.5 w-7 h-7 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-blue-600 text-white' : isWE ? 'text-gray-400' : 'text-gray-700'}`}>{d}</div>
                <div className="space-y-1">
                  {tags.slice(0, 3).map(a => {
                    const cfg   = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.offen;
                    const kunde = a.kunden ? (a.kunden.firmenname || a.kunden.name) : null;
                    return (
                      <Link key={a.id} href={`/dashboard/auftraege/${a.id}`}
                        title={`${a.titel}${kunde ? ' — ' + kunde : ''}${a.adresse ? ' · ' + a.adresse : ''}`}
                        className={`block text-xs px-1.5 py-0.5 rounded border truncate hover:opacity-75 transition ${cfg.cls}`}>
                        {a.titel}
                      </Link>
                    );
                  })}
                  {tags.length > 3 && <p className="text-xs text-gray-400 pl-1">+{tags.length - 3} weitere</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Legende */}
      <div className="flex items-center gap-5 mt-4">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-3 h-3 rounded border ${v.cls}`} />{v.label}
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-auto">{auftraege.length} geplante Aufträge gesamt</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DISPOSITION-ANSICHT
// ════════════════════════════════════════════════════════════════════════════
function DispositionAnsicht({ auftraege: alleAuftraege }) {
  const [datum,       setDatum]       = useState(todayDateStr());
  const [startAdr,    setStartAdr]    = useState('');
  const [mapsReady,   setMapsReady]   = useState(false);
  const [optimieren,  setOptimieren]  = useState(false);
  const [route,       setRoute]       = useState(null);
  const [fehler,      setFehler]      = useState('');

  const mapRef      = useRef(null);
  const mapInst     = useRef(null);
  const rendererRef = useRef(null);
  const markersList = useRef([]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Aufträge für gewähltes Datum
  const tagesAuftraege = alleAuftraege.filter(a => a.datum?.slice(0, 10) === datum);
  const mitAdresse     = tagesAuftraege.filter(a => a.adresse?.trim());
  const ohneAdresse    = tagesAuftraege.filter(a => !a.adresse?.trim());

  const datumLabel = (() => {
    try { return new Date(datum + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return datum; }
  })();

  // Start-Adresse aus localStorage
  useEffect(() => {
    setStartAdr(localStorage.getItem('disposition_start') || '');
  }, []);

  // Maps laden
  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMaps(apiKey).then(ok => setMapsReady(ok));
  }, [apiKey]);

  // Karte initialisieren
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInst.current) return;
    mapInst.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 51.5, lng: 10.0 },
      zoom: 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    rendererRef.current = new window.google.maps.DirectionsRenderer({ suppressMarkers: false });
    rendererRef.current.setMap(mapInst.current);
  }, [mapsReady]);

  // Einfache Marker zeigen (ohne Route)
  useEffect(() => {
    if (!mapsReady || !mapInst.current || route) return;
    try { rendererRef.current?.setDirections({ routes: [] }); } catch {}
    markersList.current.forEach(m => m.setMap(null));
    markersList.current = [];
    if (mitAdresse.length === 0) return;

    const bounds   = new window.google.maps.LatLngBounds();
    const geocoder = new window.google.maps.Geocoder();
    let done = 0;

    mitAdresse.forEach((a, i) => {
      geocoder.geocode({ address: a.adresse, region: 'de' }, (results, status) => {
        if (status === 'OK') {
          const marker = new window.google.maps.Marker({
            position: results[0].geometry.location,
            map: mapInst.current,
            label: { text: String(i + 1), color: 'white', fontWeight: 'bold' },
            title: a.titel,
          });
          markersList.current.push(marker);
          bounds.extend(results[0].geometry.location);
        }
        done++;
        if (done === mitAdresse.length && !bounds.isEmpty()) {
          mapInst.current.fitBounds(bounds, 60);
        }
      });
    });
  }, [mapsReady, mitAdresse, route]);

  function saveStartAdr(val) {
    setStartAdr(val);
    localStorage.setItem('disposition_start', val);
  }

  async function handleOptimieren() {
    if (!startAdr.trim())        { setFehler('Bitte Startadresse eingeben.');                    return; }
    if (mitAdresse.length === 0) { setFehler('Keine Aufträge mit Adresse für diesen Tag.'); return; }
    setFehler(''); setOptimieren(true); setRoute(null);

    const svc = new window.google.maps.DirectionsService();
    try {
      const result = await svc.route({
        origin:            startAdr,
        destination:       startAdr,
        waypoints:         mitAdresse.map(a => ({ location: a.adresse, stopover: true })),
        optimizeWaypoints: true,
        travelMode:        window.google.maps.TravelMode.DRIVING,
        region:            'de',
      });
      rendererRef.current.setDirections(result);

      const order = result.routes[0].waypoint_order;
      const legs  = result.routes[0].legs;
      let cumDist = 0, cumDur = 0;

      const stops = order.map((idx, i) => {
        cumDist += legs[i].distance.value;
        cumDur  += legs[i].duration.value;
        return {
          ...mitAdresse[idx],
          legDist:  legs[i].distance.text,
          legDur:   legs[i].duration.text,
          cumDist:  formatM(cumDist),
          cumDur:   formatSek(cumDur),
        };
      });

      setRoute({
        stops,
        totalDist: legs.reduce((s, l) => s + l.distance.value, 0),
        totalDur:  legs.reduce((s, l) => s + l.duration.value, 0),
      });
    } catch (e) {
      setFehler('Routenberechnung fehlgeschlagen — bitte Adressen prüfen.');
    } finally {
      setOptimieren(false);
    }
  }

  return (
    <>
      {/* Print-Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .print-only { display: none; }
      `}} />

      {/* ── Interaktiver Bereich ─────────────────────────────────── no-print */}
      <div className="no-print">

        {/* Datum + Startadresse */}
        <div className="flex flex-wrap gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">📅 Datum</label>
            <input type="date" value={datum}
              onChange={e => { setDatum(e.target.value); setRoute(null); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1 min-w-64">
            <label className="block text-xs font-medium text-gray-500 mb-1">🏠 Startadresse (Betrieb / Heimatort)</label>
            <input type="text" value={startAdr}
              onChange={e => saveStartAdr(e.target.value)}
              placeholder="z. B. Musterstraße 1, 12345 Berlin"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Status-Zeile */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">{tagesAuftraege.length} Aufträge · {datumLabel}</span>
          {mitAdresse.length > 0 && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
              {mitAdresse.length} routebar
            </span>
          )}
          {ohneAdresse.length > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
              ⚠️ {ohneAdresse.length} ohne Adresse
            </span>
          )}
        </div>

        {/* Fehlermeldung */}
        {fehler && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4 border border-red-100">{fehler}</div>
        )}

        {/* API-Key-Anleitung */}
        {!apiKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5">
            <p className="font-semibold text-amber-800 mb-3">🔑 Google Maps API Key einrichten</p>
            <ol className="text-sm text-amber-700 space-y-2 list-decimal ml-5">
              <li>Öffne die <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-medium">Google Cloud Console</a> und erstelle ein Projekt.</li>
              <li>Aktiviere <strong>Maps JavaScript API</strong> und <strong>Directions API</strong> unter &quot;APIs &amp; Services&quot;.</li>
              <li>Erstelle einen API-Key unter &quot;Credentials&quot; (HTTP-Referrer auf deine Domain beschränken).</li>
              <li>In Vercel: <strong>Settings → Environment Variables</strong> → Variable <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> mit deinem Key anlegen.</li>
              <li>Redeployment anstoßen → Disposition ist einsatzbereit.</li>
            </ol>
          </div>
        )}

        {/* Karte */}
        {apiKey && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-5 shadow-sm">
            <div ref={mapRef} style={{ width: '100%', height: '420px' }} />
          </div>
        )}

        {/* Aufträge ohne Adresse */}
        {ohneAdresse.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <p className="text-sm font-medium text-amber-800 mb-2">⚠️ Nicht routebar — Adresse fehlt:</p>
            <div className="space-y-1">
              {ohneAdresse.map(a => (
                <Link key={a.id} href={`/dashboard/auftraege/${a.id}`}
                  className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900 hover:underline">
                  → {a.titel}
                  <span className="text-xs text-amber-400">(jetzt nachtragen)</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Kein Auftrag an diesem Tag */}
        {tagesAuftraege.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-medium">Keine Aufträge für diesen Tag</p>
            <Link href="/dashboard/auftraege/neu" className="text-sm text-blue-600 hover:underline mt-1 inline-block">+ Neuen Auftrag anlegen</Link>
          </div>
        )}

        {/* Buttons */}
        {apiKey && mitAdresse.length > 0 && (
          <div className="flex gap-3 mb-6 flex-wrap">
            <button onClick={handleOptimieren} disabled={optimieren}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 text-sm flex items-center gap-2">
              {optimieren ? '⏳ Berechne Route…' : '⚡ Route optimieren'}
            </button>
            {route && (
              <>
                <button onClick={() => window.print()}
                  className="px-5 py-2.5 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition text-sm flex items-center gap-2">
                  🖨️ Drucken / als PDF speichern
                </button>
                <button onClick={() => { setRoute(null); markersList.current.forEach(m => m.setMap(null)); markersList.current = []; }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
                  ✕ Zurücksetzen
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Routen-Ergebnis ─────────────────────────────────────────────── */}
        {route && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Optimierter Ablaufplan</h3>
                <p className="text-xs text-gray-500 mt-0.5">{datumLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{formatM(route.totalDist)}</p>
                <p className="text-xs text-gray-500">{formatSek(route.totalDur)} Fahrzeit gesamt</p>
              </div>
            </div>

            {/* Start */}
            <div className="px-6 py-3.5 border-b border-gray-50 flex items-center gap-3 bg-green-50/40">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Start</p>
                <p className="text-sm font-medium text-gray-900">{startAdr}</p>
              </div>
            </div>

            {/* Haltepunkte */}
            {route.stops.map((stop, i) => {
              const cfg   = STATUS_CONFIG[stop.status] ?? STATUS_CONFIG.offen;
              const kunde = stop.kunden ? (stop.kunden.firmenname || stop.kunden.name) : null;
              return (
                <div key={stop.id} className="px-6 py-4 border-b border-gray-50 flex items-start gap-3 hover:bg-gray-50/60 transition">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-gray-900">{stop.titel}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
                      {kunde && <span className="text-xs text-gray-400">{kunde}</span>}
                    </div>
                    <p className="text-xs text-gray-500">{stop.adresse}</p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-xs font-medium text-blue-600">🚗 {stop.legDur} · {stop.legDist}</span>
                      <span className="text-xs text-gray-400">Σ {stop.cumDur} · {stop.cumDist}</span>
                    </div>
                  </div>
                  <Link href={`/dashboard/auftraege/${stop.id}`}
                    className="text-sm text-gray-300 hover:text-blue-600 flex-shrink-0 mt-1 transition">→</Link>
                </div>
              );
            })}

            {/* Rückkehr */}
            <div className="px-6 py-3.5 border-b border-gray-50 flex items-center gap-3 bg-green-50/40">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">E</span>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Rückkehr</p>
                <p className="text-sm font-medium text-gray-900">{startAdr}</p>
              </div>
            </div>

            {/* Zusammenfassung */}
            <div className="px-6 py-5 bg-blue-50/30">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{route.stops.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Einsätze</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatM(route.totalDist)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Gesamtstrecke</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatSek(route.totalDur)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reine Fahrzeit</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PRINT LAYOUT (nur beim Drucken sichtbar)
          ══════════════════════════════════════════════════════════════════ */}
      {route && (
        <div className="print-only" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          {/* Kopfzeile */}
          <div style={{ borderBottom: '3px solid #1d4ed8', paddingBottom: '14px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '22pt', margin: '0 0 4px', color: '#1d4ed8', fontWeight: 'bold' }}>Tourenplan</h1>
                <p style={{ margin: '0 0 2px', fontSize: '13pt', color: '#111827', fontWeight: '600' }}>{datumLabel}</p>
                <p style={{ margin: 0, fontSize: '10pt', color: '#6b7280' }}>
                  Start/Ende: {startAdr}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 2px', fontSize: '14pt', fontWeight: 'bold', color: '#111827' }}>{formatM(route.totalDist)}</p>
                <p style={{ margin: 0, fontSize: '10pt', color: '#6b7280' }}>{formatSek(route.totalDur)} Fahrzeit</p>
                <p style={{ margin: '4px 0 0', fontSize: '10pt', color: '#6b7280' }}>{route.stops.length} Einsätze</p>
              </div>
            </div>
          </div>

          {/* Tabelle */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <thead>
              <tr style={{ background: '#dbeafe' }}>
                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #bfdbfe', width: '28px', color: '#1e40af' }}>#</th>
                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #bfdbfe', color: '#1e40af' }}>Auftrag / Kunde</th>
                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #bfdbfe', color: '#1e40af' }}>Adresse</th>
                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #bfdbfe', color: '#1e40af', whiteSpace: 'nowrap' }}>Fahrt</th>
                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #bfdbfe', color: '#1e40af', whiteSpace: 'nowrap' }}>Kumuliert</th>
                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #bfdbfe', color: '#1e40af', width: '90px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f0fdf4' }}>
                <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontWeight: 'bold', color: '#16a34a' }}>S</td>
                <td colSpan={4} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', color: '#374151' }}>Start: {startAdr}</td>
                <td style={{ border: '1px solid #e5e7eb' }} />
              </tr>
              {route.stops.map((stop, i) => {
                const statusLabel = STATUS_CONFIG[stop.status]?.label ?? 'Offen';
                const statusColor = stop.status === 'abgeschlossen' ? { bg: '#dcfce7', fg: '#166534' } : stop.status === 'in_bearbeitung' ? { bg: '#dbeafe', fg: '#1e40af' } : { bg: '#fef9c3', fg: '#854d0e' };
                const kunde = stop.kunden ? (stop.kunden.firmenname || stop.kunden.name) : null;
                return (
                  <tr key={stop.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb', fontWeight: 'bold', color: '#1d4ed8', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{stop.titel}</span>
                      {kunde && <div style={{ fontSize: '9pt', color: '#6b7280', marginTop: '2px' }}>{kunde}</div>}
                    </td>
                    <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb', color: '#374151' }}>{stop.adresse}</td>
                    <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb', color: '#374151', whiteSpace: 'nowrap' }}>{stop.legDur} · {stop.legDist}</td>
                    <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb', color: '#374151', whiteSpace: 'nowrap' }}>{stop.cumDur} · {stop.cumDist}</td>
                    <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '9pt', fontWeight: '600', background: statusColor.bg, color: statusColor.fg }}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#f0fdf4' }}>
                <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontWeight: 'bold', color: '#16a34a' }}>E</td>
                <td colSpan={4} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', color: '#374151' }}>Rückkehr: {startAdr}</td>
                <td style={{ border: '1px solid #e5e7eb' }} />
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ background: '#dbeafe', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ padding: '7px 10px', border: '1px solid #bfdbfe', color: '#1e40af' }}>Gesamt (inkl. Rückfahrt)</td>
                <td colSpan={2} style={{ padding: '7px 10px', border: '1px solid #bfdbfe', color: '#1e40af' }}>{formatSek(route.totalDur)} · {formatM(route.totalDist)}</td>
                <td style={{ border: '1px solid #bfdbfe' }} />
              </tr>
            </tfoot>
          </table>

          <p style={{ marginTop: '24px', fontSize: '9pt', color: '#9ca3af', textAlign: 'right' }}>
            KanalPro · Erstellt am {new Date().toLocaleDateString('de-DE')}
          </p>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HAUPT-EXPORT
// ════════════════════════════════════════════════════════════════════════════
export default function Einsatzplanung() {
  const [alleAuftraege, setAlleAuftraege] = useState([]);
  const [laden,         setLaden]         = useState(true);
  const [aktiveTab,     setAktiveTab]     = useState('kalender');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('auftraege')
        .select('id, titel, datum, status, adresse, kunden(name, firmenname)')
        .eq('user_id', user.id)
        .not('datum', 'is', null)
        .order('datum');
      setAlleAuftraege(data ?? []);
      setLaden(false);
    }
    load();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 no-print">
        <h1 className="text-2xl font-bold text-gray-900">📅 Einsatzplanung</h1>
        <Link href="/dashboard/auftraege/neu"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          + Neuer Auftrag
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit no-print">
        {[
          { id: 'kalender',    label: '📅 Kalender' },
          { id: 'disposition', label: '🗺️ Disposition' },
        ].map(t => (
          <button key={t.id} onClick={() => setAktiveTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${aktiveTab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {laden ? (
        <div className="text-gray-400 py-16 text-center">Wird geladen…</div>
      ) : (
        <>
          {aktiveTab === 'kalender'    && <KalenderAnsicht    auftraege={alleAuftraege} />}
          {aktiveTab === 'disposition' && <DispositionAnsicht auftraege={alleAuftraege} />}
        </>
      )}
    </div>
  );
}
