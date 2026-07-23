'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Plus, Search, ArrowUpDown, ChevronUp, ChevronDown,
  X, CheckCircle, XCircle, Clock, Send,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import KpiCard from '@/components/ui/v2/KpiCard';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Page from '@/components/ui/v2/Page';
import EmptyState from '@/components/ui/v2/EmptyState';

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
var FILTERS = [
  { key: 'alle', label: 'Alle' },
  { key: 'entwurf', label: 'Entwurf' },
  { key: 'versendet', label: 'Versendet' },
  { key: 'angenommen', label: 'Angenommen' },
  { key: 'abgelehnt', label: 'Abgelehnt' },
];

function formatDate(d) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('de-DE');
}

function formatEuro(n) {
  if (!n && n !== 0) return '--';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
}

function calcBrutto(a) {
  var pos = a.positionen ?? [];
  return pos.reduce(function(sum, p) {
    return sum + (p.menge || 1) * (p.einzelpreis || p.preis || 0) * (1 + (p.mwst || 19) / 100);
  }, 0);
}

function sortList(list, key, dir) {
  return list.slice().sort(function(a, b) {
    var av, bv;
    if (key === 'datum') {
      av = new Date(a.datum || a.created_at || 0).getTime();
      bv = new Date(b.datum || b.created_at || 0).getTime();
    } else if (key === 'betrag') {
      av = calcBrutto(a);
      bv = calcBrutto(b);
    } else {
      av = a[key] || '';
      bv = b[key] || '';
    }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 ml-1 inline text-gray-400" />;
  if (sortDir === 'asc') return <ChevronUp className="w-3 h-3 ml-1 inline text-primary-600" />;
  return <ChevronDown className="w-3 h-3 ml-1 inline text-primary-600" />;
}

export default function AngebotePage() {
  var router = useRouter();
  var [angebote, setAngebote] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [search, setSearch] = useState('');
  var [filter, setFilter] = useState('alle');
  var [sortKey, setSortKey] = useState('datum');
  var [sortDir, setSortDir] = useState('desc');
  var debounceRef = useRef(null);
  var [query, setQuery] = useState('');

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
          .select('*, kunden(name)')
          .eq('company_id', member.company_id)
          .order('created_at', { ascending: false });
        if (!alive) return;
        if (err) { setError(err.message); return; }
        setAngebote(data || []);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return function() { alive = false; };
  }, []);

  function handleSearch(val) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(function() { setQuery(val); }, 300);
  }

  var gesamt = angebote.length;
  var entwuerfe = angebote.filter(function(a) { return a.status === 'entwurf'; }).length;
  var versendet = angebote.filter(function(a) { return a.status === 'versendet'; }).length;
  var angenommen = angebote.filter(function(a) { return a.status === 'angenommen'; }).length;
  var abgelehnt = angebote.filter(function(a) { return a.status === 'abgelehnt'; }).length;

  var visible = angebote.filter(function(a) {
    if (filter !== 'alle' && a.status !== filter) return false;
    if (query) {
      var q = query.toLowerCase();
      var nr = (a.angebotsnummer || '').toLowerCase();
      var kunde = ((a.kunden && a.kunden.name) || '').toLowerCase();
      if (!nr.includes(q) && !kunde.includes(q)) return false;
    }
    return true;
  });
  visible = sortList(visible, sortKey, sortDir);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(function(d) { return d === 'asc' ? 'desc' : 'asc'; });
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <Page>
      <Page.Header>
        <div className="flex items-center justify-between">
          <div>
            <Page.Title>Angebote</Page.Title>
            <Page.Description>Angebotsverwaltung und Statusverfolgung</Page.Description>
          </div>
          <Link href="/dashboard-v2/angebote/neu">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1 inline" />Neues Angebot
            </Button>
          </Link>
        </div>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <KpiCard title="Angebote gesamt" value={loading ? '--' : gesamt} icon={FileText} loading={loading} />
          <KpiCard title="Entwuerfe" value={loading ? '--' : entwuerfe} icon={Clock} iconColor="text-gray-600" iconBg="bg-gray-50" loading={loading} />
          <KpiCard title="Versendet" value={loading ? '--' : versendet} icon={Send} iconColor="text-primary-600" iconBg="bg-primary-50" loading={loading} />
          <KpiCard title="Angenommen" value={loading ? '--' : angenommen} icon={CheckCircle} iconColor="text-success-600" iconBg="bg-success-50" loading={loading} />
          <KpiCard title="Abgelehnt" value={loading ? '--' : abgelehnt} icon={XCircle} iconColor="text-danger-600" iconBg="bg-danger-50" loading={loading} />
        </div>

        <Card className="mb-4">
          <Card.Content>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Angebotsnummer oder Kundenname suchen..."
                  value={search}
                  onChange={function(e) { handleSearch(e.target.value); }}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {search && (
                  <button onClick={function() { handleSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1 flex-wrap">
                {FILTERS.map(function(f) {
                  return (
                    <button
                      key={f.key}
                      onClick={function() { setFilter(f.key); }}
                      className={'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ' + (filter === f.key ? 'bg-primary-600 text-white border-primary-600' : 'text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600')}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card.Content>
        </Card>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(function(i) { return <div key={i} className="skeleton h-12 w-full rounded-lg" />; })}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-danger-600">{error}</div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={query || filter !== 'alle' ? 'Keine Ergebnisse' : 'Noch keine Angebote'}
            description={query || filter !== 'alle' ? 'Passen Sie Suche oder Filter an.' : 'Erstellen Sie Ihr erstes Angebot.'}
            action={query || filter !== 'alle' ? undefined : function() { router.push('/dashboard-v2/angebote/neu'); }}
            actionLabel={query || filter !== 'alle' ? undefined : 'Neues Angebot'}
          />
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeaderCell>
                  <button onClick={function() { toggleSort('angebotsnummer'); }} className="flex items-center text-xs font-medium text-gray-500 hover:text-primary-600">
                    Angebotsnummer<SortIcon col="angebotsnummer" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </Table.HeaderCell>
                <Table.HeaderCell>Kunde</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>
                  <button onClick={function() { toggleSort('betrag'); }} className="flex items-center text-xs font-medium text-gray-500 hover:text-primary-600">
                    Angebotssumme<SortIcon col="betrag" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </Table.HeaderCell>
                <Table.HeaderCell>
                  <button onClick={function() { toggleSort('datum'); }} className="flex items-center text-xs font-medium text-gray-500 hover:text-primary-600">
                    Erstellungsdatum<SortIcon col="datum" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </Table.HeaderCell>
                <Table.HeaderCell>Gueltigkeit</Table.HeaderCell>
                <Table.HeaderCell>Aktionen</Table.HeaderCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {visible.map(function(a) {
                return (
                  <Table.Row key={a.id} onClick={function() { router.push('/dashboard-v2/angebote/' + a.id); }}>
                    <Table.Cell>
                      <span className="font-mono text-sm font-semibold text-gray-900">{a.angebotsnummer || '--'}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-gray-700">{(a.kunden && a.kunden.name) || '--'}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={STATUS_VARIANT[a.status] || 'default'} size="sm">
                        {STATUS_LABEL[a.status] || a.status || '--'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm font-medium text-gray-900">{formatEuro(calcBrutto(a))}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-gray-500">{formatDate(a.datum || a.created_at)}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-gray-500">{formatDate(a.gueltig_bis)}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <Link href={'/dashboard-v2/angebote/' + a.id} onClick={function(e) { e.stopPropagation(); }}>
                        <Button variant="ghost" size="xs">Ansehen</Button>
                      </Link>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </Page.Content>
    </Page>
  );
}
