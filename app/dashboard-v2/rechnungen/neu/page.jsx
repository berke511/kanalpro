'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Button from '@/components/ui/v2/Button';

var INPUT = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
var LABEL = 'block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide';

var EINHEITEN = ['Pauschal', 'Stk.', 'Stunden', 'Meter', 'Liter', 'kg', 'm²', 'm³', 'Rollen'];

var LEISTUNGEN = [
  'Rohrreinigung', 'Kanalreinigung', 'Grundleitungsreinigung', 'Fallstrangreinigung',
  'Hochdruckspuelung', 'Kombinierte Saug- und Spuelarbeiten', 'Absaugarbeiten',
  'Schlammentsorgung', 'Verstopfungsbeseitigung', 'Wurzelentfernung', 'Wurzelfraesen',
  'TV-Inspektion', 'Kamerainspektion', 'Rohrkamerauntersuchung', 'Schadensaufnahme',
  'Fotodokumentation', 'Zustandsbewertung', 'Dichtheitspruefung Luft', 'Dichtheitspruefung Wasser',
  'Rohrreparatur', 'Kanalreparatur', 'Leckstellenabdichtung', 'Injektionsarbeiten',
  'Schachtreinigung', 'Hebeanlagenreinigung', 'Fettabscheiderreinigung', 'Oelabscheiderreinigung',
  'Kanalwartung', 'Pumpenpreufung', 'Wartungsvertrag', 'Notdienst',
  'Fahrtkosten', 'Entsorgungsgebuehren', 'Material', 'Sonstige Leistungen',
];

var ZAHLUNGSSTATUS = [
  { value: 'offen', label: 'Offen' },
  { value: 'teilweise_bezahlt', label: 'Teilweise bezahlt' },
  { value: 'bezahlt', label: 'Bezahlt' },
  { value: 'storniert', label: 'Storniert' },
];

function today() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  var d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function genRechnungsnummer(count) {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var n = String((count ?? 0) + 1).padStart(4, '0');
  return 'RE-' + y + m + '-' + n;
}

function kundeAnzeigeName(k) {
  if (!k) return '';
  if (k.kundentyp === 'firma') return k.firmenname || k.firma || k.name || '';
  return k.name || '';
}

