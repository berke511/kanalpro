'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

// ── Stammdaten ────────────────────────────────────────────────────────────────
const MASCHINENTYP_OPTIONS = [
  { value: 'hebebuehne',      label: 'Hebebühne' },
  { value: 'kompressor',      label: 'Kompressor' },
  { value: 'generator',       label: 'Generator / Aggregat' },
  { value: 'kran',            label: 'Kran' },
  { value: 'stapler',         label: 'Stapler / Hubwagen' },
  { value: 'schweissgeraet',  label: 'Schweißgerät' },
  { value: 'werkzeugmaschine',label: 'Werkzeugmaschine' },
  { value: 'pumpe',           label: 'Pumpe' },
  { value: 'druckluftwerkzeug', label: 'Druckluftwerkzeug' },
  { value: 'hochdruckspueler', label: 'Hochdruckspüler' },
  { value: 'fraese',          label: 'Fräse / Bohrwerk' },
  { value: 'messgeraet',      label: 'Messgerät' },
  { value: 'pruefgeraet',     label: 'Prüfgerät' },
  { value: 'kamera',          label: 'Kamera / Optik' },
  { value: 'werkzeug',        label: 'Werkzeug (Allg.)' },
  { value: 'roboter',         label: 'Roboter' },
  { value: 'sonstiges',       label: 'Sonstiges' },
];

const ZUSTAND_CONFIG = {
  aktiv:         { label: 'Aktiv',          bg: 'bg-green-100',  text: 'text-green-700' },
  in_einsatz:    { label: 'Im Einsatz',     bg: 'bg-blue-100',   text: 'text-blue-700' },
  wartung:       { label: 'In Wartung',     bg: 'bg-yellow-100', text: 'text-yellow-700' },
  defekt:        { label: 'Defekt',         bg: 'bg-red-100',    text: 'text-red-700' },
  ausser_betrieb:{ label: 'Außer Betrieb',  bg: 'bg-gray-100',   text: 'text-gray-600' },
};

function ZustandBadge({ zustand }) {
  const cfg = ZUSTAND_CONFIG[zustand] ?? { label: zustand, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function TypLabel({ typ }) {
  const opt = MASCHINENTYP_OPTIONS.find(o => o.value === typ);
  return <span className="text-sm text-gray-500">{opt?.label ?? typ ?? '–'}</span>;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ d, className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const TOOL_ICON = 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z';

// ── Formular Leer-Zustand ─────────────────────────────────────────────────────
const FORM_EMPTY = { name: '', typ: 'sonstiges', lagerort: '', zustand: 'aktiv' };

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function MaschinenPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(null);
  const [maschinen, setMaschinen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (cId) => {
    const { data } = await supabase
      .from('maschinen')
      .select('id,name,typ,lagerort,zustand,betriebsstunden_aktuell,naechste_pruefung_datum,hersteller,modell')
      .eq('company_id', cId)
      .order('name');
    setMaschinen(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!member) { router.push('/login'); return; }
      setCompanyId(member.company_id);
      load(member.company_id);
    }
    init();
  }, [router, load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from('maschinen').insert({
      ...form,
      company_id: companyId,
      betriebsstunden_aktuell: 0,
    });
    setForm(FORM_EMPTY);
    setShowForm(false);
    load(companyId);
    setSaving(false);
  }

  // Warnung: Prüfungsdatum < 30 Tage
  function hatPruefWarnung(m) {
    if (!m.naechste_pruefung_datum) return false;
    const diff = (new Date(m.naechste_pruefung_datum) - new Date()) / 86400000;
    return diff <= 30;
  }

  const filtered = maschinen.filter(m =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.lagerort?.toLowerCase().includes(search.toLowerCase()) ||
    m.hersteller?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-gray-400">Lade…</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maschinen &amp; Geräte</h1>
          <p className="text-sm text-gray-500 mt-0.5">{maschinen.length} Maschinen erfasst</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          <Icon d="M12 4.5v15m7.5-7.5h-15" className="w-4 h-4" />
          Neue Maschine
        </button>
      </div>

      {/* Suchfeld */}
      {maschinen.length > 0 && (
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, Standort oder Hersteller suchen…"
            className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Inline Formular */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Neue Maschine anlegen</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Bezeichnung *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Kompressor Atlas Copco"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
              <select
                value={form.typ}
                onChange={e => setForm(f => ({ ...f, typ: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MASCHINENTYP_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Standort / Lagerort</label>
              <input
                type="text"
                value={form.lagerort}
                onChange={e => setForm(f => ({ ...f, lagerort: e.target.value }))}
                placeholder="z.B. Halle 2, Baustelle A"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zustand</label>
              <select
                value={form.zustand}
                onChange={e => setForm(f => ({ ...f, zustand: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ZUSTAND_CONFIG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? 'Speichern…' : 'Maschine anlegen'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(FORM_EMPTY); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Maschinenübersicht */}
      {filtered.length === 0 && !showForm ? (
        <div className="text-center py-20 text-gray-400">
          <Icon d={TOOL_ICON} className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-base font-medium">
            {search ? 'Keine Maschinen gefunden.' : 'Noch keine Maschinen erfasst.'}
          </p>
          {!search && (
            <p className="text-sm mt-1">Klicke auf „Neue Maschine" um loszulegen.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => {
            const warn = hatPruefWarnung(m);
            return (
              <div
                key={m.id}
                onClick={() => router.push(`/dashboard/maschinen/${m.id}`)}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition">
                      <Icon d={TOOL_ICON} className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                      <TypLabel typ={m.typ} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <ZustandBadge zustand={m.zustand} />
                    {warn && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                        ! Prüfung
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  {m.lagerort && (
                    <div className="flex items-center gap-1.5">
                      <Icon d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" className="w-3.5 h-3.5 shrink-0" />
                      {m.lagerort}
                    </div>
                  )}
                  {m.betriebsstunden_aktuell > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Icon d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className="w-3.5 h-3.5 shrink-0" />
                      {Number(m.betriebsstunden_aktuell).toLocaleString('de-DE')} Bst.
                    </div>
                  )}
                  {m.naechste_pruefung_datum && (
                    <div className={`flex items-center gap-1.5 ${warn ? 'text-red-600 font-medium' : ''}`}>
                      <Icon d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" className="w-3.5 h-3.5 shrink-0" />
                      Prüfung: {new Date(m.naechste_pruefung_datum).toLocaleDateString('de-DE')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
