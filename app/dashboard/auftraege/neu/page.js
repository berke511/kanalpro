'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus, getPlan } from '@/lib/subscription';

function NeuerAuftragInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillKundeId = searchParams.get('kunde_id') ?? '';
  const prefillObjektId = searchParams.get('objekt_id') ?? '';

  const [kunden, setKunden] = useState([]);
  const [objekte, setObjekte] = useState([]);
  const [objekteLaden, setObjekteLaden] = useState(false);
  const [form, setForm] = useState({
    titel: '', beschreibung: '', kunde_id: '', objekt_id: '',
    status: 'offen', datum: '', adresse: '', notizen: '',
  });
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);

  // Kunden laden + Prefill aus Query-Params + Limit-Check
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).eq('is_active', true).maybeSingle();
      const companyId = member?.company_id;
      const abo = await checkAndDowngrade(supabase, user.id);
      const sub = getSubscriptionStatus(abo);
      const plan = getPlan(sub.plan);
      const limit = plan.limits.auftraege;
      if (limit != null && limit !== Infinity) {
        const { count } = await supabase.from('auftraege').select('id', { count: 'exact', head: true }).eq('company_id', companyId);
        if (count >= limit) { router.push('/dashboard/auftraege'); return; }
      }
      const { data } = await supabase.from('kunden').select('id, name, firmenname').eq('company_id', companyId).order('name');
      setKunden(data ?? []);
      if (prefillKundeId) {
        setForm(prev => ({ ...prev, kunde_id: prefillKundeId, objekt_id: prefillObjektId }));
      }
    }
    load();
  }, [prefillKundeId, prefillObjektId]);

  // Objekte laden wenn Kunde gewechselt
  useEffect(() => {
    if (!form.kunde_id) { setObjekte([]); return; }
    setObjekteLaden(true);
    supabase.from('objekte').select('id, bezeichnung, adresse').eq('kunde_id', form.kunde_id).order('bezeichnung')
      .then(({ data }) => { setObjekte(data ?? []); setObjekteLaden(false); });
  }, [form.kunde_id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      // Objekt-Selektion zurücksetzen wenn Kunde wechselt
      if (name === 'kunde_id') next.objekt_id = '';
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault(); setFehler(''); setLaden(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('auftraege').insert({
      titel: form.titel,
      beschreibung: form.beschreibung || null,
      notizen: form.notizen || null,
      adresse: form.adresse || null,
      status: form.status,
      datum: form.datum || null,
      kunde_id: form.kunde_id || null,
      objekt_id: form.objekt_id || null,
      user_id: user.id,
    });
    if (error) { setFehler('Fehler beim Speichern. Bitte erneut versuchen.'); }
    else { router.push('/dashboard/auftraege'); }
    setLaden(false);
  }

  // Anzeigename für gewählten Kunden
  const gewaehlterKunde = kunden.find(k => k.id === form.kunde_id);
  const kundeLabel = gewaehlterKunde
    ? (gewaehlterKunde.firmenname || gewaehlterKunde.name)
    : null;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/auftraege" className="text-gray-400 hover:text-gray-600 text-sm">← Zurück</Link>
        <h1 className="text-2xl font-bold text-gray-900">Neuer Auftrag</h1>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}

          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
            <input type="text" name="titel" required value={form.titel} onChange={handleChange}
              placeholder="z. B. Rohrverstopfung Keller"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Kunde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
            <select name="kunde_id" value={form.kunde_id} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— Kein Kunde zugewiesen —</option>
              {kunden.map(k => <option key={k.id} value={k.id}>{k.firmenname || k.name}</option>)}
            </select>
          </div>

          {/* Objekt (nur wenn Kunde gewählt) */}
          {form.kunde_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objekt / Immobilie
                {objekteLaden && <span className="text-gray-400 font-normal ml-2">lädt…</span>}
              </label>
              {objekte.length === 0 && !objekteLaden ? (
                <div className="text-sm text-gray-400 px-4 py-2.5 border border-dashed border-gray-200 rounded-lg">
                  Keine Objekte für diesen Kunden —{' '}
                  <Link href={`/dashboard/kunden/${form.kunde_id}?tab=objekte`} className="text-blue-500 hover:underline">
                    jetzt anlegen
                  </Link>
                </div>
              ) : (
                <select name="objekt_id" value={form.objekt_id} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Kein Objekt ausgewählt —</option>
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

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (Einsatzort)</label>
            <input type="text" name="adresse" value={form.adresse} onChange={handleChange}
              placeholder="Musterstraße 1, 40000 Düsseldorf"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea name="beschreibung" value={form.beschreibung} onChange={handleChange} rows={3}
              placeholder="Was muss gemacht werden?"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Notizen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea name="notizen" value={form.notizen} onChange={handleChange} rows={2}
              placeholder="Interne Notizen..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={laden}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 text-sm">
              {laden ? 'Wird gespeichert...' : 'Auftrag speichern'}
            </button>
            <Link href="/dashboard/auftraege"
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
              Abbrechen
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NeuerAuftrag() {
  return <Suspense fallback={null}><NeuerAuftragInner /></Suspense>;
}
