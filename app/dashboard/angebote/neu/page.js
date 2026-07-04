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
  'Rohrnetzspølung',
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
  'Hebeanlagenprøfung',
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
  'Sprøhliner',
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
  const [logoUrl, setLogoUrl] = useState(null);
  const [openDrop, setOpenDrop] = useState(null);
  const dropRef = useRef(null);
  const [vorlageModal, setVorlageModal] = useState(false);
  const [vorlageName, setVorlageName] = useState('');
  const [vorlageSaved, setVorlageSaved] = useState(false);
  const [vorlageCompanyId, setVorlageCompanyId] = useState(null);
  const [vorlageUserId, setVorlageUserId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      if (!member) return;
      setVorlageCompanyId(member.company_id);
      setVorlageUserId(user.id);
      const { data } = await supabase.from('kunden').select('id, name, adresse, email').eq('company_id', member.company_id).order('name');
      setKunden(data ?? []);
      const { data: co } = await supabase.from('companies').select('logo_url, standard_steuersatz').eq('id', member.company_id).single();
      setLogoUrl(co?.logo_url ?? null);
      setForm(f => ({ ...f, steuersatz: co?.standard_steuersatz ?? 19 }));
      // Pre-fill from Vorlage URL param
      const params = new URLSearchParams(window.location.search);
      const vorlageId = params.get('vorlage');
      if (vorlageId) {
        const { data: vl } = await supabase
          .from('angebot_vorlagen')
          .select('*')
          .eq('id', vorlageId)
          .single();
        if (vl) {
          setPositionen(
            (vl.positionen ?? []).length > 0
              ? vl.positionen
              : [{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]
          );
          setForm(f => ({
            ...f,
            steuersatz: vl.steuersatz ?? co?.standard_steuersatz ?? 19,
            notizen: vl.notizen ?? '',
          }));
        }
      }
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

  async function handleVorlageSpeichern() {
    if (!vorlageName.trim() || !vorlageCompanyId || !vorlageUserId) return;
    const { error } = await supabase.from('angebot_vorlagen').insert({
      user_id: vorlageUserId,
      company_id: vorlageCompanyId,
      name: vorlageName.trim(),
      steuersatz: Number(form.steuersatz),
      positionen,
      notizen: form.notizen || null,
    });
    if (!error) {
      setVorlageModal(false);
      setVorlageName('');
      setVorlageSaved(true);
      setTimeout(() => setVorlageSaved(false), 3000);
    }
  }

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
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/angebote" className="text-gray-400 hover:text-gray-600 text-sm transition">← Zurück</Link>
          <span className="text-gray-200">/</span>
          <h1 className="text-xl font-bold text-gray-900">Neues Angebot</h1>
        </div>
        {logoUrl && (
          <img src={logoUrl} alt="Firmenlogo" className="h-9 max-w-[130px] object-contain" />
        )}
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
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 rounded-t-xl">
            <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>
          </div>

          <div className="p-5 overflow-x-auto space-y-2" ref={dropRef}>
            {/* Spaltenüberschriften */}
            <div className="grid grid-cols-[1fr_80px_100px_100px_90px_32px] gap-2 px-1 mb-1 min-w-[640px]">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Beschreibung</span>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Menge</span>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Einheit</span>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preis (€)</span>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide text-right">Gesamt</span>
              <span></span>
            </div>
            {positionen.map((p, i) => {
              const filtered = LEISTUNGEN.filter(l =>
                l.toLowerCase().includes((p.beschreibung || '').toLowerCase())
              );
              const showDrop = openDrop === i && filtered.length > 0;
              return (
                <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_90px_32px] gap-2 items-center">
                  <div className="relative">
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
                      <ul className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto text-sm">
                        {filtered.map(l => (
                          <li
                            key={l}
                            onMouseDown={e => { e.preventDefault(); onPos(i, 'beschreibung', l); setOpenDrop(null); }}
                            className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 truncate border-b border-gray-50 last:border-0"
                          >{l}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <input type="number" min="0" step="0.5" value={p.menge} onChange={e => onPos(i, 'menge', e.target.value)} className={INPUT} />
                  <select value={p.einheit} onChange={e => onPos(i, 'einheit', e.target.value)} className={INPUT}>
                    <option>Pauschal</option>
                    <option>Stück</option>
                    <option>Std.</option>
                    <option>m</option>
                    <option>m²</option>
                    <option>m³</option>
                    <option>kg</option>
                    <option>t</option>
                  </select>
                  <input type="number" min="0" step="0.01" value={p.preis} onChange={e => onPos(i, 'preis', e.target.value)} placeholder="0,00" className={INPUT} />
                  <span className="text-right text-sm font-medium text-gray-700 tabular-nums pr-1">{fmt(p.menge * p.preis)}</span>
                  <button type="button" onClick={() => removePos(i)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition" title="Position entfernen">×</button>
                </div>
              );
            })}
            <button type="button" onClick={addPos} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">+ Position hinzufügen</button>
          </div>

          {/* Summary */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
            <div className="min-w-[220px] space-y-1.5 text-sm">
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
              placeholder="z. B. Dieses Angebot ist 30 Tage gültig. Lieferung innerhalb von 5 Werktagen nach Auftragserteilung."
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
          <button
            type="button"
            onClick={() => setVorlageModal(true)}
            className="px-5 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-medium hover:bg-purple-100 transition text-sm"
          >
            Als Vorlage speichern
          </button>
          <Link
            href="/dashboard/angebote"
            className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            Abbrechen
          </Link>
        </div>
      </form>

      {/* ── Vorlage Modal ── */}
      {vorlageModal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setVorlageModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Als Vorlage speichern</h3>
            <p className="text-xs text-gray-400 mb-4">
              Gib der Vorlage einen Namen für den Schnellzugriff. Die aktuellen Positionen und der Steuersatz werden gespeichert.
            </p>
            <input
              type="text"
              value={vorlageName}
              onChange={e => setVorlageName(e.target.value)}
              placeholder="z. B. Standard Kanalreinigung"
              className={INPUT}
              onKeyDown={e => e.key === 'Enter' && handleVorlageSpeichern()}
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleVorlageSpeichern}
                disabled={!vorlageName.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-40 text-sm"
              >
                Speichern
              </button>
              <button
                onClick={() => { setVorlageModal(false); setVorlageName(''); }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Vorlage gespeichert Toast ── */}
      {vorlageSaved && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Vorlage gespeichert!
        </div>
      )}
    </div>
  );
}
