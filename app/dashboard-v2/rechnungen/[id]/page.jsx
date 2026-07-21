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

var STATUS_OPTS = [
  { value: 'entwurf', label: 'Entwurf' },
  { value: 'gesendet', label: 'Gesendet' },
  { value: 'versendet', label: 'Versendet' },
  { value: 'bezahlt', label: 'Bezahlt' },
  { value: 'storniert', label: 'Storniert' },
];

function kundeAnzeigeName(k) {
  if (!k) return '';
  if (k.kundentyp === 'firma') return k.firmenname || k.firma || k.name || '';
  return k.name || '';
}

function fmtEuro(n) {
  return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function RechnungEditV2Page() {
  var router = useRouter();
  var params = useParams();
  var id = params.id;
  var dropRef = useRef(null);

  var [companyId, setCompanyId] = useState(null);
  var [isLaden, setIsLaden] = useState(true);
  var [nichtGefunden, setNichtGefunden] = useState(false);
  var [speichern, setSpeichern] = useState(false);
  var [loeschen, setLoeschen] = useState(false);
  var [showDialog, setShowDialog] = useState(false);
  var [apiErr, setApiErr] = useState('');
  var [kunden, setKunden] = useState([]);
  var [rechnungsNr, setRechnungsNr] = useState('');
  var [openDrop, setOpenDrop] = useState(null);

  var [form, setForm] = useState({
    kundeId: '',
    datum: '',
    faelligAm: '',
    steuersatz: 19,
    status: 'entwurf',
    notizen: '',
  });

  var [positionen, setPositionen] = useState([
    { beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 },
  ]);

  useEffect(function() {
    async function ladeDaten() {
      try {
        var session = await supabase.auth.getUser();
        var user = session.data.user;
        if (!user) { router.push('/login'); return; }

        var memberRes = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (!memberRes.data) { setIsLaden(false); return; }
        var cid = memberRes.data.company_id;
        setCompanyId(cid);

        var [rechnungRes, kundenRes] = await Promise.all([
          supabase.from('rechnungen').select('*').eq('id', id).eq('company_id', cid).maybeSingle(),
          supabase.from('kunden').select('id, name, firmenname, firma, kundentyp').eq('company_id', cid).order('name'),
        ]);

        setKunden(kundenRes.data ?? []);

        if (!rechnungRes.data) {
          setNichtGefunden(true);
          setIsLaden(false);
          return;
        }

        var r = rechnungRes.data;
        setRechnungsNr(r.rechnungsnummer ?? '');
        setForm({
          kundeId: r.kunde_id ?? '',
          datum: r.datum ?? '',
          faelligAm: r.faellig_am ?? '',
          steuersatz: r.steuersatz ?? 19,
          status: r.status ?? 'entwurf',
          notizen: r.notizen ?? '',
        });
        setPositionen(
          (r.positionen ?? []).length > 0
            ? r.positionen
            : [{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }]
        );
        setIsLaden(false);
      } catch (e) {
        setIsLaden(false);
      }
    }
    ladeDaten();
  }, [id, router]);

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

  var netto = positionen.reduce(function(s, p) { return s + (p.menge || 0) * (p.preis || 0); }, 0);
  var mwst = netto * (Number(form.steuersatz) / 100);
  var brutto = netto + mwst;

  async function handleSpeichern() {
    setSpeichern(true);
    setApiErr('');
    try {
      var res = await supabase
        .from('rechnungen')
        .update({
          kunde_id: form.kundeId || null,
          datum: form.datum,
          faellig_am: form.faelligAm || null,
          steuersatz: Number(form.steuersatz),
          status: form.status,
          positionen: positionen,
          notizen: form.notizen || null,
        })
        .eq('id', id)
        .eq('company_id', companyId);
      if (res.error) throw res.error;
      router.push('/dashboard-v2/rechnungen');
    } catch (err) {
      setApiErr(err.message ?? 'Fehler beim Speichern.');
      setSpeichern(false);
    }
  }

  async function handleLoeschen() {
    setLoeschen(true);
    try {
      var res = await supabase
        .from('rechnungen')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (res.error) throw res.error;
      router.push('/dashboard-v2/rechnungen');
    } catch (err) {
      setApiErr(err.message ?? 'Fehler beim Loeschen.');
      setLoeschen(false);
      setShowDialog(false);
    }
  }

  if (isLaden) {
    return (
      <Page>
        <Page.Header><Page.Title>Rechnung bearbeiten</Page.Title></Page.Header>
        <Page.Content><div className="text-sm text-gray-400 py-8 text-center">Laedt...</div></Page.Content>
      </Page>
    );
  }

  if (nichtGefunden) {
    return (
      <Page>
        <Page.Header><Page.Title>Rechnung nicht gefunden</Page.Title></Page.Header>
        <Page.Content>
          <Card>
            <Card.Content>
              <div className="py-8 text-center">
                <div className="text-sm text-gray-500 mb-4">Diese Rechnung existiert nicht oder gehoert nicht zu Ihrem Unternehmen.</div>
                <Button variant="secondary" onClick={function() { router.push('/dashboard-v2/rechnungen'); }}>
                  Zurueck zur Uebersicht
                </Button>
              </div>
            </Card.Content>
          </Card>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Rechnung bearbeiten</Page.Title>
        <Page.Description>{rechnungsNr}</Page.Description>
      </Page.Header>
      <Page.Content>
        <div className="space-y-5 max-w-3xl" ref={dropRef}>

          {apiErr && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">{apiErr}</div>
          )}

          {/* Rechnungsdaten */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Rechnungsdaten</div>
              <div className="space-y-4">
                <div>
                  <label className={LABEL}>Kunde</label>
                  <select value={form.kundeId}
                    onChange={function(e) { setField('kundeId', e.target.value); }}
                    className={INPUT}>
                    <option value="">-- Kein Kunde --</option>
                    {kunden.map(function(k) {
                      return <option key={k.id} value={k.id}>{kundeAnzeigeName(k)}</option>;
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL}>Rechnungsdatum</label>
                    <input type="date" value={form.datum}
                      onChange={function(e) { setField('datum', e.target.value); }}
                      className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Faellig bis</label>
                    <input type="date" value={form.faelligAm}
                      onChange={function(e) { setField('faelligAm', e.target.value); }}
                      className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Status</label>
                    <select value={form.status}
                      onChange={function(e) { setField('status', e.target.value); }}
                      className={INPUT}>
                      {STATUS_OPTS.map(function(s) {
                        return <option key={s.value} value={s.value}>{s.label}</option>;
                      })}
                    </select>
                  </div>
                </div>
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
              </div>
            </Card.Content>
          </Card>

          {/* Positionen */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Positionen</div>
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
              {/* Summen */}
              <div className="mt-4 bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Nettobetrag</span>
                  <span className="font-mono">{fmtEuro(netto)}</span>
                </div>
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

          {/* Notizen */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Notizen / Zahlungshinweis</div>
              <textarea rows={3} value={form.notizen}
                onChange={function(e) { setField('notizen', e.target.value); }}
                placeholder="z. B. Bitte ueberweisen Sie den Betrag innerhalb von 14 Tagen..."
                className={INPUT + ' resize-none'} />
            </Card.Content>
          </Card>

          {/* Aktionen */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={function() { router.push('/dashboard-v2/rechnungen'); }} disabled={speichern || loeschen}>
                Abbrechen
              </Button>
              <Button variant="danger" onClick={function() { setShowDialog(true); }} disabled={speichern || loeschen}>
                Loeschen
              </Button>
            </div>
            <Button variant="primary" onClick={handleSpeichern} disabled={speichern || loeschen}>
              {speichern ? 'Speichern...' : 'Aenderungen speichern'}
            </Button>
          </div>

        </div>
      </Page.Content>

      <Dialog open={showDialog} onClose={function() { setShowDialog(false); }}>
        <Dialog.Title>Rechnung loeschen</Dialog.Title>
        <Dialog.Content>
          <p className="text-sm text-gray-600">
            Bist du sicher, dass du diese Rechnung loeschen moechtest? Diese Aktion kann nicht rueckgaengig gemacht werden.
          </p>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="secondary" onClick={function() { setShowDialog(false); }} disabled={loeschen}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={handleLoeschen} disabled={loeschen}>
            {loeschen ? 'Loeschen...' : 'Ja, loeschen'}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </Page>
  );
}
