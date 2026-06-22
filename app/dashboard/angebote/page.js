'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const statusConfig = {
  entwurf:    { label: 'Entwurf',    cls: 'bg-gray-100 text-gray-600'   },
  gesendet:   { label: 'Gesendet',   cls: 'bg-blue-50 text-blue-700'    },
  angenommen: { label: 'Angenommen', cls: 'bg-green-50 text-green-700'  },
  abgelehnt:  { label: 'Abgelehnt',  cls: 'bg-red-50 text-red-600'      },
};

function fmt(n) { return n.toFixed(2).replace('.', ',') + ' €'; }

export default function Angebote() {
  const router = useRouter();
  const [tab, setTab]           = useState('angebote');
  const [angebote, setAngebote] = useState([]);
  const [laden, setLaden]       = useState(true);

  // PDF-Export state
  const [selectedId, setSelectedId] = useState('');
  const [pdfLaden, setPdfLaden]     = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('angebote')
        .select('*, kunden(name, adresse, email)')
        .order('erstellt_am', { ascending: false });
      setAngebote(data ?? []);
      setLaden(false);
    }
    load().catch(() => setLaden(false));
  }, []);

  function calcBrutto(a) {
    const netto = (a.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + (a.steuersatz ?? 19) / 100);
  }

  const selected = angebote.find(a => a.id === selectedId) ?? null;

  async function handlePDF() {
    if (!selected) return;
    setPdfLaden(true);
    if (!window.jspdf) {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    }
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF();
    const blau = [37, 99, 235];
    const grau = [107, 114, 128];
    const a    = selected;
    const nr   = a.angebotsnummer ?? '–';
    const positionen = a.positionen ?? [];
    const netto  = positionen.reduce((s, p) => s + p.menge * p.preis, 0);
    const mwst   = netto * (a.steuersatz ?? 19) / 100;
    const brutto = netto + mwst;
    const kunde  = a.kunden ?? null;

    // Header
    doc.setFillColor(...blau); doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold');   doc.text('KanalPro', 15, 18);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('Rohr- & Kanalservice Verwaltung', 15, 26);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');   doc.text('ANGEBOT', 195, 18, { align: 'right' });
    doc.setFontSize(9);  doc.setFont('helvetica', 'normal'); doc.text('Nr: ' + nr, 195, 26, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Absender + Empfänger
    doc.setFontSize(8); doc.setTextColor(...grau);
    doc.text('Ihr Unternehmen · Musterstraße 1 · 40000 Düsseldorf', 15, 45);
    doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold');
    doc.text('Angebot für:', 15, 55);
    doc.setFont('helvetica', 'normal');
    if (kunde) {
      doc.text(kunde.name ?? '', 15, 62);
      if (kunde.adresse) doc.text(kunde.adresse, 15, 68);
    } else {
      doc.text('Kein Kunde zugewiesen', 15, 62);
    }

    // Datum / Gültig bis
    doc.setFont('helvetica', 'bold');
    doc.text('Datum:', 130, 55);
    doc.text('Gültig bis:', 130, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(a.datum      ? new Date(a.datum).toLocaleDateString('de-DE')          : '–', 195, 55, { align: 'right' });
    doc.text(a.gueltig_bis ? new Date(a.gueltig_bis).toLocaleDateString('de-DE') : '30 Tage ab Angebotsdatum', 195, 62, { align: 'right' });

    // Divider + Intro
    doc.setDrawColor(...blau); doc.setLineWidth(0.5); doc.line(15, 75, 195, 75);
    doc.setFontSize(9); doc.setTextColor(...grau);
    doc.text('Wir unterbreiten Ihnen folgendes Angebot:', 15, 82);

    // Positionen-Tabelle
    doc.autoTable({
      startY: 88,
      head: [['Pos.', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],
      body: positionen.map((p, i) => [
        i + 1,
        p.beschreibung || '–',
        p.menge,
        p.einheit,
        p.preis.toFixed(2).replace('.', ',') + ' €',
        (p.menge * p.preis).toFixed(2).replace('.', ',') + ' €',
      ]),
      headStyles:         { fillColor: blau, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles:         { fontSize: 9 },
      columnStyles:       { 0: { cellWidth: 12 }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin:             { left: 15, right: 15 },
    });

    // Summen
    const ty = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9); doc.setTextColor(...grau);
    doc.text('Nettobetrag:', 140, ty);
    doc.text(netto.toFixed(2).replace('.', ',') + ' €', 195, ty, { align: 'right' });
    doc.text('MwSt. ' + (a.steuersatz ?? 19) + '%:', 140, ty + 7);
    doc.text(mwst.toFixed(2).replace('.', ',') + ' €', 195, ty + 7, { align: 'right' });
    doc.setDrawColor(...grau); doc.line(140, ty + 10, 195, ty + 10);
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Angebotssumme:', 140, ty + 17);
    doc.setTextColor(...blau);
    doc.text(brutto.toFixed(2).replace('.', ',') + ' €', 195, ty + 17, { align: 'right' });

    // Notizen
    if (a.notizen) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(9);
      doc.text('Hinweis:', 15, ty + 30);
      doc.setTextColor(...grau);
      doc.text(a.notizen, 15, ty + 37, { maxWidth: 180 });
    }

    // Footer
    doc.setFillColor(249, 250, 251); doc.rect(15, 262, 180, 18, 'F');
    doc.setTextColor(...grau); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Dieses Angebot ist freibleibend und unverbindlich. Preise inkl. gesetzlicher MwSt.', 105, 270, { align: 'center' });
    doc.setFontSize(7); doc.setTextColor(156, 163, 175);
    doc.text('Erstellt mit KanalPro', 105, 285, { align: 'center' });

    doc.save('Angebot_' + nr + '.pdf');
    setPdfLaden(false);
  }

  return (
    <div>
      {/* ── Tab-Bar + Action ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('angebote')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === 'angebote' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Angebote
          </button>
          <Link
            href="/dashboard/angebote/vorlagen"
            className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 transition"
          >
            Vorlagen
          </Link>
          <button
            onClick={() => setTab('pdf')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === 'pdf' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            PDF-Export
          </button>
        </div>
        {tab === 'angebote' && (
          <Link href="/dashboard/angebote/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
            + Neues Angebot
          </Link>
        )}
      </div>

      {/* ── Angebote-Tab ── */}
      {tab === 'angebote' && (
        laden ? (
          <p className="text-gray-400 text-sm">Wird geladen…</p>
        ) : angebote.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">Noch keine Angebote</p>
            <p className="text-xs text-gray-400 mt-1">Erstelle dein erstes Angebot.</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {angebote.map(a => {
                  const cfg = statusConfig[a.status] ?? statusConfig.entwurf;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/dashboard/angebote/${a.id}`)}
                      className="hover:bg-gray-50 transition cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono font-medium text-gray-900">{a.angebotsnummer ?? '–'}</td>
                      <td className="px-5 py-3 text-gray-500">{a.kunden?.name ?? '–'}</td>
                      <td className="px-5 py-3 text-gray-500">{a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{fmt(calcBrutto(a))}</td>
                      <td className="px-5 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>{cfg.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── PDF-Export-Tab ── */}
      {tab === 'pdf' && (
        <div className="max-w-xl space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Angebot als PDF exportieren</h2>
                <p className="text-xs text-gray-400 mt-0.5">Wähle ein Angebot aus und lade es als professionelles PDF herunter.</p>
              </div>
            </div>

            {laden ? (
              <p className="text-gray-400 text-sm">Angebote werden geladen…</p>
            ) : angebote.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Angebote vorhanden. <Link href="/dashboard/angebote/neu" className="text-blue-600 hover:underline">Neues Angebot erstellen →</Link></p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Angebot auswählen</label>
                  <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Angebot wählen —</option>
                    {angebote.map(a => (
                      <option key={a.id} value={a.id}>
                        {(a.angebotsnummer ?? '–') + (a.kunden?.name ? ' · ' + a.kunden.name : '') + (a.datum ? ' · ' + new Date(a.datum).toLocaleDateString('de-DE') : '')}
                      </option>
                    ))}
                  </select>
                </div>

                {selected && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-gray-900">{selected.angebotsnummer ?? '–'}</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${(statusConfig[selected.status] ?? statusConfig.entwurf).cls}`}>
                        {(statusConfig[selected.status] ?? statusConfig.entwurf).label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
                      <div><span className="text-gray-400 text-xs">Kunde</span><div className="mt-0.5">{selected.kunden?.name ?? '–'}</div></div>
                      <div><span className="text-gray-400 text-xs">Datum</span><div className="mt-0.5">{selected.datum ? new Date(selected.datum).toLocaleDateString('de-DE') : '–'}</div></div>
                      <div><span className="text-gray-400 text-xs">Gültig bis</span><div className="mt-0.5">{selected.gueltig_bis ? new Date(selected.gueltig_bis).toLocaleDateString('de-DE') : '30 Tage'}</div></div>
                      <div><span className="text-gray-400 text-xs">Positionen</span><div className="mt-0.5">{(selected.positionen ?? []).length}</div></div>
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold text-gray-900">
                      <span>Gesamtbetrag (brutto)</span>
                      <span className="text-blue-600">{fmt(calcBrutto(selected))}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePDF}
                  disabled={!selectedId || pdfLaden}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {pdfLaden ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      PDF wird erstellt…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Als PDF herunterladen
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