function fmtEuro(n) {
  return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function RechnungNeuV2Page() {
  var router = useRouter();
  var dropRef = useRef(null);

  var [companyId, setCompanyId] = useState(null);
  var [userId, setUserId] = useState(null);
  var [isLaden, setIsLaden] = useState(true);
  var [kunden, setKunden] = useState([]);
  var [rechnungsNr, setRechnungsNr] = useState('');
  var [speichern, setSpeichern] = useState(false);
  var [apiErr, setApiErr] = useState('');
  var [openDrop, setOpenDrop] = useState(null);

  var [form, setForm] = useState({
    kundeId: '',
    rechnungsadresse: '',
    datum: today(),
    faelligAm: addDays(today(), 14),
    leistungsdatum: '',
    steuersatz: 19,
    skonto: 0,
    betreff: '',
    notizen: '',
    zahlungsstatus: 'offen',
  });

  var [positionen, setPositionen] = useState([
    { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 },
  ]);

  useEffect(function() {
    async function ladeDaten() {
      var session = await supabase.auth.getUser();
      var user = session.data.user;
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      var memberRes = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!memberRes.data) { setIsLaden(false); return; }
      var cid = memberRes.data.company_id;
      setCompanyId(cid);

      var [kundenRes, countRes, coRes] = await Promise.all([
        supabase.from('kunden').select('id, name, firmenname, firma, kundentyp, adresse').eq('company_id', cid).order('name'),
        supabase.from('rechnungen').select('*', { count: 'exact', head: true }).eq('company_id', cid),
        supabase.from('companies').select('standard_steuersatz').eq('id', cid).maybeSingle(),
      ]);

      setKunden(kundenRes.data ?? []);
      setRechnungsNr(genRechnungsnummer(countRes.count));
      if (coRes.data && coRes.data.standard_steuersatz) {
        setForm(function(f) { return Object.assign({}, f, { steuersatz: coRes.data.standard_steuersatz }); });
      }
      setIsLaden(false);
    }
    ladeDaten();
  }, [router]);

  useEffect(function() {
    function outside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpenDrop(null);
    }
    document.addEventListener('mousedown', outside);
    return function() { document.removeEventListener('mousedown', outside); };
  }, []);

  function setField(key, val) {
    setForm(function(f) { return Object.assign({}, f, { [key]: val }); });
    setApiErr('');
  }

  function posChange(i, field, val) {
    var n = positionen.slice();
    var p = Object.assign({}, n[i]);
    if (field === 'menge' || field === 'preis') { p[field] = parseFloat(val) || 0; }
    else { p[field] = val; }
    n[i] = p;
    setPositionen(n);
  }

  function addPos() {
    setPositionen(function(ps) {
      return ps.concat([{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]);
    });
  }

  function removePos(i) {
    if (positionen.length > 1) {
      setPositionen(positionen.filter(function(_, j) { return j !== i; }));
    }
  }

  var kundeObj = kunden.find(function(k) { return k.id === form.kundeId; }) ?? null;
  var netto = positionen.reduce(function(s, p) { return s + (p.menge || 0) * (p.preis || 0); }, 0);
  var skontoAmt = form.skonto > 0 ? netto * (form.skonto / 100) : 0;
  var nettoNachSk = netto - skontoAmt;
  var mwst = nettoNachSk * (Number(form.steuersatz) / 100);
  var brutto = nettoNachSk + mwst;

  async function handleSpeichern() {
    if (!form.betreff.trim()) { setApiErr('Betreff ist erforderlich.'); return; }
    if (positionen.every(function(p) { return !p.beschreibung.trim(); })) {
      setApiErr('Mindestens eine Position ist erforderlich.');
      return;
    }
    setSpeichern(true);
    setApiErr('');
    try {
      var payload = {
        user_id: userId,
        company_id: companyId,
        kunde_id: form.kundeId || null,
        rechnungsnummer: rechnungsNr,
        datum: form.datum,
        faellig_am: form.faelligAm || null,
        leistungsdatum: form.leistungsdatum || null,
        steuersatz: Number(form.steuersatz),
        skonto: Number(form.skonto) || 0,
        notizen: form.notizen || null,
        positionen: positionen,
        status: 'entwurf',
        zahlungsstatus: form.zahlungsstatus,
      };
      var res = await supabase.from('rechnungen').insert(payload);
      if (res.error) throw res.error;
      router.push('/dashboard-v2/rechnungen');
    } catch (err) {
      setApiErr(err.message ?? 'Fehler beim Speichern.');
      setSpeichern(false);
    }
  }

  if (isLaden) {
    return (
      <Page>
        <Page.Header><Page.Title>Rechnung erstellen</Page.Title></Page.Header>
        <Page.Content><div className="text-sm text-gray-400 py-8 text-center">Laedt...</div></Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Rechnung erstellen</Page.Title>
        <Page.Description>{rechnungsNr}</Page.Description>
      </Page.Header>
      <Page.Content>
        <div className="space-y-5 max-w-3xl" ref={dropRef}>

          {apiErr && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">{apiErr}</div>
          )}

          {/* Rechnungsinformationen */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Rechnungsinformationen</div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL}>Rechnungsdatum</label>
                    <input type="date" value={form.datum}
                      onChange={function(e) {
                        setField('datum', e.target.value);
                        setField('faelligAm', addDays(e.target.value, 14));
                      }}
                      className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Zahlungsziel</label>
                    <input type="date" value={form.faelligAm}
                      onChange={function(e) { setField('faelligAm', e.target.value); }}
                      className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Leistungsdatum</label>
                    <input type="date" value={form.leistungsdatum}
                      onChange={function(e) { setField('leistungsdatum', e.target.value); }}
                      className={INPUT} />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Betreff *</label>
                  <input type="text" value={form.betreff}
                    onChange={function(e) { setField('betreff', e.target.value); }}
                    placeholder="z. B. Rechnung fuer Kanalreinigung"
                    className={INPUT} />
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Rechnungsempfaenger */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Rechnungsempfaenger</div>
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>Kunde</label>
                  <select value={form.kundeId}
                    onChange={function(e) {
                      var k = kunden.find(function(k) { return k.id === e.target.value; });
                      setField('kundeId', e.target.value);
                      if (k && k.adresse) setField('rechnungsadresse', k.adresse);
                    }}
                    className={INPUT}>
                    <option value="">-- Kunden waehlen --</option>
                    {kunden.map(function(k) {
                      return <option key={k.id} value={k.id}>{kundeAnzeigeName(k)}</option>;
                    })}
                  </select>
                </div>
                {kundeObj && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Kundendaten</p>
                    <p className="text-sm font-medium text-blue-800">{kundeAnzeigeName(kundeObj)}</p>
                    {kundeObj.adresse && <p className="text-xs text-blue-600 mt-0.5">{kundeObj.adresse}</p>}
                  </div>
                )}
                <div>
                  <label className={LABEL}>Rechnungsadresse</label>
                  <textarea rows={3} value={form.rechnungsadresse}
                    onChange={function(e) { setField('rechnungsadresse', e.target.value); }}
                    placeholder="Strasse, PLZ Ort"
                    className={INPUT + ' resize-none'} />
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Positionen */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Positionen *</div>
              <div className="space-y-3">
                {positionen.map(function(pos, i) {
                  var filtered = LEISTUNGEN.filter(function(l) {
                    return l.toLowerCase().includes((pos.beschreibung || '').toLowerCase()) && l !== pos.beschreibung;
                  });
                  return (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">Pos. {i + 1}</span>
                        <button onClick={function() { removePos(i); }}
                          className="text-xs text-gray-300 hover:text-red-400 transition px-2 py-1 rounded">
                          Entfernen
                        </button>
                      </div>
                      <div className="relative">
                        <label className={LABEL}>Beschreibung</label>
                        <input type="text" value={pos.beschreibung}
                          onChange={function(e) { posChange(i, 'beschreibung', e.target.value); setOpenDrop(i); }}
                          onFocus={function() { setOpenDrop(i); }}
                          placeholder="Leistung oder Freitext..."
                          className={INPUT} />
                        {openDrop === i && filtered.length > 0 && (
                          <div className="absolute left-0 right-0 bottom-full mb-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg max-h-44 overflow-y-auto">
                            {filtered.slice(0, 10).map(function(l) {
                              return (
                                <button key={l} type="button"
                                  onMouseDown={function() { posChange(i, 'beschreibung', l); setOpenDrop(null); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition">
                                  {l}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={LABEL}>Menge</label>
                          <input type="number" min="0" step="0.5" value={pos.menge}
                            onChange={function(e) { posChange(i, 'menge', e.target.value); }}
                            className={INPUT} />
                        </div>
                        <div>
                          <label className={LABEL}>Einheit</label>
                          <select value={pos.einheit}
                            onChange={function(e) { posChange(i, 'einheit', e.target.value); }}
                            className={INPUT}>
                            {EINHEITEN.map(function(eu) { return <option key={eu}>{eu}</option>; })}
                          </select>
                        </div>
                        <div>
                          <label className={LABEL}>Einzelpreis</label>
                          <input type="number" min="0" step="0.01" value={pos.preis}
                            onChange={function(e) { posChange(i, 'preis', e.target.value); }}
                            className={INPUT} />
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold text-gray-700">
                        {'Gesamt: ' + fmtEuro(pos.menge * pos.preis)}
                      </div>
                    </div>
                  );
                })}
                <button onClick={addPos}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition">
                  + Position hinzufuegen
                </button>
              </div>
            </Card.Content>
          </Card>

          {/* Konditionen + Summen */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Konditionen</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={LABEL}>Steuersatz (%)</label>
                  <select value={form.steuersatz}
                    onChange={function(e) { setField('steuersatz', Number(e.target.value)); }}
                    className={INPUT}>
                    <option value={19}>19% (Standard)</option>
                    <option value={7}>7% (Ermaessigt)</option>
                    <option value={0}>0% (Steuerfrei)</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Skonto (%)</label>
                  <input type="number" min="0" max="20" step="0.5" value={form.skonto}
                    onChange={function(e) { setField('skonto', e.target.value); }}
                    className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Zahlungsstatus</label>
                  <select value={form.zahlungsstatus}
                    onChange={function(e) { setField('zahlungsstatus', e.target.value); }}
                    className={INPUT}>
                    {ZAHLUNGSSTATUS.map(function(z) {
                      return <option key={z.value} value={z.value}>{z.label}</option>;
                    })}
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Nettobetrag</span>
                  <span className="font-mono">{fmtEuro(netto)}</span>
                </div>
                {skontoAmt > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{'Skonto (' + form.skonto + '%)'}</span>
                    <span className="font-mono">{'-' + fmtEuro(skontoAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{'MwSt. (' + form.steuersatz + '%)'}</span>
                  <span className="font-mono">{fmtEuro(mwst)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold text-gray-900">
                  <span>Gesamtbetrag</span>
                  <span className="font-mono text-blue-600">{fmtEuro(brutto)}</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Bemerkungen */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Bemerkungen</div>
              <textarea rows={3} value={form.notizen}
                onChange={function(e) { setField('notizen', e.target.value); }}
                placeholder="z. B. Zahlungshinweise, besondere Konditionen..."
                className={INPUT + ' resize-none'} />
            </Card.Content>
          </Card>

          {/* Aktionen */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="secondary" onClick={function() { router.push('/dashboard-v2/rechnungen'); }} disabled={speichern}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleSpeichern} disabled={speichern}>
              {speichern ? 'Speichern...' : 'Rechnung speichern'}
            </Button>
          </div>

        </div>
      </Page.Content>
    </Page>
  );
}
