'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

// ── Konstanten ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700 border-blue-200'       },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-100 text-green-700 border-green-200'    },
};
const WOCHENTAGE = ['Mo','Di','Mi','Do','Fr','Sa','So'];
const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const _today = new Date();

function todayDateStr() {
  return [
    _today.getFullYear(),
    String(_today.getMonth() + 1).padStart(2, '0'),
    String(_today.getDate()).padStart(2, '0'),
  ].join('-');
}

// ══════════════════════════════════════════════════════════════════════════════
// KALENDER-ANSICHT
// ══════════════════════════════════════════════════════════════════════════════
function KalenderAnsicht({ auftraege }) {
  const [jahr,  setJahr]  = useState(_today.getFullYear());
  const [monat, setMonat] = useState(_today.getMonth());

  const prevMonat = () => monat === 0  ? (setMonat(11), setJahr(j => j - 1)) : setMonat(m => m - 1);
  const nextMonat = () => monat === 11 ? (setMonat(0),  setJahr(j => j + 1)) : setMonat(m => m + 1);
  const zuHeute   = () => { setJahr(_today.getFullYear()); setMonat(_today.getMonth()); };

  const ersterTag  = new Date(jahr, monat, 1);
  const anzahlTage = new Date(jahr, monat + 1, 0).getDate();
  const startOffset = (ersterTag.getDay() + 6) % 7;

  const byDate = {};
  for (const a of auftraege) {
    const key = a.datum.slice(0, 10);
    (byDate[key] = byDate[key] ?? []).push(a);
  }

  const todayStr = todayDateStr();
  const cells    = [...Array(startOffset).fill(null), ...Array.from({ length: anzahlTage }, (_, i) => i + 1)];
  const rest     = (7 - (cells.length % 7)) % 7;
  const allCells = [...cells, ...Array(rest).fill(null)];

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prevMonat} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600 text-lg">&#8249;</button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{MONATE[monat]} {jahr}</h2>
            {(jahr !== _today.getFullYear() || monat !== _today.getMonth()) && (
              <button onClick={zuHeute} className="text-xs text-blue-600 hover:underline font-medium">Heute</button>
            )}
          </div>
          <button onClick={nextMonat} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600 text-lg">&#8250;</button>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {WOCHENTAGE.map((w, i) => (
            <div key={w} className={`text-center text-xs font-semibold uppercase tracking-wide py-3 ${i >= 5 ? 'text-gray-400' : 'text-gray-500'}`}>{w}</div>
          ))}
        </div>
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
                        title={`${a.titel}${kunde ? ' – ' + kunde : ''}${a.adresse ? ' · ' + a.adresse : ''}`}
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

// ══════════════════════════════════════════════════════════════════════════════
// DISPOSITION-ANSICHT
// ══════════════════════════════════════════════════════════════════════════════
function DispositionAnsicht({ auftraege: alleAuftraege }) {
  const [datum, setDatum] = useState(todayDateStr());

  const tagesAuftraege = alleAuftraege.filter(a => a.datum?.slice(0, 10) === datum);

  const datumLabel = (() => {
    try { return new Date(datum + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return datum; }
  })();

  function mapsUrl(adresse) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
  }

  return (
    <div className="space-y-6">
      {/* Datumsauswahl */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Datum:</label>
        <input
          type="date"
          value={datum}
          onChange={e => setDatum(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500">{datumLabel}</span>
        <button
          onClick={() => setDatum(todayDateStr())}
          className="ml-auto text-xs text-blue-600 hover:underline font-medium"
        >
          Heute
        </button>
      </div>

      {/* Aufträge des Tages */}
      {tagesAuftraege.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">Keine Aufträge für diesen Tag</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500">{tagesAuftraege.length} Einsatz{tagesAuftraege.length !== 1 ? 'ätze' : ''}</p>
          {tagesAuftraege.map((a, i) => {
            const cfg   = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.offen;
            const kunde = a.kunden ? (a.kunden.firmenname || a.kunden.name) : null;
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
                {/* Nummer */}
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-gray-900">{a.titel}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                  {kunde && <p className="text-xs text-gray-500 mb-0.5">{kunde}</p>}
                  {a.adresse ? (
                    <p className="text-xs text-gray-500">{a.adresse}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Keine Adresse hinterlegt</p>
                  )}
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.adresse && (
                    <a
                      href={mapsUrl(a.adresse)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      &#128205; Navigation
                    </a>
                  )}
                  <Link
                    href={`/dashboard/auftraege/${a.id}`}
                    className="flex items-center gap-1 px-3 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HAUPT-EXPORT
// ══════════════════════════════════════════════════════════════════════════════
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
      <div className="flex items-center justify-between mb-6 no-print">
        <h1 className="text-2xl font-bold text-gray-900">&#128197; Einsatzplanung</h1>
        <Link href="/dashboard/auftraege/neu"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          + Neuer Auftrag
        </Link>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit no-print">
        {[
          { id: 'kalender',    label: '📅 Kalender'    },
          { id: 'disposition', label: '🗨️ Disposition' },
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
