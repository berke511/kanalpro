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
  'DachentwÃ¤sserungsreinigung',
  'Hofablaufreinigung',
  'Sinkkastenreinigung',
  'StraÃenablaufreinigung',
  'Schachtreinigung',
  'Pumpenschachtreinigung',
  'Hebeanlagenreinigung',
  'Pumpwerksreinigung',
  'Fettabscheiderreinigung',
  'Ãlabscheiderreinigung',
  'Benzinabscheiderreinigung',
  'Schlammfangreinigung',
  'Sandfangreinigung',
  'RegenrÃ¼ckhaltebeckenreinigung',
  'RegenÃ¼berlaufbeckenreinigung',
  'Zisternenreinigung',
  'BehÃ¤lterreinigung',
  'Tankreinigung',
  'RohrnetzspÃ¼lung',
  'KanalnetzspÃ¼lung',
  'HochdruckspÃ¼lung',
  'Kombinierte Saug- und SpÃ¼larbeiten',
  'Absaugarbeiten',
  'Schlammentsorgung',
  'Sandabsaugung',
  'Fettabsaugung',
  'Ãlabsaugung',
  'Verstopfungsbeseitigung',
  'Wurzelentfernung',
  'Betonentfernung',
  'MÃ¶rtelentfernung',
  'Kalkentfernung',
  'Ablagerungsentfernung',
  'FremdkÃ¶rperentfernung',
  'WurzelfrÃ¤sen',
  'KettenfrÃ¤sen',
  'Roboterschneiden',
  'RoboterfrÃ¤sarbeiten',
  'Ãffnen von ZulÃ¤ufen',
  'Ãffnen von AnschlÃ¼ssen',
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
  'GroÃprofilinspektion',
  'Vorinspektion',
  'Nachinspektion',
  'Abnahmeinspektion',
  'GewÃ¤hrleistungsinspektion',
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
  'Ortung verdeckter SchÃ¤chte',
  'GPS-Vermessung',
  'Kanalvermessung',
  'Schachtvermessung',
  'HÃ¶henvermessung',
  'Lagevermessung',
  '3D-Vermessung',
  'DichtheitsprÃ¼fung Luft',
  'DichtheitsprÃ¼fung Wasser',
  'KanaldichtheitsprÃ¼fung',
  'RohrdichtheitsprÃ¼fung',
  'SchachtdichtheitsprÃ¼fung',
  'HausanschlussprÃ¼fung',
  'DruckprÃ¼fung',
  'FunktionsprÃ¼fung',
  'AbnahmeprÃ¼fung',
  'GewÃ¤hrleistungsprÃ¼fung',
  'InspektionsprÃ¼fung',
  'RÃ¼ckstausicherungsprÃ¼fung',
  'HebeanlagenprÃ¼fung',
  'PumpenprÃ¼fung',
  'Kanalwartung',
  'Rohrleitungswartung',
  'EntwÃ¤sserungsanlagenwartung',
  'Hebeanlagenwartung',
  'Pumpenwartung',
  'Pumpwerkswartung',
  'RÃ¼ckstausicherungswartung',
  'RÃ¼ckstauklappenwartung',
  'Fettabscheiderwartung',
  'Ãlabscheiderwartung',
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
  'SprÃ¼hliner',
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
  'Austausch von SchÃ¤chten',
  'Berstlining',
  'Pipe Bursting',
  'Pipe Eating',
  'Rohrvortrieb',
  'Mikrotunneling',
  'HorizontalspÃ¼lbohrung',
  'HDD-Bohrung',
  'Vortriebsarbeiten',
  'Rohrgrabenherstellung',
  'RohrgrabenverfÃ¼llung',
  'Ausschachtungsarbeiten',
  'Erdarbeiten',
  'Baggerarbeiten',
  'Freilegungsarbeiten',
  'Aufbrucharbeiten',
  'Asphaltaufbruch',
  'Pflasteraufbruch',
  'Betonaufbruch',
  'OberflÃ¤chenwiederherstellung',
  'Asphaltarbeiten',
  'Pflasterarbeiten',
  'Betonarbeiten',
  'Einbau RÃ¼ckstauklappe',
  'Einbau RÃ¼ckstausicherung',
  'Einbau Hebeanlage',
  'Einbau Pumpanlage',
  'Einbau Kontrollschacht',
  'Einbau Revisionsschacht',
  'Einbau Hausanschluss',
  'Rohrverlegung',
  'Kanalverlegung',
  'Schachtmontage',
  'FÃ¤kalschlammentsorgung',
  'Fettentsorgung',
  'Ãlentsorgung',
  'Sonderabfallentsorgung',
  'KanalrÃ¼ckstandsentsorgung',
  'Industrielle Abwasserentsorgung',
  'BehÃ¤lterentleerung',
  'Abscheiderentleerung',
  'Kanalzustandsbewertung',
  'Sanierungskonzept',
  'Sanierungsplanung',
  'Kanalnetzplanung',
  'EntwÃ¤sserungsplanung',
  'Ausschreibungserstellung',
  'Bauleitung',
  'BauÃ¼berwachung',
  'Projektsteuerung',
  'Wirtschaftlichkeitsberechnung',
  'Werterhaltungskonzept',
  'Anfahrtspauschale',
  'Fahrzeugpauschale',
  'SpÃ¼lfahrzeugpauschale',
  'Kamerafahrzeugpauschale',
  'GerÃ¤teeinsatz',
  'Baustelleneinrichtung',
  'Verkehrssicherung',
  'AbsperrmaÃnahmen',
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
  'RÃ¼ckstauschutz',
  'Einbau RÃ¼ckstauverschluss',
  'RÃ¼ckstauverschlusswartung',
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
  'GrundstÃ¼cksentwÃ¤sserung',
  'EntwÃ¤sserungsberatung',
  'Kanalmanagement',
  'Kanalkatasterpflege',
  'Digitale Schadensbewertung',
  'CAD-BestandsplÃ¤ne',
  '3D-Kanalmodellierung',
  'Asset-Management Kanalnetz',
  'Regenwassermanagement',
  'Versickerungsanlagenbau',
  'Drainagebau',
  'Drainagesanierung',
  'Regenwasserschachtbau',
  'Pumpenschachtbau',
  'Sonderbauwerksreinigung',
  'KlÃ¤ranlagenservice',
  'Industriekanalservice',
  'Chemieanlagenreinigung',
  'TunnelentwÃ¤sserung',
  'FlughafenentwÃ¤sserung',
  'BahnentwÃ¤sserung',
  'Hochwasserschutzanlagen-Service',
  'RegenÃ¼berlaufbecken-Service',
  'RegenrÃ¼ckhaltebecken-Service',
  'GroÃprofilkanalreinigung',
  'GroÃprofilkanalsanierung',
  'RohrstatikprÃ¼fung',
  'KanalstatikprÃ¼fung',
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
  'Erstellung MaÃnahmenplan',
  'SofortmaÃnahmen bei Wasserschaden',
  'Notabdichtung',
  'Havariesanierung',
  'Rohrbruchbeseitigung',
  'Wasserschadenservice',
  'FreispÃ¼len von Leitungen',
  'Reinigung von LÃ¼ftungsleitungen in EntwÃ¤sserungssystemen',
  'Hausanschlussortung',
  'Hausanschlussneubau',
  'RevisionsÃ¶ffnung herstellen',
  'RevisionsÃ¶ffnung erneuern',
  'RohrÃ¶ffnung herstellen',
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
  const [dropIdx, setDropIdx] = useState(null);
  const dropRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: kundenData }, { data: rechnung }] = await Promise.all([
        supabase.from('kunden').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('rechnungen').select('*').eq('id', id).single(),
      ]);

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
  const fmt    = v => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' â¬';

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.kunden_id) { setFehler('Bitte einen Kunden auswÃ¤hlen.'); return; }
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

  if (laden) return <p className="text-gray-400 text-sm">Wird geladenâ¦</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* ââ Header ââ */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/rechnungen" className="text-xs text-gray-400 hover:text-gray-600 transition">
            â ZurÃ¸ck zu Angebote
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">Rechnung bearbeiten</h1>
        </div>
        <button
          type="button"
          onClick={() => setDeleteConfirm(true)}
          className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition text-sm"
        >
          Angebot lÃ¶schen
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* ââ Rechnungsdaten ââ */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Angebotsdaten</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Kunde</label>
              <select name="kunde_id" value={form.kunde_id} onChange={onChange} className={INPUT}>
                <option value="">Kunde auswÃ¤hlenâ¦</option>
                {kunden.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Datum</label>
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

        {/* ââ Positionen ââ */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>
          </div>
          <div className="p-5 space-y-2">
            {positionen.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-center">
                <div className="relative">
                  <input
                    type="text"
                    value={p.beschreibung}
                    onChange={e => { posChange(i, 'beschreibung', e.target.value); setDropIdx(e.target.value.length > 0 ? i : null); }}
                    onFocus={() => p.beschreibung.length > 0 && setDropIdx(i)}
                    onBlur={() => setTimeout(() => setDropIdx(null), 150)}
                    placeholder="Leistungsbeschreibung"
                    className={INPUT}
                  />
                  {dropIdx === i && (
                    <div ref={dropRef} className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {LEISTUNGEN
                        .filter(l => l.toLowerCase().includes(p.beschreibung.toLowerCase()))
                        .map(l => (
                          <button
                            key={l}
                            type="button"
                            onMouseDown={() => { posChange(i, 'beschreibung', l); setDropIdx(null); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700"
                          >
                            {l}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <input type="number" value={p.menge} onChange={e => posChange(i, 'menge', e.target.value)} placeholder="Menge" min="0" step="0.01" className={INPUT} />
                <select value={p.einheit} onChange={e => posChange(i, 'einheit', e.target.value)} className={INPUT}>
                  <option>Pauschal</option>
                  <option>Stunde</option>
                  <option>Tag</option>
                  <option>m</option>
                  <option>mÂ²</option>
                  <option>StÃ¸ck</option>
                </select>
                <input type="number" value={p.preis} onChange={e => posChange(i, 'preis', e.target.value)} placeholder="Preis â¬" min="0" step="0.01" className={INPUT} />
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
            ))}
            <button
              type="button"
              onClick={addPos}
              className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Position hinzufÃ¸gen
            </button>
          </div>
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

        {/* ââ Notizen ââ */}
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
              placeholder="z. B. Dieses Angebot ist 30 Tage gÃ¸ltig."
              className={INPUT + ' resize-none'}
            />
          </div>
        </div>

        {fehler && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{fehler}</p>}

        {/* ââ Aktionen ââ */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={speichern}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            {speichern ? 'Wird gespeichertâ¦' : 'Ãnderungen speichern'}
          </button>
          <Link
            href="/dashboard/rechnungen"
            className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            Abbrechen
          </Link>
        </div>
      </form>

      {/* ââ LÃ¶sch-BestÃ¤tigung Modal ââ */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Angebot lÃ¶schen?</h3>
            <p className="text-xs text-gray-400 mb-4">
              Diese Aktion kann nicht rÃ¸ckgÃ¤ngig gemacht werden.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 text-sm"
              >
                {deleting ? 'Wird gelÃ¶schtâ¦' : 'Ja, lÃ¶schen'}
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
