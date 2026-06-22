'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

const LEISTUNGEN = [
  'Kanalreinigung DN 100-300',
  'Kanalreinigung DN 300-500',
  'Kanalinspektion mit Kamera',
  'Dichtigkeitsprüfung',
  'Wurzelentfernung',
  'Ablagerungsentfernung',
  'Notfalleinsatz Kanalverstopfung',
  'Sanierung Kanalrohr DN 150',
  'Einbau Kanalrevision',
  'Abscheider reinigen',
];

const STATUS_OPTS = [
  { value: 'entwurf',    label: 'Entwurf'    },
  { value: 'gesendet',   label: 'Gesendet'   },
  { value: 'angenommen', label: 'Angenommen' },
  { value: 'abgelehnt',  label: 'Abgelehnt'  },
];

export default function AngebotBearbeiten() {
  const router = useRouter();
  const { id } = useParams();

  const [laden, setLaden]               = useState(true);
  const [speichern, setSpeichern]       = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [kunden, setKunden]             = useState([]);
  const [form, setForm] = useState({
    kunden_id: '',
    datum: new Date().toISOString().split('T')[0],
    steuersatz: 19,
    status: 'entwurf',
    notizen: '',
  });
  const [positionen, setPositionen] = useState([
    { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 },
  ]);
  const [fehler, setFehler]   = useState('');
  const [dropIdx, setDropIdx] = useState(null);
  const dropRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!member) return;

      const [{ data: kundenData }, { data: angebot }] = await Promise.all([
        supabase.from('kunden').select('id, name').eq('company_id', member.company_id).order('name'),
        supabase.from('angebote').select('*').eq('id', id).single(),
      ]);

      setKunden(kundenData ?? []);

      if (!angebot) { router.push('/dashboard/angebote'); return; }
      setForm({
        kunden_id:  angebot.kunden_id  ?? '',
        datum:      angebot.datum      ?? new Date().toISOString().split('T')[0],
        steuersatz: angebot.steuersatz ?? 19,
        status:     angebot.status     ?? 'entwurf',
        notizen:    angebot.notizen    ?? '',
      });
      setPositionen(
        (angebot.positionen ?? []).length > 0
          ? angebot.positionen
          : [{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]
      );
      setLaden(false);
    }
    load().catch(() => setLaden(false));
  }, [id]);

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function posChange(i, field, val) {
    setPositionen(ps =>
      ps.map((p, j) =>
        j === i
          ? { ...p, [field]: field === 'menge' || field === 'preis' ? Number(val) : val }
          : p
      )
    );
  }

  function addPos() {
    setPositionen(ps => [...ps, { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]);
  }

  function removePos(i) {
    if (positionen.length > 1) setPositionen(positionen.filter((_, j) => j !== i));
  }

  const netto  = positionen.reduce((s, p) => s + (p.menge ?? 0) * (p.preis ?? 0), 0);
  const mwst   = netto * (Number(form.steuersatz) / 100);
  const brutto = netto + mwst;
  const fmt    = v => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.kunden_id) { setFehler('Bitte einen Kunden auswählen.'); return; }
    setSpeichern(true);
    setFehler('');
    const { error } = await supabase.from('angebote').update({
      kunden_id:  form.kunden_id,
      datum:      form.datum,
      steuersatz: Number(form.steuersatz),
      status:     form.status,
      positionen,
      notizen:    form.notizen || null,
    }).eq('id', id);
    setSpeichern(false);
    if (error) { setFehler('Fehler: ' + error.message); return; }
    router.push('/dashboard/angebote');
  }

  async function onDelete() {
    setDeleting(true);
    await supabase.from('angebote').delete().eq('id', id);
    router.push('/dashboard/angebote');
  }

  if (laden) return <p className="text-gray-400 text-sm">Wird geladen…</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/angebote" className="text-xs text-gray-400 hover:text-gray-600 transition">
            ← Zurøck zu Angebote
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">Angebot bearbeiten</h1>
        </div>
        <button
          type="button"
          onClick={() => setDeleteConfirm(true)}
          className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition text-sm"
        >
          Angebot löschen
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* ── Angebotsdaten ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Angebotsdaten</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Kunde *</label>
              <select name="kunden_id" value={form.kunden_id} onChange={onChange} className={INPUT}>
                <option value="">Kunde auswählen…</option>
                {kunden.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Datum</label>
              <input type="date" name="datum" value={form.datum} onChange={onChange} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select name="status" value={form.status} onChange={onChange} className={INPUT}>
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">MwSt. %</label>
              <input type="number" name="steuersatz" value={form.steuersatz} onChange={onChange} min="0" max="100" className={INPUT} />
            </div>
          </div>
        </div>

        {/* ── Positionen ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>
          </div>
          <div className="p-5 space-y-2">
            {positionen.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-center">
                <div className="relative">
                  <input
                    type="text"
                    value={p.beschreibung}
                    onChange={e => { posChange(i, 'beschreibung', e.target.value); setDropIdx(e.target.value.length > 0 ? i : null); }}
                    onFocus={() => p.beschreibung.length > 0 && setDropIdx(i)}
                    onBlur={() => setTimeout(() => setDropIdx(null), 150)}
                    placeholder="Leistungsbeschreibung"
                    className={INPUT}
                  />
                  {dropIdx === i && (
                    <div ref={dropRef} className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {LEISTUNGEN
                        .filter(l => l.toLowerCase().includes(p.beschreibung.toLowerCase()))
                        .map(l => (
                          <button
                            key={l}
                            type="button"
                            onMouseDown={() => { posChange(i, 'beschreibung', l); setDropIdx(null); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700"
                          >
                            {l}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <input type="number" value={p.menge} onChange={e => posChange(i, 'menge', e.target.value)} placeholder="Menge" min="0" step="0.01" className={INPUT} />
                <select value={p.einheit} onChange={e => posChange(i, 'einheit', e.target.value)} className={INPUT}>
                  <option>Pauschal</option>
                  <option>Stunde</option>
                  <option>Tag</option>
                  <option>m</option>
                  <option>m²</option>
                  <option>Støck</option>
                </select>
                <input type="number" value={p.preis} onChange={e => posChange(i, 'preis', e.target.value)} placeholder="Preis €" min="0" step="0.01" className={INPUT} />
                <button
                  type="button"
                  onClick={() => removePos(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPos}
              className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Position hinzuføgen
            </button>
          </div>
          {/* Summary */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
            <div className="min-w-[220px] space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Netto</span><span className="tabular-nums">{fmt(netto)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>MwSt. {form.steuersatz} %</span><span className="tabular-nums">{fmt(mwst)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5">
                <span>Gesamtbetrag</span><span className="text-blue-600 tabular-nums">{fmt(brutto)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notizen ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Notizen / Hinweise</h2>
          </div>
          <div className="p-5">
            <textarea
              name="notizen"
              value={form.notizen}
              onChange={onChange}
              rows={2}
              placeholder="z. B. Dieses Angebot ist 30 Tage gøltig."
              className={INPUT + ' resize-none'}
            />
          </div>
        </div>

        {fehler && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{fehler}</p>}

        {/* ── Aktionen ── */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={speichern}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            {speichern ? 'Wird gespeichert…' : 'Änderungen speichern'}
          </button>
          <Link
            href="/dashboard/angebote"
            className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            Abbrechen
          </Link>
        </div>
      </form>

      {/* ── Lösch-Bestätigung Modal ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Angebot löschen?</h3>
            <p className="text-xs text-gray-400 mb-4">
              Diese Aktion kann nicht røckgängig gemacht werden.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 text-sm"
              >
                {deleting ? 'Wird gelöscht…' : 'Ja, löschen'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
