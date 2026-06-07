'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const TYP_CONFIG = {
  schacht:         { label: 'Schacht',          icon: '⬡', color: 'bg-gray-100 text-gray-700'   },
  leitung:         { label: 'Leitung',          icon: '━', color: 'bg-blue-50 text-blue-700'    },
  fallrohr:        { label: 'Fallrohr',         icon: '↓', color: 'bg-cyan-50 text-cyan-700'    },
  rueckstauklappe: { label: 'Rückstauklappe',   icon: '⊣', color: 'bg-orange-50 text-orange-700'},
  hebeanlage:      { label: 'Hebeanlage',       icon: '⬆', color: 'bg-purple-50 text-purple-700'},
  fettabscheider:  { label: 'Fettabscheider',   icon: '⊕', color: 'bg-yellow-50 text-yellow-700'},
};

const TYPEN = Object.keys(TYP_CONFIG);
const MATERIALIEN = ['PVC', 'Beton', 'Steinzeug', 'Guss', 'PP', 'GFK', 'Stahl', 'Sonstiges'];
const DURCHMESSER = [70, 100, 125, 150, 200, 250, 300, 400, 500, 600];

const STATUS_CONFIG = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-50 text-yellow-700' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-50 text-blue-700'    },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-50 text-green-700'  },
};

const FORM_INIT = { typ: 'leitung', bezeichnung: '', material: '', durchmesser_mm: '', baujahr: '', notizen: '' };

