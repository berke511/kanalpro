'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

export default function NeueRechnung() {
  const router = useRouter();
  const [kunden, setKunden] = useState([]);
  const [form, setForm] = useState({ kunde_id: '', datum: new Date().toISOString().split('T')[0], faellig_am: '', steuersatz: 19, notizen: '' });
  const [positionen, setPositionen] = useState([{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]);
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);
  const [pdfLaden, setPdfLaden] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('kunden').select('id, name, adresse, email').eq('user_id', user.id).order('name');
      setKunden(data ?? []);
    }
    load();
  }, []);

  function onChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  function onPosition(i, field, value) {
    const n = [...positionen];
    n[i] = { ...n[i], [field]: (field === 'menge' || field === 'preis') ? parseFloat(value) || 0 : value };
    setPositionen(n);
  }
  function addPos() { setPositionen([...positionen, { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]); }
  function removePos(i) { if (positionen.length > 1) setPositionen(positionen.filter((_, j) => j !== i)); }

  const netto = positionen.reduce((s, p) => s + p.menge * p.preis, 0);
  const mwst  = netto * form.steuersatz / 100;
  const brutto = netto + mwst;

  async function handleSpeichern(e) {
    e.preventDefault(); setFehler(''); setLaden(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { count } = await supabase.from('rechnungen').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const nr = `RE-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`;
    const { error } = await supabase.from('rechnungen').insert({
      ...form, kunde_id: form.kunde_id || null, faellig_am: form.faellig_am || null,
      steuersatz: Number(form.steuersatz), positionen, rechnungsnummer: nr, user_id: user.id,
    });
    if (error) { setFehler('Fehler beim Speichern.'); } else { router.push('/dashboard/rechnungen'); }
    setLaden(false);
  }

  async function handlePDF() {
    setPdfLaden(true);
    const kunde = kunden.find(k => k.id === form.kunde_id);
    if (!window.jspdf) {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const blau = [37, 99, 235], grau = [107, 114, 128];
    const nr = `RE-${new Date().getFullYear()}-XXX`;

    doc.setFillColor(...blau); doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(22); doc.setFont('helvetica','bold'); doc.text('KanalPro', 15, 18);
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text('Rohr- & Kanalservice Verwaltung', 15, 26);
    doc.setFontSize(20); doc.setFont('helvetica','bold'); doc.text('RECHNUNG', 195, 18, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.text(`Nr: ${nr}`, 195, 26, { align: 'right' });
    doc.setTextColor(0,0,0);
    doc.setFontSize(8); doc.setTextColor(...grau); doc.text('Ihr Unternehmen · Musterstraße 1 · 40000 Düsseldorf', 15, 45);
    doc.setFontSize(10); doc.setTextColor(0,0,0); doc.setFont('helvetica','bold'); doc.text('Rechnungsempfänger:', 15, 55);
    doc.setFont('helvetica','normal');
    if (kunde) { doc.text(kunde.name, 15, 62); if (kunde.adresse) doc.text(kunde.adresse, 15, 68); }
    else { doc.text('Kein Kunde ausgewählt', 15, 62); }
    doc.setFont('helvetica','bold'); doc.text('Datum:', 130, 55); doc.text('Fällig bis:', 130, 62);
    doc.setFont('helvetica','normal');
    doc.text(form.datum ? new Date(form.datum).toLocaleDateString('de-DE') : '–', 195, 55, { align: 'right' });
    doc.text(form.faellig_am ? new Date(form.faellig_am).toLocaleDateString('de-DE') : '14 Tage nach Rechnungsdatum', 195, 62, { align: 'right' });
    doc.setDrawColor(...blau); doc.setLineWidth(0.5); doc.line(15, 82, 195, 82);
    doc.autoTable({
      startY: 88,
      head: [['Pos.', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],
      body: positionen.map((p, i) => [i+1, p.beschreibung||'–', p.menge, p.einheit, `${p.preis.toFixed(2).replace('.',',')} €`, `${(p.menge*p.preis).toFixed(2).replace('.',',')} €`]),
      headStyles: { fillColor: blau, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0:{cellWidth:12}, 4:{halign:'right'}, 5:{halign:'right',fontStyle:'bold'} },
      alternateRowStyles: { fillColor: [249,250,251] },
      margin: { left: 15, right: 15 },
    });
    const ty = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9); doc.setTextColor(...grau);
    doc.text('Nettobetrag:', 140, ty); doc.text(`${netto.toFixed(2).replace('.',',')} €`, 195, ty, { align: 'right' });
    doc.text(`MwSt. ${form.steuersatz}%:`, 140, ty+7); doc.text(`${mwst.toFixed(2).replace('.',',')} €`, 195, ty+7, { align: 'right' });
    doc.setDrawColor(...grau); doc.line(140, ty+10, 195, ty+10);
    doc.setTextColor(0,0,0); doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text('Gesamtbetrag:', 140, ty+17); doc.setTextColor(...blau); doc.text(`${brutto.toFixed(2).replace('.',',')} €`, 195, y+17, { align: 'right' });
    if (form.notizen) { doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0); doc.setFontSize(9); doc.text('Hinweis:', 15, ty+30); doc.setTextColor(...grau); doc.text(form.notizen, 15, ty+37); }
    doc.setFillColor(249,250,251); doc.rect(15, 260, 180, 22, 'F');
    doc.setTextColor(...grau); doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text('Bankverbindung:', 20, 268);
    doc.setFont('helvetica','normal'); doc.text('IBAN: DE00 0000 0000 0000 0000 00  ·  BIC: XXXXXXXX  ·  [Ihre Bank]', 20, 275);
    doc.setFontSize(7); doc.setTextColor(156,163,175); doc.text('Erstellt mit KanalPro', 105, 285, { align: 'center' });
    doc.save(`Rechnung_${nr}.pdf`);
    setPdfLaden(false);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/rechnungen" className="text-gray-400 hover:text-gray-600 text-sm">← Zurück</Link>
        <h1 className="text-2xl font-bold text-gray-900">Neue Rechnung</h1>
      </div>
      <form onSubmit={handleSpeichern} className="space-y-5">
        {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Rechnungsdetails</h2>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
            <select name="kunde_id" value={form.kunde_id} onChange={onChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Kein Kunde —</option>
              {kunden.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Rechnungsdatum</label><input type="date" name="datum" value={form.datum} onChange={onChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fällig bis</label><input type="date" name="faellig_am" value={form.faellig_am} onChange={onChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Steuersatz</label>
            <select name="steuersatz" value={form.steuersatz} onChange={onChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={19}>19 % (Regelsteuersatz)</option>
              <option value={7}>7 % (ermäßigt)</option>
              <option value={0}>0 % (steuerfrei / Kleinunternehmer)</option>
            </select>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Positionen</h2>
          <div className="space-y-3">
            {positionen.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5"><input type="text" value={p.beschreibung} onChange={e=>onPosition(i,'beschreibung',e.target.value)} placeholder="Leistungsbeschreibung" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="col-span-2"><input type="number" min="0" step="0.5" value={p.menge} onChange={e=>onPosition(i,'menge',e.target.value)} className="w7-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="col-span-2"><select value={p.einheit} onChange={e=>onPosition(i,'einheit',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"><option>Pauschal</option><option>Stunde</option><option>Stück</option><option>m</option><option>m²</option></select></div>
                <div className="col-span-2"><input type="number" min="0" step="0.01" value={p.preis} onChange={e=>onPosition(i,'preis',e.target.value)} placeholder="€" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="col-span-1 flex justify-center"><button type="button" onClick={()=>removePos(i)} className="text-gray-300 hover:text-red-400 text-xl leading-none">×</button></div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addPos} className="mt-3 text-sm text-blue-600 hover:underline font-medium">+ Position hinzufügen</button>
          <div className="mt-6 border-t border-gray-100 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Netto</span><span>{netto.toFixed(2).replace('.',',')} €</span></div>
            <div className="flex justify-between text-gray-500"><span>MwSt. {form.steuersatz} %</span><span>{mwst.toFixed(2).replace('.',',')} €</span></div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200"><span>Gesamt (brutto)</span><span className="text-blue-600">{brutto.toFixed(2).replace('.',',')} €</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notizen / Zahlungshinweis</label>
          <textarea name="notizen" value={form.notizen} onChange={onChange} rows={2} placeholder="z. B. Bitte überweisen Sie den Betrag innerhalb von 14 Tagen..." className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div className="flex gap-3 pb-8">
          <button type="submit" disabled={laden} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 text-sm">{laden ? 'Wird gespeichert...' : 'Speichern'}</button>
          <button type="button" onClick={handlePDF} disabled={pdfLaden} className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-60 text-sm">{pdfLaden ? 'PDF wird erstellt...' : 'PDF herunterladen'}</button>
          <Link href="/dashboard/rechnungen" className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm">Abbrechen</Link>
        </div>
      </form>
    </div>
  );
}