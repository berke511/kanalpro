'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const firmaFelder = [
  { section: 'Firmendaten', items: [
    { name: 'firmenname',   label: 'Firmenname',    placeholder: 'Mustermann Rohrreinigung GmbH' },
    { name: 'adresse',      label: 'Adresse',       placeholder: 'Musterstraße 1, 40000 Düsseldorf' },
    { name: 'telefon',      label: 'Telefon',       placeholder: '0211 123456' },
    { name: 'email',        label: 'E-Mail',        placeholder: 'info@musterfirma.de' },
  ]},
  { section: 'Steuerdaten', items: [
    { name: 'steuernummer', label: 'Steuernummer',  placeholder: '123/456/78901' },
    { name: 'ust_id',       label: 'USt-IdNr.',     placeholder: 'DE123456789' },
  ]},
  { section: 'Bankverbindung', items: [
    { name: 'iban', label: 'IBAN', placeholder: 'DE00 0000 0000 0000 0000 00' },
    { name: 'bic',  label: 'BIC',  placeholder: 'DEUTDEDB' },
    { name: 'bank', label: 'Bank', placeholder: 'Deutsche Bank' },
  ]},
];


export default function FirmendatenEinstellungen() {
  const router = useRouter();
  // Firmendaten
  const [firma, setFirma] = useState({ firmenname:'', adresse:'', telefon:'', email:'', steuernummer:'', ust_id:'', iban:'', bic:'', bank:'' });
  const [firmaGespeichert, setFirmaGespeichert] = useState(false);
  const [firmaFehler, setFirmaFehler] = useState('');
  const [myMember, setMyMember] = useState(null);

  // Logo
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoLaden, setLogoLaden] = useState(false);
  const [logoStatus, setLogoStatus] = useState('');
  const [logoError, setLogoError] = useState('');
  const logoInputRef = useRef(null);


  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      const [{ data: einst }, { data: member }] = await Promise.all([
        supabase.from('einstellungen').select('*').eq('user_id', u.id).single(),
        supabase.from('company_members').select('*, companies(id, logo_url)').eq('user_id', u.id).eq('is_active', true).single(),
      ]);
      if (einst) setFirma(einst);
      if (member) {
        setMyMember(member);
        setLogoUrl(member.companies?.logo_url ?? null);
      }
    }
    load();
  }, []);

  async function handleFirmaSpeichern(e) {
    e.preventDefault(); setFirmaFehler(''); setFirmaGespeichert(false);
    const { data: { user: u } } = await supabase.auth.getUser();
    const companyId = myMember?.company_id;
    const { error } = await supabase.from('einstellungen').upsert(
      { ...firma, user_id: u.id, company_id: companyId },
      { onConflict: 'user_id' }
    );
    if (error) { setFirmaFehler('Fehler beim Speichern: ' + error.message); }
    else { setFirmaGespeichert(true); setTimeout(() => setFirmaGespeichert(false), 3000); }
  }


  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!ALLOWED.includes(file.type)) { setLogoError('Nur JPG, PNG, SVG oder WebP erlaubt.'); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError('Datei zu groß (max. 2 MB).'); return; }
    setLogoError(''); setLogoStatus(''); setLogoLaden(true);
    try {
      const companyId = myMember?.company_id;
      if (!companyId) throw new Error('Keine Firma gefunden.');
      const ext = file.type === 'image/svg+xml' ? 'svg'
        : file.type === 'image/png' ? 'png'
        : file.type === 'image/webp' ? 'webp'
        : 'jpg';
      const path = `${companyId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      const newUrl = urlData.publicUrl + '?t=' + Date.now();
      const { error: dbErr } = await supabase
        .from('companies')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', companyId);
      if (dbErr) throw dbErr;
      setLogoUrl(newUrl);
      setLogoStatus('Logo erfolgreich gespeichert!');
    } catch (err) {
      setLogoError('Fehler beim Upload: ' + (err.message ?? 'Unbekannt'));
    }
    setLogoLaden(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  }


  async function handleLogoEntfernen() {
    if (!confirm('Logo wirklich entfernen?')) return;
    setLogoError(''); setLogoStatus(''); setLogoLaden(true);
    try {
      const companyId = myMember?.company_id;
      await supabase.from('companies').update({ logo_url: null }).eq('id', companyId);
      setLogoUrl(null);
      setLogoStatus('Logo entfernt.');
    } catch (err) {
      setLogoError('Fehler beim Entfernen.');
    }
    setLogoLaden(false);
  }


  return (
    <div className="max-w-xl space-y-5">
        <div className="space-y-5 max-w-xl">
          <form onSubmit={handleFirmaSpeichern} className="space-y-5">
            {firmaFehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{firmaFehler}</div>}
            {firmaGespeichert && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg font-medium">Erfolgreich gespeichert!</div>}
            {firmaFelder.map(section => (
              <div key={section.section} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-blue-600">{section.section}</h2>
                {section.items.map(f => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type="text" value={firma[f.name] || ''} onChange={e => setFirma({ ...firma, [f.name]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            ))}
            <div>
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm">Firmendaten speichern</button>
              <p className="text-xs text-gray-400 mt-3">Diese Daten erscheinen automatisch auf deinen Rechnungs-PDFs.</p>
            </div>
          </form>

          {/* ── Firmenlogo ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-blue-600 mb-4">Firmenlogo</h2>

            {logoUrl ? (
              <div className="mb-3 flex items-center gap-4">
                <div className="w-28 h-16 border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="Firmenlogo"
                    className="max-w-full max-h-full object-contain p-1"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoLaden}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    Logo ersetzen
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoEntfernen}
                    disabled={logoLaden}
                    className="px-3.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition"
                  >
                    Logo entfernen
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="cursor-pointer w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition"
                >
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Logo hochladen</p>
                  <p className="text-xs text-gray-400">JPG, PNG, SVG oder WebP · max. 2 MB</p>
                </div>
              </div>
            )}

            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />

            {logoLaden && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                Wird hochgeladen…
              </div>
            )}
            {logoStatus && !logoLaden && (
              <p className="text-sm text-green-600">{logoStatus}</p>
            )}
            {logoError && (
              <p className="text-sm text-red-600">{logoError}</p>
            )}

            <p className="text-xs text-gray-400 mt-4">Das Logo erscheint automatisch auf deinen Rechnungs- und Angebots-PDFs.</p>
          </div>
        </div>
    </div>
  );
}
