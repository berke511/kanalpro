'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const STATUS_CONFIG = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700 border-blue-200'       },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-100 text-green-700 border-green-200'    },
};

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONATE = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
];

export default function Einsatzplanung() {
  const today = new Date();

  const [jahr,      setJahr]      = useState(today.getFullYear());
  const [monat,     setMonat]     = useState(today.getMonth());
  const [auftraege, setAuftraege] = useState([]);
  const [laden,     setLaden]     = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('auftraege')
        .select('id, titel, datum, status, adresse, kunden(name, firmennamen)')
        .eq('user_id', user.id)
        .not('datum', 'is', null)
        .order('datum');
      setAuftraege(data ?? []);
      setLaden(false);
    }
    load();
  }, []);

  function prevMonat() {
    if (monat === 0) { setMonat(11); setJahr(j => j - 1); }
    else setMonat(m => m - 1);
  }
  function nextMonat() {
    if (monat === 11) { setMonat(0); setJahr(j => j + 1); }
    else setMonat(m => m + 1);
  }
  function zuHeute() {
    setJahr(today.getFullYear());
    setMonat(today.getMonth());
  }

  // ── Kalender-Grid aufbauen ────────────────────────────────────────────────────
  const ersterTag    = new Date(jahr, monat, 1);
  const anzahlTage   = new Date(jahr, monat + 1, 0).getDate();
  const startOffset  = (ersterTag.getDay() + 6) % 7; // 0=Mo … 6=So

  // date → auftraege-Array
  const byDate = {};
  for (const a of auftraege) {
    const key = a.datum.slice(0, 10);
    (byDate[key] = byDate[key] ?? []).push(a);
  }

  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  // Alle Zellen: null = Vortag-Lücke, Zahl = Tag des Monats
  const cells = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: anzahlTage }, (_, i) => i + 1),
  ];
  // Auf volle Wochen auffüllen
  const rest = (7 - (cells.length % 7)) % 7;
  const allCells = [...cells, ...Array(rest).fill(null)];

  // ── Aufträge ohne Datum (Disposition-Pending) ─────────────────────────────────
  const ohneDatum = auftraege.filter(a => !a.datum); // already excluded by query, kept for future

  if (laden) {
    return <div className="text-gray-400 py-16 text-center">Wird geladen…</div>;
  }

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📅 Einsatzplanung</h1>
        <Link href="/dashboard/auftraege/neu"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          + Neuer Auftrag
        </Link>
      </div>

      {/* ── Monats-Navigation ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prevMonat}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600 text-lg">
            ‹
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{MONATE[monat]} {jahr}</h2>
            {(jahr !== today.getFullYear() || monat !== today.getMonth()) && (
              <button onClick={zuHeute}
                className="text-xs text-blue-600 hover:underline font-medium">
                Heute
              </button>
            )}
          </div>
          <button onClick={nextMonat}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600 text-lg">
            ›
          </button>
        </div>

        {/* ── Wochentag-Kopfzeile ──────────────────────────────────────────── */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {WOCHENTAGE.map((w, i) => (
            <div key={w}
              className={`text-center text-xs font-semibold uppercase tracking-wide py-3 ${i >= 5 ? 'text-gray-400' : 'text-gray-500'}`}>
              {w}
            </div>
          ))}
        </div>

        {/* ── Tages-Zellen ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-7">
          {allCells.map((d, i) => {
            if (!d) {
              return (
                <div key={`pad-${i}`}
                  className={`min-h-28 border-r border-b border-gray-100 ${i % 7 >= 5 ? 'bg-gray-50/60' : 'bg-gray-50/30'}`} />
              );
            }

            const dateStr = [
              jahr,
              String(monat + 1).padStart(2, '0'),
              String(d).padStart(2, '0'),
            ].join('-');

            const tagesAuftraege = byDate[dateStr] ?? [];
            const isToday        = dateStr === todayStr;
            const isWochenende   = i % 7 >= 5;

            return (
              <div key={d}
                className={`min-h-28 border-r border-b border-gray-100 p-2 ${isWochenende ? 'bg-amber-50/20' : 'bg-white'}`}>
                {/* Tag-Zahl */}
                <div className={`text-sm font-semibold mb-1.5 w-7 h-7 flex items-center justify-center rounded-full leading-none ${
                  isToday ? 'bg-blue-600 text-white' : isWochenende ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {d}
                </div>

                {/* Auftrags-Chips */}
                <div className="space-y-1">
                  {tagesAuftraege.slice(0, 3).map(a => {
                    const cfg        = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.offen;
                    const kundeLabel = a.kunden ? (a.kunden.firmennamen || a.kunden.name) : null;
                    return (
                      <Link key={a.id} href={`/dashboard/auftraege/${a.id}`}
                        title={`${a.titel}${kundeLabel ? ' — ' + kundeLabel : ''}${a.adresse ? ' · ' + a.adresse : ''}`}
                        className={`block text-xs px-1.5 py-0.5 rounded border truncate hover:opacity-75 transition ${cfg.cls}`}>
                        {a.titel}
                      </Link>
                    );
                  })}
                  {tagesAuftraege.length > 3 && (
                    <p className="text-xs text-gray-400 pl-1">+{tagesAuftraege.length - 3} weitere</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legende ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 mt-4">
        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-3 h-3 rounded border ${val.cls}`} />
            {val.label}
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-auto">
          {auftraege.length} geplante Aufträge gesamt
        </span>
      </div>
    </div>
  );
}
