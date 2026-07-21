'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Button from '@/components/ui/v2/Button';
import Dialog from '@/components/ui/v2/Dialog';

var INPUT = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
var LABEL = 'block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide';

var LEISTUNGEN = [
  'Rohrreinigung','Kanalreinigung','Grundleitungsreinigung','Fallstrangreinigung',
  'Fallleitungsreinigung','Sammelleitungsreinigung','Hausanschlussreinigung','Hauptkanalreinigung',
  'Schmutzwasserleitungsreinigung','Regenwasserleitungsreinigung','Mischwasserkanalreinigung',
  'Drainagereinigung','Dachentwässerungsreinigung','Hofablaufreinigung','Sinkkastenreinigung',
  'Straßenablaufreinigung','Schachtreinigung','Pumpenschachtreinigung','Hebeanlagenreinigung',
  'Pumpwerksreinigung','Fettabscheiderreinigung','Ölabscheiderreinigung','Benzinabscheiderreinigung',
  'Schlammfangreinigung','Sandfangreinigung','Regenrückhaltebeckenreinigung',
  'Regenüberlaufbeckenreinigung','Zisternenreinigung','Behälterreinigung','Tankreinigung',
  'Rohrnetzspülung','Kanalnetzspülung','Hochdruckspülung','Kombinierte Saug- und Spülarbeiten',
  'Absaugarbeiten','Schlammentsorgung','Sandabsaugung','Fettabsaugung','Ölabsaugung',
  'Verstopfungsbeseitigung','Wurzelentfernung','Betonentfernung','Mörtelentfernung',
  'Kalkentfernung','Ablagerungsentfernung','Fremdkörperentfernung','Wurzelfräsen',
  'Kettenfräsen','Roboterschneiden','Roboterfräsarbeiten','Öffnen von Zuläufen',
  'Öffnen von Anschlüssen','Beseitigung einragender Stutzen','Entfernung von Hindernissen',
  'Sanierungsroboter-Einsatz','Roboterspachtelarbeiten','Roboterverpressarbeiten',
  'TV-Inspektion','Kamerainspektion','Rohrkamerauntersuchung','Kanal-TV-Untersuchung',
  'Hausanschlussinspektion','Schachtinspektion','Großprofilinspektion','Vorinspektion',
  'Nachinspektion','Abnahmeinspektion','Gewährleistungsinspektion','Schadensaufnahme',
  'Schadensdokumentation','Videodokumentation','Fotodokumentation','Zustandsbewertung',
  'Kanalzustandserfassung','Bestandsaufnahme','Bestandsdokumentation','Kanalkatastererstellung',
  'Digitale Dokumentation','GIS-Erfassung','Leitungsortung','Kanalortung','Schachtortung',
  'Rohrverlaufsermittlung','Schadensortung','Leckageortung','Rohrbruchortung',
  'Fremdwasserortung','Ortung verdeckter Schächte','GPS-Vermessung','Kanalvermessung',
  'Schachtvermessung','Höhenvermessung','Lagevermessung','3D-Vermessung',
  'Dichtheitsprüfung Luft','Dichtheitsprüfung Wasser','Kanaldichtheitsprüfung',
  'Rohrdichtheitsprüfung','Schachtdichtheitsprüfung','Hausanschlussprüfung','Druckprüfung',
  'Funktionsprüfung','Abnahmeprüfung','Gewährleistungsprüfung','Inspektionsprüfung',
  'Rückstausicherungsprüfung','Hebeanlagenprüfung','Pumpenprüfung','Kanalwartung',
  'Rohrleitungswartung','Entwässerungsanlagenwartung','Hebeanlagenwartung','Pumpenwartung',
  'Pumpwerkswartung','Rückstausicherungswartung','Rückstauklappenwartung',
  'Fettabscheiderwartung','Ölabscheiderwartung','Schachtwartung','Regelinspektion',
  'Wartungsvertrag','Jahreswartung','Rohrreparatur','Kanalreparatur','Hausanschlussreparatur',
  'Schadstellenreparatur','Punktuelle Sanierung','Rissabdichtung','Fugenabdichtung',
  'Injektionsarbeiten','Verpressarbeiten','Leckstellenabdichtung','Kurzlinersanierung',
  'Partlinersanierung','Hutprofilsanierung','Stutzensanierung','Anschlusssanierung',
  'Manschettensanierung','Edelstahlmanschettensanierung','Innenmanschettenmontage',
  'Roboter-Sanierung','Verpresssanierung','Schlauchlinersanierung','Inlinersanierung',
  'UV-Liner-Sanierung','Warmwasserliner-Sanierung','Dampfliner-Sanierung',
  'Hausanschlussliner-Sanierung','Relining','Rohr-in-Rohr-Verfahren','Wickelrohrverfahren',
  'Close-Fit-Lining','Tight-Fit-Lining','Sprühliner','Beschichtung','Innenbeschichtung',
  'Mineralauskleidung','Korrosionsschutzbeschichtung','Schachtabdichtung','Schachtbeschichtung',
  'Schachtinstandsetzung','Schachtauskleidung','Schachtkopfsanierung','Schachtrahmensanierung',
  'Schachtdeckelsanierung','Gerinnesanierung','Bermensanierung','Steigeisensanierung',
  'Fugensanierung','Schachtregulierung','Kanalerneuerung','Rohrerneuerung',
  'Hausanschlusserneuerung','Leitungsneubau','Kanalneubau','Schachtneubau',
  'Austausch von Rohrleitungen','Austausch von Schächten','Berstlining','Pipe Bursting',
  'Pipe Eating','Rohrvortrieb','Mikrotunneling','Horizontalspülbohrung','HDD-Bohrung',
  'Vortriebsarbeiten','Rohrgrabenherstellung','Rohrgrabenverfüllung','Ausschachtungsarbeiten',
  'Erdarbeiten','Baggerarbeiten','Freilegungsarbeiten','Aufbrucharbeiten','Asphaltaufbruch',
  'Pflasteraufbruch','Betonaufbruch','Oberflächenwiederherstellung','Asphaltarbeiten',
  'Pflasterarbeiten','Betonarbeiten','Einbau Rückstauklappe','Einbau Rückstausicherung',
  'Einbau Hebeanlage','Einbau Pumpanlage','Einbau Kontrollschacht','Einbau Revisionsschacht',
  'Einbau Hausanschluss','Rohrverlegung','Kanalverlegung','Schachtmontage',
  'Fäkalschlammentsorgung','Fettentsorgung','Ölentsorgung','Sonderabfallentsorgung',
  'Kanalrückstandsentsorgung','Industrielle Abwasserentsorgung','Behälterentleerung',
  'Abscheiderentleerung','Kanalzustandsbewertung','Sanierungskonzept','Sanierungsplanung',
  'Kanalnetzplanung','Entwässerungsplanung','Ausschreibungserstellung','Bauleitung',
  'Bauüberwachung','Projektsteuerung','Wirtschaftlichkeitsberechnung','Werterhaltungskonzept',
  'Anfahrtspauschale','Fahrzeugpauschale','Spülfahrzeugpauschale','Kamerafahrzeugpauschale',
  'Geräteeinsatz','Baustelleneinrichtung','Verkehrssicherung','Absperrmaßnahmen',
  'Dokumentationspauschale','Arbeitszeit Helfer','Arbeitszeit Facharbeiter',
  'Arbeitszeit Kanaltechniker','Arbeitszeit Sanierungstechniker','Nachtzuschlag',
  'Wochenendzuschlag','Feiertagszuschlag','Notdienstzuschlag','Havarieeinsatz',
  'Soforteinsatz','Bereitschaftsdienst','24-Stunden-Notdienst','Notdienst Rohrreinigung',
  'Notdienst Kanalreinigung','Rückstauschutz','Einbau Rückstauverschluss',
  'Rückstauverschlusswartung','Hebeanlageneinbau','Hebeanlagenreparatur','Pumpenreparatur',
  'Pumpenaustausch','Schachtabdeckung erneuern','Schachtdeckel austauschen',
  'Geruchsverschlussreinigung','Rohrsanierung','Kanalsanierung','Hausanschlusssanierung',
  'Grundstücksentwässerung','Entwässerungsberatung','Kanalmanagement','Kanalkatasterpflege',
  'Digitale Schadensbewertung','CAD-Bestandspläne','3D-Kanalmodellierung',
  'Asset-Management Kanalnetz','Regenwassermanagement','Versickerungsanlagenbau','Drainagebau',
  'Drainagesanierung','Regenwasserschachtbau','Pumpenschachtbau','Sonderbauwerksreinigung',
  'Kläranlagenservice','Industriekanalservice','Chemieanlagenreinigung','Tunnelentwässerung',
  'Flughafenentwässerung','Bahnentwässerung','Hochwasserschutzanlagen-Service',
  'Regenüberlaufbecken-Service','Regenrückhaltebecken-Service','Großprofilkanalreinigung',
  'Großprofilkanalsanierung','Rohrstatikprüfung','Kanalstatikprüfung',
  'Zustandsklassifizierung nach DWA','Sanierungsberatung','Versicherungsdokumentation',
  'Gutachtenerstellung','Technische Bestandsanalyse','Vor-Ort-Beratung','Baustellenbesichtigung',
  'Erstellung Fotobericht','Erstellung Videobericht','Erstellung Sanierungsangebot',
  'Erstellung Maßnahmenplan','Sofortmaßnahmen bei Wasserschaden','Notabdichtung',
  'Havariesanierung','Rohrbruchbeseitigung','Wasserschadenservice','Freispülen von Leitungen',
  'Reinigung von Lüftungsleitungen in Entwässerungssystemen','Hausanschlussortung',
  'Hausanschlussneubau','Revisionsöffnung herstellen','Revisionsöffnung erneuern',
  'Rohröffnung herstellen','Kanalanschluss herstellen','Kanalanschluss sanieren',
  'Anschlussleitung erneuern','Anschlussleitung reinigen','Anschlussleitung inspizieren',
  'Anschlussleitung sanieren',
];

