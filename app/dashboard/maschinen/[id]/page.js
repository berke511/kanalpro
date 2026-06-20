'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';

// ── Stammdaten ────────────────────────────────────────────────────────────────
const MASCHINENTYP_OPTIONS = [
  { value: 'hebebuehne',       label: 'Hebebøhne' },
  { value: 'kompressor',       label: 'Kompressor' },
  { value: 'generator',        label: 'Generator / Aggregat' },
  { value: 'kran',             label: 'Kran' },
  { value: 'stapler',          label: 'Stapler / Hubwagen' },
  { value: 'schweissgeraet',   label: 'Schweißgerät' },
  { value: 'werkzeugmaschine', label: 'Werkzeugmaschine' },
  { value: 'pumpe',            label: 'Pumpe' },
  { value: 'druckluftwerkzeug',label: 'Druckluftwerkzeug' },
  { value: 'hochdruckspueler', label: 'Hochdruckspøler' },
  { value: 'fraese',           label: 'Fräse / Bohrwerk' },
  { value: 'messgeraet',       label: 'Messgerät' },
  { value: 'pruefgeraet',      label: 'Prüfgerät' },
  { value: 'kamera',           label: 'Kamera / Optik' },
  { value: 'werkzeug',         label: 'Werkzeug (Allg.)' },
  { value: 'roboter',          label: 'Roboter' },
  { value: 'sonstiges',        label: 'Sonstiges' },
];

