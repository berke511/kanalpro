'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';

function netto(r) {
  return (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
}
function mwst(r) { return netto(r) * (r.steuersatz ?? 0) / 100; }
function brutto(r) { return netto(r) + mwst(r); }
function fmt(n) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE');
}

const statusCls = {
  entwurf:  'bg-gray-100 text-gray-600',
  gesendet: 'bg-blue-50 text-blue-700',
  bezahlt:  'bg-green-50 text-green-700',
  mahnung:  'bg-orange-50 text-orange-600',
};

export default function PdfExport() {
  const [rechnungen, setRechnungen] = useState([]);
  const [firma, setFirma] = useState(null);
  const [laden, setLaden] = useState(true);
  const [jahr, setJahr] = useState(new Date().getFullYear().toString());
  const [quartal, setQuartal] = useState('alle');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: rech }, { data: einst }] = await Promise.all([
        supabase.from('rechnungen').select('*, kunden(name, email)').eq('user_id', user.id).order('datum', { ascending: true }),
        supabase.from('einstellungen').select('firmaname, strasse, plz, ort').eq('user_id', user.id).single(),
      ]);
      setRechnungen(rech ?? []);
      setFirma(einst ?? null);
      setLaden(false);
    }
    load();
  }, []);

  const filtered = rechnungen.filter(r => {
    if (!r.datum) return false;
    const d = new Date(r.datum);
    if (d.getFullYear().toString() !== jahr) return false;
    if (quartal !== 'alle') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      if (q.toString() !== quartal) return false;
    }
    return true;
  });

  const totalNetto  = filtered.reduce((s, r) => s + netto(r), 0);
  const totalMwst   = filtered.reduce((s, r) => s + mwst(r), 0);
  const totalBrutto = filtered.reduce((s, r) => s + brutto(r), 0);

  const jahre = [...new Set(
    rechnungen.map(r => r.datum ? new Date(r.datum).getFullYear().toString() : null).filter(Boolean)
  )].sort((a, b) => b - a);

  // ── Export: Umsatzliste PDF ──────────────────────────────────────────────
  async function exportUmsatzPdf() {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const firmaname = firma?.firmaname ?? 'Unbekannt';
      const adresse   = firma ? `${firma.strasse}, ${firma.plz} ${firma.ort}` : '';
      const zeitraum  = quartal === 'alle' ? `Jahr ${jahr}` : `Q${quartal} ${jahr}`;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Umsatzliste', 17, 20);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`${firmaname}  ·  ${adresse}`, 17, 29);
      doc.text(`Zeitraum: ${zeitraum}   ·   Exportdatum: ${new Date().toLocaleDateString('de-DE')}`, 17, 35);
      doc.setTextColor(0);

      doc.setDrawColor(220, 220, 220);
      doc.line(17, 39, 195, 39);

      let y = 47;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Rech.-Nr.',   17,  y);
      doc.text('Datum',       55,  y);
      doc.text('Kunde',       85,  y);
      doc.text('Status',      135, y);
      doc.text('Netto',       152, y, { align: 'right' });
      doc.text('MwSt',        169, y, { align: 'right' });
      doc.text('Brutto',      188, y, { align: 'right' });
      y += 4;
      doc.line(17, y, 195, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      for (const r of filtered) {
        if (y > 272) {
          doc.addPage();
          y = 20;
        }
        doc.text((r.rechnungsnummer ?? '—').substring(0, 15), 17, y);
        doc.text(fmtDate(r.datum),                            55, y);
        doc.text((r.kunden?.name ?? '—').substring(0, 28),   85, y);
        doc.text(r.status ?? '—',                            135, y);
        doc.text(fmt(netto(r)),                              152, y, { align: 'right' });
        doc.text(fmt(mwst(r)),                               169, y, { align: 'right' });
        doc.text(fmt(brutto(r)),                             188, y, { align: 'right' });
        y += 7;
      }

      y += 2;
      doc.line(17, y, 195, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text(`Gesamt (${filtered.length} Rechnungen)`, 17, y);
      doc.text(fmt(totalNetto),  152, y, { align: 'right' });
      doc.text(fmt(totalMwst),   169, y, { align: 'right' });
      doc.text(fmt(totalBrutto), 188, y, { align: 'right' });

      const filename = `Umsatzliste_${zeitraum.replace(/[\s/]/g, '_')}.pdf`;
      doc.save(filename);
    } finally {
      setExporting(false);
    }
  }

  // ── Export: Alle Einzelrechnungen als mehrseitiges PDF ───────────────────
  async function exportEinzelPdf() {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let first = true;

      for (const r of filtered) {
        if (!first) doc.addPage();
        first = false;

        const firmaname = firma?.firmaname ?? '';
        const b = brutto(r);
        const n = netto(r);
        const m = mwst(r);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rechnung ${r.rechnungsnummer ?? ''}`, 17, 22);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(firmaname, 17, 30);
        doc.setTextColor(0);

        doc.text(`Datum:       ${fmtDate(r.datum)}`,     17, 40);
        doc.text(`Fällig am:   ${fmtDate(r.faellig_am)}`, 17, 47);
        doc.text(`Kunde:       ${r.kunden?.name ?? '—'}`, 17, 54);
        doc.text(`Status:      ${r.status ?? '—'}`,        17, 61);

        doc.setDrawColor(220, 220, 220);
        doc.line(17, 66, 195, 66);

        let y = 74;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Pos.',     17, y); doc.text('Beschreibung', 30, y);
        doc.text('Menge', 130, y, { align: 'right' }); doc.text('Preis', 158, y, { align: 'right' }); doc.text('Gesamt', 188, y, { align: 'right' });
        y += 4; doc.line(17, y, 195, y); y += 6;

        doc.setFont('helvetica', 'normal');
        (r.positionen ?? []).forEach((p, i) => {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.text(`${i + 1}.`, 17, y);
          doc.text((p.beschreibung ?? '').substring(0, 55), 30, y);
          doc.text(`${p.menge}`, 130, y, { align: 'right' });
          doc.text(fmt(p.preis), 158, y, { align: 'right' });
          doc.text(fmt(p.menge * p.preis), 188, y, { align: 'right' });
          y += 7;
        });

        y += 3; doc.line(120, y, 195, y); y += 6;
        doc.text('Nettobetrag:',          120, y); doc.text(fmt(n), 188, y, { align: 'right' }); y += 7;
        doc.text(`MwSt. ${r.steuersatz ?? 0} %:`, 120, y); doc.text(fmt(m), 188, y, { align: 'right' }); y += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Bruttobetrag:',         120, y); doc.text(fmt(b), 188, y, { align: 'right' });
      }

      const zeitraum = quartal === 'alle' ? `${jahr}` : `Q${quartal}_${jahr}`;
      doc.save(`Rechnungen_Einzeln_${zeitraum}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  // ── Export: CSV ──────────────────────────────────────────────────────────
  function exportCsv() {
    const rows = [
      ['Rechnungsnummer', 'Datum', 'Fällig am', 'Bezahlt am', 'Kunde', 'Status', 'Netto (€)', 'MwSt (€)', 'Brutto (€)'],
      ...filtered.map(r => [
        r.rechnungsnummer ?? '',
        r.datum ?? '',
        r.faellig_am ?? '',
        r.bezahlt_am ?? '',
        r.kunden?.name ?? '',
        r.status ?? '',
        netto(r).toFixed(2).replace('.', ','),
        mwst(r).toFixed(2).replace('.', ','),
        brutto(r).toFixed(2).replace('.', ','),
      ]),
    ];
    const csv = rows.map(row =>
      row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')
    ).join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const zeitraum = quartal === 'alle' ? `${jahr}` : `Q${quartal}_${jahr}`;
    a.download = `Rechnungen_${zeitraum}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">PDF Export</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rechnungen für Steuerprogramme & DATEV exportieren</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/rechnungen/zahlungseingaenge"
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            ← Zahlungseingänge
          </Link>
          <Link href="/dashboard/rechnungen"
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Rechnungen ↗
          </Link>
        </div>
      </div>

      {/* Filter + Export-Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Jahr</label>
            <select
              value={jahr}
              onChange={e => setJahr(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {jahre.length === 0 && (
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              )}
              {jahre.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Quartal</label>
            <select
              value={quartal}
              onChange={e => setQuartal(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="alle">Gesamtes Jahr</option>
              <option value="1">Q1 (Jan – Mär)</option>
              <option value="2">Q2 (Apr – Jun)</option>
              <option value="3">Q3 (Jul – Sep)</option>
              <option value="4">Q4 (Okt – Dez)</option>
            </select>
          </div>

          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0 || exporting}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-40 transition"
              title="CSV-Datei für Excel / DATEV"
            >
              CSV Export
            </button>
            <button
              onClick={exportEinzelPdf}
              disabled={filtered.length === 0 || exporting}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition"
              title="Alle Einzelrechnungen als mehrseitiges PDF"
            >
              {exporting ? 'Exportiert…' : 'Einzel-PDFs'}
            </button>
            <button
              onClick={exportUmsatzPdf}
              disabled={filtered.length === 0 || exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition"
              title="Umsatzliste als PDF-Übersicht"
            >
              {exporting ? 'Exportiert…' : 'Umsatzliste PDF'}
            </button>
          </div>
        </div>
        {filtered.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            {filtered.length} Rechnung{filtered.length !== 1 ? 'en' : ''} im gewählten Zeitraum
          </p>
        )}
      </div>

      {/* Summary Cards */}
      {!laden && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ['Netto gesamt',  fmt(totalNetto),  'text-gray-900'],
            ['MwSt gesamt',   fmt(totalMwst),   'text-gray-700'],
            ['Brutto gesamt', fmt(totalBrutto), 'text-blue-700'],
          ].map(([label, value, cls]) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className={`text-xl font-bold mt-1 ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {laden ? (
          <div className="p-8 text-center text-gray-400 text-sm">Lädt…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Keine Rechnungen im gewählten Zeitraum.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nr.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Kunde</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Netto</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">MwSt</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Brutto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{r.rechnungsnummer ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">{fmtDate(r.datum)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.kunden?.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCls[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell whitespace-nowrap">{fmt(netto(r))}</td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell whitespace-nowrap">{fmt(mwst(r))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{fmt(brutto(r))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700">
                    {filtered.length} Rechnung{filtered.length !== 1 ? 'en' : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800 hidden lg:table-cell whitespace-nowrap">{fmt(totalNetto)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800 hidden lg:table-cell whitespace-nowrap">{fmt(totalMwst)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700 whitespace-nowrap">{fmt(totalBrutto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
