'use client';
import { useState } from 'react';

const STATUS_DEFINITIONEN = [
  {
    id:          'neu',
    reihenfolge: 1,
    label:       'Neu',
    beschreibung:'Auftrag wurde erstellt, aber noch nicht geplant.',
    bg:          'bg-blue-50',
    text:        'text-blue-700',
    dot:         'bg-blue-500',
    border:      'border-blue-100',
    ring:        'ring-blue-200',
    hex:         '#3B82F6',
    istStart:    true,
    istEnde:     false,
    istSonder:   false,
    aktiv:       true,
  },
  {
    id:          'geplant',
    reihenfolge: 2,
    label:       'Geplant',
    beschreibung:'Auftrag hat einen Termin, aber noch keine vollständige Zuweisung.',
    bg:          'bg-yellow-50',
    text:        'text-yellow-700',
    dot:         'bg-yellow-400',
    border:      'border-yellow-100',
    ring:        'ring-yellow-200',
    hex:         '#EAB308',
    istStart:    false,
    istEnde:     false,
    istSonder:   false,
    aktiv:       true,
  },
  {
    id:          'zugewiesen',
    reihenfolge: 3,
    label:       'Zugewiesen',
    beschreibung:'Mitarbeiter, Fahrzeug oder Gerät wurden zugewiesen.',
    bg:          'bg-teal-50',
    text:        'text-teal-700',
    dot:         'bg-teal-500',
    border:      'border-teal-100',
    ring:        'ring-teal-200',
    hex:         '#14B8A6',
    istStart:    false,
    istEnde:     false,
    istSonder:   false,
    aktiv:       true,
  },
  {
    id:          'unterwegs',
    reihenfolge: 4,
    label:       'Unterwegs',
    beschreibung:'Mitarbeiter ist auf dem Weg zum Einsatzort.',
    bg:          'bg-orange-50',
    text:        'text-orange-700',
    dot:         'bg-orange-400',
    border:      'border-orange-100',
    ring:        'ring-orange-200',
    hex:         '#F97316',
    istStart:    false,
    istEnde:     false,
    istSonder:   false,
    aktiv:       true,
  },
  {
    id:          'vor_ort',
    reihenfolge: 5,
    label:       'Vor Ort',
    beschreibung:'Mitarbeiter ist beim Kunden angekommen.',
    bg:          'bg-sky-50',
    text:        'text-sky-700',
    dot:         'bg-sky-400',
    border:      'border-sky-100',
    ring:        'ring-sky-200',
    hex:         '#0EA5E9',
    istStart:    false,
    istEnde:     false,
    istSonder:   false,
    aktiv:       true,
  },
  {
    id:          'in_arbeit',
    reihenfolge: 6,
    label:       'In Arbeit',
    beschreibung:'Der Einsatz wird aktuell durchgeführt.',
    bg:          'bg-amber-50',
    text:        'text-amber-800',
    dot:         'bg-amber-500',
    border:      'border-amber-100',
    ring:        'ring-amber-200',
    hex:         '#D97706',
    istStart:    false,
    istEnde:     false,
    istSonder:   false,
    aktiv:       true,
  },
  {
    id:          'wartend',
    reihenfolge: 7,
    label:       'Wartend',
    beschreibung:'Auftrag pausiert, z. B. wegen fehlendem Material, Rückfrage oder Folgetermin.',
    bg:          'bg-gray-100',
    text:        'text-gray-500',
    dot:         'bg-gray-400',
    border:      'border-gray-200',
    ring:        'ring-gray-300',
    hex:         '#9CA3AF',
    istStart:    false,
    istEnde:     false,
    istSonder:   false,
    aktiv:       true,
  },
  {
    id:          'abgeschlossen',
    reihenfolge: 8,
    label:       'Abgeschlossen',
    beschreibung:'Einsatz wurde erledigt und kann weiterverarbeitet werden.',
    bg:          'bg-green-50',
    text:        'text-green-700',
    dot:         'bg-green-500',
    border:      'border-green-100',
    ring:        'ring-green-200',
    hex:         '#22C55E',
    istStart:    false,
    istEnde:     true,
    istSonder:   false,
    aktiv:       true,
  },
  {
    id:          'storniert',
    reihenfolge: 9,
    label:       'Storniert',
    beschreibung:'Auftrag wurde abgebrochen oder gelöscht.',
    bg:          'bg-red-50',
    text:        'text-red-600',
    dot:         'bg-red-400',
    border:      'border-red-100',
    ring:        'ring-red-200',
    hex:         '#EF4444',
    istStart:    false,
    istEnde:     true,
    istSonder:   true,
    aktiv:       true,
  },
];

