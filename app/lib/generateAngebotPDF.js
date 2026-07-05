'use client';
// Shared helper – Angebot PDF generation (jsPDF, browser-only)
// Usage: const doc = await generateAngebotPDF({ angebot, company });
//        const ab = doc.output('arraybuffer');

export async function generateAngebotPDF({ angebot, company }) {
    if (!window.jspdf) {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    }
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF();
    const blau = [37, 99, 235];
    const grau = [107, 114, 128];
    const a    = angebot;
    const nr   = a.angebotsnummer ?? '–';
    const positionen = a.positionen ?? [];
    const netto  = positionen.reduce((s, p) => s + p.menge * p.preis, 0);
    const mwst   = netto * (a.steuersatz ?? 19) / 100;
    const brutto = netto + mwst;
    const kunde  = a.kunden ?? null;

    // Firmendaten aus company-Parameter (alle optional, kein Crash bei fehlenden Werten)
    const logoUrl   = company?.logo_url ?? null;
    const firmeName = company?.name     ?? '';
    const firmeAdr  = company?.adresse  ?? '';

    // Logo in dataURL konvertieren
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

    // Header
    doc.setFillColor(...blau); doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    if (logoImgData) {
      doc.addImage(logoImgData, 'PNG', 15, (35 - logoImgH) / 2, logoImgW, logoImgH);
    } else {
      doc.setFontSize(22); doc.setFont('helvetica', 'bold');   doc.text(firmeName || 'Unternehmen', 15, 18);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(firmeAdr, 15, 26);
    }
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');   doc.text('ANGEBOT', 195, 18, { align: 'right' });
    doc.setFontSize(9);  doc.setFont('helvetica', 'normal'); doc.text('Nr: ' + nr, 195, 26, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Absender + Empfänger
    const absenderParts = [firmeName, firmeAdr].filter(Boolean).join(' · ');
    doc.setFontSize(8); doc.setTextColor(...grau);
    doc.text(absenderParts, 15, 45);
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

    return doc;
  }
