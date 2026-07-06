'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const STATUS_CONFIG = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-100 text-yellow-700' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700'    },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-100 text-green-700'  },
};

const PRIORITAET_CONFIG = {
  niedrig: { label: 'Niedrig', cls: 'bg-gray-100 text-gray-600'       },
  normal:  { label: 'Normal',  cls: 'bg-blue-100 text-blue-700'       },
  hoch:    { label: 'Hoch',    cls: 'bg-orange-100 text-orange-700'   },
  notfall: { label: 'Notfall', cls: 'bg-red-100 text-red-700'         },
};

export default function AuftragDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [auftrag, setAuftrag]     = useState(null);
  const [laden, setLaden]         = useState(true);
  const [editMode, setEditMode]   = useState(false);
  const [loeschen, setLoeschen]   = useState(false);
  const [speichern, setSpeichern] = useState(false);
  const [fehler, setFehler]       = useState('');

  const [kunden, setKunden]       = useState([]);
  const [objekte, setObjekte]     = useState([]);
  const [objLaden, setObjLaden]   = useState(false);

  const [form, setForm] = useState({
    titel: '', beschreibung: '', notizen: '', adresse: '',
    status: 'offen', datum: '', kunde_id: '', objekt_id: '',
    prioritaet: 'normal', dauer_minuten: '', uhrzeit: '', notdienst: false, interne_notiz: '',
  });

  // Auftrag laden
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('auftraege')
        .select('*, kunden(id, name, firmennamen), objekte(id, bezeichnung, adresse)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) { router.push('/dashboard/auftraege'); return; }
      setAuftrag(data);
      setForm({
        titel:         data.titel          ?? '',
        beschreibung:  data.beschreibung   ?? '',
        notizen:       data.notizen        ?? '',
        adresse:       data.adresse        ?? '',
        status:        data.status         ?? 'offen',
        datum:         data.datum          ?? '',
        kunde_id:      data.kunde_id       ?? '',
        objekt_id:     data.objekt_id      ?? '',
        prioritaet:    data.prioritaet     ?? 'normal',
        dauer_minuten: data.dauer_minuten  ?? '',
        uhrzeit:       data.uhrzeit        ?? '',
        notdienst:     data.notdienst      ?? false,
        interne_notiz: data.interne_notiz  ?? '',
      });

      // Kunden fÃ¼r Dropdown laden
      const { data: kundenData } = await supabase
        .from('kunden').select('id, name, firmennamen').eq('user_id', user.id).order('name');
      setKunden(kundenData ?? []);

      setLaden(false);
    }
    load();
  }, [id, router]);

  // Objekte nachladen wenn Kunde in Edit-Form wechselt
  useEffect(() => {
    if (!form.kunde_id) { setObjekte([]); return; }
    setObjLaden(true);
    supabase.from('objekte').select('id, bezeichnung, adresse')
      .eq('kunde_id', form.kunde_id).order('bezeichnung')
      .then(({ data }) => { setObjekte(data ?? []); setObjLaden(false); });
  }, [form.kunde_id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'kunde_id') next.objekt_id = '';
      return next;
    });
  }

  function handleNotdienstToggle() {
    const v = !form.notdienst;
    setForm(prev => ({
      ...prev,
      notdienst: v,
      prioritaet: v ? 'notfall' : 'normal',
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setFehler(''); setSpeichern(true);
    const { error } = await supabase.from('auftraege').update({
      titel:         form.titel,
      beschreibung:  form.beschreibung  || null,
      notizen:       form.notizen       || null,
      adresse:       form.adresse       || null,
      status:        form.status,
      datum:         form.datum         || null,
      kunde_id:      form.kunde_id      || null,
      objekt_id:     form.objekt_id     || null,
      prioritaet:    form.prioritaet,
      dauer_minuten: form.dauer_minuten ? parseInt(form.dauer_minuten) : null,
      uhrzeit:       form.uhrzeit       || null,
      notdienst:     form.notdienst,
      interne_notiz: form.interne_notiz || null,
    }).eq('id', id);

    if (error) {
      setFehler('Fehler beim Speichern. Bitte erneut versuchen.');
      setSpeichern(false);
      return;
    }

    // Aktualisierten Auftrag neu laden
    const { data } = await supabase
      .from('auftraege')
      .select('*, kunden(id, name, firmennamen), objekte(id, bezeichnung, adresse)')
      .eq('id', id).single();
    setAuftrag(data);
    setEditMode(false);
    setSpeichern(false);
  }

  async function handleDelete() {
    setLoeschen(true);
    await supabase.from('auftraege').delete().eq('id', id);
    router.push('/dashboard/auftraege');
  }

  if (laden) {
    return <div className="text-gray-400 py-16 text-center">Wird geladen...</div>;
  }

  const cfg = STATUS_CONFIG[auftrag.status] ?? STATUS_CONFIG.offen;
  const priCfg = PRIORITAET_CONFIG[auftrag.prioritaet] ?? PRIORITAET_CONFIG.normal;
  const kundeLabel = auftrag.kunden
    ? (auftrag.kunden.firmennamen || auftrag.kunden.name)
    : null;

  // âââ Edit-Modus âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  if (editMode) {
    return (
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-gray-600 text-sm">
            â Abbrechen
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Auftrag bearbeiten</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <form onSubmit={handleSave} className="space-y-4">
            {fehler && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>
            )}

            {/* Titel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input type="text" name="titel" required value={form.titel} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Kunde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
              <select name="kunde_id" value={form.kunde_id} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">â Kein Kunde zugewiesen â</option>
                {kunden.map(k => (
                  <option key={k.id} value={k.id}>{k.firmennamen || k.name}</option>
                ))}
              </select>
            </div>

            {/* Objekt */}
            {form.kunde_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objekt / Immobilie
                  {objLaden && <span className="text-gray-400 font-normal ml-2">lÃ¤dtâ¦</span>}
                </label>
                {objekte.length === 0 && !objLaden ? (
                  <p className="text-sm text-gray-400 px-4 py-2.5 border border-dashed border-gray-200 rounded-lg">
                    Keine Objekte fÃ¼r diesen Kunden
                  </p>
                ) : (
                  <select name="objekt_id" value={form.objekt_id} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">â Kein Objekt ausgewÃ¤hlt â</option>
                    {objekte.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.bezeichnung}{o.adresse ? ` (${o.adresse})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Status + Datum */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={form.status} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white">
                  <option value="offen">Offen</option>
                  <option value="in_bearbeitung">In Bearbeitung</option>
                  <option value="abgeschlossen">Abgeschlossen</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input type="date" name="datum" value={form.datum} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm" />
              </div>
            </div>

            {/* PrioritÃ¤t + Dauer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PrioritÃ¤t</label>
                <select name="prioritaet" value={form.prioritaet} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="niedrig">Niedrig</option>
                  <option value="normal">Normal</option>
                  <option value="hoch">Hoch</option>
                  <option value="notfall">Notfall</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Minuten)</label>
                <input type="number" name="dauer_minuten" min="0" step="15" value={form.dauer_minuten}
                  onChange={handleChange}
                  placeholder="z.B. 90"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            {/* Uhrzeit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
              <input type="time" name="uhrzeit" value={form.uhrzeit} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            {/* Notdienst Toggle */}
            <div>
              <button
                type="button"
                onClick={handleNotdienstToggle}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition ${
                  form.notdienst
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                  form.notdienst ? 'bg-red-500 border-red-500' : 'border-gray-300'
                }`}>
                  {form.notdienst && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${form.notdienst ? 'text-red-700' : 'text-gray-700'}`}>
                    Notdienst
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Auftrag erhÃ¤lt Notdienst-Status und hÃ¶chste BearbeitungsprioritÃ¤t
                  </p>
                </div>
                {form.notdienst && (
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full shrink-0">
                    AKTIV
                  </span>
                )}
              </button>
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (Einsatzort)</label>
              <input type="text" name="adresse" value={form.adresse} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Beschreibung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <textarea name="beschreibung" value={form.beschreibung} onChange={handleChange} rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* Interne Notiz */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interne Notiz</label>
              <textarea name="interne_notiz" value={form.interne_notiz} onChange={handleChange} rows={2}
                placeholder="Nur intern sichtbar..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
            </div>

            {/* Notizen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea name="notizen" value={form.notizen} onChange={handleChange} rows={2}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={speichern}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 text-sm">
                {speichern ? 'Wird gespeichertâ¦' : 'Speichern'}
              </button>
              <button type="button" onClick={() => setEditMode(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-grat­200 transition text-sm">
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // âââ Detail-Ansicht âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/auftraege" className="text-gray-400 hover:text-gray-600 text-sm">
            â AuftrÃ¤ge
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{auftrag.titel}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>
                {cfg.label}
              </span>
              <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${priCfg.cls}`}>
                {priCfg.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditMode(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            âï¸ Bearbeiten
          </button>
          <button onClick={() => {
            if (window.confirm('Auftrag wirklich lÃ¶schen? Diese Aktion kann nicht rÃ¼ckgÃ¤ngig gemacht werden.')) {
              handleDelete();
            }
          }} disabled={loeschen}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-60">
            {loeschen ? 'â¦' : 'ðï¸ LÃ¶schen'}
          </button>
        </div>
      </div>

      {/* Info-Karte */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

        {/* Datum + Adresse */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Datum</p>
            <p className="text-sm text-gray-800 font-medium">
              {auftrag.datum ? new Date(auftrag.datum).toLocaleDateString('de-DE') : 'â'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Einsatzort</p>
            <p className="text-sm text-gray-800 font-medium">{auftrag.adresse || 'â'}</p>
          </div>
        </div>

        {/* Uhrzeit + Dauer */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Uhrzeit</p>
            <p className="text-sm text-gray-800 font-medium">
              {auftrag.uhrzeit ? auftrag.uhrzeit.slice(0, 5) : 'â'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Dauer</p>
            <p className="text-sm text-gray-800 font-medium">
              {auftrag.dauer_minuten ? `${auftrag.dauer_minuten} Min.` : 'â'}
            </p>
          </div>
        </div>

        {/* Kunde + Objekt */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Kunde</p>
            {kundeLabel ? (
              <Link href={`/dashboard/kunden/${auftrag.kunden.id}`}
                className="text-sm text-blue-600 hover:underline font-medium">
                {kundeLabel}
              </Link>
            ) : (
              <p className="text-sm text-gray-400">â</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Objekt</p>
            {auftrag.objekte ? (
              <Link href={`/dashboard/kunden/${auftrag.kunde_id}/objekte/${auftrag.objekt_id}`}
                className="text-sm text-blue-600 hover:underline font-medium">
                {auftrag.objekte.bezeichnung}
                {auftrag.objekte.adresse && (
                  <span className="text-gray-400 font-normal"> ({auftrag.objekte.adresse})</span>
                )}
              </Link>
            ) : (
              <p className="text-sm text-gray-400">â</p>
            )}
          </div>
        </div>

        {/* Beschreibung */}
        {auftrag.beschreibung && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Beschreibung</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{auftrag.beschreibung}</p>
          </div>
        )}

        {/* Notizen */}
        {auftrag.notizen && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Notizen</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg px-4 py-3">
              {auftrag.notizen}
            </p>
          </div>
        )}

        {/* Interne Notiz */}
        {auftrag.interne_notiz && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              Interne Notiz
              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">Intern</span>
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-yellow-50 rounded-lg px-4 py-3 border border-yellow-100">
              {auftrag.interne_notiz}
            </p>
          </div>
        )}

        {/* Erstellt am */}
        <div className="pt-2 border-t border-gray-50">
          <p className="text-xs text-gray-400">
            Erstellt am {auftrag.erstellt_am ? new Date(auftrag.erstellt_am).toLocaleDateString('de-DE') : 'â'}
          </p>
        </div>
      </div>
    </div>
  );
}
