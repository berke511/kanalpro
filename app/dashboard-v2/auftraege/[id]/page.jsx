'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Button from '@/components/ui/v2/Button';
import Dialog from '@/components/ui/v2/Dialog';

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

var STATUS_OPTS = [
  { value: 'offen', label: 'Offen' },
  { value: 'in_bearbeitung', label: 'In Bearbeitung' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
  { value: 'storniert', label: 'Storniert' },
];

function kundeAnzeigeName(k) {
  if (!k) return '';
  if (k.kundentyp === 'firma') return k.firmenname || k.firma || k.name || '';
  return k.name || '';
}

export default function AuftragEditV2Page() {
  var router = useRouter();
  var params = useParams();
  var id = params.id;

  var [companyId, setCompanyId] = useState(null);
  var [laden, setLaden] = useState(true);
  var [nichtGefunden, setNichtGefunden] = useState(false);
  var [speichern, setSpeichern] = useState(false);
  var [loeschen, setLoeschen] = useState(false);
  var [showDialog, setShowDialog] = useState(false);
  var [apiErr, setApiErr] = useState('');
  var [erfolg, setErfolg] = useState('');
  var [kundeName, setKundeName] = useState('');

  var [form, setForm] = useState({
    auftragsart: '',
    beschreibung: '',
    datum: '',
    uhrzeit: '',
    adresse: '',
    status: 'offen',
    intNotiz: '',
    notdienst: false,
  });

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
        if (!memberRes.data) { setLaden(false); return; }
        var cid = memberRes.data.company_id;
        setCompanyId(cid);

        var auftragRes = await supabase
          .from('auftraege')
          .select('*')
          .eq('id', id)
          .eq('company_id', cid)
          .maybeSingle();

        if (!auftragRes.data) {
          setNichtGefunden(true);
          setLaden(false);
          return;
        }

        var a = auftragRes.data;

        var notizenObj = {};
        if (a.notizen) {
          try { notizenObj = JSON.parse(a.notizen); } catch (e) {}
        }

        setForm({
          auftragsart: a.titel ?? '',
          beschreibung: a.beschreibung ?? '',
          datum: a.datum ? a.datum.split('T')[0] : '',
          uhrzeit: a.uhrzeit ?? notizenObj.uhrzeit ?? '',
          adresse: a.adresse ?? a.einsatzort ?? '',
          status: a.status ?? 'offen',
          intNotiz: a.interne_notiz ?? notizenObj.interne_notiz ?? '',
          notdienst: a.notdienst ?? notizenObj.notdienst ?? false,
        });

        var kundenId = a.kunden_id ?? a.kunde_id ?? null;
        if (kundenId) {
          var kundeRes = await supabase
            .from('kunden')
            .select('id, name, firmenname, firma, kundentyp')
            .eq('id', kundenId)
            .maybeSingle();
          if (kundeRes.data) {
            setKundeName(kundeAnzeigeName(kundeRes.data));
          }
        }

        setLaden(false);
      } catch (e) {
        setLaden(false);
      }
    }
    ladeDaten();
  }, [id, router]);

  function setField(key, val) {
    setForm(function(f) { return Object.assign({}, f, { [key]: val }); });
    setApiErr('');
  }

  async function handleSpeichern() {
    if (!form.auftragsart) { setApiErr('Auftragsart ist erforderlich.'); return; }
    if (!form.beschreibung.trim()) { setApiErr('Beschreibung ist erforderlich.'); return; }
    setSpeichern(true);
    setApiErr('');
    try {
      var payload = {
        titel: form.auftragsart,
        beschreibung: form.beschreibung.trim(),
        datum: form.datum || null,
        adresse: form.adresse.trim() || null,
        status: form.status,
        interne_notiz: form.intNotiz.trim() || null,
      };
      var res = await supabase
        .from('auftraege')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId);
      if (res.error) throw res.error;
      router.push('/dashboard-v2/auftraege');
    } catch (err) {
      setApiErr(err.message ?? 'Fehler beim Speichern.');
      setSpeichern(false);
    }
  }

  async function handleLoeschen() {
    setLoeschen(true);
    try {
      var res = await supabase
        .from('auftraege')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (res.error) throw res.error;
      router.push('/dashboard-v2/auftraege');
    } catch (err) {
      setApiErr(err.message ?? 'Fehler beim Loeschen.');
      setLoeschen(false);
      setShowDialog(false);
    }
  }

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Auftrag bearbeiten</Page.Title></Page.Header>
        <Page.Content>
          <div className="text-sm text-gray-400 py-8 text-center">Laedt...</div>
        </Page.Content>
      </Page>
    );
  }

  if (nichtGefunden) {
    return (
      <Page>
        <Page.Header><Page.Title>Auftrag nicht gefunden</Page.Title></Page.Header>
        <Page.Content>
          <Card>
            <Card.Content>
              <div className="py-8 text-center">
                <div className="text-sm text-gray-500 mb-4">Dieser Auftrag existiert nicht oder gehoert nicht zu Ihrem Unternehmen.</div>
                <Button variant="secondary" onClick={function() { router.push('/dashboard-v2/auftraege'); }}>
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
        <Page.Title>Auftrag bearbeiten</Page.Title>
        <Page.Description>Auftragsdaten aktualisieren oder Auftrag loeschen</Page.Description>
      </Page.Header>
      <Page.Content>
        <div className="space-y-5 max-w-2xl">

          {apiErr && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
              {apiErr}
            </div>
          )}

          {/* Kunde (read-only) */}
          {kundeName && (
            <Card>
              <Card.Content>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kunde</div>
                <div className="text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                  {kundeName}
                </div>
                <div className="mt-1 text-xs text-gray-400">Kunde kann nach Erstellung nicht geaendert werden.</div>
              </Card.Content>
            </Card>
          )}

          {/* Auftragsart + Status */}
          <Card>
            <Card.Content>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Auftragsinformationen</div>
              <div className="space-y-4">
                <div>
                  <label className={LABEL}>Auftragsart *</label>
                  <select
                    value={form.auftragsart}
                    onChange={function(e) { setField('auftragsart', e.target.value); }}
                    className={INPUT}
                  >
                    <option value="">-- Bitte auswaehlen --</option>
                    {AUFTRAGSARTEN.map(function(a) {
                      return <option key={a} value={a}>{a}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Status</label>
                  <select
                    value={form.status}
                    onChange={function(e) { setField('status', e.target.value); }}
                    className={INPUT}
                  >
                    {STATUS_OPTS.map(function(s) {
                      return <option key={s.value} value={s.value}>{s.label}</option>;
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Termin</label>
                    <input
                      type="date"
                      value={form.datum}
                      onChange={function(e) { setField('datum', e.target.value); }}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Einsatzadresse</label>
                    <input
                      type="text"
                      value={form.adresse}
                      onChange={function(e) { setField('adresse', e.target.value); }}
                      placeholder="Adresse"
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
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Beschreibung *</div>
              <textarea
                rows={5}
                value={form.beschreibung}
                onChange={function(e) { setField('beschreibung', e.target.value); }}
                placeholder="Beschreibung des Problems oder Auftrags..."
                className={INPUT + ' resize-none'}
              />
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
                placeholder="Nur intern sichtbar..."
                className={INPUT + ' resize-none'}
              />
            </Card.Content>
          </Card>

          {/* Aktionen */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={function() { router.push('/dashboard-v2/auftraege'); }} disabled={speichern || loeschen}>
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
        <Dialog.Title>Auftrag loeschen</Dialog.Title>
        <Dialog.Content>
          <p className="text-sm text-gray-600">
            Bist du sicher, dass du diesen Auftrag loeschen moechtest? Diese Aktion kann nicht rueckgaengig gemacht werden.
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
