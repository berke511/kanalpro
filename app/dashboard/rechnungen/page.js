'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PlanGate from '@/components/PlanGate';

const statusConfig = {
  entwurf:  { label: 'Entwurf',  cls: 'bg-gray-100 text-gray-600'    },
  gesendet: { label: 'Gesendet', cls: 'bg-blue-50 text-blue-700'     },
  bezahlt:  { label: 'Bezahlt',  cls: 'bg-green-50 text-green-700'   },
  mahnung:  { label: 'Mahnung',  cls: 'bg-orange-50 text-orange-700' },
};

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

// jsPDF per CDN laden
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.jspdf) {
      resolve(window.jspdf.jsPDF);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error('jsPDF konnte nicht geladen werden.'));
    document.head.appendChild(script);
  });
}

function isUeberfaellig(r) {
  if (!r.datum) return false;
  const frist = new Date(r.datum);
  frist.setDate(frist.getDate() + (r.zahlungsziel ?? 14));
  return frist < new Date();
}

export default function Rechnungen() {
  const router = useRouter();
  const [tab, setTab] = useState('liste');
  const [rechnungen, setRechnungen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [firma, setFirma] = useState({ firmenname:'', adresse:'', telefon:'', email:'', steuernummer:'', ust_id:'', iban:'', bic:'', bank:'' });
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState('');

  const [myMember, setMyMember]     = useState(null);
  const [logoUrl, setLogoUrl]       = useState(null);
  const [logoLaden, setLogoLaden]   = useState(false);
  const [logoStatus, setLogoStatus] = useState('');
  const [logoError, setLogoError]   = useState('');
  const logoInputRef                = useRef(null);

  const mahnungen = rechnungen.filter(r => r.status === 'mahnung');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: rech }, { data: einst }] = await Promise.all([
        supabase.from('rechnungen').select('*, kunden(name)').eq('user_id', user.id).order('erstellt_am', { ascending: false }),
        supabase.from('einstellungen').select('*').eq('user_id', user.id).single(),
      ]);
      setRechnungen(rech ?? []);
      if (einst) setFirma(einst);

      const { data: member } = await supabase
        .from('company_members')
        .select('*, companies(id, logo_url)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (member) {
        setMyMember(member);
        setLogoUrl(member.companies?.logo_url ?? null);
      }
      setLaden(false);
    }
    load();
  }, []);

  function brutto(r) {
    const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + r.steuersatz / 100);
  }

  async function handleFirmaSpeichern(e) {
    e.preventDefault(); setFehler(''); setGespeichert(false);
    const { data: { user } } = await supabase.auth.getUser();
    const companyId = myMember?.company_id;
    const { error } = await supabase.from('einstellungen').upsert(
      { ...firma, user_id: user.id, company_id: companyId },
      { onConflict: 'user_id' }
    );
    if (error) { setFehler('Fehler beim Speichern: ' + error.message); }
    else { setGespeichert(true); setTimeout(() => setGespeichert(false), 3000); }
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
        : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${companyId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      const newUrl = urlData.publicUrl + '?t=' + Date.now();
      const { error: dbErr } = await supabase.from('companies').update({ logo_url: urlData.publicUrl }).eq('id', companyId);
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
      setLogoUrl(null); setLogoStatus('Logo entfernt.');
    } catch (err) { setLogoError('Fehler beim Entfernen.'); }
    setLogoLaden(false);
  }

  async function mahnungMarkieren(id) {
    const { error } = await supabase.from('rechnungen').update({ status: 'mahnung' }).eq('id', id);
    if (!error) setRechnungen(prev => prev.map(r => r.id === id ? { ...r, status: 'mahnung' } : r));
  }

  async function zurueckZuRechnungen(id) {
    const { error } = await supabase.from('rechnungen').update({ status: 'gesendet' }).eq('id', id);
    if (!error) setRechnungen(prev => prev.map(r => r.id === id ? { ...r, status: 'gesendet' } : r));
  }

  async function mahnbriefPDF(r) {
    try {
      const JsPDF = await loadJsPDF();
      const doc = new JsPDF();
      const betrag = brutto(r).toFixed(2).replace('.', ',');
      const rDatum = r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '-';
      const heute = new Date().toLocaleDateString('de-DE');
      const fristDatum = new Date();
      fristDatum.setDate(fristDatum.getDate() + 7);
      const zahlungsFrist = fristDatum.toLocaleDateString('de-DE');
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text(firma.firmenname || 'Ihr Unternehmen', 20, 20);
      doc.text(firma.adresse || '', 20, 26);
      if (firma.telefon) doc.text('Tel: ' + firma.telefon, 20, 32);
      if (firma.email) doc.text(firma.email, 20, 38);
      doc.setFontSize(16); doc.setTextColor(0); doc.setFont(undefined, 'bold');
      doc.text('MAHNUNG', 20, 60);
      doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(80);
      doc.text('Datum: ' + heute, 20, 70);
      doc.setTextColor(0); doc.setFontSize(11);
      doc.text(r.kunden?.name ?? 'Kunde', 20, 88);
      doc.setFontSize(10);
      doc.text('Betreff: Mahnung zur Rechnung ' + r.rechnungsnummer + ' vom ' + rDatum, 20, 105);
      const lines = [
        'Sehr geehrte Damen und Herren,', '',
        'trotz unserer Rechnung vom ' + rDatum + ' (Rechnungsnr.: ' + r.rechnungsnummer + ')',
        'ist der Betrag von ' + betrag + ' EUR bis heute nicht eingegangen.', '',
        'Bitte ueberweisen Sie ' + betrag + ' EUR bis spaetestens ' + zahlungsFrist + '.', '',
        firma.iban ? 'IBAN: ' + firma.iban : null,
        firma.bic  ? 'BIC:  ' + firma.bic  : null,
        firma.bank ? 'Bank: ' + firma.bank  : null,
        '', 'Falls Sie die Zahlung bereits veranlasst haben, betrachten Sie',
        'dieses Schreiben bitte als gegenstandslos.', '',
        'Mit freundlichen Gruessen', '', firma.firmenname || '',
      ].filter(l => l !== null);
      let y = 118;
      for (const line of lines) { doc.text(line, 20, y); y += 6; }
      doc.save('Mahnung_' + r.rechnungsnummer + '.pdf');
    } catch (err) { alert('PDF-Fehler: ' + err.message); }
  }

  function mahnungMailto(r) {
    const betrag = brutto(r).toFixed(2).replace('.', ',');
    const rDatum = r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '-';
    const fristDatum = new Date(); fristDatum.setDate(fristDatum.getDate() + 7);
    const zahlungsFrist = fristDatum.toLocaleDateString('de-DE');
    const subject = encodeURIComponent('Mahnung: Rechnung ' + r.rechnungsnummer);
    const bodyText = 'Sehr geehrte Damen und Herren,\n\n' +
      'trotz unserer Rechnung vom ' + rDatum + ' (Rechnungsnummer: ' + r.rechnungsnummer + ') ' +
      'ist der Betrag von ' + betrag + ' EUR bis heute noch nicht eingegangen.\n\n' +
      'Bitte ueberweisen Sie den Betrag von ' + betrag + ' EUR bis zum ' + zahlungsFrist + '.\n\n' +
      (firma.iban ? 'IBAN: ' + firma.iban + '\n' : '') +
      (firma.bic  ? 'BIC: '  + firma.bic  + '\n' : '') +
      (firma.bank ? 'Bank: ' + firma.bank  + '\n' : '') +
      '\nMit freundlichen Gruessen\n' + (firma.firmenname || '');
    window.location.href = 'mailto:' + (r.kunden?.email ?? '') + '?subject=' + subject + '&body=' + encodeURIComponent(bodyText);
  }

  return (
    <PlanGate feature="rechnungen">
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
        {tab === 'liste' && (
          <Link href="/dashboard/rechnungen/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">+ Neue Rechnung</Link>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {[
          { key: 'liste',       label: 'Rechnungen' },
          { key: 'mahnungen',   label: mahnungen.length > 0 ? 'Mahnungen (' + mahnungen.length + ')' : 'Mahnungen' },
          { key: 'firmendaten', label: 'Firmendaten' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'liste' && (
        laden ? <p className="text-gray-400">Wird geladen...</p> : rechnungen.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Noch keine Rechnungen</p>
            <p className="text-sm mt-1">Erstelle deine erste Rechnung.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Nummer</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Datum</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Betrag (brutto)</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rechnungen.map(r => {
                  const cfg = statusConfig[r.status] ?? statusConfig.entwurf;
                  const kannMahnung = r.status === 'gesendet' && isUeberfaellig(r);
                  return (
                    <tr key={r.id} onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)} className="hover:bg-gray-50 transition cursor-pointer">
                      <td className="px-5 py-3 font-mono font-medium text-gray-900">{r.rechnungsnummer}</td>
                      <td className="px-5 py-3 text-gray-500">{r.kunden?.name ?? '–'}</td>
                      <td className="px-5 py-3 text-gray-500">{r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '–'}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{brutto(r).toFixed(2).replace('.', ',')} €</td>
                      <td className="px-5 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>{cfg.label}</span></td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        {kannMahnung && (
                          <button onClick={() => mahnungMarkieren(r.id)}
                            className="px-3 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium hover:bg-orange-100 transition whitespace-nowrap">
                            → Als Mahnung markieren
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'mahnungen' && (
        laden ? <p className="text-gray-400">Wird geladen...</p> : mahnungen.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Keine Mahnungen vorhanden</p>
            <p className="text-sm mt-1">Überfällige gesendete Rechnungen können im Rechnungen-Tab als Mahnung markiert werden.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Nummer</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Datum</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Betrag (brutto)</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mahnungen.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-mono font-medium text-gray-900">{r.rechnungsnummer}</td>
                    <td className="px-5 py-3 text-gray-500">{r.kunden?.name ?? '–'}</td>
                    <td className="px-5 py-3 text-gray-500">{r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '–'}</td>
                    <td className="px-5 py-3 font-medium text-orange-700">{brutto(r).toFixed(2).replace('.', ',')} €</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => mahnbriefPDF(r)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition">
                          📄 Mahnbrief PDF
                        </button>
                        <button onClick={() => mahnungMailto(r)}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium hover:bg-indigo-100 transition">
                          ✉️ Mahnung per E-Mail
                        </button>
                        <button onClick={() => zurueckZuRechnungen(r.id)}
                          className="px-3 py-1 bg-gray-50 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-100 transition">
                          ← Zurück zu Rechnungen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'firmendaten' && (
        <div className="space-y-5 max-w-xl">
          <form onSubmit={handleFirmaSpeichern} className="space-y-5">
            {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
            {gespeichert && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg font-medium">Erfolgreich gespeichert!</div>}
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

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-blue-600 mb-4">Firmenlogo</h2>
            {logoUrl ? (
              <div className="mb-3 flex items-center gap-4">
                <div className="w-28 h-16 border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={logoUrl} alt="Firmenlogo" className="max-w-full max-h-full object-contain p-1" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoLaden}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                    Logo ersetzen
                  </button>
                  <button type="button" onClick={handleLogoEntfernen} disabled={logoLaden}
                    className="px-3.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition">
                    Logo entfernen
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <div onClick={() => logoInputRef.current?.click()}
                  className="cursor-pointer w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Logo hochladen</p>
                  <p className="text-xs text-gray-400">JPG, PNG, SVG oder WebP · max. 2 MB</p>
                </div>
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/svg+xml,image/webp"
              className="hidden" onChange={handleLogoUpload} />
            {logoLaden && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                Wird hochgeladen…
              </div>
            )}
            {logoStatus && !logoLaden && <p className="text-sm text-green-600">{logoStatus}</p>}
            {logoError && <p className="text-sm text-red-600">{logoError}</p>}
            <p className="text-xs text-gray-400 mt-4">Das Logo erscheint automatisch auf deinen Rechnungs- und Angebots-PDFs.</p>
          </div>
        </div>
      )}
    </div>
    </PlanGate>
  );
}
