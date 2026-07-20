'use client';

import { useState } from 'react';
import { Building2, Users, Bell, Plug, Save, ChevronRight } from 'lucide-react';

function SettingsCard({ icon: Icon, title, description, children }) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-[#2a2a4a]">
        <div className="p-2 bg-[#6366f1]/10 rounded-lg">
          <Icon className="w-5 h-5 text-[#6366f1]" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <p className="text-[#8b8ba7] text-sm">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingsInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#c4c4d4]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[#0f0f23] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-white placeholder-[#4a4a6a] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors text-sm"
      />
    </div>
  );
}

function SettingsToggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-[#c4c4d4]">{label}</p>
        {description && <p className="text-xs text-[#8b8ba7] mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[#6366f1]' : 'bg-[#2a2a4a]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function IntegrationItem({ name, description, connected, onToggle }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#0f0f23] rounded-lg border border-[#2a2a4a]">
      <div>
        <p className="text-sm font-medium text-white">{name}</p>
        <p className="text-xs text-[#8b8ba7] mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          connected
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-[#2a2a4a] text-[#8b8ba7]'
        }`}>
          {connected ? 'Verbunden' : 'Nicht verbunden'}
        </span>
        <button
          onClick={onToggle}
          className="text-xs text-[#6366f1] hover:text-[#818cf8] flex items-center gap-1 transition-colors"
        >
          {connected ? 'Trennen' : 'Verbinden'}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function EinstellungenPage() {
  const [company, setCompany] = useState({
    name: 'KanalPro GmbH',
    email: 'info@kanalpro.de',
    website: 'https://kanalpro.de',
    adresse: 'Musterstraße 1, 10115 Berlin',
  });

  const [user, setUser] = useState({
    vorname: 'Max',
    nachname: 'Mustermann',
    email: 'max@kanalpro.de',
    rolle: 'Administrator',
  });

  const [notifications, setNotifications] = useState({
    emailBenachrichtigungen: true,
    auftragsUpdates: true,
    systemWarnungen: true,
    wochenbericht: false,
    neueKommentare: true,
    teamNachrichten: false,
  });

  const [integrations, setIntegrations] = useState({
    slack: true,
    googleCalendar: false,
    outlook: true,
    zapier: false,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleIntegration = (key) => {
    setIntegrations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Einstellungen</h1>
          <p className="text-[#8b8ba7] text-sm mt-1">Verwalte deine Konto- und Systemeinstellungen</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
            saved ? 'bg-emerald-500 text-white' : 'bg-[#6366f1] hover:bg-[#818cf8] text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Gespeichert!' : 'Änderungen speichern'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingsCard icon={Building2} title="Unternehmen" description="Firmeninformationen und Stammdaten">
          <SettingsInput label="Unternehmensname" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} placeholder="Firmenname" />
          <SettingsInput label="E-Mail-Adresse" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} type="email" placeholder="info@firma.de" />
          <SettingsInput label="Website" value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} placeholder="https://firma.de" />
          <SettingsInput label="Adresse" value={company.adresse} onChange={(e) => setCompany({ ...company, adresse: e.target.value })} placeholder="Straße, PLZ Stadt" />
        </SettingsCard>

        <SettingsCard icon={Users} title="Benutzer" description="Persönliche Kontodaten">
          <div className="grid grid-cols-2 gap-3">
            <SettingsInput label="Vorname" value={user.vorname} onChange={(e) => setUser({ ...user, vorname: e.target.value })} placeholder="Vorname" />
            <SettingsInput label="Nachname" value={user.nachname} onChange={(e) => setUser({ ...user, nachname: e.target.value })} placeholder="Nachname" />
          </div>
          <SettingsInput label="E-Mail" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} type="email" placeholder="benutzer@firma.de" />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#c4c4d4]">Rolle</label>
            <select value={user.rolle} onChange={(e) => setUser({ ...user, rolle: e.target.value })} className="w-full bg-[#0f0f23] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6366f1] transition-colors text-sm">
              <option value="Administrator">Administrator</option>
              <option value="Manager">Manager</option>
              <option value="Mitarbeiter">Mitarbeiter</option>
            </select>
          </div>
          <div className="pt-2">
            <button className="text-sm text-[#6366f1] hover:text-[#818cf8] transition-colors">Passwort ändern →</button>
          </div>
        </SettingsCard>

        <SettingsCard icon={Bell} title="Benachrichtigungen" description="Steuere, welche Benachrichtigungen du erhältst">
          <SettingsToggle label="E-Mail-Benachrichtigungen" description="Erhalte Benachrichtigungen per E-Mail" checked={notifications.emailBenachrichtigungen} onChange={(v) => setNotifications({ ...notifications, emailBenachrichtigungen: v })} />
          <SettingsToggle label="Auftrags-Updates" description="Statusänderungen bei Aufträgen" checked={notifications.auftragsUpdates} onChange={(v) => setNotifications({ ...notifications, auftragsUpdates: v })} />
          <SettingsToggle label="System-Warnungen" description="Kritische Systembenachrichtigungen" checked={notifications.systemWarnungen} onChange={(v) => setNotifications({ ...notifications, systemWarnungen: v })} />
          <SettingsToggle label="Wochenbericht" description="Wöchentliche Zusammenfassung" checked={notifications.wochenbericht} onChange={(v) => setNotifications({ ...notifications, wochenbericht: v })} />
          <SettingsToggle label="Neue Kommentare" description="Bei neuen Kommentaren benachrichtigen" checked={notifications.neueKommentare} onChange={(v) => setNotifications({ ...notifications, neueKommentare: v })} />
          <SettingsToggle label="Team-Nachrichten" description="Interne Team-Kommunikation" checked={notifications.teamNachrichten} onChange={(v) => setNotifications({ ...notifications, teamNachrichten: v })} />
        </SettingsCard>

        <SettingsCard icon={Plug} title="Integrationen" description="Externe Dienste und Apps verbinden">
          <IntegrationItem name="Slack" description="Team-Kommunikation und Benachrichtigungen" connected={integrations.slack} onToggle={() => toggleIntegration('slack')} />
          <IntegrationItem name="Google Calendar" description="Termine und Einsatzplanung synchronisieren" connected={integrations.googleCalendar} onToggle={() => toggleIntegration('googleCalendar')} />
          <IntegrationItem name="Microsoft Outlook" description="E-Mail und Kalender-Integration" connected={integrations.outlook} onToggle={() => toggleIntegration('outlook')} />
          <IntegrationItem name="Zapier" description="Workflows mit 5000+ Apps automatisieren" connected={integrations.zapier} onToggle={() => toggleIntegration('zapier')} />
        </SettingsCard>
      </div>

      <div className="mt-6 bg-[#1a1a2e] border border-red-500/20 rounded-xl p-6">
        <h3 className="text-red-400 font-semibold mb-2">Gefahrenzone</h3>
        <p className="text-[#8b8ba7] text-sm mb-4">Diese Aktionen sind nicht umkehrbar. Bitte gehe vorsichtig vor.</p>
        <button className="px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">Konto löschen</button>
      </div>
    </div>
  );
}
