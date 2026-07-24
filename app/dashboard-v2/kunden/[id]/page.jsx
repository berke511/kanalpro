'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Phone, Mail, Globe, MapPin, Calendar,
  FileText, Briefcase, Receipt, FolderOpen, MessageSquare,
  Users, Edit, ArrowLeft, AlertCircle, Building2, Plus,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Page from '@/components/ui/v2/Page';
import EmptyState from '@/components/ui/v2/EmptyState';

var TABS = [
  { key: 'uebersicht',      label: 'Ubersicht',         icon: User },
  { key: 'ansprechpartner', label: 'Ansprechpartner',   icon: Users },
  { key: 'objekte',         label: 'Objekte/Standorte', icon: MapPin },
  { key: 'angebote',        label: 'Angebote',          icon: FileText },
  { key: 'auftraege',       label: 'Auftraege',         icon: Briefcase },
  { key: 'rechnungen',      label: 'Rechnungen',        icon: Receipt },
  { key: 'dokumente',       label: 'Dokumente',         icon: FolderOpen },
  { key: 'notizen',         label: 'Notizen',           icon: MessageSquare },
];

var ANGEBOT_STATUS  = { entwurf: 'default', versendet: 'primary', angenommen: 'success', abgelehnt: 'danger' };
var AUFTRAG_STATUS  = { geplant: 'default', aktiv: 'primary', abgeschlossen: 'success', storniert: 'danger' };
var RECHNUNG_STATUS = { entwurf: 'default', versendet: 'primary', offen: 'warning', bezahlt: 'success', storniert: 'danger' };

