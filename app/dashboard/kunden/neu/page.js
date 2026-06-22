'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus, getPlan } from '@/lib/subscription';

export default function NeuerKunde() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', telefon: '', email: '', adresse: '', notizen: '',
    kundentyp: 'privat', firmenname: '',
    rechnungsadresse_abweichend: false,
    rechnung_strasse: '', rechnung_plz: '', rechnung_ort: '',
    ist_vertragskunde: false, ist_wartungskunde: false,
  });
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);

  useEffect(() => {
    async function checkLimit() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const abo = await checkAndDowngrade(supabase, user.id);
      const sub = getSubscriptionStatus(abo);
      const plan = getPlan(sub.plan);
      const limit = plan.limits.kunden;
      if (limit == null || limit === Infinity) return;
      const { count } = await supabase.from('kunden').select('id', { count: 'exact', head: true });
      if (count >= limit) router.push('/dashboard/kunden');
    }
    checkLimit();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFehler('');
    setLaden(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
    const { error } = await supabase.from('kunden').insert({
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
      user_id: user.id,
      company_id: member?.company_id ?? null,
    });
    if (error) { setFehler('Fehler beim Speichern. Bitte erneut versuchen.'); setLaden(false); return; }
    router.push('/dashboard/kunden');
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/kunden" className="text-gray-400 hover:text-gray-600 text-sm">← Zurück</Link>
        <h1 className="text-2xl font-bold text-gray-900">Neuer Kunde</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}

          {/* Kundentyp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kundentyp</label>
            <div className="flex gap-3">
              {[
                { value: 'privat', label: 'Privatperson' },
                { value: 'firma', label: 'Firmenkunde' },
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

          {/* Name / Firmenname */}
          <div className={form.kundentyp === 'firma' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.kundentyp === 'firma' ? 'Ansprechpartner *' : 'Name *'}
              </label>
              <input type="text" name="name" required value={form.name} onChange={handleChange}
                placeholder="Max Mustermann"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {form.kundentyp === 'firma' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
                <input type="text" name="firmenname" required={form.kundentyp === 'firma'}
                  value={form.firmenname} onChange={handleChange}
                  placeholder="Mustermann GmbH"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input type="tel" name="telefon" value={form.telefon} onChange={handleChange}
                placeholder="+49 211 123456"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="kunde@beispiel.de"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (Einsatzort / Lieferadresse)</label>
            <input type="text" name="adresse" value={form.adresse} onChange={handleChange}
              placeholder="Musterstraße 1, 40000 Düsseldorf"
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
              <input type="checkbox" name="ist_vertragskunde" checked={form.ist_vertragskunde} onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">Vertragskunde</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" name="ist_wartungskunde" checked={form.ist_wartungskunde} onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">Wartungskunde</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea name="notizen" value={form.notizen} onChange={handleChange} rows={3}
              placeholder="Interne Notizen..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={laden}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 text-sm">
              {laden ? 'Wird gespeichert...' : 'Kunde speichern'}
            </button>
            <Link href="/dashboard/kunden"
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
              Abbrechen
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