var STATUS_OPTS = [
  { value: 'entwurf', label: 'Entwurf' },
  { value: 'gesendet', label: 'Gesendet' },
  { value: 'angenommen', label: 'Angenommen' },
  { value: 'abgelehnt', label: 'Abgelehnt' },
];

export default function AngebotEditV2Page() {
  var router = useRouter();
  var { id } = useParams();
  var dropRef = useRef(null);
  var [kunden, setKunden] = useState([]);
  var [companyId, setCompanyId] = useState(null);
  var [form, setForm] = useState({
    kunden_id: '',
    datum: new Date().toISOString().split('T')[0],
    gueltig_bis: '',
    steuersatz: 19,
    status: 'entwurf',
    notizen: '',
  });
  var [positionen, setPositionen] = useState([
    { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 },
  ]);
  var [laden, setLaden] = useState(true);
  var [speichern, setSpeichern] = useState(false);
  var [loeschen, setLoeschen] = useState(false);
  var [loeschenBestaetigen, setLoeschenBestaetigen] = useState(false);
  var [fehler, setFehler] = useState('');
  var [openDrop, setOpenDrop] = useState(null);

  useEffect(function() { ladeDaten(); }, [id]);

  useEffect(function() {
    function onDown(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpenDrop(null);
    }
    document.addEventListener('mousedown', onDown);
    return function() { document.removeEventListener('mousedown', onDown); };
  }, []);

  async function ladeDaten() {
    try {
      var r = await supabase.auth.getUser();
      var user = r.data.user;
      if (!user) { setLaden(false); return; }
      var mr = await supabase.from('company_members').select('company_id').eq('user_id', user.id).eq('is_active', true).single();
      if (!mr.data) { setLaden(false); return; }
      var cid = mr.data.company_id;
      setCompanyId(cid);
      var results = await Promise.all([
        supabase.from('kunden').select('id, name').eq('company_id', cid).order('name'),
        supabase.from('angebote').select('*').eq('id', id).eq('company_id', cid).single(),
      ]);
      var kd = results[0].data;
      var ang = results[1].data;
      setKunden(kd ?? []);
      if (!ang) { setFehler('Angebot nicht gefunden oder kein Zugriff.'); setLaden(false); return; }
      setForm({
        kunden_id: ang.kunden_id ?? '',
        datum: ang.datum ?? new Date().toISOString().split('T')[0],
        gueltig_bis: ang.gueltig_bis ?? '',
        steuersatz: ang.steuersatz ?? 19,
        status: ang.status ?? 'entwurf',
        notizen: ang.notizen ?? '',
      });
      setPositionen(
        (ang.positionen ?? []).length > 0
          ? ang.positionen
          : [{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]
      );
      setLaden(false);
    } catch (err) {
      setFehler('Fehler beim Laden: ' + (err.message ?? ''));
      setLaden(false);
    }
  }

  function setField(key, val) {
    setForm(function(f) { return Object.assign({}, f, { [key]: val }); });
  }

  function posChange(i, field, val) {
    setPositionen(function(ps) {
      return ps.map(function(p, j) {
        if (j !== i) return p;
        var n = Object.assign({}, p);
        n[field] = (field === 'menge' || field === 'preis') ? (parseFloat(val) || 0) : val;
        return n;
      });
    });
  }

  function addPos() {
    setPositionen(function(ps) {
      return ps.concat([{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]);
    });
  }

  function removePos(i) {
    if (positionen.length <= 1) return;
    setPositionen(function(ps) { return ps.filter(function(_, j) { return j !== i; }); });
  }

  var netto = positionen.reduce(function(s, p) { return s + (p.menge || 0) * (p.preis || 0); }, 0);
  var mwst = netto * Number(form.steuersatz) / 100;
  var brutto = netto + mwst;
  function fmt(v) { return v.toFixed(2).replace('.', ',') + ' €'; }

  async function handleSpeichern(e) {
    e.preventDefault();
    if (!companyId) { setFehler('Nicht eingeloggt.'); return; }
    setSpeichern(true);
    setFehler('');
    var upd = await supabase.from('angebote').update({
      kunden_id: form.kunden_id || null,
      datum: form.datum,
      gueltig_bis: form.gueltig_bis || null,
      steuersatz: Number(form.steuersatz),
      status: form.status,
      positionen: positionen,
      notizen: form.notizen || null,
    }).eq('id', id).eq('company_id', companyId);
    setSpeichern(false);
    if (upd.error) { setFehler('Fehler: ' + upd.error.message); return; }
    router.push('/dashboard-v2/angebote');
  }

  async function handleLoeschen() {
    setLoeschen(true);
    await supabase.from('angebote').delete().eq('id', id).eq('company_id', companyId);
    router.push('/dashboard-v2/angebote');
  }

  if (laden) return (
    <Page>
      <Page.Header><Page.Title>Angebot bearbeiten</Page.Title></Page.Header>
      <Page.Content><p className="text-sm text-gray-400">Laedt...</p></Page.Content>
    </Page>
  );

  if (!companyId && fehler) return (
    <Page>
      <Page.Header><Page.Title>Angebot bearbeiten</Page.Title></Page.Header>
      <Page.Content>
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>
      </Page.Content>
    </Page>
  );

  return (
    <Page>
      <Page.Header>
        <div className="flex items-center justify-between">
          <div>
            <Page.Title>Angebot bearbeiten</Page.Title>
            <Page.Description>Angebotsdaten und Positionen aktualisieren</Page.Description>
          </div>
          <Button variant="danger" size="sm" onClick={function() { setLoeschenBestaetigen(true); }}>
            Angebot loeschen
          </Button>
        </div>
      </Page.Header>
      <Page.Content>
        <form onSubmit={handleSpeichern} className="space-y-4 max-w-3xl">
          {fehler && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>
          )}

          <Card>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 rounded-t-xl">
              <h2 className="text-sm font-semibold text-gray-700">Angebotsdaten</h2>
            </div>
            <Card.Content>
              <div className="space-y-4">
                <div>
                  <label className={LABEL}>Kunde</label>
                  <select value={form.kunden_id} onChange={function(e) { setField('kunden_id', e.target.value); }} className={INPUT}>
                    <option value="">-- Kein Kunde --</option>
                    {kunden.map(function(k) { return <option key={k.id} value={k.id}>{k.name}</option>; })}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Angebotsdatum</label>
                    <input type="date" value={form.datum} onChange={function(e) { setField('datum', e.target.value); }} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Gueltig bis</label>
                    <input type="date" value={form.gueltig_bis} onChange={function(e) { setField('gueltig_bis', e.target.value); }} className={INPUT} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Steuersatz</label>
                    <select value={String(form.steuersatz)} onChange={function(e) { setField('steuersatz', e.target.value); }} className={INPUT}>
                      <option value="19">19 % - Regelsteuersatz</option>
                      <option value="7">7 % - ermaessigter Steuersatz</option>
                      <option value="0">0 % - steuerfrei / Kleinunternehmer</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Status</label>
                    <select value={form.status} onChange={function(e) { setField('status', e.target.value); }} className={INPUT}>
                      {STATUS_OPTS.map(function(o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
                    </select>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 rounded-t-xl">
              <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>
            </div>
            <Card.Content className="pb-0">
              <div ref={dropRef} className="overflow-x-auto space-y-2">
                <div className="grid grid-cols-[1fr_80px_100px_100px_90px_32px] gap-2 px-1 mb-1 min-w-[640px]">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Beschreibung</span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Menge</span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Einheit</span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preis</span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide text-right">Gesamt</span>
                  <span></span>
                </div>
                {positionen.map(function(p, i) {
                  var filtered = LEISTUNGEN.filter(function(l) {
                    return l.toLowerCase().includes((p.beschreibung || '').toLowerCase());
                  });
                  var showDrop = openDrop === i && filtered.length > 0;
                  return (
                    <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_90px_32px] gap-2 items-center min-w-[640px]">
                      <div className="relative">
                        <input
                          type="text"
                          value={p.beschreibung}
                          onChange={function(e) { posChange(i, 'beschreibung', e.target.value); setOpenDrop(i); }}
                          onFocus={function() { setOpenDrop(i); }}
                          placeholder="Leistung eingeben..."
                          autoComplete="off"
                          className={INPUT}
                        />
                        {showDrop && (
                          <ul className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto text-sm">
                            {filtered.map(function(l) {
                              return (
                                <li
                                  key={l}
                                  onMouseDown={function(e) { e.preventDefault(); posChange(i, 'beschreibung', l); setOpenDrop(null); }}
                                  className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 truncate border-b border-gray-50 last:border-0"
                                >{l}</li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      <input type="number" min="0" step="0.5" value={p.menge} onChange={function(e) { posChange(i, 'menge', e.target.value); }} className={INPUT} />
                      <select value={p.einheit} onChange={function(e) { posChange(i, 'einheit', e.target.value); }} className={INPUT}>
                        <option>Pauschal</option>
                        <option>Stück</option>
                        <option>Std.</option>
                        <option>m</option>
                        <option>m²</option>
                        <option>m³</option>
                        <option>kg</option>
                        <option>t</option>
                      </select>
                      <input type="number" min="0" step="0.01" value={p.preis} onChange={function(e) { posChange(i, 'preis', e.target.value); }} placeholder="0,00" className={INPUT} />
                      <span className="text-right text-sm font-medium text-gray-700 tabular-nums pr-1">{fmt(p.menge * p.preis)}</span>
                      <button type="button" onClick={function() { removePos(i); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition">&times;</button>
                    </div>
                  );
                })}
                <button type="button" onClick={addPos} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">+ Position hinzufuegen</button>
              </div>
            </Card.Content>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-end">
              <div className="min-w-[220px] space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Netto</span>
                  <span className="tabular-nums">{fmt(netto)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>{'MwSt. ' + form.steuersatz + ' %'}</span>
                  <span className="tabular-nums">{fmt(mwst)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5">
                  <span>Gesamtbetrag</span>
                  <span className="text-blue-600 tabular-nums">{fmt(brutto)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 rounded-t-xl">
              <h2 className="text-sm font-semibold text-gray-700">Notizen / Hinweise</h2>
            </div>
            <Card.Content>
              <textarea
                value={form.notizen}
                onChange={function(e) { setField('notizen', e.target.value); }}
                rows={3}
                placeholder="z. B. Dieses Angebot ist 30 Tage gueltig."
                className={INPUT + ' resize-none'}
              />
            </Card.Content>
          </Card>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={speichern}>
              {speichern ? 'Wird gespeichert...' : 'Aenderungen speichern'}
            </Button>
            <Button type="button" variant="secondary" onClick={function() { router.push('/dashboard-v2/angebote'); }}>
              Abbrechen
            </Button>
          </div>
        </form>
      </Page.Content>

      <Dialog open={loeschenBestaetigen} onClose={function() { setLoeschenBestaetigen(false); }}>
        <Dialog.Header>
          <Dialog.Title>Angebot loeschen?</Dialog.Title>
          <Dialog.Description>Diese Aktion kann nicht rueckgaengig gemacht werden.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button variant="secondary" onClick={function() { setLoeschenBestaetigen(false); }}>Abbrechen</Button>
          <Button variant="danger" disabled={loeschen} onClick={handleLoeschen}>
            {loeschen ? 'Wird geloescht...' : 'Ja, loeschen'}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </Page>
  );
}
