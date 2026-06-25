'use client';
import { useEffect, useState } from 'react';
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
  const [rechnungen, setRechnungen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [firma, setFirma] = useState({ firmenname:'', adresse:'', telefon:'', email:'', steuernummer:'', ust_id:'', iban:'', bic:'', bank:'' });


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

      setLaden(false);
    }
    load();
  }, []);

  function brutto(r) {
    const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + r.steuersatz / 100);
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
          <Link href="/dashboard/rechnungen/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">+ Neue Rechnung</Link>
      </div>
        {laden ? <p className="text-gray-400">Wird geladen...</p> : rechnungen.length === 0 ? (
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
                      <td className="px-5 py-3 text-gray-500">{r.kunden?.name ?? 'â'}</td>
                      <td className="px-5 py-3 text-gray-500">{r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : 'â'}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{brutto(r).toFixed(2).replace('.', ',')} â¬</td>
                      <td className="px-5 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>{cfg.label}</span></td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        {kannMahnung && (
                          <button onClick={() => mahnungMarkieren(r.id)}
                            className="px-3 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium hover:bg-orange-100 transition whitespace-nowrap">
                            â Als Mahnung markieren
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
          )


    </div>
    </PlanGate>
  );
}
