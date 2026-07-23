'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Package, FolderOpen, History, MessageSquare,
  ArrowLeft, Edit, Briefcase, AlertCircle,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Page from '@/components/ui/v2/Page';
import EmptyState from '@/components/ui/v2/EmptyState';

var TABS = [
  { key: 'uebersicht', label: 'Uebersicht', icon: FileText },
  { key: 'positionen', label: 'Positionen', icon: Package },
  { key: 'dokumente', label: 'Dokumente', icon: FolderOpen },
  { key: 'historie', label: 'Historie', icon: History },
  { key: 'notizen', label: 'Notizen', icon: MessageSquare },
];

var STATUS_VARIANT = {
  entwurf: 'default',
  versendet: 'primary',
  angenommen: 'success',
  abgelehnt: 'danger',
};
var STATUS_LABEL = {
  entwurf: 'Entwurf',
  versendet: 'Versendet',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
};

function formatDate(d) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('de-DE');
}

function formatEuro(n) {
  if (!n && n !== 0) return '--';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
}

function calcBrutto(pos) {
  return (pos || []).reduce(function(sum, p) {
    return sum + (p.menge || 1) * (p.einzelpreis || p.preis || 0) * (1 + (p.mwst || 19) / 100);
  }, 0);
}

function UebersichtTab({ angebot }) {
  var pos = angebot.positionen || [];
  var brutto = calcBrutto(pos);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <Card.Header>
          <Card.Title>Angebotsdaten</Card.Title>
        </Card.Header>
        <Card.Content>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Angebotsnummer</dt>
              <dd className="text-sm font-mono font-semibold text-gray-900">{angebot.angebotsnummer || '--'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd>
                <Badge variant={STATUS_VARIANT[angebot.status] || 'default'} size="sm">
                  {STATUS_LABEL[angebot.status] || angebot.status || '--'}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Angebotssumme</dt>
              <dd className="text-sm font-semibold text-gray-900">{formatEuro(brutto)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Erstellungsdatum</dt>
              <dd className="text-sm text-gray-700">{formatDate(angebot.datum || angebot.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Gueltigkeitsdatum</dt>
              <dd className="text-sm text-gray-700">{formatDate(angebot.gueltig_bis)}</dd>
            </div>
            {angebot.bearbeiter && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Bearbeiter</dt>
                <dd className="text-sm text-gray-700">{angebot.bearbeiter}</dd>
              </div>
            )}
          </dl>
        </Card.Content>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title>Kunde</Card.Title>
        </Card.Header>
        <Card.Content>
          {angebot.kunden ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Name</dt>
                <dd>
                  <Link href={'/dashboard-v2/kunden/' + angebot.kunden_id} className="text-sm font-medium text-primary-600 hover:underline">
                    {angebot.kunden.name || '--'}
                  </Link>
                </dd>
              </div>
              {angebot.kunden.ansprechpartner && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Ansprechpartner</dt>
                  <dd className="text-sm text-gray-700">{angebot.kunden.ansprechpartner}</dd>
                </div>
              )}
              {angebot.kunden.email && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">E-Mail</dt>
                  <dd className="text-sm text-gray-700">{angebot.kunden.email}</dd>
                </div>
              )}
              {angebot.kunden.telefon && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Telefon</dt>
                  <dd className="text-sm text-gray-700">{angebot.kunden.telefon}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-400">Kein Kunde zugeordnet.</p>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}

function PositionenTab({ angebot }) {
  var pos = angebot.positionen || [];
  if (pos.length === 0) {
    return <EmptyState icon={Package} title="Keine Positionen" description="Diesem Angebot wurden noch keine Positionen hinzugefuegt." />;
  }
  var netto = pos.reduce(function(s, p) { return s + (p.menge || 1) * (p.einzelpreis || p.preis || 0); }, 0);
  var brutto = calcBrutto(pos);
  return (
    <div>
      <Table>
        <Table.Head>
          <tr>
            <Table.HeaderCell>Pos.</Table.HeaderCell>
            <Table.HeaderCell>Beschreibung</Table.HeaderCell>
            <Table.HeaderCell>Menge</Table.HeaderCell>
            <Table.HeaderCell>Einzelpreis</Table.HeaderCell>
            <Table.HeaderCell>MwSt.</Table.HeaderCell>
            <Table.HeaderCell>Gesamt</Table.HeaderCell>
          </tr>
        </Table.Head>
        <Table.Body>
          {pos.map(function(p, i) {
            var ep = p.einzelpreis || p.preis || 0;
            var menge = p.menge || 1;
            var mwst = p.mwst || 19;
            var bruttop = menge * ep * (1 + mwst / 100);
            return (
              <Table.Row key={i}>
                <Table.Cell><span className="text-sm text-gray-500">{i + 1}</span></Table.Cell>
                <Table.Cell><span className="text-sm text-gray-900">{p.beschreibung || p.leistung || '--'}</span></Table.Cell>
                <Table.Cell><span className="text-sm text-gray-700">{menge} {p.einheit || 'Stk.'}</span></Table.Cell>
                <Table.Cell><span className="text-sm text-gray-700">{formatEuro(ep)}</span></Table.Cell>
                <Table.Cell><span className="text-sm text-gray-500">{mwst} %</span></Table.Cell>
                <Table.Cell><span className="text-sm font-medium text-gray-900">{formatEuro(bruttop)}</span></Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
      <div className="mt-4 flex justify-end">
        <div className="bg-gray-50 rounded-xl p-4 min-w-64">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Nettobetrag</span>
            <span className="text-gray-900">{formatEuro(netto)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">MwSt.</span>
            <span className="text-gray-900">{formatEuro(brutto - netto)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span className="text-gray-900">Gesamtbetrag</span>
            <span className="text-primary-600">{formatEuro(brutto)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AngebotDetailPage() {
  var params = useParams();
  var router = useRouter();
  var angebotId = params.id;

  var [activeTab, setActiveTab] = useState('uebersicht');
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [angebot, setAngebot] = useState(null);

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
        var { data, error: err } = await supabase
          .from('angebote')
          .select('*, kunden(name, email, telefon, ansprechpartner)')
          .eq('id', angebotId)
          .eq('company_id', member.company_id)
          .single();
        if (!alive) return;
        if (err) { setError(err.message); return; }
        setAngebot(data);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return function() { alive = false; };
  }, [angebotId]);

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

  if (error || !angebot) {
    return (
      <Page>
        <Page.Content>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-12 h-12 text-danger-400 mb-4" />
            <p className="text-gray-500">{error || 'Angebot nicht gefunden.'}</p>
            <Button variant="ghost" size="sm" onClick={function() { router.push('/dashboard-v2/angebote'); }} className="mt-4">
              Zur Angebotsliste
            </Button>
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={function() { router.push('/dashboard-v2/angebote'); }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <Page.Title>{angebot.angebotsnummer || 'Angebot'}</Page.Title>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={STATUS_VARIANT[angebot.status] || 'default'} size="sm">
                  {STATUS_LABEL[angebot.status] || angebot.status || '--'}
                </Badge>
                {angebot.kunden && (
                  <Link href={'/dashboard-v2/kunden/' + angebot.kunden_id} className="text-sm text-gray-500 hover:text-primary-600">
                    {angebot.kunden.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={'/dashboard-v2/angebote/' + angebotId + '/bearbeiten'}>
              <Button variant="secondary" size="sm">
                <Edit className="w-4 h-4 mr-1 inline" />Bearbeiten
              </Button>
            </Link>
            {angebot.status === 'angenommen' && (
              <Link href={'/dashboard-v2/auftraege/erstellen?angebot_id=' + angebotId}>
                <Button variant="primary" size="sm">
                  <Briefcase className="w-4 h-4 mr-1 inline" />Auftrag erstellen
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Page.Header>
      <Page.Content>
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-0">
            {TABS.map(function(tab) {
              var Icon = tab.icon;
              var active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={function() { setActiveTab(tab.key); }}
                  className={'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ' + (active ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}
                >
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'uebersicht' && <UebersichtTab angebot={angebot} />}
        {activeTab === 'positionen' && <PositionenTab angebot={angebot} />}
        {activeTab === 'dokumente' && (
          <EmptyState icon={FolderOpen} title="Keine Dokumente" description="Noch keine Dokumente vorhanden." />
        )}
        {activeTab === 'historie' && (
          <EmptyState icon={History} title="Keine Historie" description="Noch keine Aktivitaeten aufgezeichnet." />
        )}
        {activeTab === 'notizen' && (
          <EmptyState icon={MessageSquare} title="Keine Notizen" description="Noch keine Notizen vorhanden." />
        )}
      </Page.Content>
    </Page>
  );
}
