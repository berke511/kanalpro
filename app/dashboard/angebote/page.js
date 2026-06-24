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

  // Firmenlogo
  const [logoUrl, setLogoUrl] = useState(null);

  // E-Mail-Versand state
  const [emailSelectedId,  setEmailSelectedId]  = useState('');
  const [emailEmpfaenger,  setEmailEmpfaenger]  = useState('');
  const [emailBetreff,     setEmailBetreff]     = useState('');
  const [emailNachricht,   setEmailNachricht]   = useState('');


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
      // Logo laden
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (member) {
        const { data: co } = await supabase.from('companies').select('logo_url').eq('id', member.company_id).single();
        setLogoUrl(co?.logo_url ?? null);
      }
    }
    load().catch(() => setLaden(false));
  }, []);

  // Derived lists
  const offeneAngebote = angebote.filter(a => !a.auftrag);

  function calcBrutto(a) {
    const netto = (a.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + (a.steuersatz ?? 19) / 100);
  }

  // Auto-fill E-Mail-Felder beim Auswählen eines Angebots
  useEffect(() => {
    const a = angebote.find(x => x.id === emailSelectedId);
    if (!a) {
      setEmailEmpfaenger('');
      setEmailBetreff('');
      setEmailNachricht('');
      return;
    }
    const nr     = a.angebotsnummer ?? '–';
    const netto  = (a.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    const brutto = netto * (1 + (a.steuersatz ?? 19) / 100);
    const betrag = brutto.toFixed(2).replace('.', ',') + ' €';
    setEmailEmpfaenger(a.kunden?.email ?? '');
    setEmailBetreff(`Ihr Angebot Nr. ${nr} von KanalPro`);
    setEmailNachricht(
      `Sehr geehrte Damen und Herren,\n\n` +
      `vielen Dank für Ihr Interesse an unseren Leistungen.\n\n` +
      `anbei erhalten Sie unser Angebot Nr. ${nr} über ${betrag} (brutto inkl. MwSt.).\n\n` +
      `Wir würden uns freuen, Ihnen mit diesem Angebot weiterhelfen zu dürfen. ` +
      `Bei Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.\n\n` +
      `Mit freundlichen Grüßen\nIhr KanalPro-Team`
    );
  }, [emailSelectedId, angebote]);

  const selected = angebote.find(a => a.id === selectedId) ?? null;

  function loadLogoDataUrl(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

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

    let logoImgData = null, logoImgW = 0, logoImgH = 0;
    if (logoUrl) {
      const res = await loadLogoDataUrl(logoUrl);
      if (res) {
        const maxW = 52, maxH = 22;
        const ratio = res.w / res.h;
        if (ratio >= maxW / maxH) { logoImgW = maxW; logoImgH = maxW / ratio; }
        else { logoImgH = maxH; logoImgW = maxH * ratio; }
        logoImgData = res.dataUrl;
      }
    }

    doc.setFillColor(...blau); doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    if (logoImgData) {
      doc.addImage(logoImgData, 'PNG', 15, (35 - logoImgH) / 2, logoImgW, logoImgH);
    } else {
      doc.setFontSize(22); doc.setFont('helvetica', 'bold');   doc.text('KanalPro', 15, 18);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('Rohr- & Kanalservice Verwaltung', 15, 26);
    }
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');   doc.text('ANGEBOT', 195, 18, { align: 'right' });
    doc.setFontSize(9);  doc.setFont('helvetica', 'normal'); doc.text('Nr: ' + nr, 195, 26, { align: 'right' });
    doc.setTextColor(0, 0, 0);

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

    doc.setFont('helvetica', 'bold');
    doc.text('Datum:', 130, 55);
    doc.text('Gültig bis:', 130, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(a.datum       ? new Date(a.datum).toLocaleDateString('de-DE')          : '–', 195, 55, { align: 'right' });
    doc.text(a.gueltig_bis ? new Date(a.gueltig_bis).toLocaleDateString('de-DE')    : '30 Tage ab Angebotsdatum', 195, 62, { align: 'right' });

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
        p.preis.toFixed(2).replace('.', ',') + ' €',
        (p.menge * p.preis).toFixed(2).replace('.', ',') + ' €',
      ]),
      headStyles:         { fillColor: blau, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles:         { fontSize: 9 },
      columnStyles:       { 0: { cellWidth: 12 }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin:             { left: 15, right: 15 },
    });

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

    if (a.notizen) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(9);
      doc.text('Hinweis:', 15, ty + 30);
      doc.setTextColor(...grau);
      doc.text(a.notizen, 15, ty + 37, { maxWidth: 180 });
    }

    doc.setFillColor(249, 250, 251); doc.rect(15, 262, 180, 18, 'F');
    doc.setTextColor(...grau); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Dieses Angebot ist freibleibend und unverbindlich. Preise inkl. gesetzlicher MwSt.', 105, 270, { align: 'center' });
    doc.setFontSize(7); doc.setTextColor(156, 163, 175);
    doc.text('Erstellt mit KanalPro', 105, 285, { align: 'center' });

    doc.save('Angebot_' + nr + '.pdf');
    setPdfLaden(false);
  }

  function handleMailto() {
    const href =
      `mailto:${encodeURIComponent(emailEmpfaenger)}` +
      `?subject=${encodeURIComponent(emailBetreff)}` +
      `&body=${encodeURIComponent(emailNachricht)}`;
    window.location.href = href;
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
          <button
            onClick={() => setTab('email')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            E-Mail-Versand
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
        ) : offeneAngebote.length === 0 ? (
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
                {offeneAngebote.map(a => {
                  const cfg = statusConfig[a.status] ?? statusConfig.entwurf;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/dashboard/angebote/${a.id}`)}
                      className="hover:bg-gray-50 transition cursor-pointer