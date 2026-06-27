'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ─────────────────────────────────────────────────────────────
   Konfiguration
───────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  'Neu':           { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-100'  },
  'Geplant':       { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400', border: 'border-yellow-100' },
  'Zugewiesen':    { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-500',   border: 'border-teal-100'   },
  'Unterwegs':     { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400', border: 'border-orange-100' },
  'Vor Ort':       { bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-400',    border: 'border-sky-100'    },
  'In Arbeit':     { bg: 'bg-amber-50',  text: 'text-amber-800',  dot: 'bg-amber-600',  border: 'border-amber-100'  },
  'Wartend':       { bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400',   border: 'border-gray-200'   },
  'Abgeschlossen': { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-100'  },
  'Storniert':     { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400',    border: 'border-red-100'    },
};

const PRIO_CFG = {
  'Hoch':    { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100'    },
  'Mittel':  { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
  'Niedrig': { bg: 'bg-gray-50',   text: 'text-gray-400',   border: 'border-gray-200'   },
};

const STATUS_TABS = [
  'Alle', 'Neu', 'Geplant', 'Zugewiesen', 'Unterwegs',
  'Vor Ort', 'In Arbeit', 'Wartend', 'Abgeschlossen', 'Storniert',
];

const ROLLEN_ALLE_AUFTRAEGE = ['geschaeftsfuehrer', 'administrator', 'buero', 'disposition'];

function Svg({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG['Neu'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {status}
    </span>
  );
}

function PrioBadge({ prio }) {
  const c = PRIO_CFG[prio] ?? PRIO_CFG['Niedrig'];
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {prio}
    </span>
  );
}

function KpiCard({ label, wert, iconD, rot = false, laden = false }) {
  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 ${rot ? 'border-red-100' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rot ? 'bg-red-50' : 'bg-gray-50'}`}>
          <Svg d={iconD} cls={`w-4 h-4 ${rot ? 'text-red-400' : 'text-gray-400'}`} />
        </div>
      </div>
      {laden
        ? <div className="h-9 w-12 bg-gray-100 rounded-lg animate-pulse" />
        : <p className={`text-3xl font-bold ${rot ? 'text-red-600' : 'text-gray-900'}`}>{wert}</p>
      }
    </div>
  );
}

function IconBtn({ d, title, onClick, danger = false }) {
  return (
    <button title={title} onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition
        ${danger
          ? 'text-gray-300 hover:text-red-500 hover:bg-red-50'
          : 'text-gray-300 hover:text-gray-700 hover:bg-gray-100'}`}>
      <Svg d={d} cls="w-3.5 h-3.5" />
    </button>
  );
}

function SkeletonRows() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-gray-50">
          {[...Array(9)].map((_, j) => (
            <td key={j} className="px-4 py-4">
              <div className={`h-3 bg-gray-100 rounded animate-pulse ${j === 1 ? 'w-32' : j === 2 ? 'w-24' : 'w-16'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function kundenAnzeige(k) {
  if (!k) return '—';
  return k.kundentyp === 'firma' && k.firmenname ? k.firmenname : (k.name ?? '—');
}

function einsatzortAnzeige(a) {
  const teile = [a.einsatzort_strasse, a.einsatzort_plz && a.einsatzort_ort
    ? `${a.einsatzort_plz} ${a.einsatzort_ort}`
    : (a.einsatzort_ort ?? '')].filter(Boolean);
  return teile.join(', ') || '—';
}

function mitarbeiterAnzeige(m) {
  if (!m) return null;
  return { name: `${m.vorname ?? ''} ${m.nachname ?? ''}`.trim(), ini: `${m.vorname?.[0] ?? ''}${m.nachname?.[0] ?? ''}` };
}

export default function AuftraegeSeite() {
  const router = useRouter();

  const [auftraege,  setAuftraege]  = useState([]);
  const [ladeStatus, setLadeStatus] = useState('loading');
  const [aktiveTab,  setAktiveTab]  = useState('Alle');
  const [suche,      setSuche]      = useState('');

  useEffect(() => {
    async function laden() {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) { router.push('/login'); return; }

        const { data: member } = await supabase
          .from('company_members')
          .select('company_id, rolle')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!member) { setLadeStatus('error'); return; }

        let query = supabase
          .from('auftraege')
          .select(`
            id, nummer, typ, prioritaet, status,
            ansprechpartner, einsatzort_strasse, einsatzort_plz, einsatzort_ort,
            einsatzdatum, created_at,
            kunden:kunden_id(id, name, firmenname, kundentyp),
            mitarbeiter:mitarbeiter_id(id, vorname, nachname),
            fahrzeuge:fahrzeug_id(id, kennzeichen)
          `)
          .eq('company_id', member.company_id)
          .order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        setAuftraege(data ?? []);
        setLadeStatus('ready');
      } catch {
        setLadeStatus('error');
      }
    }
    laden();
  }, [router]);

  const neu = useCallback(() => router.push('/dashboard/auftraege/erstellen'), [router]);

  const heute        = new Date().toISOString().slice(0, 10);
  const ABGESCHL     = ['Abgeschlossen', 'Storniert'];
  const aktiv        = auftraege.filter(a => !ABGESCHL.includes(a.status)).length;
  const heuteAnz     = auftraege.filter(a => a.einsatzdatum === heute).length;
  const ueberfaellig = auftraege.filter(a => !ABGESCHL.includes(a.status) && a.einsatzdatum < heute).length;
  const abgeschlAnz  = auftraege.filter(a => a.status === 'Abgeschlossen').length;
  const laden        = ladeStatus === 'loading';

  const gefiltert = auftraege.filter(a => {
    const matchTab   = aktiveTab === 'Alle' || a.status === aktiveTab;
    const s          = suche.toLowerCase();
    const ort        = einsatzortAnzeige(a).toLowerCase();
    const kunde      = kundenAnzeige(a.kunden).toLowerCase();
    const apSp       = (a.ansprechpartner ?? '').toLowerCase();
    const nr         = (a.nummer ?? '').toLowerCase();
    const matchSuche = !suche || nr.includes(s) || kunde.includes(s) || ort.includes(s) || apSp.includes(s);
    return matchTab && matchSuche;
  });

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Aufträge</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Verwalte alle Aufträge, Einsätze und Arbeitsabläufe deines Unternehmens zentral an einem Ort.
          </p>
        </div>
        <button onClick={neu}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0">
          <Svg d="M12 4.5v15m7.5-7.5h-15" />
          Neuer Auftrag
        </button>
      </div>

      {ladeStatus === 'error' && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-700">Aufträge konnten nicht geladen werden. Bitte Seite neu laden.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard laden={laden} label="Aktive Aufträge" wert={aktiv}
          iconD="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        <KpiCard laden={laden} label="Heute geplant" wert={heuteAnz}
          iconD="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        <KpiCard laden={laden} label="Überfällig" wert={ueberfaellig} rot={ueberfaellig > 0}
          iconD="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        <KpiCard laden={laden} label="Abgeschlossen" wert={abgeschlAnz}
          iconD="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Svg d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607" cls="w-4 h-4 text-gray-400" />
          </div>
          <input type="text" value={suche} onChange={e => setSuche(e.target.value)}
            placeholder="Suche nach Auftragsnummer, Kunde, Einsatzort, Ansprechpartner …"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <button onClick={() => {}}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium hover:bg-gray-50 transition shrink-0">
          <Svg d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          Filter
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => {
          const anzahl = tab === 'Alle' ? auftraege.length : auftraege.filter(a => a.status === tab).length;
          return (
            <button key={tab} onClick={() => setAktiveTab(tab)}
              className={`whitespace-nowrap px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0
                ${aktiveTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
              {tab}
              {!laden && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs
                  ${aktiveTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {anzahl}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {!laden && gefiltert.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Svg
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                cls="w-7 h-7 text-gray-300"
              />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {suche || aktiveTab !== 'Alle' ? 'Keine Aufträge gefunden' : 'Noch keine Aufträge vorhanden'}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-sm">
              {suche || aktiveTab !== 'Alle'
                ? 'Versuche andere Suchbegriffe oder wähle einen anderen Filter.'
                : 'Erstelle jetzt deinen ersten Auftrag und beginne mit der digitalen Einsatzplanung.'}
            </p>
            {!suche && aktiveTab === 'Alle' && (
              <button onClick={neu}
                className="mt-6 flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                <Svg d="M12 4.5v15m7.5-7.5h-15" />
                Neuer Auftrag
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Auftragsnummer', 'Kunde', 'Einsatzort', 'Datum', 'Mitarbeiter', 'Fahrzeug', 'Priorität', 'Status', 'Aktionen'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {laden
                  ? <SkeletonRows />
                  : gefiltert.map(a => {
                      const isUeberfaellig = !['Abgeschlossen', 'Storniert'].includes(a.status) && a.einsatzdatum < heute;
                      const ma = mitarbeiterAnzeige(a.mitarbeiter);
                      const ort = einsatzortAnzeige(a);
                      const kname = kundenAnzeige(a.kunden);
                      const datum = a.einsatzdatum
                        ? a.einsatzdatum.split('-').reverse().join('.')
                        : '—';

                      return (
                        <tr key={a.id}
                          onClick={() => router.push(`/dashboard/auftraege/${a.id}`)}
                          className="hover:bg-gray-50/60 transition cursor-pointer group">

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-gray-900">{a.nummer ?? '—'}</span>
                          </td>

                          <td className="px-4 py-3.5">
                            <p className="font-medium text-gray-900 whitespace-nowrap">{kname}</p>
                            {a.ansprechpartner && (
                              <p className="text-xs text-gray-400 mt-0.5">{a.ansprechpartner}</p>
                            )}
                          </td>

                          <td className="px-4 py-3.5 max-w-[180px]">
                            <div className="flex items-start gap-1.5">
                              <Svg d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" cls="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
                              <span className="text-xs text-gray-600 leading-snug">{ort}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`text-xs font-medium ${isUeberfaellig ? 'text-red-500' : 'text-gray-600'}`}>
                              {datum}
                            </span>
                            {isUeberfaellig && (
                              <span className="block text-xs text-red-400 mt-0.5">überfällig</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {ma ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-semibold text-blue-600">{ma.ini}</span>
                                </div>
                                <span className="text-xs text-gray-600">{ma.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="text-xs text-gray-600">{a.fahrzeuge?.kennzeichen ?? '—'}</span>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <PrioBadge prio={a.prioritaet} />
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <StatusBadge status={a.status} />
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                              <IconBtn title="Öffnen"
                                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                onClick={() => router.push(`/dashboard/auftraege/${a.id}`)} />
                              <IconBtn title="Bearbeiten"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                onClick={() => router.push(`/dashboard/auftraege/${a.id}/bearbeiten`)} />
                              <IconBtn title="Duplizieren"
                                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                                onClick={() => {}} />
                              <IconBtn title="Abschließen"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                onClick={() => {}} />
                              <IconBtn title="Löschen" danger
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                onClick={() => {}} />
                            </div>
                          </td>

                        </tr>
                      );
                    })
                }
              </tbody>
            </table>

            {!laden && (
              <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {gefiltert.length === auftraege.length
                    ? `${auftraege.length} Auftrag${auftraege.length !== 1 ? 'e' : ''}`
                    : `${gefiltert.length} von ${auftraege.length} Aufträgen`}
                </span>
                {(suche || aktiveTab !== 'Alle') && (
                  <button onClick={() => { setSuche(''); setAktiveTab('Alle'); }}
                    className="text-xs text-blue-600 hover:underline font-medium">
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