function formatDate(d) {
  if (!d) return 'â';
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatEuro(n) {
  if (n === null || n === undefined) return 'â';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
}

// âââ Tab: Ubersicht âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function UebersichtTab({ kunde, angebote, auftraege, rechnungen }) {
  var offeneAngebote   = (angebote   || []).filter(function(a) { return a.status !== 'abgelehnt' && a.status !== 'angenommen'; }).length;
  var offeneAuftraege  = (auftraege  || []).filter(function(a) { return a.status === 'aktiv' || a.status === 'geplant'; }).length;
  var offeneRechnungen = (rechnungen || []).filter(function(r) { return r.status === 'offen' || r.status === 'ausstehend' || r.status === 'versendet'; });
  var offeneSumme      = offeneRechnungen.reduce(function(acc, r) { return acc + (r.betrag || 0); }, 0);
  var letzterAuftrag   = (auftraege || [])[0];
  var adressParts      = [kunde.strasse, [kunde.plz, kunde.ort].filter(Boolean).join(' ')].filter(Boolean);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <Card.Header>
            <Card.Title>Kontaktdaten</Card.Title>
          </Card.Header>
          <Card.Content>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Firmenname</dt>
                <dd className="text-sm font-semibold text-gray-900">{kunde.firmenname || 'â'}</dd>
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Ansprechpartner</dt>
                <dd className="text-sm text-gray-700">{kunde.ansprechpartner || 'â'}</dd>
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Telefon</dt>
                <dd className="flex items-center gap-1.5 text-sm text-gray-700">
                  {kunde.telefon ? <><Phone className="h-3.5 w-3.5 text-gray-400" />{kunde.telefon}</> : 'â'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">E-Mail</dt>
                <dd className="flex items-center gap-1.5 text-sm text-gray-700">
                  {kunde.email ? (
                    <><Mail className="h-3.5 w-3.5 text-gray-400" />
                    <a href={'mailto:' + kunde.email} className="text-primary-600 hover:underline">{kunde.email}</a></>
                  ) : 'â'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Website</dt>
                <dd className="flex items-center gap-1.5 text-sm text-gray-700">
                  {kunde.website ? (
                    <><Globe className="h-3.5 w-3.5 text-gray-400" />
                    <a href={kunde.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate">{kunde.website}</a></>
                  ) : 'â'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Adresse</dt>
                <dd className="flex items-start gap-1.5 text-sm text-gray-700">
                  {adressParts.length > 0 ? (
                    <><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <span>{adressParts.join(', ')}</span></>
                  ) : 'â'}
                </dd>
              </div>
            </dl>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Letzter Auftrag</Card.Title>
          </Card.Header>
          <Card.Content>
            {letzterAuftrag ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-gray-900">{letzterAuftrag.titel || 'Auftrag'}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {formatDate(letzterAuftrag.created_at)}
                  </div>
                </div>
                <Badge variant={AUFTRAG_STATUS[letzterAuftrag.status] || 'default'} size="sm">
                  {letzterAuftrag.status || 'â'}
                </Badge>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Noch kein Auftrag vorhanden.</span>
            )}
          </Card.Content>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <Card.Header><Card.Title>Status</Card.Title></Card.Header>
          <Card.Content>
            <div className="flex items-center gap-2">
              <Badge variant={kunde.status === 'aktiv' ? 'success' : 'default'} dot>
                {kunde.status || 'unbekannt'}
              </Badge>
              {kunde.typ && <span className="text-xs text-gray-400">{kunde.typ}</span>}
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Angelegt {formatDate(kunde.created_at)}
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header><Card.Title>Kannzahlen</Card.Title></Card.Header>
          <Card.Content className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Offene Angebote</span>
              <span className="text-2xl font-bold text-gray-900">{offeneAngebote}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Offene Auftraege</span>
              <span className="text-2xl font-bold text-gray-900">{offeneAuftraege}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-semibold text-gray-700">Offene Rechnungen</span>
              <span className={'text-xl font-bold ' + (offeneSumme > 0 ? 'text-warning-600' : 'text-gray-900')}>
                {formatEuro(offeneSumme)}
              </span>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}

// âââ Tab: Angebote ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AngeboteTab({ angebote, detailLoading, kundeId }) {
  if (detailLoading) return <div className="skeleton h-40 w-full rounded-xl" />;
  if (!angebote || angebote.length === 0) {
    return <EmptyState icon={FileText} title="Keine Angebote" description="Fur diesen Kunden wurden noch keine Angebote erstellt." action={function() { window.location.assign('/dashboard-v2/angebote/neu?kunden_id=' + kundeId); }} actionLabel="Angebot erstellen" />;
  }
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link href={'/dashboard-v2/angebote/neu?kunden_id=' + kundeId}>
          <Button variant="primary" size="sm">Angebot erstellen</Button>
        </Link>
      </div>
    <Table>
      <Table.Head>
        <tr>
          <Table.HeaderCell>Nummer</Table.HeaderCell>
          <Table.HeaderCell>Betreff</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell>Betrag</Table.HeaderCell>
          <Table.HeaderCell>Datum</Table.HeaderCell>
        </tr>
      </Table.Head>
      <Table.Body>
        {angebote.map(function(a) {
          return (
            <Table.Row key={a.id}>
              <Table.Cell className="font-mono text-xs">{(a.angebotsnummer || a.id || '').toString().slice(0, 12)}</Table.Cell>
              <Table.Cell className="font-medium">{a.betreff || a.titel || 'â'}</Table.Cell>
              <Table.Cell><Badge variant={ANGEBOT_STATUS[a.status] || 'default'} size="sm">{a.status || 'â'}</Badge></Table.Cell>
              <Table.Cell>{formatEuro(a.gesamtbetrag || a.betrag)}</Table.Cell>
              <Table.Cell className="text-gray-400">{formatDate(a.created_at)}</Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
    </div>
  );
}

// âââ Tab: Auftraege âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AuftraegeTab({ auftraege, detailLoading }) {
  if (detailLoading) return <div className="skeleton h-40 w-full rounded-xl" />;
  if (!auftraege || auftraege.length === 0) {
    return <EmptyState icon={Briefcase} title="Keine Auftraege" description="Fur diesen Kunden wurden noch keine Auftraege erstellt." />;
  }
  return (
    <>
      <div className="flex justify-end mb-3">
        <Button variant="primary" onClick={() => router.push('/dashboard-v2/rechnungen/neu?kunde_id=' + kundeId)}>+ Neue Rechnung</Button>
      </div>
      <Table>
      <Table.Head>
        <tr>
          <Table.HeaderCell>Titel</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell>Erstellt</Table.HeaderCell>
        </tr>
      </Table.Head>
      <Table.Body>
        {auftraege.map(function(a) {
          return (
            <Table.Row key={a.id}>
              <Table.Cell className="font-medium">{a.titel || 'â'}</Table.Cell>
              <Table.Cell><Badge variant={AUFTRAG_STATUS[a.status] || 'default'} size="sm">{a.status || 'â'}</Badge></Table.Cell>
              <Table.Cell className="text-gray-400">{formatDate(a.created_at)}</Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
    </>
  );
}

// âââ Tab: Rechnungen âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function RechnungenTab({ rechnungen, detailLoading, router, kundeId }) {
  if (detailLoading) return <div className="skeleton h-40 w-full rounded-xl" />;
  if (!rechnungen || rechnungen.length === 0) {
    return <EmptyState icon={Receipt} title="Keine Rechnungen" description="Fur diesen Kunden wurden noch keine Rechnungen erstellt." />;
  }
  return (
    <Table>
      <Table.Head>
        <tr>
          <Table.HeaderCell>Nummer</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell>Betrag</Table.HeaderCell>
          <Table.HeaderCell>Datum</Table.HeaderCell>
        </tr>
      </Table.Head>
      <Table.Body>
        {rechnungen.map(function(r) {
          return (
            <Table.Row key={r.id} className="cursor-pointer" onClick={() => router.push('/dashboard-v2/rechnungen/' + r.id)}>
              <Table.Cell className="font-mono text-xs">{(r.rechnungsnummer || r.id || '').toString().slice(0, 12)}</Table.Cell>
              <Table.Cell><Badge variant={RECHNUNG_STATUS[r.status] || 'default'} size="sm">{r.status || 'â'}</Badge></Table.Cell>
              <Table.Cell className="font-medium">{formatEuro(r.betrag)}</Table.Cell>
              <Table.Cell className="text-gray-400">{formatDate(r.created_at)}</Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}

// âââ Main page ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function KundeDetailPage() {
  var params      = useParams();
  var router      = useRouter();
  var kundeId     = params.id;
  var [activeTab,    setActiveTab]    = useState('uebersicht');
  var [loading,      setLoading]      = useState(true);
  var [detailLoading,setDetailLoading]= useState(true);
  var [err,          setErr]          = useState(null);
  var [kunde,        setKunde]        = useState(null);
  var [angebote,     setAngebote]     = useState([]);
  var [auftraege,    setAuftraege]    = useState([]);
  var [rechnungen,   setRechnungen]   = useState([]);

  useEffect(function() {
    var alive = true;
    async function load() {
      try {
        var { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/login'); return; }
        var { data: member } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        if (!member) { if (alive) { setErr('Kein Unternehmen gefunden.'); setLoading(false); } return; }
        var { data: k, error: kErr } = await supabase
          .from('kunden')
          .select('*')
          .eq('id', kundeId)
          .eq('company_id', member.company_id)
          .single();
        if (!alive) return;
        if (kErr || !k) { setErr('Kunde nicht gefunden.'); setLoading(false); return; }
        setKunde(k);
        setLoading(false);
        var [angRes, aufRes, recRes] = await Promise.all([
          supabase.from('angebote').select('id, angebotsnummer, betreff, titel, status, gesamtbetrag, betrag, created_at').eq('kunden_id', kundeId).order('created_at', { ascending: false }),
          supabase.from('auftraege').select('id, titel, status, created_at').eq('kunden_id', kundeId).order('created_at', { ascending: false }),
          supabase.from('rechnungen').select('id, rechnungsnummer, status, betrag, created_at').eq('kunden_id', kundeId).order('created_at', { ascending: false }),
        ]);
        if (!alive) return;
        setAngebote(angRes.data || []);
        setAuftraege(aufRes.data || []);
        setRechnungen(recRes.data || []);
        setDetailLoading(false);
      } catch (e) {
        if (alive) { setErr(e.message || 'Ladefehler'); setLoading(false); }
      }
    }
    load();
    return function() { alive = false; };
  }, [kundeId]);

  if (loading) {
    return (
      <Page>
        <div className="space-y-4">
          <div className="skeleton h-8 w-48 rounded" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-64 w-full rounded-xl" />
        </div>
      </Page>
    );
  }

  if (err || !kunde) {
    return (
      <Page>
        <Page.Content>
          <Card>
            <Card.Content>
              <div className="flex items-center gap-3 text-danger-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{err || 'Kunde nicht gefunden.'}</span>
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard-v2/kunden">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <Page.Title>{kunde.firmenname || 'Kundenakte'}</Page.Title>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={kunde.status === 'aktiv' ? 'success' : 'default'} size="xs" dot>
                  {kunde.status || 'â'}
                </Badge>
                {kunde.typ && <span className="text-xs text-gray-400">{kunde.typ}</span>}
              </div>
            </div>
          </div>
          <Link href={'/dashboard-v2/kunden/' + kundeId + '/bearbeiten'}>
            <Button variant="secondary" size="sm">
              <Edit className="h-4 w-4" />
              Bearbeiten
            </Button>
          </Link>
        </div>
      </Page.Header>

      <Page.Content>
        {/* Tab navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto scrollbar-thin">
            {TABS.map(function(tab) {
              var Icon = tab.icon;
              var isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={function() { setActiveTab(tab.key); }}
                  className={
                    'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ' +
                    (isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700')
                  }
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="mt-5">
          {activeTab === 'uebersicht' && (
            <UebersichtTab kunde={kunde} angebote={angebote} auftraege={auftraege} rechnungen={rechnungen} />
          )}
          {activeTab === 'ansprechpartner' && (
            <EmptyState icon={Users} title="Ansprechpartner" description="Verwaltung von Ansprechpartnern folgt in Kurze." />
          )}
          {activeTab === 'objekte' && (
            <EmptyState icon={MapPin} title="Objekte und Standorte" description="Objekte und Standorte folgen in Kurze." />
          )}
          {activeTab === 'angebote' && (
            <AngeboteTab angebote={angebote} detailLoading={detailLoading} kundeId={kundeId} />
          )}
          {activeTab === 'auftraege' && (
            <AuftraegeTab auftraege={auftraege} detailLoading={detailLoading} />
          )}
          {activeTab === 'rechnungen' && (
            <RechnungenTab rechnungen={rechnungen} detailLoading={detailLoading} router={router} kundeId={kundeId} />
          )}
          {activeTab === 'dokumente' && (
            <EmptyState icon={FolderOpen} title="Dokumente" description="Dokumentenverwaltung folgt in Kurze." />
          )}
          {activeTab === 'notizen' && (
            <EmptyState icon={MessageSquare} title="Notizen" description="Notizfunktion folgt in Kurze." />
          )}
        </div>
      </Page.Content>
    </Page>
  );
}
