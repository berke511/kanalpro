'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Calendar, Users, Truck, Wrench, Package,
  FolderOpen, History, MessageSquare, ArrowLeft, Edit,
  MapPin, AlertCircle,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Card from '@/components/ui/v2/Card';
import Page from '@/components/ui/v2/Page';
import EmptyState from '@/components/ui/v2/EmptyState';

var TABS = [
  { key: 'uebersicht', label: 'Uebersicht', icon: FileText },
  { key: 'einsatzplanung', label: 'Einsatzplanung', icon: Calendar },
  { key: 'mitarbeiter', label: 'Mitarbeiter', icon: Users },
  { key: 'fahrzeuge', label: 'Fahrzeuge', icon: Truck },
  { key: 'maschinen', label: 'Maschinen', icon: Wrench },
  { key: 'leistungen', label: 'Leistungen', icon: Package },
  { key: 'dokumente', label: 'Dokumente', icon: FolderOpen },
  { key: 'historie', label: 'Historie', icon: History },
  { key: 'notizen', label: 'Notizen', icon: MessageSquare },
];

var STATUS_VARIANT = {
  offen: 'primary',
  in_bearbeitung: 'warning',
  abgeschlossen: 'success',
  storniert: 'default',
};
var STATUS_LABEL = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  abgeschlossen: 'Abgeschlossen',
  storniert: 'Storniert',
};
var PRIO_VARIANT = {
  niedrig: 'default',
  mittel: 'info',
  hoch: 'warning',
  kritisch: 'danger',
};
var PRIO_LABEL = {
  niedrig: 'Niedrig',
  mittel: 'Mittel',
  hoch: 'Hoch',
  kritisch: 'Kritisch',
};

function formatDate(d) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('de-DE');
}

function formatDateTime(d) {
  if (!d) return '--';
  return new Date(d).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function DlRow({ label, children }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-500 shrink-0 mr-4">{label}</dt>
      <dd className="text-sm text-right text-gray-900">{children}</dd>
    </div>
  );
}

