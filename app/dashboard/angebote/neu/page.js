'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const LEISTUNGEN = [
  'Kanalreinigung (HD-Spülung)',
  'Kanalspülung (Hochdruck)',
  'TV-Inspektion / Kamerabefahrung',
  'Rohrreinigung (mechanisch)',
  'Verstopfungsbeseitigung',
  'Abflussreinigung',
  'Wurzelfräsen',
  'Roboterfräsen',
  'Dichtigkeitsprüfung (DIN EN 1610)',
  'Druckprobe Abwasserleitung',
  'Schlauch-Inlining (Schlauchliner)',
  'Kurzliner setzen',
  'Rohrmanschette setzen',
  'Grabenlose Kanalsanierung',
  'Schachtsanierung / Schachtabdichtung',
  'Anschlusskanal verlegen',
  'Hausanschluss prüfen',
  'Regenwasserkanal reinigen',
  'Sinkkastenreinigung',
  'Fettabscheider reinigen',
  'Ölabscheider reinigen',
  'Leckageortung',
  'Rohrbruchortung',
  'Abwasserpumpen-Wartung',
  'Pumpenwartung / -service',
  'Schacht reinigen',
  'Industriereinigung',
  'Notfalleinsatz / Havarie',
  'Befahrung nach DIBT-Richtlinie',
  'Vorreinigung vor Inspektion',
  'Dokumentation / Berichterstellung',
  'Anfahrtspauschale',
];

const INPUT = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const LABEL = 'block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide';