const AUTOMATISIERUNGEN = [
  {
    ausloeser:   'Auftrag erstellt',
    zielStatus:  'Neu',
    beschreibung:'Jeder neu angelegte Auftrag startet automatisch mit Status "Neu".',
    trigger:     'onAuftragCreate',
    aktiv:       false,
  },
  {
    ausloeser:   'Termin gesetzt',
    zielStatus:  'Geplant',
    beschreibung:'Sobald ein Einsatzdatum hinterlegt wird, wechselt der Status auf "Geplant".',
    trigger:     'onEinsatzdatumSet',
    aktiv:       false,
  },
  {
    ausloeser:   'Mitarbeiter / Fahrzeug zugewiesen',
    zielStatus:  'Zugewiesen',
    beschreibung:'Bei vollständiger Zuweisung wird der Status auf "Zugewiesen" gesetzt.',
    trigger:     'onZuweisungComplete',
    aktiv:       false,
  },
  {
    ausloeser:   'Mitarbeiter startet Fahrt',
    zielStatus:  'Unterwegs',
    beschreibung:'Wenn der Techniker in der App "Fahrt starten" klickt, wechselt der Status.',
    trigger:     'onFahrtStart',
    aktiv:       false,
  },
  {
    ausloeser:   'Mitarbeiter kommt an',
    zielStatus:  'Vor Ort',
    beschreibung:'GPS-Ankunftserkennung oder manuelle Bestätigung in der mobilen App.',
    trigger:     'onAnkunft',
    aktiv:       false,
  },
  {
    ausloeser:   'Mitarbeiter startet Arbeit',
    zielStatus:  'In Arbeit',
    beschreibung:'Wenn der Techniker in der App "Arbeit starten" bestätigt.',
    trigger:     'onArbeitStart',
    aktiv:       false,
  },
  {
    ausloeser:   'Einsatzbericht abgeschlossen',
    zielStatus:  'Abgeschlossen',
    beschreibung:'Nach Abschluss des Einsatzberichts und digitaler Kundenunterschrift.',
    trigger:     'onEinsatzberichtComplete',
    aktiv:       false,
  },
];

