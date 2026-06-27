'use client';
import { useState } from 'react';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WOCHENTAGE_LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function getWochenstart(datum) {
  const d = new Date(datum);
  const tag = d.getDay();
  const diff = (tag === 0 ? -6 : 1 - tag);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDatum(datum) {
  return datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatKW(datum) {
  const start = getWochenstart(datum);
  const jan1 = new Date(start.getFullYear(), 0, 1);
  const kw = Math.ceil(((start - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return kw;
}

function CalendarIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
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

function ChevronIcon({ direction, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d={direction === 'left' ? 'M15.75 19.5L8.25 12l7.5-7.5' : 'M8.25 4.5l7.5 7.5-7.5 7.5'} />
    </svg>
  );
}

export default function Wochenplanung() {
  const [modalOffen, setModalOffen] = useState(false);
  const [basisDatum, setBasisDatum] = useState(new Date());

  const heute = new Date();
  const wochenstart = getWochenstart(basisDatum);
  const kw = formatKW(basisDatum);

  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(wochenstart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const istAktuelleWoche =
    getWochenstart(heute).getTime() === wochenstart.getTime();

  function vorige() {
    const d = new Date(basisDatum);
    d.setDate(d.getDate() - 7);
    setBasisDatum(d);
  }
  function naechste() {
    const d = new Date(basisDatum);
    d.setDate(d.getDate() + 7);
    setBasisDatum(d);
  }

  const einsaetze = [];

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Wochenplanung</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plane und verwalte alle Einsätze der aktuellen Woche.
          </p>
        </div>
        <button
          onClick={() => setModalOffen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Einsatz planen
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={vorige}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-500"
        >
          <ChevronIcon direction="left" className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            KW {kw} — {formatDatum(tage[0])} bis {formatDatum(tage[6])}.{tage[6].getFullYear()}
          </span>
          {!istAktuelleWoche && (
            <button
              onClick={() => setBasisDatum(new Date())}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Heute
            </button>
          )}
        </div>
        <button
          onClick={naechste}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-500"
        >
          <ChevronIcon direction="right" className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {tage.map((tag, i) => {
            const istHeute = tag.toDateString() === heute.toDateString();
            const istWE = i >= 5;
            return (
              <div key={i} className={`py-3 text-center ${istWE ? 'bg-gray-50/60' : ''}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${istWE ? 'text-gray-400' : 'text-gray-500'}`}>
                  {WOCHENTAGE[i]}
                </p>
                <div className={`mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold leading-none ${istHeute ? 'bg-blue-600 text-white' : istWE ? 'text-gray-400' : 'text-gray-700'}`}>
                  {tag.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {einsaetze.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              Keine Einsätze für diese Woche geplant.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf „Einsatz planen", um den ersten Einsatz hinzuzufügen.
            </p>
            <button
              onClick={() => setModalOffen(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Einsatz planen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-7 min-h-48 divide-x divide-gray-100">
            {tage.map((tag, i) => (
              <div key={i} className={`p-2 ${i >= 5 ? 'bg-amber-50/20' : 'bg-white'}`} />
            ))}
          </div>
        )}

        {einsaetze.length === 0 && (
          <div className="border-t border-gray-50">
            <div className="grid grid-cols-7 divide-x divide-gray-50 min-h-32">
              {tage.map((tag, i) => (
                <div key={i} className={`p-2 ${i >= 5 ? 'bg-gray-50/40' : 'hover:bg-gray-50/60'} transition`} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {tage.map((tag, i) => {
          const istHeute = tag.toDateString() === heute.toDateString();
          const istWE = i >= 5;
          return (
            <div key={i} className={`rounded-xl border px-2 py-2 text-center ${istHeute ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white'}`}>
              <p className={`text-xs font-medium ${istWE ? 'text-gray-400' : istHeute ? 'text-blue-700' : 'text-gray-500'}`}>
                {WOCHENTAGE_LANG[i].slice(0, 2)}
              </p>
              <p className={`text-xs mt-0.5 ${istHeute ? 'text-blue-500' : 'text-gray-300'}`}>0</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-blue-700">
          Die vollständige Wochenplanung mit Drag & Drop, Mitarbeiter- und Fahrzeugzuweisung wird
          in einer kommenden Version verfügbar sein.
        </p>
      </div>

      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Einsatz planen</h2>
                <p className="text-xs text-gray-400 mt-0.5">Funktion wird bald verfügbar sein.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Die Einsatzplanung wird in einer kommenden Version vollständig implementiert.
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
