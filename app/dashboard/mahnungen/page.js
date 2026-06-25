'use client';
import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import PlanGate from '@/components/PlanGate';

export default function Mahnungen() {
  const [mahnungen, setMahnungen] = useState([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('rechnungen')
        .select('*, kunden(name, email, adresse)')
        .eq('user_id', user.id)
        .eq('status', 'mahnung')
        .order('erstellt_am', { ascending: false });
      setMahnungen(data ?? []);
      setLaden(false);
    }
    load();
  }, []);

  function brutto(r) {
    const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + r.steuersatz / 100);
  }

  function zahlungsziel(r) {
    const basis = r.faellig_am ? new Date(r.faellig_am) : new Date();
    const ziel = new Date(basis);
    ziel.setDate(ziel.getDate() + 14);
    return ziel.toLocaleDateString('de-DE');
  }

  async function zurueckZuRechnungen(id) {
    await supabase.from('rechnungen').update({ status: 'gesendet' }).eq('id', id);
    setMahnungen(prev => prev.filter(m => m.id !== id));
  }

  async function mahnbriefPDF(r) {
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const betrag = brutto(r).toFixed(2).replace('.', ',');
    const reDatum = r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '–';
    const heute = new Date().toLocaleDateString('de-DE');
    const ziel = zahlungsziel(r);
    const kundenName = r.kunden?.name ?? 'Sehr geehrte Damen und Herren';
    const kundenAdresse = r.kunden?.adresse ?? '';

    // Absender
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('KanalPro', 20, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Ihr Kanal-Dienstleister', 20, 26);
    doc.setTextColor(0, 0, 0);

    // Datum
    doc.setFontSize(10);
    doc.text(heute, 150, 30);

    // Empfaenger
    doc.setFontSize(11);
    doc.text(kundenName, 20, 55);
    if (kundenAdresse) {
      const zeilen = kundenAdresse.split(/[\n,]/).map(z => z.trim()).filter(Boolean);
      zeilen.forEach((z, i) => doc.text(z, 20, 63 + i * 6));
    }

    // Betreff
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Mahnung – Rechnung Nr. ' + r.rechnungsnummer, 20, 92);

    // Anrede & Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Sehr geehrte Damen und Herren,', 20, 108);
    const textBody = doc.splitTextToSize(
      'trotz unserer Rechnung vom ' + reDatum + ' über ' + betrag + ' € haben wir bis heute keinen ' +
      'Zahlungseingang verzeichnet. Wir bitten Sie, den ausstehenden Betrag bis zum ' +
      ziel + ' zu begleichen.',
      170
    );
    doc.text(textBody, 20, 118);

    // Gruss
    doc.text('Mit freundlichen Grüßen', 20, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('KanalPro', 20, 158);

    doc.save('Mahnung_' + r.rechnungsnummer + '.pdf');
  }

  function mahnungEmail(r) {
    const betrag = brutto(r).toFixed(2).replace('.', ',');
    const reDatum = r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '–';
    const ziel = zahlungsziel(r);
    const email = r.kunden?.email ?? '';
    const betreff = 'Mahnung – Rechnung Nr. ' + r.rechnungsnummer;
    const body =
      'Sehr geehrte Damen und Herren,\n\n' +
      'trotz unserer Rechnung vom ' + reDatum + ' über ' + betrag + ' € haben wir bis heute ' +
      'keinen Zahlungseingang verzeichnet. Wir bitten Sie, den ausstehenden Betrag bis zum ' +
      ziel + ' zu begleichen.\n\n' +
      'Mit freundlichen Grüßen\nKanalPro';
    window.location.href =
      'mailto:' + email +
      '?subject=' + encodeURIComponent(betreff) +
      '&body=' + encodeURIComponent(body);
  }

  return (
    <PlanGate feature="rechnungen">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mahnungen</h1>
        </div>

        {laden ? (
          <p className="text-gray-400">Wird geladen...</p>
        ) : mahnungen.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Keine offenen Mahnungen</p>
            <p className="text-sm mt-1">
              Hier erscheinen Rechnungen, die als Mahnung markiert wurden.
            </p>
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
                    <td className="px-5 py-3 font-mono font-medium text-gray-900">
                      {r.rechnungsnummer}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{r.kunden?.name ?? '–'}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '–'}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {brutto(r).toFixed(2).replace('.', ',')} €
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => mahnbriefPDF(r)}
                          className="px-3 py-1 bg-gray-700 text-white rounded text-xs font-medium hover:bg-gray-900 transition"
                        >
                          Mahnbrief PDF
                        </button>
                        <button
                          onClick={() => mahnungEmail(r)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition"
                        >
                          Mahnung per E-Mail
                        </button>
                        <button
                          onClick={() => zurueckZuRechnungen(r.id)}
                          className="px-3 py-1 bg-white border border-gray-300 text-gray-600 rounded text-xs font-medium hover:bg-gray-50 transition"
                        >
                          ← Zurück zu Rechnungen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PlanGate>
  );
}