function Svg({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function StatusBadge({ s, sm = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border whitespace-nowrap
      ${sm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'}
      ${s.bg} ${s.text} ${s.border}`}>
      <span className={`rounded-full shrink-0 ${sm ? 'w-1 h-1' : 'w-1.5 h-1.5'} ${s.dot}`} />
      {s.label}
    </span>
  );
}

function Chip({ label, color = 'gray' }) {
  const map = {
    gray:   'bg-gray-100 text-gray-500',
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${map[color] ?? map.gray}`}>
      {label}
    </span>
  );
}

export default function Auftragsstatus() {
  const [statusListe, setStatusListe] = useState(STATUS_DEFINITIONEN);

  const WORKFLOW_STATUS = statusListe.filter(s => !s.istSonder).sort((a, b) => a.reihenfolge - b.reihenfolge);
  const SONDER_STATUS   = statusListe.filter(s => s.istSonder);

  function toggleAktiv(id) {
    setStatusListe(prev =>
      prev.map(s => s.id === id ? { ...s, aktiv: !s.aktiv } : s)
    );
  }

  function reihenfolgeHoch(id) {
    setStatusListe(prev => {
      const liste = [...prev].sort((a, b) => a.reihenfolge - b.reihenfolge);
      const idx   = liste.findIndex(s => s.id === id);
      if (idx <= 0) return prev;
      const result = [...liste];
      const rA = result[idx - 1].reihenfolge;
      const rB = result[idx].reihenfolge;
      result[idx - 1] = { ...result[idx - 1], reihenfolge: rB };
      result[idx]     = { ...result[idx],     reihenfolge: rA };
      return result;
    });
  }

  function reihenfolgeRunter(id) {
    setStatusListe(prev => {
      const liste = [...prev].sort((a, b) => a.reihenfolge - b.reihenfolge);
      const idx   = liste.findIndex(s => s.id === id);
      if (idx >= liste.length - 1) return prev;
      const result = [...liste];
      const rA = result[idx].reihenfolge;
      const rB = result[idx + 1].reihenfolge;
      result[idx]     = { ...result[idx],     reihenfolge: rB };
      result[idx + 1] = { ...result[idx + 1], reihenfolge: rA };
      return result;
    });
  }

  const sortiert = [...statusListe].sort((a, b) => a.reihenfolge - b.reihenfolge);

  return (
    <div className="space-y-8">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Auftragsstatus</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Verwalte die Status, die ein Auftrag während seines gesamten Arbeitsablaufs durchläuft.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            {statusListe.filter(s => s.aktiv).length} aktive Status
          </span>
        </div>
      </div>

      {/* Bereich 2 – Workflow */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-900">Workflow-Übersicht</p>
          <p className="text-xs text-gray-400 mt-0.5">Standardablauf eines Auftrags von Erstellung bis Abschluss</p>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-center gap-0 flex-wrap">
            {WORKFLOW_STATUS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className={`relative w-9 h-9 rounded-full flex items-center justify-center ring-2 ${s.aktiv ? s.ring : 'ring-gray-200'} ${s.aktiv ? s.bg : 'bg-gray-50'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.aktiv ? s.dot : 'bg-gray-300'}`} />
                    {s.istStart && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                        <Svg d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" cls="w-1.5 h-1.5 text-white" />
                      </span>
                    )}
                    {s.istEnde && !s.istSonder && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full flex items-center justify-center">
                        <Svg d="M4.5 12.75l6 6 9-13.5" cls="w-1.5 h-1.5 text-white" />
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${s.aktiv ? s.text : 'text-gray-300'}`}>
                    {s.label}
                  </span>
                </div>
                {i < WORKFLOW_STATUS.length - 1 && (
                  <div className="flex items-center mx-2 mt-[-18px]">
                    <div className="w-6 h-px bg-gray-200" />
                    <Svg d="M8.25 4.5l7.5 7.5-7.5 7.5" cls="w-3 h-3 text-gray-300 -ml-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 pt-5 border-t border-gray-50">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-400 shrink-0">Sonderstatus:</span>
              {SONDER_STATUS.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ring-2 ${s.ring} ${s.bg}`}>
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  </div>
                  <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
                  <span className="text-xs text-gray-400">— kann von jedem aktiven Status aus gesetzt werden</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bereich 1 – Statusübersicht */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Statusübersicht</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {statusListe.length} Status definiert · {statusListe.filter(s => s.aktiv).length} aktiv
            </p>
          </div>
          <button disabled
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-300 cursor-not-allowed">
            <Svg d="M12 4.5v15m7.5-7.5h-15" cls="w-3.5 h-3.5" />
            Status hinzufügen
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {['#', 'Status', 'Beschreibung', 'Typ', 'Aktiv', 'Aktionen'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortiert.map((s, idx) => (
                <tr key={s.id} className={`group transition ${!s.aktiv ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-300 font-mono w-4">{s.reihenfolge}</span>
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => reihenfolgeHoch(s.id)} disabled={idx === 0}
                          className="w-4 h-3 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed">
                          <Svg d="M4.5 15.75l7.5-7.5 7.5 7.5" cls="w-2.5 h-2.5 text-gray-400" />
                        </button>
                        <button onClick={() => reihenfolgeRunter(s.id)} disabled={idx === sortiert.length - 1}
                          className="w-4 h-3 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed">
                          <Svg d="M19.5 8.25l-7.5 7.5-7.5-7.5" cls="w-2.5 h-2.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <StatusBadge s={s} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs text-gray-500 max-w-sm leading-relaxed">{s.beschreibung}</p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {s.istStart && <Chip label="Startstatus" color="blue" />}
                      {s.istEnde && !s.istSonder && <Chip label="Endstatus" color="green" />}
                      {s.istSonder && <Chip label="Sonderstatus" color="red" />}
                      {!s.istStart && !s.istEnde && !s.istSonder && <Chip label="Standard" color="gray" />}
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <button
                      onClick={() => { if (s.istStart || s.istEnde) return; toggleAktiv(s.id); }}
                      disabled={s.istStart || s.istEnde}
                      title={s.istStart || s.istEnde ? 'Systemrelevanter Status — kann nicht deaktiviert werden.' : ''}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition
                        ${s.aktiv ? 'bg-blue-500' : 'bg-gray-200'}
                        ${s.istStart || s.istEnde ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition
                        ${s.aktiv ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                    </button>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button disabled title="Bearbeiten (folgt in Sprint 2)"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-gray-50 transition cursor-not-allowed">
                        <Svg d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" cls="w-3 h-3" />
                        Bearbeiten
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bereich 3 – Statusregeln */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-900">Statusregeln</p>
          <p className="text-xs text-gray-400 mt-0.5">Verbindliche Regeln für den Auftragsworkflow in KanalPro</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z', titel: 'Standardstatus dürfen nicht gelöscht werden', text: 'Die 9 definierten Status sind systemrelevant und können nicht entfernt werden. Sie bilden die Grundlage des gesamten Auftragsworkflows.', typ: 'warnung' },
            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', titel: '"Neu" ist immer der Startstatus', text: 'Jeder neu erstellte Auftrag erhält automatisch den Status "Neu". Dieser Status kann nicht manuell übersprungen werden.', typ: 'info' },
            { icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', titel: '"Abgeschlossen" ist ein Endstatus', text: 'Aufträge mit Status "Abgeschlossen" können nicht mehr in einen früheren Status zurückversetzt werden. Sie können zur Rechnungsstellung weitergegeben werden.', typ: 'grün' },
            { icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', titel: '"Storniert" ist ein Sonder-Endstatus', text: 'Stornierte Aufträge sind nicht abgeschlossen, sondern abgebrochen. Sie können von jedem aktiven Status aus gesetzt werden.', typ: 'rot' },
            { icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5.25 0a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z', titel: 'Inaktive Status sind nicht mehr auswählbar', text: 'Wenn ein Status deaktiviert wird, kann er bei neuen Aufträgen nicht mehr ausgewählt werden. Bestehende Aufträge mit diesem Status bleiben unverändert.', typ: 'info' },
            { icon: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z', titel: 'Rollen & Rechte', text: 'Sichtbar: Geschäftsführer, Administrator, Büro, Disposition. Bearbeiten: Geschäftsführer, Administrator. Nicht sichtbar: Techniker / Monteur.', typ: 'grau' },
          ].map((r, i) => {
            const farben = { warnung: { bg: 'bg-yellow-50', icon: 'text-yellow-500' }, info: { bg: 'bg-blue-50', icon: 'text-blue-400' }, grün: { bg: 'bg-green-50', icon: 'text-green-500' }, rot: { bg: 'bg-red-50', icon: 'text-red-400' }, grau: { bg: 'bg-gray-50', icon: 'text-gray-400' } };
            const f = farben[r.typ] ?? farben.grau;
            return (
              <div key={i} className="px-6 py-4 flex items-start gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${f.bg}`}>
                  <Svg d={r.icon} cls={`w-4 h-4 ${f.icon}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.titel}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{r.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bereich 4 – Automatisierungen */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Automatische Statusänderungen</p>
            <p className="text-xs text-gray-400 mt-0.5">Architektur vorbereitet · Aktivierung erfolgt in Sprint 2</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            In Vorbereitung
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {AUTOMATISIERUNGEN.map((a, i) => {
            const s = STATUS_DEFINITIONEN.find(x => x.label === a.zielStatus);
            return (
              <div key={i} className="px-6 py-4 flex items-center gap-4 group">
                <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-xs text-gray-300 font-mono">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-gray-700">{a.ausloeser}</p>
                    <Svg d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" cls="w-3 h-3 text-gray-300" />
                    {s && <StatusBadge s={s} sm />}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{a.beschreibung}</p>
                </div>
                <code className="text-xs text-gray-200 font-mono hidden sm:block shrink-0">{a.trigger}()</code>
                <div className="relative inline-flex h-4 w-8 items-center rounded-full bg-gray-100 opacity-40 cursor-not-allowed shrink-0">
                  <span className="inline-block h-3 w-3 translate-x-[2px] rounded-full bg-white shadow" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 bg-gray-50/40 border-t border-gray-50">
          <p className="text-xs text-gray-400">
            Die Trigger-Funktionen sind im Code vorbereitet und werden in Sprint 2 mit der mobilen App und dem Backend verbunden.
            Keiner dieser Automatismen ist aktuell aktiv.
          </p>
        </div>
      </div>

    </div>
  );
}
