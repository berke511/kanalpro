'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Button from '@/components/ui/v2/Button';

var INPUT = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
var LABEL = 'block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide';

var AUFTRAGSARTEN = [
  'Rohrreinigung',
  'TV-Inspektion',
  'Dichtheitsprüfung',
  'Notdienst',
  'Wartung',
  'Sanierung',
  'Sonstiges',
];

function genNummer() {
  var year = new Date().getFullYear();
  var rand = String(Math.floor(10000 + Math.random() * 90000));
  return 'AUF-' + year + '-' + rand;
}

function kundeAnzeigeName(k) {
  if (!k) return '';
  if (k.kundentyp === 'firma') return k.firmenname || k.firma || k.name;
  return k.name || '';
}

export default function AuftragErstellenV2Page() {
  var router = useRouter();
  var dropRef = useRef(null);

  var [companyId, setCompanyId] = useState(null);
  var [userId, setUserId] = useState(null);
  var [laden, setLaden] = useState(true);
  var [speichern, setSpeichern] = useState(false);
  var [apiErr, setApiErr] = useState('');

  var [suchText, setSuchText] = useState('');
  var [kundenliste, setKundenliste] = useState([]);
  var [showDrop, setShowDrop] = useState(false);
  var [suchLaden, setSuchLaden] = useState(false);
  var [selectedKunde, setSelectedKunde] = useState(null);

  var [objekte, setObjekte] = useState([]);
  var [objektLaden, setObjektLaden] = useState(false);
  var [selectedObjekt, setSelectedObjekt] = useState(null);
  var [manuelleAdr, setManuelleAdr] = useState('');

  var [form, setForm] = useState({
    auftragsart: '',
    termin: '',
    uhrzeit: '',
    beschreibung: '',
    intNotiz: '',
    notdienst: false,
  });

  var [formFehler, setFormFehler] = useState({});

  useEffect(function() {
    async function init() {
      try {
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
        if (!memberRes.data) { setLaden(false); return; }
        setCompanyId(memberRes.data.company_id);
        setLaden(false);
      } catch (e) {
        setLaden(false);
      }
    }
    init();
  }, [router]);

  useEffect(function() {
    if (!companyId || suchText.trim().length < 1) {
      setKundenliste([]);
      setShowDrop(false);
      return;
    }
    var timer = setTimeout(async function() {
      setSuchLaden(true);
      var qt = '%' + suchText.trim() + '%';
      var orFilter = 'name.ilike.' + qt + ',firmenname.ilike.' + qt + ',firma.ilike.' + qt;
      var res = await supabase
        .from('kunden')
        .select('id, name, firmenname, firma, kundentyp, telefon, email, adresse')
        .eq('company_id', companyId)
        .or(orFilter)
        .limit(10);
      setKundenliste(res.data ?? []);
      setShowDrop(true);
      setSuchLaden(false);
    }, 300);
    return function() { clearTimeout(timer); };
  }, [suchText, companyId]);

  useEffect(function() {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return function() { document.removeEventListener('mousedown', handler); };
  }, []);

  async function onKundeWaehlen(k) {
    setSelectedKunde(k);
    setSuchText(kundeAnzeigeName(k));
    setShowDrop(false);
    setFormFehler(function(prev) { return Object.assign({}, prev, { kunde: '', einsatzort: '' }); });
    setSelectedObjekt(null);
    setManuelleAdr('');
    setObjektLaden(true);
    var res = await supabase
      .from('objekte')
      .select('id, bezeichnung, adresse')
      .eq('kunde_id', k.id)
      .eq('company_id', companyId)
      .order('bezeichnung');
    var liste = res.data ?? [];
    setObjekte(liste);
    setObjektLaden(false);
    if (liste.length === 1) {
      setSelectedObjekt(liste[0]);
      setManuelleAdr(liste[0].adresse ?? '');
    }
  }

  function kundeZuruecksetzen() {
    setSelectedKunde(null);
    setSuchText('');
    setKundenliste([]);
    setObjekte([]);
    setSelectedObjekt(null);
    setManuelleAdr('');
  }

  function setField(key, val) {
    setForm(function(f) { return Object.assign({}, f, { [key]: val }); });
    setFormFehler(function(prev) { return Object.assign({}, prev, { [key]: '' }); });
  }

  function validieren() {
    var e = {};
    if (!selectedKunde) e.kunde = 'Bitte einen Kunden auswaehlen.';
    if (!form.auftragsart) e.auftragsart = 'Auftragsart ist erforderlich.';
    if (!form.beschreibung.trim()) e.beschreibung = 'Bitte eine Beschreibung eingeben.';
    if (!selectedObjekt && !manuelleAdr.trim()) e.einsatzort = 'Bitte einen Einsatzort angeben.';
    setFormFehler(e);
    return Object.keys(e).length === 0;
  }

  async function handleSpeichern() {
    if (!validieren()) return;
    setSpeichern(true);
    setApiErr('');
    try {
      var nummer = genNummer();
      var einsatzAdr = selectedObjekt
        ? (selectedObjekt.bezeichnung + (selectedObjekt.adresse ? ' - ' + selectedObjekt.adresse : ''))
        : manuelleAdr.trim();
      var metaDaten = {
        nummer: nummer,
        uhrzeit: form.uhrzeit || null,
        notdienst: form.notdienst,
        interne_notiz: form.intNotiz.trim() || null,
      };
      var payload = {
        company_id: companyId,
        user_id: userId,
        kunde_id: selectedKunde.id,
        objekt_id: selectedObjekt ? selectedObjekt.id : null,
        titel: form.auftragsart,
        beschreibung: form.beschreibung.trim(),
        status: 'offen',
        datum: form.termin || null,
        adresse: einsatzAdr || null,
        notizen: JSON.stringify(metaDaten),
      };
      var res = await supabase.from('auftraege').insert(payload).select('id').single();
      if (res.error) throw res.error;
      router.push('/dashboard-v2/auftraege');
    } catch (err) {
      setApiErr(err.message ?? 'Fehler beim Speichern.');
      setSpeichern(false);
    }
  }

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Neuer Auftrag</Page.Title></Page.Header>
        <Page.Content>
          <div className="text-sm text-gray-400 py-8 text-center">Laedt...</div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Neuer Auftrag</Page.Title>
        <Page.Description>Auftrag erstellen und fuer die Einsatzplanung vorbereiten</Page.Description>
      </Page.Header>
      <Page.Content>
        <div className="space-y-5 max-w-2xl">

          {apiErr && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
              {apiErr}
            </div>
          )}

          {/* Kunde */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Kunde *</div>
              {!selectedKunde ? (
                <div ref={dropRef} className="relative">
                  <input
                    type="text"
                    value={suchText}
                    onChange={function(e) { setSuchText(e.target.value); }}
                    placeholder="Kundenname oder Firma eingeben..."
                    autoComplete="off"
                    className={INPUT + (formFehler.kunde ? ' border-red-300' : '')}
                  />
                  {showDrop && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                      {suchLaden ? (
                        <div className="px-4 py-3 text-sm text-gray-400">Suche...</div>
                      ) : kundenliste.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400">Kein Kunde gefunden.</div>
                      ) : (
                        <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                          {kundenliste.map(function(k) {
                            return (
                              <button
                                key={k.id}
                                type="button"
                                onClick={function() { onKundeWaehlen(k); }}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition text-sm"
                              >
                                <div className="font-medium text-gray-900">{kundeAnzeigeName(k)}</div>
                                {k.adresse && <div className="text-xs text-gray-400 mt-0.5">{k.adresse}</div>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {formFehler.kunde && <div className="mt-1 text-xs text-red-500">{formFehler.kunde}</div>}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-md mb-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{kundeAnzeigeName(selectedKunde)}</div>
                      {selectedKunde.adresse && <div className="text-xs text-gray-500 mt-0.5">{selectedKunde.adresse}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={kundeZuruecksetzen}
                      className="text-xs text-gray-400 hover:text-gray-600 ml-4"
                    >
                      &#x2715;
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {selectedKunde.telefon && (
                      <div>
                        <div className="text-gray-400 uppercase tracking-wide mb-0.5">Telefon</div>
                        <div className="text-gray-700">{selectedKunde.telefon}</div>
                      </div>
                    )}
                    {selectedKunde.email && (
                      <div>
                        <div className="text-gray-400 uppercase tracking-wide mb-0.5">E-Mail</div>
                        <div className="text-gray-700 truncate">{selectedKunde.email}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Einsatzort */}
          {selectedKunde && (
            <Card>
              <Card.Content>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Einsatzort *</div>
                {objektLaden ? (
                  <div className="text-sm text-gray-400">Objekte werden geladen...</div>
                ) : objekte.length > 0 ? (
                  <div>
                    <label className={LABEL}>Objekt auswaehlen</label>
                    <select
                      value={selectedObjekt ? selectedObjekt.id : ''}
                      onChange={function(e) {
                        var obj = objekte.find(function(o) { return o.id === e.target.value; }) ?? null;
                        setSelectedObjekt(obj);
                        setManuelleAdr(obj ? (obj.adresse ?? '') : '');
                        setFormFehler(function(prev) { return Object.assign({}, prev, { einsatzort: '' }); });
                      }}
                      className={INPUT + (formFehler.einsatzort ? ' border-red-300' : '')}
                    >
                      {objekte.length > 1 && <option value="">-- Objekt auswaehlen --</option>}
                      {objekte.map(function(o) {
                        return (
                          <option key={o.id} value={o.id}>
                            {o.bezeichnung}{o.adresse ? ' - ' + o.adresse : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className={LABEL}>Adresse</label>
                    <input
                      type="text"
                      value={manuelleAdr}
                      onChange={function(e) {
                        setManuelleAdr(e.target.value);
                        setFormFehler(function(prev) { return Object.assign({}, prev, { einsatzort: '' }); });
                      }}
                      placeholder="z. B. Musterstrasse 12, 12345 Berlin"
                      className={INPUT + (formFehler.einsatzort ? ' border-red-300' : '')}
                    />
                  </div>
                )}
                {formFehler.einsatzort && <div className="mt-1 text-xs text-red-500">{formFehler.einsatzort}</div>}
              </Card.Content>
            </Card>
          )}

          {/* Auftragsart + Termin */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Auftragsinformationen</div>
              <div className="space-y-4">
                <div>
                  <label className={LABEL}>Auftragsart *</label>
                  <select
                    value={form.auftragsart}
                    onChange={function(e) { setField('auftragsart', e.target.value); }}
                    className={INPUT + (formFehler.auftragsart ? ' border-red-300' : '')}
                  >
                    <option value="">-- Bitte auswaehlen --</option>
                    {AUFTRAGSARTEN.map(function(a) {
                      return <option key={a} value={a}>{a}</option>;
                    })}
                  </select>
                  {formFehler.auftragsart && <div className="mt-1 text-xs text-red-500">{formFehler.auftragsart}</div>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Wunschtermin</label>
                    <input
                      type="date"
                      value={form.termin}
                      onChange={function(e) { setField('termin', e.target.value); }}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Uhrzeit</label>
                    <input
                      type="time"
                      value={form.uhrzeit}
                      onChange={function(e) { setField('uhrzeit', e.target.value); }}
                      className={INPUT}
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      className={'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ' + (form.notdienst ? 'bg-red-500 border-red-500' : 'border-gray-300 bg-white')}
                      onClick={function() { setField('notdienst', !form.notdienst); }}
                    >
                      {form.notdienst && <span className="text-white text-xs font-bold">&#10003;</span>}
                    </div>
                    <div>
                      <div className={'text-sm font-medium ' + (form.notdienst ? 'text-red-700' : 'text-gray-700')}>Notdienst</div>
                      <div className="text-xs text-gray-400">Hoechste Bearbeitungspriorität</div>
                    </div>
                    {form.notdienst && (
                      <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">AKTIV</span>
                    )}
                  </label>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Beschreibung */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Problembeschreibung *</div>
              <textarea
                rows={5}
                value={form.beschreibung}
                onChange={function(e) { setField('beschreibung', e.target.value); }}
                placeholder="Beschreibung des Problems oder Auftrags..."
                className={INPUT + ' resize-none ' + (formFehler.beschreibung ? 'border-red-300' : '')}
              />
              {formFehler.beschreibung && <div className="mt-1 text-xs text-red-500">{formFehler.beschreibung}</div>}
            </Card.Content>
          </Card>

          {/* Interne Notiz */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Interne Notiz</div>
              <textarea
                rows={3}
                value={form.intNotiz}
                onChange={function(e) { setField('intNotiz', e.target.value); }}
                placeholder="Nur intern sichtbar – Hinweise fuer den Techniker..."
                className={INPUT + ' resize-none'}
              />
            </Card.Content>
          </Card>

          {/* Aktionsleiste */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="secondary" onClick={function() { router.push('/dashboard-v2/auftraege'); }} disabled={speichern}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleSpeichern} disabled={speichern}>
              {speichern ? 'Speichern...' : 'Auftrag speichern'}
            </Button>
          </div>

        </div>
      </Page.Content>
    </Page>
  );
}
