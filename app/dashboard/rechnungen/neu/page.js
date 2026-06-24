'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const LEISTUNGEN = [
  'Rohrreinigung',
  'Kanalreinigung',
  'Grundleitungsreinigung',
  'Fallstrangreinigung',
  'Fallleitungsreinigung',
  'Sammelleitungsreinigung',
  'Hausanschlussreinigung',
  'Hauptkanalreinigung',
  'Schmutzwasserleitungsreinigung',
  'Regenwasserleitungsreinigung',
  'Mischwasserkanalreinigung',
  'Drainagereinigung',
  'Dachentwässerungsreinigung',
  'Hofablaufreinigung',
  'Sinkkastenreinigung',
  'Straßenablaufreinigung',
  'Schachtreinigung',
  'Pumpenschachtreinigung',
  'Hebeanlagenreinigung',
  'Pumpwerksreinigung',
  'Fettabscheiderreinigung',
  'Ölabscheiderreinigung',
  'Benzinabscheiderreinigung',
  'Schlammfangreinigung',
  'Sandfangreinigung',
  'Regenrückhaltebeckenreinigung',
  'Regenüberlaufbeckenreinigung',
  'Zisternenreinigung',
  'Behälterreinigung',
  'Tankreinigung',
  'Rohrnetzspülung',
  'Kanalnetzspülung',
  'Hochdruckspülung',
  'Kombinierte Saug- und Spülarbeiten',
  'Absaugarbeiten',
  'Schlammentsorgung',
  'Sandabsaugung',
  'Fettabsaugung',
  'Ölabsaugung',
  'Verstopfungsbeseitigung',
  'Wurzelentfernung',
  'Betonentfernung',
  'Mörtelentfernung',
  'Kalkentfernung',
  'Ablagerungsentfernung',
  'Fremdkörperentfernung',
  'Wurzelfräsen',
  'Kettenfräsen',
  'Roboterschneiden',
  'Roboterfräsarbeiten',
  'Öffnen von Zuläufen',
  'Öffnen von Anschlüssen',
  'Beseitigung einragender Stutzen',
  'Entfernung von Hindernissen',
  'Sanierungsroboter-Einsatz',
  'Roboterspachtelarbeiten',
  'Roboterverpressarbeiten',
  'TV-Inspektion',
  'Kamerainspektion',
  'Rohrkamerauntersuchung',
  'Kanal-TV-Untersuchung',
  'Hausanschlussinspektion',
  'Schachtinspektion',
  'Großprofilinspektion',
  'Vorinspektion',
  'Nachinspektion',
  'Abnahmeinspektion',
  'Gewährleistungsinspektion',
  'Schadensaufnahme',
  'Schadensdokumentation',
  'Videodokumentation',
  'Fotodokumentation',
  'Zustandsbewertung',
  'Kanalzustandserfassung',
  'Bestandsaufnahme',
  'Bestandsdokumentation',
  'Kanalkatastererstellung',
  'Digitale Dokumentation',
  'GIS-Erfassung',
  'Leitungsortung',
  'Kanalortung',
  'Schachtortung',
  'Rohrverlaufsermittlung',
  'Schadensortung',
  'Leckageortung',
  'Rohrbruchortung',
  'Fremdwasserortung',
  'Ortung verdeckter Schächte',
  'GPS-Vermessung',
  'Kanalvermessung',
  'Schachtvermessung',
  'Höhenvermessung',
  'Lagevermessung',
  '3D-Vermessung',
  'Dichtheitsprøfung Luft',
  'Dichtheitsprüfung Wasser',
  'Kanaldichtheitsprüfung',
  'Rohrdichtheitsprüfung',
  'Schachtdichtheitsprüfung',
  'Hausanschlussprüfung',
  'Druckprüfung',
  'Funktionsprüfung',
  'Abnahmeprüfung',
  'Gewährleistungsprüfung',
  'Inspektionsprüfung',
  'Røckstausicherungsprüfung',
  'Hebeanlagenprüfung',
  'Pumpenprüfung',
  'Kanalwartung',
  'Rohrleitungswartung',
  'Entwässerungsanlagenwartung',
  'Hebeanlagenwartung',
  'Pumpenwartung',
  'Pumpwerkswartung',
  'Rückstausicherungswartung',
  'Rückstauklappenwartung',
  'Fettabscheiderwartung',
  'Ölabscheiderwartung',
  'Schachtwartung',
  'Regelinspektion',
  'Wartungsvertrag',
  'Jahreswartung',
  'Rohrreparatur',
  'Kanalreparatur',
  'Hausanschlussreparatur',
  'Schadstellenreparatur',
  'Punktuelle Sanierung',
  'Rissabdichtung',
  'Fugenabdichtung',
  'Injektionsarbeiten',
  'Verpressarbeiten',
  'Leckstellenabdichtung',
  'Kurzlinersanierung',
  'Partlinersanierung',
  'Hutprofilsanierung',
  'Stutzensanierung',
  'Anschlusssanierung',
  'Manschettensanierung',
  'Edelstahlmanschettensanierung',
  'Innenmanschettenmontage',
  'Roboter-Sanierung',
  'Verpresssanierung',
  'Schlauchlinersanierung',
  'Inlinersanierung',
  'UV-Liner-Sanierung',
  'Warmwasserliner-Sanierung',
  'Dampfliner-Sanierung',
  'Hausanschlussliner-Sanierung',
  'Relining',
  'Rohr-in-Rohr-Verfahren',
  'Wickelrohrverfahren',
  'Close-Fit-Lining',
  'Tight-Fit-Lining',
  'Sprühliner',
  'Beschichtung',
  'Innenbeschichtung',
  'Mineralauskleidung',
  'Korrosionsschutzbeschichtung',
  'Schachtabdichtung',
  'Schachtbeschichtung',
  'Schachtinstandsetzung',
  'Schachtauskleidung',
  'Schachtkopfsanierung',
  'Schachtrahmensanierung',
  'Schachtdeckelsanierung',
  'Gerinnesanierung',
  'Bermensanierung',
  'Steigeisensanierung',
  'Fugensanierung',
  'Schachtregulierung',
  'Kanalerneuerung',
  'Rohrerneuerung',
  'Hausanschlusserneuerung',
  'Leitungsneubau',
  'Kanalneubau',
  'Schachtneubau',
  'Austausch von Rohrleitungen',
  'Austausch von Schächten',
  'Berstlining',
  'Pipe Bursting',
  'Pipe Eating',
  'Rohrvortrieb',
  'Mikrotunneling',
  'Horizontalspülbohrung',
  'HDD-Bohrung',
  'Vortriebsarbeiten',
  'Rohrgrabenherstellung',
  'Rohrgrabenverfüllung',
  'Ausschachtungsarbeiten',
  'Erdarbeiten',
  'Baggerarbeiten',
  'Freilegungsarbeiten',
  'Aufbrucharbeiten',
  'Asphaltaufbruch',
  'Pflasteraufbruch',
  'Betonaufbruch',
  'Oberflächenwiederherstellung',
  'Asphaltarbeiten',
  'Pflasterarbeiten',
  'Betonarbeiten',
  'Einbau Rückstauklappe',
  'Einbau Rückstausicherung',
  'Einbau Hebeanlage',
  'Einbau Pumpanlage',
  'Einbau Kontrollschacht',
  'Einbau Revisionsschacht',
  'Einbau Hausanschluss',
  'Rohrverlegung',
  'Kanalverlegung',
  'Schachtmontage',
  'Fäkalschlammentsorgung',
  'Fettentsorgung',
  'Ölentsorgung',
  'Sonderabfallentsorgung',
  'Kanalrückstandsentsorgung',
  'Industrielle Abwasserentsorgung',
  'Behälterentleerung',
  'Abscheiderentleerung',
  'Kanalzustandsbewertung',
  'Sanierungskonzept',
  'Sanierungsplanung',
  'Kanalnetzplanung',
  'Entwässerungsplanung',
  'Ausschreibungserstellung',
  'Bauleitung',
  'Bauüberwachung',
  'Projektsteuerung',
  'Wirtschaftlichkeitsberechnung',
  'Werterhaltungskonzept',
  'Anfahrtspauschale',
  'Fahrzeugpauschale',
  'Spülfahrzeugpauschale',
  'Kamerafahrzeugpauschale',
  'Geräteeinsatz',
  'Baustelleneinrichtung',
  'Verkehrssicherung',
  'Absperrmaßnahmen',
  'Dokumentationspauschale',
  'Arbeitszeit Helfer',
  'Arbeitszeit Facharbeiter',
  'Arbeitszeit Kanaltechniker',
  'Arbeitszeit Sanierungstechniker',
  'Nachtzuschlag',
  'Wochenendzuschlag',
  'Feiertagszuschlag',
  'Notdienstzuschlag',
  'Havarieeinsatz',
  'Soforteinsatz',
  'Bereitschaftsdienst',
  '24-Stunden-Notdienst',
  'Notdienst Rohrreinigung',
  'Notdienst Kanalreinigung',
  'Rückstauschutz',
  'Einbau Rückstauverschluss',
  'Rückstauverschlusswartung',
  'Hebeanlageneinbau',
  'Hebeanlagenreparatur',
  'Pumpenreparatur',
  'Pumpenaustausch',
  'Schachtabdeckung erneuern',
  'Schachtdeckel austauschen',
  'Geruchsverschlussreinigung',
  'Rohrsanierung',
  'Kanalsanierung',
  'Hausanschlusssanierung',
  'Grundstücksentwässerung',
  'Entwässerungsberatung',
  'Kanalmanagement',
  'Kanalkatasterpflege',
  'Digitale Schadensbewertung',
  'CAD-Bestandspläne',
  '3D-Kanalmodellierung',
  'Asset-Management Kanalnetz',
  'Regenwassermanagement',
  'Versickerungsanlagenbau',
  'Drainagebau',
  'Drainagesanierung',
  'Regenwasserschachtbau',
  'Pumpenschachtbau',
  'Sonderbauwerksreinigung',
  'Kläranlagenservice',
  'Industriekanalservice',
  'Chemieanlagenreinigung',
  'Tunnelentwässerung',
  'Flughafenentwässerung',
  'Bahnentwässerung',
  'Hochwasserschutzanlagen-Service',
  'Regenüberlaufbecken-Service',
  'Regenrückhaltebecken-Service',
  'Großprofilkanalreinigung',
  'Großprofilkanalsanierung',
  'Rohrstatikprüfung',
  'Kanalstatikprüfung',
  'Zustandsklassifizierung nach DWA',
  'Sanierungsberatung',
  'Versicherungsdokumentation',
  'Gutachtenerstellung',
  'Technische Bestandsanalyse',
  'Vor-Ort-Beratung',
  'Baustellenbesichtigung',
  'Erstellung Fotobericht',
  'Erstellung Videobericht',
  'Erstellung Sanierungsangebot',
  'Erstellung Maßnahmenplan',
  'Sofortmaßnahmen bei Wasserschaden',
  'Notabdichtung',
  'Havariesanierung',
  'Rohrbruchbeseitigung',
  'Wasserschadenservice',
  'Freispülen von Leitungen',
  'Reinigung von Lüftungsleitungen in Entwässerungssystemen',
  'Hausanschlussortung',
  'Hausanschlussneubau',
  'Revisionsöffnung herstellen',
  'Revisionsöffnung erneuern',
  'Rohröffnung herstellen',
  'Kanalanschluss herstellen',
  'Kanalanschluss sanieren',
  'Anschlussleitung erneuern',
  'Anschlussleitung reinigen',
  'Anschlussleitung inspizieren',
  'Anschlussleitung sanieren',
];