export default function ObjektDetail() {
  const router   = useRouter();
  const params   = useParams();
  const kundeId  = params.id;
  const objektId = params.oid;

  const [objekt,     setObjekt]     = useState(null);
  const [kunde,      setKunde]      = useState(null);
  const [komp,       setKomp]       = useState([]);
  const [auftraege,  setAuftraege]  = useState([]);
  const [laden,      setLaden]      = useState(true);
  const [formOffen,  setFormOffen]  = useState(false);
  const [form,       setForm]       = useState(FORM_INIT);

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: k }, { data: ks }, { data: a }] = await Promise.all([
        supabase.from('objekte').select('*').eq('id', objektId).single(),
        supabase.from('kunden').select('id,name,firmenname,kundentyp').eq('id', kundeId).single(),
        supabase.from('infrastruktur').select('*').eq('objekt_id', objektId).order('typ').order('bezeichnung'),
        supabase.from('auftraege').select('*').eq('objekt_id', objektId)
          .order('datum', { ascending: false, nullsFirst: false }),
      ]);
      if (!o) { router.push('/dashboard/kunden/' + kundeId); return; }
      setObjekt(o);
      setKunde(k);
      setKomp(ks ?? []);
      setAuftraege(a ?? []);
      setLaden(false);
    }
    load();
  }, [objektId, kundeId, router]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function addKomponente() {
    if (!form.bezeichnung.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('infrastruktur').insert({
      typ:           form.typ,
      bezeichnung:   form.bezeichnung,
      material:      form.material       || null,
      durchmesser_mm:form.durchmesser_mm ? parseInt(form.durchmesser_mm) : null,
      baujahr:       form.baujahr        ? parseInt(form.baujahr)        : null,
      notizen:       form.notizen        || null,
      objekt_id:     objektId,
      user_id:       user.id,
    }).select().single();
    if (data) {
      setKomp(prev =>
        [...prev, data].sort((a, b) => a.typ.localeCompare(b.typ) || a.bezeichnung.localeCompare(b.bezeichnung))
      );
      setForm(FORM_INIT);
      setFormOffen(false);
    }
  }

  async function deleteKomponente(kid) {
    await supabase.from('infrastruktur').delete().eq('id', kid);
    setKomp(prev => prev.filter(k => k.id !== kid));
  }

  if (laden) return <div className="text-gray-400 mt-8">Wird geladen...</div>;

  const kundeName = kunde?.kundentyp === 'firma' && kunde?.firmenname ? kunde.firmenname : kunde?.name;

  // Typ-Gruppen aufbauen
  const grouped = TYPEN.reduce((acc, t) => {
    const items = komp.filter(k => k.typ === t);
    if (items.length) acc[t] = items;
    return acc;
  }, {});

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-400 flex-wrap">
        <Link href="/dashboard/kunden" className="hover:text-gray-600">Kunden</Link>
        <span>›</span>
        <Link href={`/dashboard/kunden/${kundeId}`} className="hover:text-gray-600">{kundeName}</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{objekt.bezeichnung}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏠 {objekt.bezeichnung}</h1>
          {objekt.adresse && <p className="text-gray-500 mt-1 text-sm">{objekt.adresse}</p>}
        </div>
        <div className="text-right text-xs text-gray-400 mt-1">
          <p>{komp.length} Komponenten</p>
          <p>{auftraege.length} Einsätze</p>
        </div>
      </div>

      {/* ── Digitaler Zwilling ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">🏗️ Digitaler Zwilling</h2>
          {!formOffen && (
            <button onClick={() => setFormOffen(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
              + Komponente
            </button>
          )}
        </div>

        {/* Leere-Ansicht */}
        {komp.length === 0 && !formOffen && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">🏗️</div>
            <p className="font-medium text-sm">Noch keine Komponenten erfasst</p>
            <p className="text-xs mt-1">Füge Schächte, Leitungen, Hebeanlagen u. v. m. hinzu.</p>
          </div>
        )}

        {/* Objekt-Baum */}
        {komp.length > 0 && (
          <div className="space-y-5 mb-4">
            {/* Übergeordneter Anker */}
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <span>📦</span>
              <span>{objekt.bezeichnung}</span>
            </div>

            {Object.entries(grouped).map(([typ, items]) => {
              const cfg = TYP_CONFIG[typ];
              return (
                <div key={typ} className="pl-5 border-l-2 border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {cfg.label} ({items.length})
                  </p>
                  <div className="space-y-1.5">
                    {items.map(k => (
                      <div key={k.id} className="flex items-start gap-3 pl-3 border-l-2 border-gray-100 group">
                        <div className="flex-1 py-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-sm font-medium text-gray-800">{k.bezeichnung}</span>
                          </div>
                          <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                            {k.material       && <span>Material: {k.material}</span>}
                            {k.durchmesser_mm && <span>DN {k.durchmesser_mm}</span>}
                            {k.baujahr        && <span>Bj. {k.baujahr}</span>}
                            {k.notizen        && <span className="italic">{k.notizen}</span>}
                          </div>
                        </div>
                        <button onClick={() => deleteKomponente(k.id)}
                          className="text-gray-200 hover:text-red-400 transition text-xs px-1 py-1 opacity-0 group-hover:opacity-100 shrink-0 mt-1">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Formular neue Komponente */}
        {formOffen && (
          <div className={`${komp.length > 0 ? 'mt-4 pt-4 border-t border-gray-100' : ''} space-y-3`}>
            <p className="text-sm font-medium text-gray-700">Neue Komponente</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Typ</label>
                <select name="typ" value={form.typ} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {TYPEN.map(t => (
                    <option key={t} value={t}>{TYP_CONFIG[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bezeichnung *</label>
                <input type="text" name="bezeichnung" value={form.bezeichnung} onChange={handleChange}
                  placeholder="z. B. Schacht A, Leitung DN100"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Material</label>
                <select name="material" value={form.material} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— optional —</option>
                  {MATERIALIEN.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {['leitung', 'fallrohr', 'rueckstauklappe'].includes(form.typ) && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Durchmesser (DN)</label>
                  <select name="durchmesser_mm" value={form.durchmesser_mm} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— optional —</option>
                    {DURCHMESSER.map(d => <option key={d} value={d}>DN {d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Baujahr</label>
                <input type="number" name="baujahr" value={form.baujahr} onChange={handleChange}
                  placeholder="z. B. 1985" min="1900" max="2030"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className={`${!['leitung','fallrohr','rueckstauklappe'].includes(form.typ) ? 'col-span-2' : ''}`}>
                <label className="block text-xs text-gray-500 mb-1">Notizen</label>
                <input type="text" name="notizen" value={form.notizen} onChange={handleChange}
                  placeholder="Weitere Infos..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addKomponente}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                Hinzufügen
              </button>
              <button onClick={() => { setFormOffen(false); setForm(FORM_INIT); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition">
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Einsätze an diesem Objekt ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">📋 Einsätze ({auftraege.length})</h2>
          <Link href={`/dashboard/auftraege/neu?objekt_id=${objektId}&kunde_id=${kundeId}`}
            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium">
            + Einsatz erfassen
          </Link>
        </div>
        {auftraege.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            Noch keine Einsätze für dieses Objekt erfasst
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Auftrag</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Datum</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auftraege.map(a => {
                const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.offen;
                return (
                  <tr key={a.id}
                    onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                    className="hover:bg-gray-50 cursor-pointer transition">
                    <td className="px-5 py-3 font-medium text-gray-900">{a.titel}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