const ZUSTAND_CONFIG = {
  aktiv:          { label: 'Aktiv',         bg: 'bg-green-100',  text: 'text-green-700' },
  in_einsatz:     { label: 'Im Einsatz',    bg: 'bg-blue-100',   text: 'text-blue-700' },
  wartung:        { label: 'In Wartung',    bg: 'bg-yellow-100', text: 'text-yellow-700' },
  defekt:         { label: 'Defekt',        bg: 'bg-red-100',    text: 'text-red-700' },
  ausser_betrieb: { label: 'Außer Betrieb', bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const TABS = [
  { id: 'geraeteverwaltung', label: 'Geräteverwaltung' },
];

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ d, className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  back:  'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18',
  tool:  'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z',
  save:  'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z',
  trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  check: 'M4.5 12.75l6 6 9-13.5',
};

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
function ZustandBadge({ zustand }) {
  const cfg = ZUSTAND_CONFIG[zustand] ?? { label: zustand, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function LabelInput({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function inputCls(extra = '') {
  return `w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${extra}`;
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function MaschinenDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [maschine, setMaschine] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('geraeteverwaltung');

  // Edit-State
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('maschinen')
      .select('*')
      .eq('id', id)
      .single();
    setMaschine(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function startEdit() {
    setForm({
      name:              maschine.name              ?? '',
      typ:               maschine.typ               ?? 'sonstiges',
      hersteller:        maschine.hersteller         ?? '',
      modell:            maschine.modell             ?? '',
      seriennummer:      maschine.seriennummer       ?? '',
      inventarnummer:    maschine.inventarnummer     ?? '',
      baujahr:           maschine.baujahr            ?? '',
      kaufdatum:         maschine.kaufdatum          ?? '',
      anschaffungswert:  maschine.anschaffungswert   ?? '',
      lagerort:          maschine.lagerort           ?? '',
      zustand:           maschine.zustand            ?? 'aktiv',
      naechste_pruefung_datum: maschine.naechste_pruefung_datum ?? '',
      notiz:             maschine.notiz              ?? '',
    });
    setEditing(true);
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name:             form.name.trim(),
      typ:              form.typ,
      hersteller:       form.hersteller.trim()  || null,
      modell:           form.modell.trim()       || null,
      seriennummer:     form.seriennummer.trim() || null,
      inventarnummer:   form.inventarnummer.trim() || null,
      baujahr:          form.baujahr             || null,
      kaufdatum:        form.kaufdatum            || null,
      anschaffungsvert: form.anschaffungswert !== '' ? parseFloat(form.anschaffungswert) : null,
      lagerort:         form.lagerort.trim()     || null,
      zustand:          form.zustand,
      naechste_pruefung_datum: form.naechste_pruefung_datum || null,
      notiz:            form.notiz.trim()        || null,
    };
    await supabase.from('maschinen').update(payload).eq('id', id);
    await load();
    setEditing(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from('maschinen').delete().eq('id', id);
    router.push('/dashboard/maschinen');
  }

  if (loading) return <div className="p-8 text-gray-400">Lade…</div>;
  if (!maschine) return <div className="p-8 text-gray-400">Maschine nicht gefunden.</div>;

  const typLabel = MASCHINENTYP_OPTIONS.find(o => o.value === maschine.typ)?.label ?? maschine.typ;

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/maschinen')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <Icon d={ICONS.back} className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Icon d={ICONS.tool} className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{maschine.name}</h1>
            <p className="text-sm text-gray-500">{typLabel}</p>
          </div>
          <ZustandBadge zustand={maschine.zustand} />
        </div>

        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Icon d={ICONS.check} className="w-4 h-4" />
            Gespeichert
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Geräteverwaltung ─────────────────────────────────────────── */}
      {activeTab === 'geraeteverwaltung' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

          {!editing ? (
            <>
              {/* Ansicht */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Stammdaten</h2>
                <button
                  onClick={startEdit}
                  className="px-4 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition"
                >
                  Bearbeiten
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <Field label="Bezeichnung"     value={maschine.name} />
                <Field label="Typ"             value={typLabel} />
                <Field label="Hersteller"      value={maschine.hersteller} />
                <Field label="Modell"          value={maschine.modell} />
                <Field label="Seriennummer"    value={maschine.seriennummer} />
                <Field label="Inventarnummer"  value={maschine.inventarnummer} />
                <Field label="Baujahr"         value={maschine.baujahr} />
                <Field label="Kaufdatum"       value={maschine.kaufdatum ? new Date(maschine.kaufdatum).toLocaleDateString('de-DE') : null} />
                <Field label="Anschaffungswert"
                  value={maschine.anschaffungswert != null
                    ? Number(maschine.anschaffungswert).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
                    : null}
                />
                <Field label="Standort / Lagerort" value={maschine.lagerort} />
                <Field label="Zustand"
                  value={ZUSTAND_CONFIG[maschine.zustand]?.label ?? maschine.zustand}
                />
                <Field label="Nächste Prüfung"
                  value={maschine.naechste_pruefung_datum
                    ? new Date(maschine.naechste_pruefung_datum).toLocaleDateString('de-DE')
                    : null}
                  warn={!!maschine.naechste_pruefung_datum &&
                    (new Date(maschine.naechste_pruefung_datum) - new Date()) / 86400000 <= 30}
                />
                <Field label="Betriebsstunden"
                  value={maschine.betriebsstunden_aktuell > 0
                    ? `${Number(maschine.betriebsstunden_aktuell).toLocaleString('de-DE')} Bst.`
                    : null}
                />
              </div>

              {maschine.notiz && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Notiz</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{maschine.notiz}</p>
                </div>
              )}

              {/* Löschen */}
              <div className="mt-8 pt-5 border-t border-gray-100">
                {!confirmDel ? (
                  <button
                    onClick={() => setConfirmDel(true)}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition"
                  >
                    <Icon d={ICONS.trash} className="w-4 h-4" />
                    Maschine löschen
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">Wirklich löschen?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      {deleting ? 'Lösche…' : 'Ja, löschen'}
                    </button>
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Bearbeitungsformular */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Stammdaten bearbeiten</h2>
              </div>

              <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelInput label="Bezeichnung" required>
                  <input type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required className={inputCls()} />
                </LabelInput>

                <LabelInput label="Typ">
                  <select value={form.typ}
                    onChange={e => setForm(f => ({ ...f, typ: e.target.value }))}
                    className={inputCls()}>
                    {MASCHINENTYP_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </LabelInput>

                <LabelInput label="Hersteller">
                  <input type="text" value={form.hersteller}
                    onChange={e => setForm(f => ({ ...f, hersteller: e.target.value }))}
                    placeholder="z.B. Atlas Copco" className={inputCls()} />
                </LabelInput>

                <LabelInput label="Modell">
                  <input type="text" value={form.modell}
                    onChange={e => setForm(f => ({ ...f, modell: e.target.value }))}
                    placeholder="z.B. GA 11" className={inputCls()} />
                </LabelInput>

                <LabelInput label="Seriennummer">
                  <input type="text" value={form.seriennummer}
                    onChange={e => setForm(f => ({ ...f, seriennummer: e.target.value }))}
                    className={inputCls()} />
                </LabelInput>

                <LabelInput label="Inventarnummer">
                  <input type="text" value={form.inventarnummer}
                    onChange={e => setForm(f => ({ ...f, inventarnummer: e.target.value }))}
                    className={inputCls()} />
                </LabelInput>

                <LabelInput label="Baujahr">
                  <input type="number" value={form.baujahr}
                    onChange={e => setForm(f => ({ ...f, baujahr: e.target.value }))}
                    min="1900" max="2099" placeholder="z.B. 2018" className={inputCls()} />
                </LabelInput>

                <LabelInput label="Kaufdatum">
                  <input type="date" value={form.kaufdatum}
                    onChange={e => setForm(f => ({ ...f, kaufdatum: e.target.value }))}
                    className={inputCls()} />
                </LabelInput>

                <LabelInput label="Anschaffungswert (€)">
                  <input type="number" value={form.anschaffungswert}
                    onChange={e => setForm(f => ({ ...f, anschaffungswert: e.target.value }))}
                    min="0" step="0.01" placeholder="0.00" className={inputCls()} />
                </LabelInput>

                <LabelInput label="Standort / Lagerort">
                  <input type="text" value={form.lagerort}
                    onChange={e => setForm(f => ({ ...f, lagerort: e.target.value }))}
                    placeholder="z.B. Halle 2, Baustelle A" className={inputCls()} />
                </LabelInput>

                <LabelInput label="Zustand">
                  <select value={form.zustand}
                    onChange={e => setForm(f => ({ ...f, zustand: e.target.value }))}
                    className={inputCls()}>
                    {Object.entries(ZUSTAND_CONFIG).map(([v, c]) => (
                      <option key={v} value={v}>{c.label}</option>
                    ))}
                  </select>
                </LabelInput>

                <LabelInput label="Nächste Prüfung">
                  <input type="date" value={form.naechste_pruefung_datum}
                    onChange={e => setForm(f => ({ ...f, naechste_pruefung_datum: e.target.value }))}
                    className={inputCls()} />
                </LabelInput>

                <div className="col-span-2">
                  <LabelInput label="Notiz / Bemerkung">
                    <textarea value={form.notiz}
                      onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))}
                      rows={3} placeholder="Interne Hinweise zur Maschine…"
                      className={inputCls('resize-none')} />
                  </LabelInput>
                </div>

                <div className="col-span-2 flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving || !form.name.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    <Icon d={ICONS.save} className="w-4 h-4" />
                    {saving ? 'Speichern…' : 'Speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

    </div>
  );
}

// ── Feld-Anzeige ──────────────────────────────────────────────────────────────
function Field({ label, value, warn = false }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${warn ? 'text-red-600' : 'text-gray-800'}`}>
        {value ?? <span className="text-gray-300 font-normal">—</span>}
      </p>
    </div>
  );
}