export default function NeueRechnung() {
  const router = useRouter();
  const [kunden, setKunden] = useState([]);
  const [firma, setFirma] = useState({ firmenname:'', adresse:'', telefon:'', email:'', steuernummer:'', ust_id:'', iban:'', bic:'', bank:'' });
  const [form, setForm] = useState({ kunde_id: '', datum: new Date().toISOString().split('T')[0], faellig_am: '', steuersatz: 19, notizen: '' });
  const [positionen, setPositionen] = useState([{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]);
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);
  const [pdfLaden, setPdfLaden] = useState(false);
  const [openDrop, setOpenDrop] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: member }, { data: kundenData }, { data: einst }] = await Promise.all([
        supabase.from('company_members').select('company_id').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('kunden').select('id, name, adresse, email, telefon').eq('user_id', user.id).order('name'),
        supabase.from('einstellungen').select('*').eq('user_id', user.id).single(),
      ]);
      setKunden(kundenData ?? []);
      if (einst) setFirma(einst);
      if (member) {
        const { data: co } = await supabase.from('companies').select('logo_url').eq('id', member.company_id).single();
        setLogoUrl(co?.logo_url ?? null);
      }
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

    // Header-Block
    doc.setFillColor(...blau); doc.rect(0, 0, 210, 35, 'F');
    if (logoUrl) {
      try {
        const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=logoUrl; });
        doc.addImage(img, 'PNG', 12, 5, 0, 24);
      } catch {}
    }
    const firmaName = firma.firmenname || 'Ihr Unternehmen';
    doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text(firmaName, logoUrl ? 50 : 15, 17);
    doc.setFontSize(8); doc.setFont('helvetica','normal');
    if (firma.adresse) doc.text(firma.adresse, logoUrl ? 50 : 15, 24);
    doc.setFontSize(20); doc.setFont('helvetica','bold'); doc.text('RECHNUNG', 195, 17, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.text(`Nr: ${nr}`, 195, 25, { align: 'right' });
    doc.setTextColor(0,0,0);

    // Absender-Zeile (kleine Grauzeile)
    const absenderTeile = [firma.firmenname, firma.adresse, firma.telefon ? `Tel: ${firma.telefon}` : null, firma.email].filter(Boolean);
    doc.setFontSize(7.5); doc.setTextColor(...grau);
    doc.text(absenderTeile.join(' · '), 15, 44);

    // Empfänger
    doc.setFontSize(10); doc.setTextColor(0,0,0); doc.setFont('helvetica','bold'); doc.text('Rechnungsempfänger:', 15, 53);
    doc.setFont('helvetica','normal');
    if (kunde) {
      doc.text(kunde.name, 15, 60);
      if (kunde.adresse) doc.text(kunde.adresse, 15, 66);
      if (kunde.email) { doc.setTextColor(...grau); doc.setFontSize(8); doc.text(kunde.email, 15, 72); doc.setTextColor(0,0,0); doc.setFontSize(10); }
    } else {
      doc.setTextColor(...grau); doc.text('Kein Kunde ausgewählt', 15, 60); doc.setTextColor(0,0,0);
    }

    // Datum rechts
    doc.setFont('helvetica','bold'); doc.text('Datum:', 130, 53); doc.text('Fällig bis:', 130, 60);
    if (firma.steuernummer) { doc.text('Steuernr.:', 130, 67); }
    doc.setFont('helvetica','normal');
    doc.text(form.datum ? new Date(form.datum).toLocaleDateString('de-DE') : '–', 195, 53, { align: 'right' });
    doc.text(form.faellig_am ? new Date(form.faellig_am).toLocaleDateString('de-DE') : '14 Tage netto', 195, 60, { align: 'right' });
    if (firma.steuernummer) { doc.text(firma.steuernummer, 195, 67, { align: 'right' }); }

    doc.setDrawColor(...blau); doc.setLineWidth(0.5); doc.line(15, 80, 195, 80);

    doc.autoTable({
      startY: 86,
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
    doc.text('Gesamtbetrag:', 140, ty+17); doc.setTextColor(...blau); doc.text(`${brutto.toFixed(2).replace('.',',')} €`, 195, ty+17, { align: 'right' });
    if (form.notizen) { doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0); doc.setFontSize(9); doc.text('Hinweis:', 15, ty+30); doc.setTextColor(...grau); doc.text(form.notizen, 15, ty+37); }

    // Bankverbindung Footer
    const bankTeile = [
      firma.iban ? `IBAN: ${firma.iban}` : null,
      firma.bic  ? `BIC: ${firma.bic}`   : null,
      firma.bank || null,
    ].filter(Boolean);
    doc.setFillColor(249,250,251); doc.rect(15, 260, 180, 22, 'F');
    doc.setTextColor(...grau); doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text('Bankverbindung:', 20, 268);
    doc.setFont('helvetica','normal');
    doc.text(bankTeile.length ? bankTeile.join('  ·  ') : 'Keine Bankdaten hinterlegt', 20, 275);
    doc.setFontSize(7); doc.setTextColor(156,163,175); doc.text('Erstellt mit KanalPro', 105, 285, { align: 'center' });
    doc.save(`Rechnung_${nr}.pdf`);
    setPdfLaden(false);
  }

  const selectedKunde = kunden.find(k => k.id === form.kunde_id) ?? null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/rechnungen" className="text-gray-400 hover:text-gray-600 text-sm">← Zurück</Link>
        <h1 className="text-2xl font-bold text-gray-900">Neue Rechnung</h1>
      </div>
      <form onSubmit={handleSpeichern} className="space-y-5">
        {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}

        {/* ── Rechnungskopf ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Blauer Header-Streifen */}
          <div className="bg-blue-600 px-6 py-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-10 max-w-[80px] object-contain bg-white rounded-lg p-1" />
              )}
                    <div>
                <p className="text-white font-bold text-base leading-tight">{firma.firmenname || 'Ihr Unternehmen'}</p>
                {firma.adresse && <p className="text-blue-100 text-xs mt-0.5">{firma.adresse}</p>}
                <div className="flex gap-3 mt-0.5">
                  {firma.telefon && <p className="text-blue-100 text-xs">{firma.telefon}</p>}
                  {firma.email && <p className="text-blue-100 text-xs">{firma.email}</p>}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white font-bold text-xl tracking-wide">RECHNUNG</p>
              {firma.steuernummer && <p className="text-blue-100 text-xs mt-0.5">StNr: {firma.steuernummer}</p>}
              {firma.ust_id && <p className="text-blue-100 text-xs">USt-Id: {firma.ust_id}</p>}
            </div>
          </div>

          {/* Absender → Empfänger Block */}
          <div className="px-6 py-4 grid grid-cols-2 gap-6 border-b border-gray-100">
            {/* Absender */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Absender</p>
              <p className="text-sm font-medium text-gray-800">{firma.firmenname || <span className="text-gray-400 italic">Nicht hinterlegt</span>}</p>
              {firma.adresse && <p className="text-sm text-gray-500 mt-0.5">{firma.adresse}</p>}
              {(firma.iban || firma.bank) && (
                <p className="text-xs text-gray-400 mt-1.5">
                  {[firma.bank, firma.iban ? `IBAN: ${firma.iban}` : null].filter(Boolean).join(' · ')}
                </p>
              )}
              {!firma.firmenname && (
                <Link href="/dashboard/rechnungen?tab=firmendaten" className="text-xs text-blue-500 hover:underline mt-1 inline-block">Firmendaten hinterlegen →</Link>
              )}
            </div>
            {/* Empfänger */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Empfänger</p>
              {selectedKunde ? (
                <>
                  <p className="text-sm font-medium text-gray-800">{selectedKunde.name}</p>
                  {selectedKunde.adresse && <p className="text-sm text-gray-500 mt-0.5">{selectedKunde.adresse}</p>}
                  {selectedKunde.email && <p className="text-xs text-gray-400 mt-1">{selectedKunde.email}</p>}
                  {selectedKunde.telefon && <p className="text-xs text-gray-400">{selectedKunde.telefon}</p>}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Noch kein Kunde ausgewählt</p>
              )}
            </div>
          </div>

          {/* Datum-Zeile */}
          <div className="px-6 py-3 flex gap-6 text-sm bg-gray-50">
            <span className="text-gray-400">Datum: <span className="text-gray-700 font-medium">{form.datum ? new Date(form.datum + 'T00:00:00').toLocaleDateString('de-DE') : '–'}</span></span>
            {form.faellig_am && <span className="text-gray-400">Fällig: <span className="text-gray-700 font-medium">{new Date(form.faellig_am + 'T00:00:00').toLocaleDateString('de-DE')}</span></span>}
          </div>
        </div>

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
          <h2 className="font-semibold text-gray-800 mb-3">Positionen</h2>
          {/* Spaltenüberschriften */}
          <div className="grid grid-cols-[1fr_80px_100px_100px_90px_32px] gap-2 px-1 mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Beschreibung</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Menge</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Einheit</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preis (€)</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide text-right">Gesamt</span>
            <span></span>
          </div>
          <div className="space-y-2">
            {positionen.map((p, i) => {
              const filtered = LEISTUNGEN.filter(l => l.toLowerCase().includes((p.beschreibung || '').toLowerCase()));
              const showDrop = openDrop === i && filtered.length > 0;
              return (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_90px_32px] gap-2 items-center">
                <div className="relative">
                  <input type="text" value={p.beschreibung}
                    onChange={e => { onPosition(i,'beschreibung',e.target.value); setOpenDrop(i); }}
                    onFocus={() => setOpenDrop(i)}
                    onBlur={() => setTimeout(() => setOpenDrop(null), 150)}
                    placeholder="Leistungsbeschreibung"
                    autoComplete="off"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {showDrop && (
                    <ul className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto text-sm">
                      {filtered.map(l => (
                        <li key={l} onClick={() => { onPosition(i,'beschreibung',l); setOpenDrop(null); }}
                          className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 truncate border-b border-gray-50 last:border-0">{l}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <input type="number" min="0" step="0.5" value={p.menge} onChange={e=>onPosition(i,'menge',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={p.einheit} onChange={e=>onPosition(i,'einheit',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option>Pauschal</option>
                  <option>Stück</option>
                  <option>Std.</option>
                  <option>m</option>
                  <option>m²</option>
                  <option>m³</option>
                  <option>kg</option>
                  <option>t</option>
                </select>
                <input type="number" min="0" step="0.01" value={p.preis} onChange={e=>onPosition(i,'preis',e.target.value)} placeholder="0,00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-right text-sm font-medium text-gray-700 tabular-nums pr-1">{(p.menge * p.preis).toFixed(2).replace('.', ',')} €</span>
                <button type="button" onClick={()=>removePos(i)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition">×</button>
              </div>
              );
            })}
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