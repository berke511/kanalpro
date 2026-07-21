'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';
import Badge from '@/components/ui/v2/Badge';
import Dialog from '@/components/ui/v2/Dialog';

var MASCHINENTYP_OPTIONS = [
  { value: 'hebebuehne',       label: 'Hebebuehne' },
  { value: 'kompressor',       label: 'Kompressor' },
  { value: 'generator',        label: 'Generator / Aggregat' },
  { value: 'kran',             label: 'Kran' },
  { value: 'stapler',          label: 'Stapler / Hubwagen' },
  { value: 'schweissgeraet',   label: 'Schweissgeraet' },
  { value: 'werkzeugmaschine', label: 'Werkzeugmaschine' },
  { value: 'pumpe',            label: 'Pumpe' },
  { value: 'druckluftwerkzeug',label: 'Druckluftwerkzeug' },
  { value: 'hochdruckspueler', label: 'Hochdruckspueler' },
  { value: 'fraese',           label: 'Fraese / Bohrwerk' },
  { value: 'messgeraet',       label: 'Messgeraet' },
  { value: 'pruefgeraet',      label: 'Pruefgeraet' },
  { value: 'kamera',           label: 'Kamera / Optik' },
  { value: 'werkzeug',         label: 'Werkzeug (Allg.)' },
  { value: 'roboter',          label: 'Roboter' },
  { value: 'sonstiges',        label: 'Sonstiges' },
];

var ZUSTAND_OPTIONS = [
  { value: 'aktiv',          label: 'Aktiv' },
  { value: 'in_einsatz',     label: 'Im Einsatz' },
  { value: 'wartung',        label: 'In Wartung' },
  { value: 'defekt',         label: 'Defekt' },
  { value: 'ausser_betrieb', label: 'Ausser Betrieb' },
];

var ZUSTAND_LABELS = {
  aktiv: 'Aktiv',
  in_einsatz: 'Im Einsatz',
  wartung: 'In Wartung',
  defekt: 'Defekt',
  ausser_betrieb: 'Ausser Betrieb',
};

var ZUSTAND_VARIANTEN = {
  aktiv: 'success',
  in_einsatz: 'info',
  wartung: 'warning',
  defekt: 'danger',
  ausser_betrieb: 'default',
};