function UebersichtTab({ auftrag, mitarbeiter, fahrzeuge, maschinen }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <Card.Header>
          <Card.Title>Auftragsdaten</Card.Title>
        </Card.Header>
        <Card.Content>
          <dl>
            <DlRow label="Auftragsnummer">
              <span className="font-mono font-semibold">{auftrag.auftragsnummer || '--'}</span>
            </DlRow>
            <DlRow label="Status">
              <Badge variant={STATUS_VARIANT[auftrag.status] || 'default'} size="sm">
                {STATUS_LABEL[auftrag.status] || auftrag.status || '--'}
              </Badge>
            </DlRow>
            <DlRow label="Prioritaet">
              <Badge variant={PRIO_VARIANT[auftrag.prioritaet] || 'default'} size="sm">
                {PRIO_LABEL[auftrag.prioritaet] || auftrag.prioritaet || '--'}
              </Badge>
            </DlRow>
            <DlRow label="Termin">{formatDateTime(auftrag.termin)}</DlRow>
            <DlRow label="Verantwortlicher">{auftrag.verantwortlicher || '--'}</DlRow>
            {auftrag.beschreibung && (
              <div className="pt-2 mt-1">
                <p className="text-xs text-gray-500 mb-1">Beschreibung</p>
                <p className="text-sm text-gray-700 leading-relaxed">{auftrag.beschreibung}</p>
              </div>
            )}
          </dl>
        </Card.Content>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <Card.Header>
            <Card.Title>Kunde</Card.Title>
          </Card.Header>
          <Card.Content>
            {auftrag.kunden ? (
              <dl>
                <DlRow label="Name">
                  <Link href={'/dashboard-v2/kunden/' + auftrag.kunden_id} className="text-primary-600 hover:underline font-medium">
                    {auftrag.kunden.name || '--'}
                  </Link>
                </DlRow>
                {auftrag.ansprechpartner && <DlRow label="Ansprechpartner">{auftrag.ansprechpartner}</DlRow>}
                {auftrag.kunden.email && <DlRow label="E-Mail">{auftrag.kunden.email}</DlRow>}
                {auftrag.kunden.telefon && <DlRow label="Telefon">{auftrag.kunden.telefon}</DlRow>}
              </dl>
            ) : (
              <p className="text-sm text-gray-400">Kein Kunde zugeordnet.</p>
            )}
          </Card.Content>
        </Card>

        {auftrag.objekt && (
          <Card>
            <Card.Header>
              <Card.Title>Einsatzort</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700">{auftrag.objekt}</p>
              </div>
            </Card.Content>
          </Card>
        )}
      </div>

      <Card className="md:col-span-2">
        <Card.Header>
          <div className="flex items-center justify-between w-full">
            <Card.Title>Ressourcen</Card.Title>
            <Button variant="outline" size="sm" onClick={function() { router.push('/dashboard-v2/disposition/' + auftragId); }}>Zuweisen</Button>
          </div>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mitarbeiter</p>
              {mitarbeiter && mitarbeiter.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {mitarbeiter.map(function(m) {
                    return (
                      <Badge key={m.id} variant="default" size="sm">
                        {(m.mitarbeiter && ((m.mitarbeiter.vorname || '') + ' ' + (m.mitarbeiter.nachname || '')).trim()) || m.mitarbeiter_id}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Keine Mitarbeiter zugewiesen</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fahrzeuge</p>
              {fahrzeuge && fahrzeuge.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {fahrzeuge.map(function(f) {
                    var label = (f.fahrzeuge && (f.fahrzeuge.kennzeichen || f.fahrzeuge.marke)) || f.fahrzeug_id;
                    return <Badge key={f.id} variant="default" size="sm">{label}</Badge>;
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Keine Fahrzeuge zugewiesen</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Maschinen</p>
              {maschinen && maschinen.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {maschinen.map(function(m) {
                    var label = (m.maschinen && m.maschinen.name) || m.maschinen_id;
                    return <Badge key={m.id} variant="default" size="sm">{label}</Badge>;
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Keine Maschinen zugewiesen</p>
              )}
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

function EmptyTab({ icon, title, description }) {
  return <EmptyState icon={icon} title={title} description={description} />;
}

export default function AuftragDetailPage() {
  var params = useParams();
  var router = useRouter();
  var auftragId = params.id;

  var [activeTab, setActiveTab] = useState('uebersicht');
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [auftrag, setAuftrag] = useState(null);
  var [mitarbeiter, setMitarbeiter] = useState([]);
  var [fahrzeuge, setFahrzeuge] = useState([]);
  var [maschinen, setMaschinen] = useState([]);

  useEffect(function() {
    var alive = true;
    async function load() {
      try {
        var { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        var { data: member } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        if (!member || !alive) return;
        var cid = member.company_id;

        var { data: a, error: err } = await supabase
          .from('auftraege')
          .select('*, kunden(name, email, telefon)')
          .eq('id', auftragId)
          .eq('company_id', cid)
          .single();
        if (!alive) return;
        if (err) { setError(err.message); return; }
        setAuftrag(a);

        var [mRes, fRes, maRes] = await Promise.all([
          supabase.from('auftrag_mitarbeiter').select('id, mitarbeiter_id, mitarbeiter(vorname, nachname)').eq('auftrag_id', auftragId),
          supabase.from('auftrag_fahrzeuge').select('id, fahrzeug_id, fahrzeuge(kennzeichen, marke)').eq('auftrag_id', auftragId),
          supabase.from('auftrag_maschinen').select('id, maschinen_id, maschinen(name)').eq('auftrag_id', auftragId),
        ]);
        if (!alive) return;
        setMitarbeiter(mRes.data || []);
        setFahrzeuge(fRes.data || []);
        setMaschinen(maRes.data || []);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return function() { alive = false; };
  }, [auftragId]);

  if (loading) {
    return (
      <Page>
        <Page.Content>
          <div className="space-y-4">
            <div className="skeleton h-8 w-64 rounded-lg" />
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (error || !auftrag) {
    return (
      <Page>
        <Page.Content>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-12 h-12 text-danger-400 mb-4" />
            <p className="text-gray-500">{error || 'Auftrag nicht gefunden.'}</p>
            <Button variant="ghost" size="sm" onClick={function() { router.push('/dashboard-v2/auftraege'); }} className="mt-4">
              Zur Auftragsliste
            </Button>
          </div>
        </Page.Content>
      </Page>
    );
  }

  var isActive = auftrag.status !== 'abgeschlossen' && auftrag.status !== 'storniert';

  return (
    <Page>
      <Page.Header>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={function() { router.push('/dashboard-v2/auftraege'); }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <Page.Title>{auftrag.auftragsnummer || 'Auftrag'}</Page.Title>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={STATUS_VARIANT[auftrag.status] || 'default'} size="sm">
                  {STATUS_LABEL[auftrag.status] || auftrag.status || '--'}
                </Badge>
                <Badge variant={PRIO_VARIANT[auftrag.prioritaet] || 'default'} size="sm">
                  {PRIO_LABEL[auftrag.prioritaet] || auftrag.prioritaet || '--'}
                </Badge>
                {auftrag.kunden && (
                  <Link href={'/dashboard-v2/kunden/' + auftrag.kunden_id} className="text-sm text-gray-500 hover:text-primary-600">
                    {auftrag.kunden.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link href={'/dashboard-v2/auftraege/' + auftragId + '/bearbeiten'}>
              <Button variant="secondary" size="sm">
                <Edit className="w-4 h-4 mr-1 inline" />Bearbeiten
              </Button>
            </Link>
            {isActive && (
              <Link href={'/dashboard-v2/disposition?auftrag_id=' + auftragId}>
                <Button variant="primary" size="sm">
                  <MapPin className="w-4 h-4 mr-1 inline" />In Disposition
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Page.Header>
      <Page.Content>
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="flex gap-0 min-w-max">
            {TABS.map(function(tab) {
              var Icon = tab.icon;
              var active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={function() { setActiveTab(tab.key); }}
                  className={'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' + (active ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}
                >
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'uebersicht' && (
          <UebersichtTab auftrag={auftrag} mitarbeiter={mitarbeiter} fahrzeuge={fahrzeuge} maschinen={maschinen} />
        )}
        {activeTab === 'einsatzplanung' && (
          <EmptyTab icon={Calendar} title="Einsatzplanung" description="Hier werden Einsatzdetails und Zeitplanung verwaltet. Funktion folgt in Kuerze." />
        )}
        {activeTab === 'mitarbeiter' && (
          <EmptyTab icon={Users} title="Mitarbeiterzuweisung" description="Weisen Sie diesem Auftrag Mitarbeiter zu und verwalten Sie Einsatzzeiten." />
        )}
        {activeTab === 'fahrzeuge' && (
          <EmptyTab icon={Truck} title="Fahrzeuge" description="Fahrzeugzuweisung und -planung fuer diesen Auftrag." />
        )}
        {activeTab === 'maschinen' && (
          <EmptyTab icon={Wrench} title="Maschinen" description="Maschinenplanung und Geraeteliste fuer diesen Auftrag." />
        )}
        {activeTab === 'leistungen' && (
          <EmptyTab icon={Package} title="Leistungen" description="Leistungspositionen und Aufmass werden hier erfasst." />
        )}
        {activeTab === 'dokumente' && (
          <EmptyTab icon={FolderOpen} title="Dokumente" description="Fotos, Berichte und Dokumente zu diesem Auftrag." />
        )}
        {activeTab === 'historie' && (
          <EmptyTab icon={History} title="Historie" description="Aktivitaetsprotokoll und Statusaenderungen dieses Auftrags." />
        )}
        {activeTab === 'notizen' && (
          <EmptyTab icon={MessageSquare} title="Notizen" description="Interne Notizen und Anmerkungen zu diesem Auftrag." />
        )}
      </Page.Content>
    </Page>
  );
}
