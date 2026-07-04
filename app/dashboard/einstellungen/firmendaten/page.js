'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function Firmendaten() {
  const [companyId, setCompanyId] = useState(null);
  const [firma, setFirma] = useState({
    name: '',
    adresse: '',
    telefon: '',
    email: '',
    ust_id: '',
    steuernummer: '',
    iban: '',
    bic: '',
    bank: '',
    logo_url: '',
    standard_steuersatz: '',
  });
  const [laden, setLaden] = useState(true);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!memberData) { setLaden(false); return; }
      const cid = memberData.company_id;
      setCompanyId(cid);
      const { data } = await supabase
        .from('companies')
        .select('name, adresse, telefon, email, ust_id, steuernummer, iban, bic, bank, logo_url, standard_steuersatz')
        .eq('id', cid)
        .single();
      if (data) setFirma({
        name: data.name || '',
        adresse: data.adresse || '',
        telefon: data.telefon || '',
        email: data.email || '',
        ust_id: data.ust_id || '',
        steuernummer: data.steuernummer || '',
        iban: data.iban || '',
        bic: data.bic || '',
        bank: data.bank || '',
        logo_url: data.logo_url || '',
        standard_steuersatz: data.standard_steuersatz || '',
      });
      setLaden(false);
    }
    load();
  }, []);

  async function handleSpeichern(e) {
    e.preventDefault();
    setFehler('');
    if (!companyId) { setFehler('Kein Unternehmen gefunden.'); return; }
    const { name, adresse, telefon, email, ust_id, steuernummer, iban, bic, bank, logo_url } = firma;
    const { error } = await supabase
      .from('companies')
      .update({ name, adresse, telefon, email, ust_id, steuernummer, iban, bic, bank, logo_url })
      .eq('id', companyId);
    if (error) { setFehler(error.message); return; }
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 3000);
  }

  if (laden) return <div className="p-8 text-center text-gray-400 text-sm">LÃ¤dtâ¦</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Firmendaten</h1>
          <p className="text-sm text-gray-500 mt-0.5">Name und Daten deiner Firma</p>
        </div>
        <Link href="/dashboard/einstellungen" className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          â Einstellungen
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <form onSubmit={handleSpeichern} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname</label>
            <input
              type="text"
              value={firma.name}
              onChange={e => setFirma(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Muster GmbH"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              value={firma.adresse}
              onChange={e => setFirma(f => ({ ...f, adresse: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="MusterstraÃe 1, 12345 Musterstadt"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="text"
              value={firma.telefon}
              onChange={e => setFirma(f => ({ ...f, telefon: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="+49 123 456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input
              type="email"
              value={firma.email}
              onChange={e => setFirma(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="info@firma.de"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">USt-IdNr.</label>
            <input
              type="text"
              value={firma.ust_id}
              onChange={e => setFirma(f => ({ ...f, ust_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="DE123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Steuernummer</label>
            <input
              type="text"
              value={firma.steuernummer}
              onChange={e => setFirma(f => ({ ...f, steuernummer: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="12/345/67890"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
            <input
              type="text"
              value={firma.iban}
              onChange={e => setFirma(f => ({ ...f, iban: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="DE89 3704 0044 0532 0130 00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BIC</label>
            <input
              type="text"
              value={firma.bic}
              onChange={e => setFirma(f => ({ ...f, bic: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="COBADEFFXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
            <input
              type="text"
              value={firma.bank}
              onChange={e => setFirma(f => ({ ...f, bank: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Commerzbank AG"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="text"
              value={firma.logo_url}
              onChange={e => setFirma(f => ({ ...f, logo_url: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="https://example.com/logo.png"
            />
          </div>
          {fehler && <p className="text-sm text-red-600">{fehler}</p>}
          {gespeichert && <p className="text-sm text-green-600 font-medium">Gespeichert!</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Speichern
          </button>
        </form>
      </div>
    </div>
  );
}