export default function NeuesAngebot() {
  const router = useRouter();
  const [kunden, setKunden] = useState([]);
  const [form, setForm] = useState({
    kunde_id: '',
    datum: new Date().toISOString().split('T')[0],
    gueltig_bis: '',
    steuersatz: 19,
    notizen: '',
  });
  const [positionen, setPositionen] = useState([
    { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 },
  ]);
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);
  const [pdfLaden, setPdfLaden] = useState(false);
  const [openDrop, setOpenDrop] = useState(null);
  const dropRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      if (!member) return;
      const { data } = await supabase.from('kunden').select('id, name, adresse, email').eq('company_id', member.company_id).order('name');
      setKunden(data ?? []);
    }
    load();
  }, []);

  // Close autocomplete on outside click
  useEffect(() => {
    function onDown(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpenDrop(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function onChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  function onPos(i, field, value) {
    const next = [...positionen];
    next[i] = { ...next[i], [field]: (field === 'menge' || field === 'preis') ? parseFloat(value) || 0 : value };
    setPositionen(next);
  }
  function addPos() { setPositionen([...positionen, { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]); }
  function removePos(i) { if (positionen.length > 1) setPositionen(positionen.filter((_, j) => j !== i)); }

  const netto  = positionen.reduce((s, p) => s + p.menge * p.preis, 0);
  const mwst   = netto * form.steuersatz / 100;
  const brutto = netto + mwst;
  const fmt = v => v.toFixed(2).replace('.', ',') + ' €';

  async function handleSpeichern(e) {
    e.preventDefault(); setFehler(''); setLaden(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      if (!member) throw new Error('Keine Company gefunden');
      const { count } = await supabase.from('angebote').select('*', { count: 'exact', head: true }).eq('company_id', member.company_id);
      const nr = `AN-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`;
      const { error } = await supabase.from('angebote').insert({
        user_id: user.id,
        company_id: member.company_id,
        angebotsnummer: nr,
        kunde_id: form.kunde_id || null,
        datum: form.datum,
        gueltig_bis: form.gueltig_bis || null,
        steuersatz: Number(form.steuersatz),
        positionen,
        status: 'entwurf',
        notizen: form.notizen || null,
      });
      if (error) throw error;
      router.push('/dashboard/angebote');
    } catch (err) {
      setFehler('Fehler beim Speichern: ' + (err.message ?? ''));
    }
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
    const nr = `AN-${new Date().getFullYear()}-XXX`;

    doc.setFillColor(...blau); doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.text('KanalPro', 15, 18);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('Rohr- & Kanalservice Verwaltung', 15, 26);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text('ANGEBOT', 195, 18, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`Nr: ${nr}`, 195, 26, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(8); doc.setTextColor(...grau); doc.text('Ihr Unternehmen · Musterstraße 1 · 40000 Düsseldorf', 15, 45);
    doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.text('Angebot für:', 15, 55);
    doc.setFont('helvetica', 'normal');
    if (kunde) { doc.text(kunde.name, 15, 62); if (kunde.adresse) doc.text(kunde.adresse, 15, 68); }
    else { doc.text('Kein Kunde ausgewählt', 15, 62); }

    doc.setFont('helvetica', 'bold'); doc.text('Datum:', 130, 55); doc.text('Gültig bis:', 130, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(form.datum ? new Date(form.datum).toLocaleDateString('de-DE') : '–', 195, 55, { align: 'right' });
    doc.text(form.gueltig_bis ? new Date(form.gueltig_bis).toLocaleDateString('de-DE') : '30 Tage ab Angebotsdatum', 195, 62, { align: 'right' });

    doc.setDrawColor(...blau); doc.setLineWidth(0.5); doc.line(15, 75, 195, 75);
    doc.setFontSize(9); doc.setTextColor(...grau);
    doc.text('Wir unterbreiten Ihnen folgendes Angebot:', 15, 82);

    doc.autoTable({
      startY: 88,
      head: [['Pos.', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],
      body: positionen.map((p, i) => [
        i + 1,
        p.beschreibung || '–',
        p.menge,
        p.einheit,
        `${p.preis.toFixed(2).replace('.', ',')} €`,
        `${(p.menge * p.preis).toFixed(2).replace('.', ',')} €`,
      ]),
      headStyles: { fillColor: blau, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 12 }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 15, right: 15 },
    });

    const ty = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9); doc.setTextColor(...grau);
    doc.text('Nettobetrag:', 140, ty);
    doc.text(`${netto.toFixed(2).replace('.', ',')} €`, 195, ty, { align: 'right' });
    doc.text(`MwSt. ${form.steuersatz}%:`, 140, ty + 7);
    doc.text(`${mwst.toFixed(2).replace('.', ',')} €`, 195, ty + 7, { align: 'right' });
    doc.setDrawColor(...grau); doc.line(140, ty + 10, 195, ty + 10);
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Angebotssumme:', 140, ty + 17);
    doc.setTextColor(...blau);
    doc.text(`${brutto.toFixed(2).replace('.', ',')} €`, 195, ty + 17, { align: 'right' });

    if (form.notizen) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(9);
      doc.text('Hinweis:', 15, ty + 30);
      doc.setTextColor(...grau); doc.text(form.notizen, 15, ty + 37, { maxWidth: 180 });
    }

    doc.setFillColor(249, 250, 251); doc.rect(15, 262, 180, 18, 'F');
    doc.setTextColor(...grau); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Dieses Angebot ist freibleibend und unverbindlich. Preise inkl. gesetzlicher MwSt.', 105, 270, { align: 'center' });
    doc.setFontSize(7); doc.setTextColor(156, 163, 175);
    doc.text('Erstellt mit KanalPro', 105, 285, { align: 'center' });

    doc.save(`Angebot_${nr}.pdf`);
    setPdfLaden(false);
  }

  return (
    <div className="max-w-3xl pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/angebote" className="text-gray-400 hover:text-gray-600 text-sm transition">← Zurück</Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-gray-900">Neues Angebot</h1>
      </div>

      <form onSubmit={handleSpeichern} className="space-y-4">
        {fehler && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>
        )}

        {/* ── Angebotsdetails ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Angebotsdetails</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL}>Kunde</label>
              <select name="kunde_id" value={form.kunde_id} onChange={onChange} className={INPUT}>
                <option value="">— Kein Kunde —</option>
                {kunden.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Angebotsdatum</label>
              <input type="date" name="datum" value={form.datum} onChange={onChange} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Gültig bis</label>
              <input type="date" name="gueltig_bis" value={form.gueltig_bis} onChange={onChange} className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Steuersatz</label>
              <select name="steuersatz" value={form.steuersatz} onChange={onChange} className={INPUT}>
                <option value={19}>19 % — Regelsteuersatz</option>
                <option value={7}>7 % — ermäßigter Steuersatz</option>
                <option value={0}>0 % — steuerfrei / Kleinunternehmer</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Positionen ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" ref={dropRef}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-8">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Leistungsbeschreibung</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-24">Menge</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-32">Einheit</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide w-32">Einzelpreis €</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Gesamt €</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {positionen.map((p, i) => {
                  const filtered = LEISTUNGEN.filter(l =>
                    l.toLowerCase().includes((p.beschreibung || '').toLowerCase())
                  );
                  const showDrop = openDrop === i && filtered.length > 0;
                  const gesamt = p.menge * p.preis;
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-gray-400 text-xs font-medium">{i + 1}</td>

                      {/* Beschreibung + Drop-Up */}
                      <td className="px-2 py-2 relative">
                        <input
                          type="text"
                          value={p.beschreibung}
                          onChange={e => { onPos(i, 'beschreibung', e.target.value); setOpenDrop(i); }}
                          onFocus={() => setOpenDrop(i)}
                          placeholder="Leistung eingeben oder wählen…"
                          autoComplete="off"
                          className={INPUT}
                        />
                        {showDrop && (
                          <ul className="absolute z-50 bottom-full mb-1 left-2 right-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto text-sm">
                            {filtered.map(l => (
                              <li
                                key={l}
                                onMouseDown={e => { e.preventDefault(); onPos(i, 'beschreibung', l); setOpenDrop(null); }}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 truncate border-b border-gray-50 last:border-0"
                              >{l}</li>
                            ))}
                          </ul>
                        )}
                      </td>

                      <td className="px-2 py-2">
                        <input
                          type="number" min="0" step="0.5"
                          value={p.menge}
                          onChange={e => onPos(i, 'menge', e.target.value)}
                          className={INPUT + ' text-right'}
                        />
                      </td>

                      <td className="px-2 py-2">
                        <select
                          value={p.einheit}
                          onChange={e => onPos(i, 'einheit', e.target.value)}
                          className={INPUT}
                        >
                          <option>Pauschal</option>
                          <option>Stunde</option>
                          <option>Stück</option>
                          <option>m</option>
                          <option>m²</option>
                        </select>
                      </td>

                      <td className="px-2 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={p.preis}
                          onChange={e => onPos(i, 'preis', e.target.value)}
                          placeholder="0,00"
                          className={INPUT + ' text-right'}
                        />
                      </td>

                      <td className="px-4 py-2 text-right font-medium text-gray-700 tabular-nums">
                        {fmt(gesamt)}
                      </td>

                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removePos(i)}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none transition"
                          title="Position entfernen"
                        >×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add row + Summary */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={addPos}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              + Position hinzufügen
            </button>

            {/* Summary */}
            <div className="min-w][220px] space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Netto</span>
                <span className="tabular-nums">{fmt(netto)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>MwSt. {form.steuersatz} %</span>
                <span className="tabular-nums">{fmt(mwst)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5">
                <span>Gesamtbetrag</span>
                <span className="text-blue-600 tabular-nums">{fmt(brutto)}</span>
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
              placeholder="z. B. Dieses Angebot ist 30 Tage gøltig. Lieferung innerhalb von 5 Werktagen nach Auftragserteilung."
              className={INPUT + ' resize-none'}
            />
          </div>
        </div>

        {/* ── Aktionen ── */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={laden}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            {laden ? 'Wird gespeichert…' : 'Angebot speichern'}
          </button>
          <button
            type="button"
            onClick={handlePDF}
            disabled={pdfLaden}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 text-sm"
          >
            {pdfLaden ? 'PDF wird erstellt…' : 'PDF Vorschau'}
          </button>
          <Link
            href="/dashboard/angebote"
            className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
