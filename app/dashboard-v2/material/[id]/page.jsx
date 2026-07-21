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

var ZUSTAND_OPTIONS = [
  { value: 'aktiv',    label: 'Aktiv' },
  { value: 'leer',     label: 'Leer' },
  { value: 'gesperrt', label: 'Gesperrt' },
];

var ZUSTAND_LABELS = {
  aktiv:    'Aktiv',
  leer:     'Leer',
  gesperrt: 'Gesperrt',
};

var ZUSTAND_VARIANTEN = {
  aktiv:    'success',
  leer:     'warning',
  gesperrt: 'danger',
};

export default function MaterialBearbeiten({ params }) {
  var id = params.id;
  var router = useRouter();

  var [form, setForm] = useState({
    name: '',
    typ: '',
    einheit: '',
    hersteller: '',
    lagerort: '',
    bestand_aktuell: '',
    mindestbestand: '',
    ablaufdatum: '',
    zustand: '',
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
      if (!cId) { router.push('/dashboard-v2/material'); return; }
      setCompanyId(cId);

      var result = await supabase
        .from('materialien')
        .select('*')
        .eq('id', id)
        .eq('company_id', cId)
        .maybeSingle();

      if (!result.data) { router.push('/dashboard-v2/material'); return; }

      var d = result.data;
      setForm({
        name:            d.name ?? '',
        typ:             d.typ ?? '',
        einheit:         d.einheit ?? '',
        hersteller:      d.hersteller ?? '',
        lagerort:        d.lagerort ?? '',
        bestand_aktuell: d.bestand_aktuell != null ? String(d.bestand_aktuell) : '',
        mindestbestand:  d.mindestbestand != null ? String(d.mindestbestand) : '',
        ablaufdatum:     d.ablaufdatum ?? '',
        zustand:         d.zustand ?? '',
        notiz:           d.notiz ?? '',
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
      name:            form.name.trim(),
      typ:             form.typ.trim() || null,
      einheit:         form.einheit.trim() || null,
      hersteller:      form.hersteller.trim() || null,
      lagerort:        form.lagerort.trim() || null,
      bestand_aktuell: form.bestand_aktuell !== '' ? parseFloat(form.bestand_aktuell) : 0,
      mindestbestand:  form.mindestbestand !== '' ? parseFloat(form.mindestbestand) : 0,
      ablaufdatum:     form.ablaufdatum || null,
      zustand:         form.zustand || null,
      notiz:           form.notiz.trim() || null,
    };
    var result = await supabase
      .from('materialien')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId);
    setSpeichern(false);
    if (result.error) { setFehler(result.error.message); return; }
    setGespeichert(true);
    setTimeout(function () { setGespeichert(false); }, 3000);
    router.push('/dashboard-v2/material');
  }

  async function handleLoeschen() {
    setLoeschen(true);
    await supabase
      .from('materialien')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    setLoeschen(false);
    router.push('/dashboard-v2/material');
  }

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Material</Page.Title></Page.Header>
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
            <Page.Title>{form.name || 'Material'}</Page.Title>
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
            <Card.Header><Card.Title>Stammdaten</Card.Title></Card.Header>
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
                  <Input name="typ" value={form.typ} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                  <Input name="einheit" value={form.einheit} onChange={handleChange} placeholder="z.B. Stueck, Liter, kg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hersteller</label>
                  <Input name="hersteller" value={form.hersteller} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lagerort</label>
                  <Input name="lagerort" value={form.lagerort} onChange={handleChange} />
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
              </div>
            </Card.Content>
          </Card>
          <Card className="mb-4">
            <Card.Header><Card.Title>Bestand</Card.Title></Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bestand aktuell</label>
                  <Input name="bestand_aktuell" type="number" min="0" step="0.01" value={form.bestand_aktuell} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mindestbestand</label>
                  <Input name="mindestbestand" type="number" min="0" step="0.01" value={form.mindestbestand} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ablaufdatum</label>
                  <Input name="ablaufdatum" type="date" value={form.ablaufdatum} onChange={handleChange} />
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
              onClick={function () { router.push('/dashboard-v2/material'); }}
            >
              Abbrechen
            </Button>
          </div>
        </form>

        <Dialog open={showDialog} onClose={function () { setShowDialog(false); }}>
          <Dialog.Header>
            <Dialog.Title>Material loeschen</Dialog.Title>
            <Dialog.Description>
              Moechten Sie {form.name || 'dieses Material'} wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
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
