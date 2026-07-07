'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

// ─── Komponenten-Typen ────────────────────────────────────────────────────────
const TYP_CONFIG = {
  schacht:         { label: 'Schacht',         icon: '⬡', color: 'bg-gray-100 text-gray-700'    },
  leitung:         { label: 'Leitung',         icon: '━', color: 'bg-blue-50 text-blue-700'     },
  fallrohr:        { label: 'Fallrohr',        icon: '↓', color: 'bg-cyan-50 text-cyan-700'     },
  rueckstauklappe: { label: 'Rückstauklappe',  icon: '⊣', color: 'bg-orange-50 text-orange-700' },
  hebeanlage:      { label: 'Hebeanlage',      icon: '⬆', color: 'bg-purple-50 text-purple-700' },
  fettabscheider:  { label: 'Fettabscheider',  icon: '⊕', color: 'bg-yellow-50 text-yellow-700' },
};
const MATERIALIEN = ['PVC', 'Beton', 'Steinzeug', 'Guss', 'PP', 'GFK', 'Stahl', 'Sonstiges'];
const DURCHMESSER = [70, 100, 125, 150, 200, 250, 300, 400, 500, 600];

// ─── Ereignis-Typen ──────────────────────────────────────────────────────────
const EREIGNIS_CONFIG = {
  wurzeleinwuchs: { label: 'Wurzeleinwuchs',    dot: 'bg-orange-400', risikoGewicht: +35 },
  verstopfung:    { label: 'Verstopfung',       dot: 'bg-red-400',    risikoGewicht: +25 },
  riss:           { label: 'Riss / Schaden',    dot: 'bg-red-600',    risikoGewicht: +50 },
  kamera:         { label: 'Kamerabefahrung',   dot: 'bg-blue-400',   risikoGewicht:  -5 },
  reinigung:      { label: 'HD-Reinigung',      dot: 'bg-cyan-400',   risikoGewicht: -15 },
  inspektion:     { label: 'Inspektion',        dot: 'bg-green-400',  risikoGewicht:  -5 },
  sanierung:      { label: 'Sanierung/Inliner', dot: 'bg-emerald-500',risikoGewicht: -60 },
  sonstiges:      { label: 'Sonstiges',         dot: 'bg-gray-300',   risikoGewicht:   0 },
};

// ─── Risikoberechnung ────────────────────────────────────────────────────────
function berechneRisiko(ereignisse) {
  if (!ereignisse || ereignisse.length === 0) {
    return { stufe: 'unbekannt', label: 'Keine Daten', color: 'bg-gray-100 text-gray-500', score: 0 };
  }
  const aktuellesJahr = new Date().getFullYear();
  let score = 20; // Basisrisiko
  // Alter der Leitung einkalkulieren (älteste Ereignisse)
  const sorted = [...ereignisse].sort((a, b) => b.jahr - a.jahr);
  // Gewichtung: neuere Ereignisse zählen mehr
  sorted.forEach(e => {
    const alter = aktuellesJahr - e.jahr;
    const zerfall = Math.max(0.2, 1 - alter * 0.08); // Relevanzzerfall pro Jahr
    const gewicht = (EREIGNIS_CONFIG[e.ereignis_typ]?.risikoGewicht ?? 0) * zerfall;
    score += gewicht;
  });
  score = Math.max(0, Math.min(100, Math.round(score)));
  if (score <= 30) return { stufe: 'niedrig', label: 'Niedrig',   color: 'bg-green-100 text-green-700',  score };
  if (score <= 60) return { stufe: 'mittel',  label: 'Mittel',    color: 'bg-yellow-100 text-yellow-700', score };
  return               { stufe: 'hoch',   label: 'Hoch',     color: 'bg-red-100 text-red-700',     score };
}


// ─── KI-Schadensprognose ─────────────────────────────────────────────────────
function getEmpfehlung(typ) {
  const map = {
    verstopfung:    'HD-Reinigung oder Kamerabefahrung einplanen.',
    wurzeleinwuchs: 'Wurzelfräsung + Kamerainspektion empfohlen.',
    riss:           'Strukturelle Inspektion und ggf. Inliner-Sanierung prüfen.',
    allgemein:      'Routineinspektion einplanen.',
  };
  return map[typ] ?? map.allgemein;
}

