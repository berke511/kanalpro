'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import supabase from '@/lib/supabase';
import Button from '@/components/ui/v2/Button';
import Card from '@/components/ui/v2/Card';
import Input from '@/components/ui/v2/Input';
import Page from '@/components/ui/v2/Page';

var STATUS_OPTIONS = [
  { value: 'offen', label: 'Offen' },
  { value: 'in_bearbeitung', label: 'In Bearbeitung' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
  { value: 'storniert', label: 'Storniert' },
];
var PRIO_OPTIONS = [
  { value: 'niedrig', label: 'Niedrig' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'hoch', label: 'Hoch' },
  { value: 'kritisch', label: 'Kritisch' },
];

function genAuftragsnummer() {
  var year = new Date().getFullYear();
  var rand = Math.floor(1000 + Math.random() * 9000);
  return 'AUF-' + year + '-' + rand;
}

function AuftragErstellenInner() {
  var router = useRouter();
  var searchParams = useSearchParams();
  var angebotId = searchParams.get('angebot_id');

  var [companyId, setCompanyId] = useState(null);
  var [kunden, setKunden] = useState([]);
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState(null);
  var [prefillLoaded, setPrefillLoaded] = useState(false);

  var [form, setForm] = useState({
    auftragsnummer: genAuftragsnummer(),
    kunden_id: '',
    ansprechpartner: '',
    objekt: '',
    status: 'offen',
    prioritaet: 'mittel',
    termin: '',
    verantwortlicher: '',
    beschreibung: '',
    angebot_id: angebotId || '',
  });

  useEffect(function() {
    var alive = true;
    async function load() {
      try {
        var { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        var { data: member } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        if (!member || !alive) return;
        var cid = member.company_id;
        setCompanyId(cid);

        var { data: kundenData } = await supabase
          .from('kunden')
          .select('id, name')
          .eq('company_id', cid)
          .order('name');
        if (alive) setKunden(kundenData || []);

        if (angebotId) {
          var { data: angebot } = await supabase
            .from('angebote')
            .select('kunden_id, kunden(name, ansprechpartner), angebotsnummer')
            .eq('id', angebotId)
            .eq('company_id', cid)
            .single();
          if (alive && angebot) {
            setForm(function(prev) {
              return Object.assign({}, prev, {
                kunden_id: angebot.kunden_id || '',
                ansprechpartner: (angebot.kunden && angebot.kunden.ansprechpartner) || '',
              });
            });
            setPrefillLoaded(true);
          }
        }
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return function() { alive = false; };
  }, [angebotId, router]);

  function handleChange(field, val) {
    setForm(function(prev) { return Object.assign({}, prev, { [field]: val }); });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
    setError(null);
    try {
      var payload = {
        auftragsnummer: form.auftragsnummer,
        company_id: companyId,
        kunden_id: form.kunden_id || null,
        ansprechpartner: form.ansprechpartner || null,
        objekt: form.objekt || null,
        status: form.status,
        prioritaet: form.prioritaet,
        termin: form.termin || null,
        verantwortlicher: form.verantwortlicher || null,
        beschreibung: form.beschreibung || null,
        angebot_id: form.angebot_id || null,
      };
      var { data: newAuftrag, error: err } = await supabase
        .from('auftraege')
        .insert(payload)
        .select('id')
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      router.push('/dashboard-v2/auftraege/' + newAuftrag.id);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Page>
        <Page.Content>
          <div className="space-y-4">
            <div className="skeleton h-8 w-48 rounded-lg" />
            <div className="skeleton h-64 w-full rounded-xl" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <div className="flex items-center gap-3">
          <button onClick={function() { router.push('/dashboard-v2/auftraege'); }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <Page.Title>Neuer Auftrag</Page.Title>
            <Page.Description>
              {angebotId && prefillLoaded ? 'Daten aus Angebot vorausgefuellt.' : 'Auftragsdaten eingeben und speichern.'}
            </Page.Description>
          </div>
        </div>
      </Page.Header>
      <Page.Content>
        {angebotId && prefillLoaded && (
          <div className="flex items-center gap-2 px-4 py-3 bg-primary-50 border border-primary-200 rounded-lg mb-4">
            <ClipboardList className="w-4 h-4 text-primary-600 shrink-0" />
            <p className="text-sm text-primary-700">Angebotsdaten wurden vorausgefuellt. Bitte pruefen und anpassen.</p>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 bg-danger-50 border border-danger-200 rounded-lg mb-4">
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card>
                <Card.Header>
                  <Card.Title>Auftragsdaten</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Auftragsnummer</label>
                      <Input value={form.auftragsnummer} onChange={function(e) { handleChange('auftragsnummer', e.target.value); }} placeholder="AUF-2026-0001" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Termin</label>
                      <Input type="datetime-local" value={form.termin} onChange={function(e) { handleChange('termin', e.target.value); }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={form.status} onChange={function(e) { handleChange('status', e.target.value); }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        {STATUS_OPTIONS.map(function(o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prioritaet</label>
                      <select value={form.prioritaet} onChange={function(e) { handleChange('prioritaet', e.target.value); }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        {PRIO_OPTIONS.map(function(o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Verantwortlicher</label>
                      <Input value={form.verantwortlicher} onChange={function(e) { handleChange('verantwortlicher', e.target.value); }} placeholder="Name des Verantwortlichen" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                      <textarea value={form.beschreibung} onChange={function(e) { handleChange('beschreibung', e.target.value); }} rows={3} placeholder="Auftragsbeschreibung..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                    </div>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>Einsatzort</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Objekt / Einsatzort</label>
                    <Input value={form.objekt} onChange={function(e) { handleChange('objekt', e.target.value); }} placeholder="Adresse oder Objektbezeichnung" />
                  </div>
                </Card.Content>
              </Card>
            </div>

            <div className="flex flex-col gap-6">
              <Card>
                <Card.Header>
                  <Card.Title>Kunde</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
                      <select value={form.kunden_id} onChange={function(e) { handleChange('kunden_id', e.target.value); }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">-- Kein Kunde --</option>
                        {kunden.map(function(k) { return <option key={k.id} value={k.id}>{k.name}</option>; })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ansprechpartner</label>
                      <Input value={form.ansprechpartner} onChange={function(e) { handleChange('ansprechpartner', e.target.value); }} placeholder="Name des Ansprechpartners" />
                    </div>
                  </div>
                </Card.Content>
              </Card>

              {angebotId && (
                <Card>
                  <Card.Header>
                    <Card.Title>Verknuepftes Angebot</Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <Link href={'/dashboard-v2/angebote/' + angebotId} className="text-sm text-primary-600 hover:underline">
                      Angebot ansehen
                    </Link>
                  </Card.Content>
                </Card>
              )}

              <div className="flex flex-col gap-3">
                <Button type="submit" variant="primary" disabled={saving} className="w-full">
                  {saving ? 'Wird gespeichert...' : 'Auftrag erstellen'}
                </Button>
                <Button type="button" variant="ghost" onClick={function() { router.push('/dashboard-v2/auftraege'); }} className="w-full">
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Page.Content>
    </Page>
  );
}

export default function AuftragErstellenPage() {
  return (
    <Suspense>
      <AuftragErstellenInner />
    </Suspense>
  );
}
