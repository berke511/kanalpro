'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const statusConfig = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-50 text-yellow-700' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-50 text-blue-700'    },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-50 text-green-700'  },
};

export default function KundeDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [form, setForm] = useState({
    name: '', telefon: '', email: '', adresse: '', notizen: '',
    kundentyp: 'privat', firmenname: '',
    rechnungsadresse_abweichend: false,
    rechnung_strasse: '', rechnung_plz: '', rechnung_ort: '',
    ist_vertragskunde: false, ist_wartungskunde: false,
  });
  const [auftraege, setAuftraege] = useState([]);
  const [objekte, setObjekte] = useState([]);
  const [neuesObjekt, setNeuesObjekt] = useState({ bezeichnung: '', adresse: '' });
  const [objektHinzufuegen, setObjektHinzufuegen] = useState(false);
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const [loeschenBestaetigt, setLoeschenBestaetigt] = useState(false);
  const [fehler, setFehler] = useState('');
  const [erfolg, setErfolg] = useState(false);
  const [tab, setTab] = useState('stammdaten');

  useEffect(() => {
    async function load() {
      const { data: k} = await supabase.from('kunden').select('*').eq('id', id).single();
      if (!k) { router.push('/dashboard/kunden'); return; }
      setForm({
        name: k.name ?? '',
        telefon: k.telefon ?? '',
        email: k.email ?? '',
        adresse: k.adresse ?? '',
        notizen: k.notizen ?? '',
        kundentyp: k.kundentyp ?? 'privat',
        firmenname: k.firmenname ?? '',
        rechnungsadresse_abweichend: k.rechnungsadresse_abweichend ?? false,
        rechnung_strasse: k.rechnung_strasse ?? '',
        rechnung_plz: k.rechnung_plz ?? '',
        rechnung_ort: k.rechnung_ort ?? '',
        ist_vertragskunde: k.ist_vertragskunde ?? false,
        ist_wartungskunde: k.ist_wartungskunde ?? false,
      });
      const { data: a } = await supabase
        .from('auftraege').select('*').eq('kunde_id', id)
        .order('datum', { ascending: false, nullsFirst: false });
      setAuftraege(a ?? []);
      const { data: o } = await supabase
        .from('objekte').select('*').eq('kunde_id', id).order('erstellt_am');
      setObjekte(o ?? []);
      setLaden(false);
    }
    load();
  }, [id, router]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSpeichern(true);
    setFehler('');
    const { error } = await supabase.from('kunden').update({
      name: form.name,
      telefon: form.telefon || null,
      email: form.email || null,
      adresse: form.adresse || null,
      notizen: form.notizen || null,
      kundentyp: form.kundentyp,
      firmenname: form.kundentyp === 'firma' ? (form.firmenname || null) : null,
      rechnungsadresse_abweichend: form.rechnungsadresse_abweichend,
      rechnung_strasse: form.rechnungsadresse_abweichend ? (form.rechnung_strasse || null) : null,
      rechnung_plz: form.rechnungsadresse_abweichend ? (form.rechnung_plz || null) : null,
      rechnung_ort: form.rechnungsadresse_abweichend ? (form.rechnung_ort || null) : null,
      ist_vertragskunde: form.ist_vertragskunde,
      ist_wartungskunde: form.ist_wartungskunde,
    }).eq('id', id);
    if (error) setFehler('Fehler beim Speichern.');
    else { setErfolg(true); setTimeout(() => setErfolg(false), 3000); }
    setSpeichern(false);
  }

  async function handleDelete() {
    if (!loeschenBestaetigt) { setLoeschenBestaetigt(true); return; }
    await supabase.from('kunden').delete().eq('id', id);
    router.push('/dashboard/kunden');
  }

  async function addObjekt() {
    if (!neuesObjekt.bezeichnung.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('objekte').insert({
      bezeichnung: neuesObjekt.bezeichnung,
      adresse: neuesObjekt.adresse || null,
      kunde_id: id,
      user_id: user.id,
    }).select().single();
    if (data) {
      setObjekte(prev => [...prev, data]);
      setNeuesObjekt({ bezeichnung: '', adresse: '' });
      setObjektHinzufuegen(false);
    }
  }

  async function deleteObjekt(oid) {
    await supabase.from('objekte').delete().eq('id', oid);
    setObjekte(prev => prev.filter(o => o.id !== oid));
  }

  if (laden) return <div className="text-gray-400 mt-8">Wird geladen...</div>;

  const anzeigeName = form.kundentyp === 'firma' && form.firmenname ? form.firmenname : form.name;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/kunden" className="text-gray-400 hover:text-gray-600 text-sm">← Zurück</Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{anzeigeName}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.kundentyp === 'firma' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-600'}`}>
              {form.kundentyp === 'firma' ? '🏢 Firma' : '👤 Privat'}
            </span>
            {form.ist_vertragskunde && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">📄 Vertrag</span>}
            {form.ist_wartungskunde && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700">🔧 Wartung</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {/* TAB */}
        {[
          { key: 'stammdaten', label: '👤 Stammdaten' },
          { key: 'objekte',    label: `🏠 Objekte (${objekte.length})` },
          { key: 'historie',   label: `📋 Einsätze (${auftraege.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Stammdaten ── */}
      {tab === 'stammdaten' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <form onSubmit={handleSave} className="space-y-5">
            {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
            {erfolg && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">✓ Erfolgreich gespeichert</div>}

            {/* Kundentyp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kundentyp</label>
              <div className="flex gap-3">
                {[
                  { value: 'privat', label: '👤 Privatperson' },
                  { value: 'firma',  label: '🏢 Firmenkunde'  },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition ${
                    form.kundentyp === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="kundentyp" value={opt.value}
                      checked={form.kundentyp === opt.value} onChange={handleChange} className="hidden" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={form.kundentyp === 'firma' ? 'grid grid-cols-2 gap-4' : ''}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.kundentyp === 'firma' ? 'Ansprechpartner *' : 'Name ' + '*'}
                </label>
                <input type="text" name="name" required value={form.name} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {form.kundentyp === 'firma' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname</label>
                  <input type="text" name="firmenname" value={form.firmenname} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" name="telefon" value={form.telefon} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (Einsatzort)</label>
              <input type="text" name="adresse" value={form.adresse} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Rechnungsadresse */}
            <div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" name="rechnungsadresse_abweichend"
                  checked={form.rechnungsadresse_abweichend} onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">Rechnungsadresse weicht von Einsatzort ab</span>
              </label>
              {form.rechnungsadresse_abweichend && (
                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rechnungsadresse</p>
                  <input type="text" name="rechnung_strasse" value={form.rechnung_strasse} onChange={handleChange}
                    placeholder="Rechnungsstraße 5"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <div className="grid grid-cols-3 gap-3">
                    <input type="text" name="rechnung_plz" value={form.rechnung_plz} onChange={handleChange}
                      placeholder="40000"
                      className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    <input type="text" name="rechnung_ort" value={form.rechnung_ort} onChange={handleChange}
                      placeholder="Düsseldorf"
                      className="col-span-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Vertrags- / Wartungskunde */}
            <div className="flex gap-6 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" name="ist_vertragskunde"
                  checked={form.ist_vertragskunde} onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">📄 Vertragskunde</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" name="ist_wartungskunde"
                  checked={form.ist_wartungskunde} onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">🔧 Wartungskunde</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea name="notizen" value={form.notizen} onChange={handleChange} rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={speichern}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 text-sm">
                {speichern ? 'Wird gespeichert...' : 'Speichern'}
              </button>
              {!loeschen ? (
                <button type="button" onClick={() => setLoeschen(true)}
                  className="ml-auto px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition">
                  Löschen
                </button>
              ) : (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-red-600 font-medium">Wirklich löschen?</span>
                  <button type="button" onClick={handleDelete}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      loeschenBestaetigt ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}>
                    {loeschenBestaetigt ? 'Endgültig löschen' : 'Ja, löschen'}
                  </button>
                  <button type="button" onClick={() => { setLoeschen(false); setLoeschenBestaetigt(false); }}
                    className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition">
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Objekte ── */}
      {tab === 'objekte' && (
        <div className="space-y-3">
          {objekte.length === 0 && !objektHinzufuegen && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              <div className="text-3xl mb-2">🏠</div>
              <p className="font-medium">Keine Objekte erfasst</p>
              <p className="text-sm mt-1">Füge Immobilien oder Einsatzorte dieses Kunden hinzu.</p>
            </div>
          )}

          {objekte.map(o => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{o.bezeichnung}</p>
                {o.adresse && <p className="text-gray-400 text-xs mt-0.5">{o.adresse}</p>}
              </div>
              <button onClick={() => deleteObjekt(o.id)}
                className="text-gray-300 hover:text-red-500 transition text-xs px-2 py-1 rounded ml-4 shrink-0">
                ✕ Entfernen
              </button>
            </div>
          ))}

          {objektHinzufuegen ? (
            <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Neues Objekt hinzufügen</p>
              <input type="text" value={neuesObjekt.bezeichnung}
                onChange={e => setNeuesObjekt(p => ({ ...p, bezeichnung: e.target.value }))}
                placeholder="Bezeichnung (z. B. Einfamilienhaus Musterweg)"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" value={neuesObjekt.adresse}
                onChange={e => setNeuesObjekt(p => ({ ...p, adresse: e.target.value }))}
                placeholder="Adresse (optional)"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-2">
                <button onClick={addObjekt}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                  Hinzufügen
                </button>
                <button onClick={() => { setObjektHinzufuegen(false); setNeuesObjekt({ bezeichnung: '', adresse: '' }); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition">
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setObjektHinzufuegen(true)}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-600 transition">
              + Objekt hinzufügen
            </button>
          )}
        </div>
      )}

      {/* ── Historie ── */}
      {tab === 'historie' && (
        <div>
          {auftraege.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <p className="font-medium">Noch keine Einsätze für diesen Kunden</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 text-xs text-gray-400 font-medium">
                {auftraege.length} {auftraege.length === 1 ? 'Einsatz' : 'Einsätze'} gesamt
              </div>
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
                    const cfg = statusConfig[a.status] ?? statusConfig.offen;
                    return (
                      <tr key={a.id}
                        onClick={() => router.push('/dashboard/auftraege/' + a.id)}
                        className="hover:bg-gray-50 cursor-pointer transition">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">{a.titel}</p>
                          {a.adresse && <p className="text-xs text-gray-400 mt-0.5">{a.adresse}</p>}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={'px-2 py-1 rounded-md text-xs font-medium ' + cfg.cls}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
