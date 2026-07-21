'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { ROLE_LABELS } from '@/lib/roles';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';
import Badge from '@/components/ui/v2/Badge';
import Dialog from '@/components/ui/v2/Dialog';

var STATUS_LABELS = {
  verfuegbar: 'Verfuegbar',
  im_einsatz: 'Im Einsatz',
  urlaub: 'Urlaub',
  krank: 'Krank',
};

var STATUS_VARIANTEN = {
  verfuegbar: 'success',
  im_einsatz: 'warning',
  urlaub: 'info',
  krank: 'danger',
};

export default function MitarbeiterBearbeiten({ params }) {
  var id = params.id;
  var router = useRouter();

  var [form, setForm] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    geburtsdatum: '',
    strasse: '',
    plz: '',
    ort: '',
    eintrittsdatum: '',
    position: '',
    stundenlohn: '',
    rolle: '',
    status: '',
    notizen: '',
  });
  var [companyId, setCompanyId] = useState(null);
  var [laden, setLaden] = useState(true);
  var [speichern, setSpeichern] = useState(false);
  var [loeschen, setLoeschen] = useState(false);
  var [gespeichert, setGespeichert] = useState(false);
  var [fehler, setFehler] = useState('');
  var [showDialog, setShowDialog] = useState(false);

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
        .maybeSingle();
      var cId = memberResult.data && memberResult.data.company_id;
      if (!cId) { router.push('/dashboard-v2/mitarbeiter'); return; }
      setCompanyId(cId);

      var result = await supabase
        .from('mitarbeiter')
        .select('*')
        .eq('id', id)
        .eq('company_id', cId)
        .maybeSingle();

      if (!result.data) { router.push('/dashboard-v2/mitarbeiter'); return; }

      var d = result.data;
      setForm({
        vorname:        d.vorname ?? '',
        nachname:       d.nachname ?? '',
        email:          d.email ?? '',
        telefon:        d.telefon ?? '',
        geburtsdatum:   d.geburtsdatum ?? '',
        strasse:        d.strasse ?? '',
        plz:            d.plz ?? '',
        ort:            d.ort ?? '',
        eintrittsdatum: d.eintrittsdatum ?? '',
        position:       d.position ?? '',
        stundenlohn:    d.stundenlohn != null ? String(d.stundenlohn) : '',
        rolle:          d.rolle ?? '',
        status:         d.status ?? '',
        notizen:        d.notizen ?? '',
      });
      setLaden(false);
    }
    load();
  }, [id, router]);

  function handleChange(e) {
    var name = e.target.name;
    var value = e.target.value;
    setForm(function(f) {
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
    if (!form.vorname.trim()) { setFehler('Vorname ist ein Pflichtfeld.'); return; }
    if (!form.nachname.trim()) { setFehler('Nachname ist ein Pflichtfeld.'); return; }
    setSpeichern(true);
    var payload = {
      vorname:        form.vorname.trim(),
      nachname:       form.nachname.trim(),
      email:          form.email.trim(),
      telefon:        form.telefon.trim(),
      geburtsdatum:   form.geburtsdatum || null,
      strasse:        form.strasse.trim(),
      plz:            form.plz.trim(),
      ort:            form.ort.trim(),
      eintrittsdatum: form.eintrittsdatum || null,
      position:       form.position.trim(),
      stundenlohn:    form.stundenlohn ? parseFloat(form.stundenlohn) : null,
      rolle:          form.rolle || null,
      status:         form.status || null,
      notizen:        form.notizen.trim(),
      updated_at:     new Date().toISOString(),
    };
    var result = await supabase
      .from('mitarbeiter')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId);
    setSpeichern(false);
    if (result.error) { setFehler(result.error.message); return; }
    setGespeichert(true);
    setTimeout(function() { setGespeichert(false); }, 3000);
    router.push('/dashboard-v2/mitarbeiter');
  }

  async function handleLoeschen() {
    setLoeschen(true);
    await supabase
      .from('mitarbeiter')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    setLoeschen(false);
    router.push('/dashboard-v2/mitarbeiter');
  }

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Mitarbeiter</Page.Title></Page.Header>
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
            <Page.Title>{(form.vorname + ' ' + form.nachname).trim() || 'Mitarbeiter'}</Page.Title>
            {form.status && (
              <Badge variant={STATUS_VARIANTEN[form.status] || 'default'}>
                {STATUS_LABELS[form.status] || form.status}
              </Badge>
            )}
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={function() { setShowDialog(true); }}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorname <span className="text-red-500">*</span>
                  </label>
                  <Input name="vorname" value={form.vorname} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nachname <span className="text-red-500">*</span>
                  </label>
                  <Input name="nachname" value={form.nachname} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                  <Input name="email" type="email" value={form.email} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <Input name="telefon" value={form.telefon} onChange={handleChange} />
                </div>
              </div>
            </Card.Content>
          </Card>
          <Card className="mb-4">
            <Card.Header><Card.Title>Persoenliche Daten</Card.Title></Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
                  <Input name="geburtsdatum" type="date" value={form.geburtsdatum} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
                  <Input name="strasse" value={form.strasse} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                  <Input name="plz" value={form.plz} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                  <Input name="ort" value={form.ort} onChange={handleChange} />
                </div>
              </div>
            </Card.Content>
          </Card>
          <Card className="mb-4">
            <Card.Header><Card.Title>Beschaeftigung</Card.Title></Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eintrittsdatum</label>
                  <Input name="eintrittsdatum" type="date" value={form.eintrittsdatum} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <Input name="position" value={form.position} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stundenlohn (EUR)</label>
                  <Input name="stundenlohn" type="number" step="0.01" min="0" value={form.stundenlohn} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                  <select name="rolle" value={form.rolle} onChange={handleChange} className={selectClass}>
                    <option value="">-- Keine Rolle --</option>
                    <option value="inhaber">{ROLE_LABELS.inhaber}</option>
                    <option value="administrator">{ROLE_LABELS.administrator}</option>
                    <option value="disponent">{ROLE_LABELS.disponent}</option>
                    <option value="buero">{ROLE_LABELS.buero}</option>
                    <option value="techniker">{ROLE_LABELS.techniker}</option>
                    <option value="fahrer">{ROLE_LABELS.fahrer}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className={selectClass}>
                    <option value="">-- Kein Status --</option>
                    <option value="verfuegbar">Verfuegbar</option>
                    <option value="im_einsatz">Im Einsatz</option>
                    <option value="urlaub">Urlaub</option>
                    <option value="krank">Krank</option>
                  </select>
                </div>
              </div>
            </Card.Content>
          </Card>
          <Card className="mb-6">
            <Card.Header><Card.Title>Notizen</Card.Title></Card.Header>
            <Card.Content>
              <textarea
                name="notizen"
                value={form.notizen}
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
              onClick={function() { router.push('/dashboard-v2/mitarbeiter'); }}
            >
              Abbrechen
            </Button>
          </div>
        </form>

        <Dialog open={showDialog} onClose={function() { setShowDialog(false); }}>
          <Dialog.Header>
            <Dialog.Title>Mitarbeiter loeschen</Dialog.Title>
            <Dialog.Description>
              Moechten Sie {(form.vorname + ' ' + form.nachname).trim()} wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button
              variant="ghost"
              onClick={function() { setShowDialog(false); }}
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