export default function MaschineBearbeiten({ params }) {
  var id = params.id;
  var router = useRouter();

  var [form, setForm] = useState({
    name: '',
    typ: '',
    hersteller: '',
    modell: '',
    seriennummer: '',
    inventarnummer: '',
    baujahr: '',
    kaufdatum: '',
    anschaffungswert: '',
    betriebsstunden_aktuell: '',
    lagerort: '',
    zustand: '',
    naechste_pruefung_datum: '',
    notiz: '',
  });
  var [companyId, setCompanyId] = useState(null);
  var [laden, setLaden] = useState(true);
  var [speichern, setSpeichern] = useState(false);
  var [loeschen, setLoeschen] = useState(false);
  var [gespeichert, setGespeichert] = useState(false);
  var [fehler, setFehler] = useState('');
  var [showDialog, setShowDialog] = useState(false);

  useEffect(function () {
    async function load() {
      var authResult = await supabase.auth.getUser();
      var user = authResult.data && authResult.data.user;
      if (!user) { router.push('/login'); return; }

      var memberResult = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      var cId = memberResult.data && memberResult.data.company_id;
      if (!cId) { router.push('/dashboard-v2/maschinen'); return; }
      setCompanyId(cId);

      var result = await supabase
        .from('maschinen')
        .select('*')
        .eq('id', id)
        .eq('company_id', cId)
        .maybeSingle();

      if (!result.data) { router.push('/dashboard-v2/maschinen'); return; }

      var d = result.data;
      setForm({
        name:                     d.name ?? '',
        typ:                      d.typ ?? '',
        hersteller:               d.hersteller ?? '',
        modell:                   d.modell ?? '',
        seriennummer:             d.seriennummer ?? '',
        inventarnummer:           d.inventarnummer ?? '',
        baujahr:                  d.baujahr != null ? String(d.baujahr) : '',
        kaufdatum:                d.kaufdatum ?? '',
        anschaffungswert:         d.anschaffungswert != null ? String(d.anschaffungswert) : '',
        betriebsstunden_aktuell:  d.betriebsstunden_aktuell != null ? String(d.betriebsstunden_aktuell) : '',
        lagerort:                 d.lagerort ?? '',
        zustand:                  d.zustand ?? '',
        naechste_pruefung_datum:  d.naechste_pruefung_datum ?? '',
        notiz:                    d.notiz ?? '',
      });
      setLaden(false);
    }
    load();
  }, [id, router]);

  function handleChange(e) {
    var name = e.target.name;
    var value = e.target.value;
    setForm(function (f) {
      var next = {};
      var keys = Object.keys(f);
      for (var i = 0; i < keys.length; i++) { next[keys[i]] = f[keys[i]]; }
      next[name] = value;
      return next;
    });
    setGespeichert(false);
    setFehler('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setFehler('');
    if (!form.name.trim()) { setFehler('Bezeichnung ist ein Pflichtfeld.'); return; }
    setSpeichern(true);
    var payload = {
      name:                    form.name.trim(),
      typ:                     form.typ || null,
      hersteller:              form.hersteller.trim() || null,
      modell:                  form.modell.trim() || null,
      seriennummer:            form.seriennummer.trim() || null,
      inventarnummer:          form.inventarnummer.trim() || null,
      baujahr:                 form.baujahr ? parseInt(form.baujahr, 10) : null,
      kaufdatum:               form.kaufdatum || null,
      anschaffungswert:        form.anschaffungswert ? parseFloat(form.anschaffungswert) : null,
      betriebsstunden_aktuell: form.betriebsstunden_aktuell ? parseFloat(form.betriebsstunden_aktuell) : null,
      lagerort:                form.lagerort.trim() || null,
      zustand:                 form.zustand || null,
      naechste_pruefung_datum: form.naechste_pruefung_datum || null,
      notiz:                   form.notiz.trim() || null,
      updated_at:              new Date().toISOString(),
    };
    var result = await supabase
      .from('maschinen')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId);
    setSpeichern(false);
    if (result.error) { setFehler(result.error.message); return; }
    setGespeichert(true);
    setTimeout(function () { setGespeichert(false); }, 3000);
    router.push('/dashboard-v2/maschinen');
  }

  async function handleLoeschen() {
    setLoeschen(true);
    await supabase
      .from('maschinen')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    setLoeschen(false);
    router.push('/dashboard-v2/maschinen');
  }

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Maschine</Page.Title></Page.Header>
        <Page.Content>
          <p className="text-sm text-gray-400">Laedt...</p>
        </Page.Content>
      </Page>
    );
  }

  var selectClass = 'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <Page>
      <Page.Header>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Page.Title>{form.name || 'Maschine'}</Page.Title>
            {form.zustand && (
              <Badge variant={ZUSTAND_VARIANTEN[form.zustand] || 'default'}>
                {ZUSTAND_LABELS[form.zustand] || form.zustand}
              </Badge>
            )}
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={function () { setShowDialog(true); }}
          >
            Loeschen
          </Button>
        </div>
      </Page.Header>
      <Page.Content>
        <form onSubmit={handleSave}>
          {fehler && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {fehler}
            </div>
          )}
          {gespeichert && (
            <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              Aenderungen gespeichert.
            </div>
          )}
          <Card className="mb-4">
            <Card.Header><Card.Title>Basisdaten</Card.Title></Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bezeichnung <span className="text-red-500">*</span>
                  </label>
                  <Input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                  <select name="typ" value={form.typ} onChange={handleChange} className={selectClass}>
                    <option value="">-- Kein Typ --</option>
                    {MASCHINENTYP_OPTIONS.map(function (o) {
                      return <option key={o.value} value={o.value}>{o.label}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zustand</label>
                  <select name="zustand" value={form.zustand} onChange={handleChange} className={selectClass}>
                    <option value="">-- Kein Zustand --</option>
                    {ZUSTAND_OPTIONS.map(function (o) {
                      return <option key={o.value} value={o.value}>{o.label}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hersteller</label>
                  <Input name="hersteller" value={form.hersteller} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modell</label>
                  <Input name="modell" value={form.modell} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seriennummer</label>
                  <Input name="seriennummer" value={form.seriennummer} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inventarnummer</label>
                  <Input name="inventarnummer" value={form.inventarnummer} onChange={handleChange} />
                </div>
              </div>
            </Card.Content>
          </Card>
          <Card className="mb-4">
            <Card.Header><Card.Title>Technische Daten</Card.Title></Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Baujahr</label>
                  <Input name="baujahr" type="number" min="1900" max="2099" value={form.baujahr} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kaufdatum</label>
                  <Input name="kaufdatum" type="date" value={form.kaufdatum} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anschaffungswert (EUR)</label>
                  <Input name="anschaffungswert" type="number" step="0.01" min="0" value={form.anschaffungswert} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Betriebsstunden aktuell</label>
                  <Input name="betriebsstunden_aktuell" type="number" step="0.1" min="0" value={form.betriebsstunden_aktuell} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lagerort / Standort</label>
                  <Input name="lagerort" value={form.lagerort} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naechste Pruefung</label>
                  <Input name="naechste_pruefung_datum" type="date" value={form.naechste_pruefung_datum} onChange={handleChange} />
                </div>
              </div>
            </Card.Content>
          </Card>
          <Card className="mb-6">
            <Card.Header><Card.Title>Notizen</Card.Title></Card.Header>
            <Card.Content>
              <textarea
                name="notiz"
                value={form.notiz}
                onChange={handleChange}
                rows={4}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Interne Notizen..."
              />
            </Card.Content>
          </Card>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={speichern}>
              {speichern ? 'Speichert...' : 'Aenderungen speichern'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={function () { router.push('/dashboard-v2/maschinen'); }}
            >
              Abbrechen
            </Button>
          </div>
        </form>

        <Dialog open={showDialog} onClose={function () { setShowDialog(false); }}>
          <Dialog.Header>
            <Dialog.Title>Maschine loeschen</Dialog.Title>
            <Dialog.Description>
              Moechten Sie {form.name || 'diese Maschine'} wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button
              variant="ghost"
              onClick={function () { setShowDialog(false); }}
              disabled={loeschen}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={handleLoeschen}
              disabled={loeschen}
            >
              {loeschen ? 'Loescht...' : 'Loeschen'}
            </Button>
          </Dialog.Footer>
        </Dialog>
      </Page.Content>
    </Page>
  );
}
