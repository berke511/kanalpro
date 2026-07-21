'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';
import Dialog from '@/components/ui/v2/Dialog';

var TYP_OPTIONS = [
  { value: '', label: '— Bitte waehlen —' },
  { value: 'pkw', label: 'PKW' },
  { value: 'lkw', label: 'LKW' },
  { value: 'transporter', label: 'Transporter' },
  { value: 'kleintransporter', label: 'Kleintransporter' },
  { value: 'anhaenger', label: 'Anhaenger' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

var KRAFTSTOFF_OPTIONS = [
  { value: '', label: '— Bitte waehlen —' },
  { value: 'benzin', label: 'Benzin' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'elektro', label: 'Elektro' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'erdgas', label: 'Erdgas (CNG)' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

var ZUSTAND_OPTIONS = [
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'wartung', label: 'In Wartung' },
  { value: 'reserviert', label: 'Reserviert' },
  { value: 'ausser_betrieb', label: 'Ausser Betrieb' },
];

export default function FahrzeugDetail() {
  var router = useRouter();
  var params = useParams();
  var id = params && params.id;

  var [companyId, setCompanyId] = useState(null);
  var [laden, setLaden] = useState(true);
  var [speichern, setSpeichern] = useState(false);
  var [loeschen, setLoeschen] = useState(false);
  var [fehler, setFehler] = useState('');
  var [erfolg, setErfolg] = useState(false);
  var [showDialog, setShowDialog] = useState(false);

  var [form, setForm] = useState({
    kennzeichen: '',
    marke: '',
    modell: '',
    typ: '',
    baujahr: '',
    farbe: '',
    kraftstoff: '',
    km_stand: '',
    tuev_bis: '',
    hu_bis: '',
    uvv_bis: '',
    versicherung: '',
    zustand: 'aktiv',
    notizen: '',
  });

  useEffect(function() {
    async function load() {
      var authResult = await supabase.auth.getUser();
      var user = authResult.data && authResult.data.user;
      if (!user) { router.push('/login'); return; }

      var memberResult = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!memberResult.data) { router.push('/login'); return; }
      var cid = memberResult.data.company_id;
      setCompanyId(cid);

      var fahrzeugResult = await supabase
        .from('fahrzeuge')
        .select('*')
        .eq('id', id)
        .eq('company_id', cid)
        .maybeSingle();

      if (!fahrzeugResult.data) { router.push('/dashboard-v2/fahrzeuge'); return; }

      var d = fahrzeugResult.data;
      setForm({
        kennzeichen: d.kennzeichen ?? '',
        marke: d.marke ?? '',
        modell: d.modell ?? '',
        typ: d.typ ?? '',
        baujahr: d.baujahr != null ? String(d.baujahr) : '',
        farbe: d.farbe ?? '',
        kraftstoff: d.kraftstoff ?? '',
        km_stand: d.km_stand != null ? String(d.km_stand) : '',
        tuev_bis: d.tuev_bis ?? '',
        hu_bis: d.hu_bis ?? '',
        uvv_bis: d.uvv_bis ?? '',
        versicherung: d.versicherung ?? '',
        zustand: d.zustand ?? 'aktiv',
        notizen: d.notizen ?? '',
      });
      setLaden(false);
    }
    if (id) load();
  }, [id]);

  function handleChange(field, val) {
    setForm(function(prev) {
      var next = {};
      var keys = Object.keys(prev);
      for (var i = 0; i < keys.length; i++) {
        next[keys[i]] = prev[keys[i]];
      }
      next[field] = val;
      return next;
    });
  }

  async function handleSpeichern() {
    if (!companyId) return;
    if (!form.kennzeichen.trim()) { setFehler('Kennzeichen ist Pflichtfeld.'); return; }

    setSpeichern(true);
    setFehler('');

    var payload = {
      kennzeichen: form.kennzeichen.trim().toUpperCase(),
      marke: form.marke.trim() || null,
      modell: form.modell.trim() || null,
      typ: form.typ || null,
      baujahr: form.baujahr ? parseInt(form.baujahr) : null,
      farbe: form.farbe.trim() || null,
      kraftstoff: form.kraftstoff || null,
      km_stand: form.km_stand ? parseInt(form.km_stand) : null,
      tuev_bis: form.tuev_bis || null,
      hu_bis: form.hu_bis || null,
      uvv_bis: form.uvv_bis || null,
      versicherung: form.versicherung.trim() || null,
      zustand: form.zustand,
      notizen: form.notizen.trim() || null,
      updated_at: new Date().toISOString(),
    };

    var result = await supabase
      .from('fahrzeuge')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId);

    setSpeichern(false);

    if (result.error) {
      setFehler('Fehler beim Speichern: ' + (result.error.message || 'Unbekannter Fehler'));
      return;
    }

    setErfolg(true);
    setTimeout(function() { router.push('/dashboard-v2/fahrzeuge'); }, 800);
  }

  async function handleLoeschen() {
    if (!companyId) return;
    setLoeschen(true);

    await supabase
      .from('fahrzeuge')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    router.push('/dashboard-v2/fahrzeuge');
  }

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Fahrzeug</Page.Title></Page.Header>
        <Page.Content>
          <p className="text-sm text-gray-400">Laedt...</p>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Fahrzeug bearbeiten</Page.Title>
        <p className="mt-1 text-sm text-gray-500">Stammdaten aendern oder Fahrzeug loeschen</p>
      </Page.Header>
      <Page.Content>
        <div className="max-w-2xl space-y-6">

          <Card>
            <Card.Header>
              <Card.Title>Stammdaten</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Kennzeichen <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="z.B. M-AB 1234"
                    value={form.kennzeichen}
                    onChange={function(e) { handleChange('kennzeichen', e.target.value); }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Marke</label>
                  <Input
                    placeholder="z.B. Mercedes-Benz"
                    value={form.marke}
                    onChange={function(e) { handleChange('marke', e.target.value); }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Modell</label>
                  <Input
                    placeholder="z.B. Sprinter 314"
                    value={form.modell}
                    onChange={function(e) { handleChange('modell', e.target.value); }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fahrzeugtyp</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={form.typ}
                    onChange={function(e) { handleChange('typ', e.target.value); }}
                  >
                    {TYP_OPTIONS.map(function(o) {
                      return <option key={o.value} value={o.value}>{o.label}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Zustand</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={form.zustand}
                    onChange={function(e) { handleChange('zustand', e.target.value); }}
                  >
                    {ZUSTAND_OPTIONS.map(function(o) {
                      return <option key={o.value} value={o.value}>{o.label}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Baujahr</label>
                  <Input
                    type="number"
                    placeholder="z.B. 2019"
                    value={form.baujahr}
                    onChange={function(e) { handleChange('baujahr', e.target.value); }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Farbe</label>
                  <Input
                    placeholder="z.B. Weiss"
                    value={form.farbe}
                    onChange={function(e) { handleChange('farbe', e.target.value); }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Kraftstoff</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={form.kraftstoff}
                    onChange={function(e) { handleChange('kraftstoff', e.target.value); }}
                  >
                    {KRAFTSTOFF_OPTIONS.map(function(o) {
                      return <option key={o.value} value={o.value}>{o.label}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Kilometerstand</label>
                  <Input
                    type="number"
                    placeholder="z.B. 45000"
                    value={form.km_stand}
                    onChange={function(e) { handleChange('km_stand', e.target.value); }}
                  />
                </div>

              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Fristen und Versicherung</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">TUeV bis</label>
                  <Input
                    type="date"
                    value={form.tuev_bis}
                    onChange={function(e) { handleChange('tuev_bis', e.target.value); }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">HU bis</label>
                  <Input
                    type="date"
                    value={form.hu_bis}
                    onChange={function(e) { handleChange('hu_bis', e.target.value); }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">UVV bis</label>
                  <Input
                    type="date"
                    value={form.uvv_bis}
                    onChange={function(e) { handleChange('uvv_bis', e.target.value); }}
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Versicherung</label>
                  <Input
                    placeholder="Versicherungsgesellschaft oder Policennummer"
                    value={form.versicherung}
                    onChange={function(e) { handleChange('versicherung', e.target.value); }}
                  />
                </div>

              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Notizen</Card.Title>
            </Card.Header>
            <Card.Content>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Interne Notizen zum Fahrzeug..."
                value={form.notizen}
                onChange={function(e) { handleChange('notizen', e.target.value); }}
              />
            </Card.Content>
          </Card>

          {fehler && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fehler}</div>
          )}
          {erfolg && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">Aenderungen gespeichert. Weiterleitung...</div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={function() { router.push('/dashboard-v2/fahrzeuge'); }} disabled={speichern || loeschen}>
                Abbrechen
              </Button>
              <Button variant="danger" onClick={function() { setShowDialog(true); }} disabled={speichern || loeschen}>
                Loeschen
              </Button>
            </div>
            <Button variant="primary" onClick={handleSpeichern} disabled={speichern || loeschen || erfolg}>
              {speichern ? 'Speichert...' : 'Aenderungen speichern'}
            </Button>
          </div>

        </div>
      </Page.Content>

      <Dialog open={showDialog} onClose={function() { setShowDialog(false); }}>
        <Dialog.Title>Fahrzeug loeschen</Dialog.Title>
        <Dialog.Content>
          <p className="text-sm text-gray-600">
            Soll das Fahrzeug <strong>{form.kennzeichen}</strong> wirklich geloescht werden?
            Diese Aktion kann nicht rueckgaengig gemacht werden.
          </p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="secondary" onClick={function() { setShowDialog(false); }} disabled={loeschen}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={handleLoeschen} disabled={loeschen}>
            {loeschen ? 'Wird geloescht...' : 'Endgueltig loeschen'}
          </Button>
        </Dialog.Actions>
      </Dialog>

    </Page>
  );
}