function berechnePragnose(komponente, ereignisse) {
  if (!ereignisse || ereignisse.length === 0) return null;
  const aktuellesJahr = new Date().getFullYear();
  const alter = komponente.baujahr ? aktuellesJahr - komponente.baujahr : null;
  const material = komponente.material ?? '';
  const sorted = [...ereignisse].sort((a, b) => b.jahr - a.jahr);
  const letztes = sorted[0];
  const jahreSeitletztem = aktuellesJahr - letztes.jahr;
  const typCount = {};
  ereignisse.forEach(e => { typCount[e.ereignis_typ] = (typCount[e.ereignis_typ] || 0) + 1; });

  const materialMalus = ['Beton', 'Steinzeug', 'Guss'].includes(material) ? 12 : 0;
  const materialBonus = ['PVC', 'PP', 'GFK'].includes(material) ? -8 : 0;
  const alterMalus = alter === null ? 0 : alter > 30 ? 18 : alter > 20 ? 10 : alter > 10 ? 4 : 0;
  const zeitMalus  = jahreSeitletztem > 3 ? 12 : jahreSeitletztem > 1 ? 5 : 0;

  let w, monate, typ, label;

  if (['verstopfung', 'reinigung'].includes(letztes.ereignis_typ)) {
    const n = (typCount.verstopfung || 0) + (typCount.reinigung || 0);
    w = 38 + n * 11 + materialMalus + materialBonus + alterMalus + zeitMalus;
    monate = Math.max(3, 30 - n * 4 - (alter > 25 ? 4 : 0) - zeitMalus);
    typ = 'verstopfung'; label = 'Verstopfung';
  } else if (letztes.ereignis_typ === 'wurzeleinwuchs') {
    const n = typCount.wurzeleinwuchs || 0;
    w = 50 + n * 10 + (materialMalus > 0 ? 14 : 0) + alterMalus + zeitMalus;
    monate = Math.max(6, 22 - n * 3 - (alter > 25 ? 3 : 0));
    typ = 'wurzeleinwuchs'; label = 'Wurzeleinwuchs';
  } else if (letztes.ereignis_typ === 'riss') {
    const n = typCount.riss || 0;
    w = 48 + n * 14 + materialMalus + alterMalus + zeitMalus;
    monate = Math.max(6, 18 - n * 2 - (alter > 30 ? 4 : 0));
    typ = 'riss'; label = 'weitere Rissbildung';
  } else if (letztes.ereignis_typ === 'sanierung') {
    if (jahreSeitletztem < 5) {
      return { positiv: true, label: 'Kein signifikantes Risiko erwartet',
               sub: `Sanierung vor ${jahreSeitletztem < 1 ? 'weniger als 1' : jahreSeitletztem} Jahr(en) — Anlage in gutem Zustand.` };
    }
    w = 22 + jahreSeitletztem * 4 + alterMalus;
    monate = Math.max(12, 54 - jahreSeitletztem * 4);
    typ = 'verstopfung'; label = 'Ablagerungen / Verstopfung';
  } else if (['kamera', 'inspektion'].includes(letztes.ereignis_typ)) {
    if (!alter || alter < 12) return null;
    w = 28 + alterMalus + materialMalus + zeitMalus;
    monate = Math.max(12, 48 - alterMalus);
    typ = alter > 25 && materialMalus > 0 ? 'riss' : 'verstopfung';
    label = typ === 'riss' ? 'strukturelle Schäden' : 'Ablagerungen';

  } else {
    return null;
  }

  w = Math.min(95, Math.max(15, Math.round(w)));
  return { positiv: false, wahrscheinlichkeit: w, monate, typ, label,
           empfehlung: getEmpfehlung(typ) };
}


