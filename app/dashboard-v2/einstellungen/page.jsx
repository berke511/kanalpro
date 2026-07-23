'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, Bell, Plug, Save, ChevronRight } from 'lucide-react';
import supabase from '@/lib/supabase';
import { ROLE_LABELS } from '@/lib/roles';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Button from '@/components/ui/v2/Button';

function InfoRow({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900">{value || 'Ã¢ÂÂ'}</p>
    </div>
  );
}

function SettingsToggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={function() { onChange(!checked); }}
        className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (checked ? 'bg-primary-600' : 'bg-gray-200')}
      >
        <span
          className={'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (checked ? 'translate-x-6' : 'translate-x-1')}
        />
      </button>
    </div>
  );
}

function IntegrationItem({ name, description, connected, onToggle }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={'text-xs px-2 py-0.5 rounded-full border ' + (connected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200')}>
          {connected ? 'Verbunden' : 'Nicht verbunden'}
        </span>
        <button
          onClick={onToggle}
          className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 transition-colors"
        >
          {connected ? 'Trennen' : 'Verbinden'}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function EinstellungenPage() {
  var [firmaLaden, setFirmaLaden] = useState(true);
  var [firmaFehler, setFirmaFehler] = useState(false);
  var [firma, setFirma] = useState(null);

  useEffect(function() {
    async function ladeFirma() {
      try {
        var authResult = await supabase.auth.getUser();
        var user = authResult.data && authResult.data.user;
        if (!user) { setFirmaFehler(true); setFirmaLaden(false); return; }

        var memberResult = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!memberResult.data) { setFirmaFehler(true); setFirmaLaden(false); return; }

        var companyResult = await supabase
          .from('companies')
          .select('name, email, website, adresse, plz, ort, telefon')
          .eq('id', memberResult.data.company_id)
          .single();

        if (companyResult.error || !companyResult.data) { setFirmaFehler(true); setFirmaLaden(false); return; }

        setFirma(companyResult.data);
      } catch (err) {
        setFirmaFehler(true);
      }
      setFirmaLaden(false);
    }
    ladeFirma();
  }, []);

  function formatAdresse(f) {
    if (!f) return 'Ã¢ÂÂ';
    var ort = [f.plz, f.ort].filter(Boolean).join(' ');
    var teile = [f.adresse, ort].filter(Boolean);
    return teile.length > 0 ? teile.join(', ') : 'Ã¢ÂÂ';
  }

  var [benutzerLaden, setBenutzerLaden] = useState(true);
  var [benutzerFehler, setBenutzerFehler] = useState(false);
  var [benutzerDaten, setBenutzerDaten] = useState(null);

  useEffect(function() {
    async function ladeBenutzer() {
      try {
        var authResult = await supabase.auth.getUser();
        var user = authResult.data && authResult.data.user;
        if (!user) { setBenutzerFehler(true); setBenutzerLaden(false); return; }

        var mitgliedResult = await supabase
          .from('company_members')
          .select('vorname, nachname, email, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (mitgliedResult.error || !mitgliedResult.data) { setBenutzerFehler(true); setBenutzerLaden(false); return; }

        setBenutzerDaten(mitgliedResult.data);
      } catch (err) {
        setBenutzerFehler(true);
      }
      setBenutzerLaden(false);
    }
    ladeBenutzer();
  }, []);

  var [notifications, setNotifications] = useState({
    emailBenachrichtigungen: true,
    auftragsUpdates: true,
    systemWarnungen: true,
    wochenbericht: false,
    neueKommentare: true,
    teamNachrichten: false,
  });

  var [integrations, setIntegrations] = useState({
    slack: true,
    googleCalendar: false,
    outlook: true,
    zapier: false,
  });

  var [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(function() { setSaved(false); }, 2000);
  }

  function toggleIntegration(key) {
    setIntegrations(function(prev) { return Object.assign({}, prev, { [key]: !prev[key] }); });
  }

  function setNotif(key, v) {
    setNotifications(function(n) { return Object.assign({}, n, { [key]: v }); });
  }

  return (
    <Page>
      <Page.Header>
        <div className="flex items-center justify-between">
          <div>
            <Page.Title>Einstellungen</Page.Title>
            <Page.Description>Verwalte deine Konto- und Systemeinstellungen</Page.Description>
          </div>
          <Button variant={saved ? 'secondary' : 'primary'} onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {saved ? 'Gespeichert!' : 'Aenderungen speichern'}
          </Button>
        </div>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div>
                  <Card.Title>Unternehmen</Card.Title>
                  <Card.Description>Firmeninformationen und Stammdaten</Card.Description>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              {firmaLaden ? (
                <p className="text-sm text-gray-400">Laedt...</p>
              ) : firmaFehler ? (
                <p className="text-sm text-red-500">Unternehmensdaten konnten nicht geladen werden.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <InfoRow label="Unternehmensname" value={firma && firma.name} />
                  <InfoRow label="E-Mail-Adresse" value={firma && firma.email} />
                  <InfoRow label="Website" value={firma && firma.website} />
                  <InfoRow label="Telefon" value={firma && firma.telefon} />
                  <InfoRow label="Adresse" value={formatAdresse(firma)} />
                </div>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <Card.Title>Benutzer</Card.Title>
                  <Card.Description>Dein Konto im Unternehmen</Card.Description>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              {benutzerLaden ? (
                <p className="text-sm text-gray-400">Laedt...</p>
              ) : benutzerFehler ? (
                <p className="text-sm text-red-500">Benutzerdaten konnten nicht geladen werden.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <InfoRow label="Vorname" value={benutzerDaten && benutzerDaten.vorname} />
                  <InfoRow label="Nachname" value={benutzerDaten && benutzerDaten.nachname} />
                  <InfoRow label="E-Mail" value={benutzerDaten && benutzerDaten.email} />
                  <InfoRow label="Rolle" value={ROLE_LABELS[benutzerDaten && benutzerDaten.role] || (benutzerDaten && benutzerDaten.role)} />
                </div>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <div>
                  <Card.Title>Benachrichtigungen</Card.Title>
                  <Card.Description>Steuere, welche Benachrichtigungen du erhaeltst</Card.Description>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              <SettingsToggle label="E-Mail-Benachrichtigungen" description="Erhalte Benachrichtigungen per E-Mail" checked={notifications.emailBenachrichtigungen} onChange={function(v) { setNotif('emailBenachrichtigungen', v); }} />
              <SettingsToggle label="Auftrags-Updates" description="Statusaenderungen bei Auftraegen" checked={notifications.auftragsUpdates} onChange={function(v) { setNotif('auftragsUpdates', v); }} />
              <SettingsToggle label="System-Warnungen" description="Kritische Systembenachrichtigungen" checked={notifications.systemWarnungen} onChange={function(v) { setNotif('systemWarnungen', v); }} />
              <SettingsToggle label="Wochenbericht" description="Woechentliche Zusammenfassung" checked={notifications.wochenbericht} onChange={function(v) { setNotif('wochenbericht', v); }} />
              <SettingsToggle label="Neue Kommentare" description="Bei neuen Kommentaren benachrichtigen" checked={notifications.neueKommentare} onChange={function(v) { setNotif('neueKommentare', v); }} />
              <SettingsToggle label="Team-Nachrichten" description="Interne Team-Kommunikation" checked={notifications.teamNachrichten} onChange={function(v) { setNotif('teamNachrichten', v); }} />
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <Plug className="w-5 h-5 text-gray-400" />
                <div>
                  <Card.Title>Integrationen</Card.Title>
                  <Card.Description>Externe Dienste und Apps verbinden</Card.Description>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                <IntegrationItem name="Slack" description="Team-Kommunikation und Benachrichtigungen" connected={integrations.slack} onToggle={function() { toggleIntegration('slack'); }} />
                <IntegrationItem name="Google Calendar" description="Termine und Einsatzplanung synchronisieren" connected={integrations.googleCalendar} onToggle={function() { toggleIntegration('googleCalendar'); }} />
                <IntegrationItem name="Microsoft Outlook" description="E-Mail und Kalender-Integration" connected={integrations.outlook} onToggle={function() { toggleIntegration('outlook'); }} />
                <IntegrationItem name="Zapier" description="Workflows mit 5000+ Apps automatisieren" connected={integrations.zapier} onToggle={function() { toggleIntegration('zapier'); }} />
              </div>
            </Card.Content>
          </Card>

        </div>

        <Card className="border-red-200">
          <Card.Header>
            <Card.Title className="text-red-600">Gefahrenzone</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-sm text-gray-500 mb-4">Diese Aktionen sind nicht umkehrbar. Bitte gehe vorsichtig vor.</p>
            <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">Konto loeschen</button>
          </Card.Content>
        </Card>

      </Page.Content>
    </Page>
  );
}
