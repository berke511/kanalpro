'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function Firmendaten() {
  const [firma, setFirma] = useState({
    firmaname: '', strasse: '', plz: '', ort: '',
    telefon: '', email: '',
    ust_id: '', steuernummer: '',
    iban: '', bic: '', bank: '',
    logo_url: '',
  });
  const [companyId, setCompanyId] = useState(null);
  const [laden, setLaden] = useState(true);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('companies')
        .select('id, name, adresse, plz, ort, telefon, email, ust_id, steuernummer, iban, bic, bank, logo_url')
        .maybeSingle();
      if (data) {
        setCompanyId(data.id);
        setFirma({
          firmaname: data.name || '',
          strasse: data.adresse || '',
          plz: data.plz || '',
          ort: data.ort || '',
          telefon: data.telefon || '',
          email: data.email || '',
          ust_id: data.ust_id || '',
          steuernummer: data.steuernummer || '',
          iban: data.iban || '',
          bic: data.bic || '',
          bank: data.bank || '',
          logo_url: data.logo_url || '',
        });
      }
      setLaden(false);
    }
    load();
  }, []);

  async function handleSpeichern(e) {
    e.preventDefault();
    setFehler('');
    if (!companyId) { setFehler('Keine Firma gefunden.'); return; }
    const { error } = await supabase
      .from('companies')
      .update({
        name: firma.firmaname,
        adresse: firma.strasse,
        plz: firma.plz,
        ort: firma.ort,
        telefon: firma.telefon,
        email: firma.email,
        ust_id: firma.ust_id,
        steuernummer: firma.steuernummer,
        iban: firma.iban,
        bic: firma.bic,
        bank: firma.bank,
        logo_url: firma.logo_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);
    if (error) { setFehler(error.message); return; }
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 3000);
  }

  const Feld = ({ k, label, placeholder, type = 'text' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={firma[k]}
        onChange={e => setFirma(f => ({ ...f, [k]: e.target.value }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        placeholder={placeholder}
      />
    </div>
  );

  if (laden) return <div className="p-8 text-center text-gray-400 text-sm">Lädt…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Firmendaten</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stammdaten deiner Firma</p>
        </div>
        <Link href="/dashboard/einstellungen" className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          ← Einstellungen
        </Link>
      </div>

      <form onSubmit={handleSpeichern} className="space-y-6 max-w-lg">
        {/* Basisdaten */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Basisdaten</h2>
          <Feld k="firmaname" label="Firmenname" placeholder="Muster GmbH" />
          <Feld k="strasse" label="Straße & Hausnummer" placeholder="Musterstraße 1" />
          <div className="flex gap-3">
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
              <input
                type="text"
                value={firma.plz}
                onChange={e => setFirma(f => ({ ...f, plz: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="12345"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
              <input
                type="text"
                value={firma.ort}
                onChange={e => setFirma(f => ({ ...f, ort: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Musterstadt"
              />
            </div>
          </div>
        </div>

        {/* Kontakt */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Kontakt</h2>
          <Feld k="telefon" label="Telefon" placeholder="+49 30 123456789" />
          <Feld k="email" label="E-Mail" placeholder="info@musterfirma.de" type="email" />
        </div>

        {/* Steuerdaten */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Steuerdaten</h2>
          <Feld k="ust_id" label="USt-IdNr." placeholder="DE123456789" />
          <Feld k="steuernummer" label="Steuernummer" placeholder="12/345/67890" />
        </div>

        {/* Bankverbindung */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Bankverbindung</h2>
          <Feld k="iban" label="IBAN" placeholder="DE89 3704 0044 0532 0130 00" />
          <Feld k="bic" label="BIC" placeholder="COBADEFFXXX" />
          <Feld k="bank" label="Bank" placeholder="Commerzbank AG" />
        </div>

        {/* Logo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Logo</h2>
          <Feld k="logo_url" label="Logo-URL" placeholder="https://example.com/logo.png" />
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
  );
}