// ─── Hauptkomponente ─────────────────────────────────────────────────────────
export default function ObjektDetail() {
  const { id, oid } = useParams();
  const router = useRouter();

  const [objekt, setObjekt] = useState(null);
  const [kunde, setKunde] = useState(null);
  const [infrastruktur, setInfrastruktur] = useState({});
  const [ereignisse, setEreignisse] = useState({}); // { komponente_id: [...] }
  const [auftraege, setAuftraege] = useState([]);
  const [laden, setLaden] = useState(true);

  // Neue Komponente
  const [neueKomp, setNeueKomp] = useState({
    typ: 'schacht', bezeichnung: '', material: '', durchmesser_mm: '', baujahr: '', notizen: '',
  });
  const [kompFormOffen, setKompFormOffen] = useState(false);
  const [kompSpeichern, setKompSpeichern] = useState(false);

  // Lebenslauf: welche Komponente ist aufgeklappt
  const [aufgeklappt, setAufgeklappt] = useState({}); // { kompId: bool }

  // Neues Ereignis
  const [neuesEreignis, setNeuesEreignis] = useState({}); // { kompId: { jahr, typ, beschreibung } }
  const [ereignisFormOffen, setEreignisFormOffen] = useState({}); // { kompId: bool }
  const [ereignisSpeichern, setEreignisSpeichern] = useState(false);

  const ladeEreignisse = useCallback(async (kompIds) => {
    if (!kompIds.length) return;
    const { data } = await supabase
      .from('rohr_ereignisse')
      .select('*')
      .in('komponente_id', kompIds)
      .order('jahr', { ascending: true });
    const grouped = {};
    (data ?? []).forEach(e => {
      if (!grouped[e.komponente_id]) grouped[e.komponente_id] = [];
      grouped[e.komponente_id].push(e);
    });
    setEreignisse(grouped);
  }, []);

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: k }, { data: inf }, { data: a }] = await Promise.all([
        supabase.from('objekte').select('*').eq('id', oid).single(),
        supabase.from('kunden').select('id, name, firmenname').eq('id', id).single(),
        supabase.from('infrastruktur').select('*').eq('objekt_id', oid).order('typ').order('bezeichnung'),
        supabase.from('auftraege').select('*').eq('objekt_id', oid).order('datum', { ascending: false, nullsFirst: false }),
      ]);
      if (!o) { router.push(`/dashboard/kunden/${id}`); return; }
      setObjekt(o);
      setKunde(k);
      setAuftraege(a ?? []);
      // Gruppiere Infrastruktur nach Typ
      const grouped = {};
      (inf ?? []).forEach(i => {
        if (!grouped[i.typ]) grouped[i.typ] = [];
        grouped[i.typ].push(i);
      });
      setInfrastruktur(grouped);
      // Lade Ereignisse
      const ids = (inf ?? []).map(i => i.id);
      await ladeEreignisse(ids);
      setLaden(false);
    }
    load();
  }, [id, oid, router, ladeEreignisse]);

  async function addKomponente() {
    if (!neueKomp.bezeichnung.trim()) return;
    setKompSpeichern(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('infrastruktur').insert({
      typ: neueKomp.typ,
      bezeichnung: neueKomp.bezeichnung,
      material: neueKomp.material || null,
      durchmesser_mm: ['leitung', 'fallrohr', 'rueckstauklappe'].includes(neueKomp.typ) && neueKomp.durchmesser_mm
        ? parseInt(neueKomp.durchmesser_mm) : null,
      baujahr: neueKomp.baujahr ? parseInt(neueKomp.baujahr) : null,
      notizen: neueKomp.notizen || null,
      objekt_id: oid,
      user_id: user.id,
    }).select().single();
    if (data) {
      setInfrastruktur(prev => {
        const next = { ...prev };
        if (!next[data.typ]) next[data.typ] = [];
        next[data.typ] = [...next[data.typ], data];
        return next;
      });
      setNeueKomp({ typ: 'schacht', bezeichnung: '', material: '', durchmesser_mm: '', baujahr: '', notizen: '' });
      setKompFormOffen(false);
    }
    setKompSpeichern(false);
  }

  async function deleteKomponente(typ, kid) {
    await supabase.from('infrastruktur').delete().eq('id', kid);
    setInfrastruktur(prev => ({
      ...prev,
      [typ]: prev[typ].filter(k => k.id !== kid),
    }));
  }

  async function addEreignis(kompId) {
    const e = neuesEreignis[kompId];
    if (!e?.jahr || !e?.typ) return;
    setEreignisSpeichern(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('rohr_ereignisse').insert({
      komponente_id: kompId,
      objekt_id: oid,
      user_id: user.id,
      jahr: parseInt(e.jahr),
      ereignis_typ: e.typ,
      beschreibung: e.beschreibung || null,
    }).select().single();
    if (data) {
      setEreignisse(prev => {
        const list = [...(prev[kompId] ?? []), data].sort((a, b) => a.jahr - b.jahr);
        return { ...prev, [kompId]: list };
      });
      setNeuesEreignis(prev => ({ ...prev, [kompId]: { jahr: '', typ: 'kamera', beschreibung: '' } }));
      setEreignisFormOffen(prev => ({ ...prev, [kompId]: false }));
    }
    setEreignisSpeichern(false);
  }

  async function deleteEreignis(kompId, eid) {
    await supabase.from('rohr_ereignisse').delete().eq('id', eid);
    setEreignisse(prev => ({
      ...prev,
      [kompId]: prev[kompId].filter(e => e.id !== eid),
    }));
  }

  if (laden) return <div className="text-gray-400 mt-8">Wird geladen...</div>;

  const anzeigeKunde = kunde?.firmenname || kunde?.name || '—';

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/dashboard/kunden" className="hover:text-gray-600">Kunden</Link>
        <span>›</span>
        <Link href={`/dashboard/kunden/${id}`} className="hover:text-gray-600">{anzeigeKunde}</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{objekt.bezeichnung}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{objekt.bezeichnung}</h1>
          {objekt.adresse && <p className="text-gray-500 text-sm mt-1">{objekt.adresse}</p>}
        </div>
        <Link href={`/dashboard/auftraege/erstellen`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
          + Einsatz erfassen
        </Link>
      </div>

      {/* ── Komponenten-Baum ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Komponenten & Rohr-Lebenslauf
        </h2>
        <div className="space-y-2">
          {Object.keys(TYP_CONFIG).map(typ => {
            const komps = infrastruktur[typ] ?? [];
            if (komps.length === 0) return null;
            const cfg = TYP_CONFIG[typ];
            return (
              <div key={typ}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                  {cfg.icon} {cfg.label}
                </p>
                <div className="space-y-2">
                  {komps.map(k => {
                    const kEreignisse = ereignisse[k.id] ?? [];
                    const risiko = berechneRisiko(kEreignisse);
                    const istOffen = aufgeklappt[k.id] ?? false;
                    const ereignisForm = neuesEreignis[k.id] ?? { jahr: new Date().getFullYear(), typ: 'kamera', beschreibung: '' };
                    const formOffen = ereignisFormOffen[k.id] ?? false;
                    return (
                      <div key={k.id} className={`rounded-xl border transition ${istOffen ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
                        {/* Komponenten-Header */}
                        <div className="flex items-center gap-3 p-3 group">
                          <button
                            onClick={() => setAufgeklappt(prev => ({ ...prev, [k.id]: !istOffen }))}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          >
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{k.bezeichnung}</p>
                              <p className="text-xs text-gray-400">
                                {[k.material, k.durchmesser_mm ? `DN${k.durchmesser_mm}` : null, k.baujahr ? `Bj. ${k.baujahr}` : null]
                                  .filter(Boolean).join(' · ') || 'Keine weiteren Angaben'}
                              </p>
                            </div>
                            {/* Risiko-Badge */}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${risiko.color}`}>
                              {risiko.stufe === 'unbekannt' ? '— Kein Verlauf' : `${risiko.label} (${risiko.score})`}
                            </span>
                            <span className="text-gray-400 text-xs">{istOffen ? '▲' : '▼'}</span>
                          </button>
                          <button onClick={() => deleteKomponente(typ, k.id)}
                            className="text-gray-200 hover:text-red-400 transition text-xs px-1.5 py-1 rounded opacity-0 group-hover:opacity-100">
                            ×
                          </button>
                        </div>

                        {/* ── Lebenslauf-Panel ─── */}
                        {istOffen && (
                          <div className="border-t border-blue-100 px-4 pb-4 pt-3">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Rohr-Lebenslauf ({kEreignisse.length} Einträge)
                              </p>
                              {!formOffen && (
                                <button
                                  onClick={() => setEreignisFormOffen(prev => ({ ...prev, [k.id]: true }))}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                  + Ereignis hinzufügen
                                </button>
                              )}
                            </div>

                            {/* Timeline */}
                            {kEreignisse.length === 0 && !formOffen && (
                              <p className="text-xs text-gray-400 italic">Noch keine Einträge — füge das erste Ereignis hinzu.</p>
                            )}
                            {kEreignisse.length > 0 && (
                              <div className="space-y-1 mb-3">
                                {kEreignisse.map((e, i) => {
                                  const ecfg = EREIGNIS_CONFIG[e.ereignis_typ] ?? EREIGNIS_CONFIG.sonstiges;
                                  const isLast = i === kEreignisse.length - 1;
                                  return (
                                    <div key={e.id} className="flex items-start gap-3 group/ev">
                                      {/* Zeitleiste */}
                                      <div className="flex flex-col items-center pt-0.5">
                                        <div className={`w-3 h-3 rounded-full border-2 border-white ${ecfg.dot ?? 'bg-gray-300'}`} />
                                        {!isLast && <div className="w-0.5 h-4 bg-gray-200 mt-0.5" />}
                                      </div>
                                      <div className="flex-1 min-w-0 pb-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold text-gray-700">{e.jahr}</span>
                                          <span className="text-sm text-gray-600">{ecfg.label}</span>
                                          {e.beschreibung && (
                                            <span className="text-xs text-gray-400 truncate">— {e.beschreibung}</span>
                                          )}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => deleteEreignis(k.id, e.id)}
                                        className="text-gray-200 hover:text-red-400 transition text-xs opacity-0 group-hover/ev:opacity-100 pt-0.5 shrink-0">
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Ereignis-Formular */}
                            {formOffen && (
                              <div className="bg-white rounded-lg border border-blue-200 p-3 mt-2 space-y-2">
                                <p className="text-xs font-medium text-gray-600">Neues Ereignis</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <input
                                    type="number" placeholder="Jahr" min="1900" max="2100"
                                    value={ereignisForm.jahr}
                                    onChange={e => setNeuesEreignis(prev => ({ ...prev, [k.id]: { ...ereignisForm, jahr: e.target.value } }))}
                                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <select
                                    value={ereignisForm.typ}
                                    onChange={e => setNeuesEreignis(prev => ({ ...prev, [k.id]: { ...ereignisForm, typ: e.target.value } }))}
                                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {Object.entries(EREIGNIS_CONFIG).map(([v, c]) => (
                                      <option key={v} value={v}>{c.icon} {c.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <input
                                  type="text" placeholder="Notiz (optional)"
                                  value={ereignisForm.beschreibung}
                                  onChange={e => setNeuesEreignis(prev => ({ ...prev, [k.id]: { ...ereignisForm, beschreibung: e.target.value } }))}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => addEreignis(k.id)} disabled={ereignisSpeichern}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                                    Speichern
                                  </button>
                                  <button onClick={() => setEreignisFormOffen(prev => ({ ...prev, [k.id]: false }))}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition">
                                    Abbrechen
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Risiko-Erklärung */}
                            {kEreignisse.length > 0 && (
                              <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${risiko.color} flex items-center gap-2`}>
                                <span className="font-semibold">Risikoeinschätzung:</span>
                                <span>{risiko.label} (Score {risiko.score}/100)</span>
                                {risiko.stufe === 'hoch' && <span>— Dringende Prüfung empfohlen</span>}
                                {risiko.stufe === 'mittel' && <span>— Beobachten</span>}
                                {risiko.stufe === 'niedrig' && <span>— Alles im grünen Bereich</span>}
                              </div>
                            )}                            {/* KI-Prognose */}
                            {(() => {
                              const prognose = berechnePragnose(k, kEreignisse);
                              if (!prognose) return null;
                              return (
                                <div className="mt-3 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-xs">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-indigo-700">KI-Prognose</span>
                                    <span className="text-indigo-400">auf Basis von Verlauf + Materialwerten</span>
                                  </div>
                                  {prognose.positiv ? (
                                    <p className="text-indigo-800 font-medium">{prognose.label}</p>
                                  ) : (
                                    <>
                                      <p className="text-indigo-800 font-medium">
                                        {prognose.wahrscheinlichkeit}% Wahrscheinlichkeit: {prognose.label}
                                        {' '}innerhalb der nächsten {prognose.monate} Monate
                                      </p>
                                      <p className="text-indigo-600 mt-0.5">{prognose.empfehlung}</p>
                                    </>
                                  )}
                                </div>
                              );
                            })()}

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {Object.keys(infrastruktur).length === 0 && !kompFormOffen && (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-400">
              
              <p className="font-medium text-sm">Noch keine Komponenten erfasst</p>
              <p className="text-xs mt-1">Füge Schächte, Leitungen und mehr hinzu</p>
            </div>
          )}

          {/* Neue Komponente */}
          {kompFormOffen ? (
            <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Neue Komponente</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Typ</label>
                  <select value={neueKomp.typ}
                    onChange={e => setNeueKomp(p => ({ ...p, typ: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(TYP_CONFIG).map(([v, c]) => (
                      <option key={v} value={v}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bezeichnung *</label>
                  <input type="text" value={neueKomp.bezeichnung}
                    onChange={e => setNeueKomp(p => ({ ...p, bezeichnung: e.target.value }))}
                    placeholder="z. B. Schacht A"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Material</label>
                  <select value={neueKomp.material}
                    onChange={e => setNeueKomp(p => ({ ...p, material: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— wählen —</option>
                    {MATERIALIEN.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {['leitung', 'fallrohr', 'rueckstauklappe'].includes(neueKomp.typ) && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Rohrdurchmesser (DN)</label>
                    <select value={neueKomp.durchmesser_mm}
                      onChange={e => setNeueKomp(p => ({ ...p, durchmesser_mm: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— wählen —</option>
                      {DURCHMESSER.map(d => <option key={d} value={d}>DN {d}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Baujahr</label>
                  <input type="number" value={neueKomp.baujahr} placeholder="z. B. 1985"
                    onChange={e => setNeueKomp(p => ({ ...p, baujahr: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Notizen</label>
                  <input type="text" value={neueKomp.notizen}
                    onChange={e => setNeueKomp(p => ({ ...p, notizen: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addKomponente} disabled={kompSpeichern}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                  Hinzufügen
                </button>
                <button onClick={() => { setKompFormOffen(false); setNeueKomp({ typ: 'schacht', bezeichnung: '', material: '', durchmesser_mm: '', baujahr: '', notizen: '' }); }}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setKompFormOffen(true)}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-600 transition">
              + Komponente hinzufügen
            </button>
          )}
        </div>
      </div>

      {/* ── Einsätze ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Einsätze an diesem Objekt ({auftraege.length})
        </h2>
        {auftraege.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400">
            <p className="text-sm font-medium">Noch keine Einsätze</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Auftrag</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Datum</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auftraege.map(a => (
                  <tr key={a.id} onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                    className="hover:bg-gray-50 cursor-pointer transition">
                    <td className="px-5 py-3 font-medium text-gray-900">{a.titel}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        a.status === 'abgeschlossen' ? 'bg-green-50 text-green-700' :
                        a.status === 'in_bearbeitung' ? 'bg-blue-50 text-blue-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>
                        {a.status === 'abgeschlossen' ? 'Abgeschlossen' :
                         a.status === 'in_bearbeitung' ? 'In Bearbeitung' : 'Offen'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
