'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

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
  'Dichtheitsprüfung Luft',
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
  'Rückstausicherungsprüfung',
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

const STATUS_OPTS = [
  { value: 'entwurf',  label: 'Entwurf'  },
  { value: 'gesendet', label: 'Gesendet' },
  { value: 'bezahlt',  label: 'Bezahlt'  },
];

export default function RechnungBearbeiten() {
  const router = useRouter();
  const { id } = useParams();

  const [laden, setLaden]               = useState(true);
  const [speichern, setSpeichern]       = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [kunden, setKunden]             = useState([]);
  const [form, setForm] = useState({
    kunde_id:   '',
    datum:      new Date().toISOString().split('T')[0],
    faellig_am: '',
    steuersatz: 19,
    status:     'entwurf',
    notizen:    '',
  });
  const [positionen, setPositionen] = useState([
    { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 },
  ]);
  const [fehler, setFehler]   = useState('');
  const [openDrop, setOpenDrop] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).eq('is_active', true).maybeSingle();

      const [{ data: kundenData }, { data: rechnung }, { data: co }] = await Promise.all([
        supabase.from('kunden').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('rechnungen').select('*').eq('id', id).single(),
        member ? supabase.from('companies').select('logo_url').eq('id', member.company_id).single() : Promise.resolve({ data: null }),
      ]);
      setLogoUrl(co?.logo_url ?? null);

      setKunden(kundenData ?? []);

      if (!rechnung) { router.push('/dashboard/rechnungen'); return; }
      setForm({
        kunde_id:   rechnung.kunde_id   ?? '',
        datum:      rechnung.datum      ?? new Date().toISOString().split('T')[0],
        faellig_am: rechnung.faellig_am ?? '',
        steuersatz: rechnung.steuersatz ?? 19,
        status:     rechnung.status     ?? 'entwurf',
        notizen:    rechnung.notizen    ?? '',
      });
      setPositionen(
        (rechnung.positionen ?? []).length > 0
          ? rechnung.positionen
          : [{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]
      );
      setLaden(false);
    }
    load().catch(() => setLaden(false));
  }, [id]);

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function posChange(i, field, val) {
    setPositionen(ps =>
      ps.map((p, j) =>
        j === i
          ? { ...p, [field]: field === 'menge' || field === 'preis' ? Number(val) : val }
          : p
      )
    );
  }

  function addPos() {
    setPositionen(ps => [...ps, { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]);
  }

  function removePos(i) {
    if (positionen.length > 1) setPositionen(positionen.filter((_, j) => j !== i));
  }

  const netto  = positionen.reduce((s, p) => s + (p.menge ?? 0) * (p.preis ?? 0), 0);
  const mwst   = netto * (Number(form.steuersatz) / 100);
  const brutto = netto + mwst;
  const fmt    = v => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  async function onSubmit(e) {
    e.preventDefault();
    setSpeichern(true);
    setFehler('');
    const { error } = await supabase.from('rechnungen').update({
      kunde_id:   form.kunde_id || null,
      datum:      form.datum,
      faellig_am: form.faellig_am || null,
      steuersatz: Number(form.steuersatz),
      status:     form.status,
      positionen,
      notizen:    form.notizen || null,
    }).eq('id', id);
    setSpeichern(false);
    if (error) { setFehler('Fehler: ' + error.message); return; }
    router.push('/dashboard/rechnungen');
  }

  async function onDelete() {
    setDeleting(true);
    await supabase.from('rechnungen').delete().eq('id', id);
    router.push('/dashboard/rechnungen');
  }

  if (laden) return <p className="text-gray-400 text-sm">Wird geladen…</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/dashboard/rechnungen" className="text-xs text-gray-400 hover:text-gray-600 transition">
            ← Zurück zu Rechnungen
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">Rechnung bearbeiten</h1>
        </div>
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Firmenlogo" className="h-9 max-w-[130px] object-contain" />
          )}
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition text-sm"
          >
            Rechnung löschen
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* ── Rechnungsdaten ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Rechnungsdaten</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Kunde</label>
              <select name="kunde_id" value={form.kunde_id} onChange={onChange} className={INPUT}>
                <option value="">— Kein Kunde —</option>
                {kunden.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rechnungsdatum</label>
              <input type="date" name="datum" value={form.datum} onChange={onChange} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fällig bis</label>
              <input type="date" name="faellig_am" value={form.faellig_am} onChange={onChange} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select name="status" value={form.status} onChange={onChange} className={INPUT}>
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">MwSt. %</label>
              <input type="number" name="steuersatz" value={form.steuersatz} onChange={onChange} min="0" max="100" className={INPUT} />
            </div>
          </div>
        </div>

        {/* ── Positionen ── */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 rounded-t-xl">
            <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>
          </div>
          <div className="p-5">
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
                  <input
                    type="text"
                    value={p.beschreibung}
                    onChange={e => { posChange(i, 'beschreibung', e.target.value); setOpenDrop(i); }}
                    onFocus={() => setOpenDrop(i)}
                    onBlur={() => setTimeout(() => setOpenDrop(null), 150)}
                    placeholder="Leistungsbeschreibung"
                    autoComplete="off"
                    className={INPUT}
                  />
                  {showDrop && (
                    <ul className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto text-sm">
                      {filtered.map(l => (
                        <li key={l} onClick={() => { posChange(i, 'beschreibung', l); setOpenDrop(null); }}
                          className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 truncate border-b border-gray-50 last:border-0">{l}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <input type="number" value={p.menge} onChange={e => posChange(i, 'menge', e.target.value)} min="0" step="0.5" className={INPUT} />
                <select value={p.einheit} onChange={e => posChange(i, 'einheit', e.target.value)} className={INPUT}>
                  <option>Pauschal</option>
                  <option>Støck</option>
                  <option>Std.</option>
                  <option>m</option>
                  <option>m²</option>
                  <option>m³</option>
                  <option>kg</option>
                  <option>t</option>
                </select>
                <input type="number" value={p.preis} onChange={e => posChange(i, 'preis', e.target.value)} placeholder="0,00" min="0" step="0.01" className={INPUT} />
                <span className="text-right text-sm font-medium text-gray-700 tabular-nums pr-1">{fmt(p.menge * p.preis)}</span>
                <button
                  type="button"
                  onClick={() => removePos(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              );
            })}
            <button
              type="button"
              onClick={addPos}
              className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Position hinzufügen
            </button>
          </div>
          </div>{/* end p-5 */}
          {/* Summary */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
            <div className="min-w-[220px] space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Netto</span><span className="tabular-nums">{fmt(netto)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>MwSt. {form.steuersatz} %</span><span className="tabular-nums">{fmt(mwst)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5">
                <span>Gesamtbetrag</span><span className="text-blue-600 tabular-nums">{fmt(brutto)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notizen ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Notizen / Zahlungshinweis</h2>
          </div>
          <div className="p-5">
            <textarea
              name="notizen"
              value={form.notizen}
              onChange={onChange}
              rows={2}
              placeholder="z. B. Bitte überweisen Sie den Betrag innerhalb von 14 Tagen…"
              className={INPUT + ' resize-none'}
            />
          </div>
        </div>

        {fehler && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{fehler}</p>}

        {/* ── Aktionen ── */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={speichern}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            {speichern ? 'Wird gespeichert…' : 'Änderungen speichern'}
          </button>
          <Link
            href="/dashboard/rechnungen"
            className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            Abbrechen
          </Link>
        </div>
      </form>

      {/* ── Lösch-Bestätigung Modal ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Rechnung löschen?</h3>
            <p className="text-xs text-gray-400 mb-4">
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 text-sm"
              >
                {deleting ? 'Wird gelöscht…' : 'Ja, löschen'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
