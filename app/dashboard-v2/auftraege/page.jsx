'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList, Plus, Search, ArrowUpDown, ChevronUp, ChevronDown,
  X, CheckCircle, AlertCircle, Clock, CalendarDays,
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
var PRIO_ORDER = { kritisch: 4, hoch: 3, mittel: 2, niedrig: 1 };
var FILTERS = [
  { key: 'alle', label: 'Alle' },
  { key: 'offen', label: 'Offen' },
  { key: 'in_bearbeitung', label: 'In Bearbeitung' },
  { key: 'heute', label: 'Heute' },
  { key: 'ueberfaellig', label: 'Ueberfaellig' },
  { key: 'abgeschlossen', label: 'Abgeschlossen' },
];

function formatDate(d) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('de-DE');
}

function isToday(d) {
  if (!d) return false;
  var t = new Date(d);
  var n = new Date();
  return t.getFullYear() === n.getFullYear() && t.getMonth() === n.getMonth() && t.getDate() === n.getDate();
}

function isUeberfaellig(a) {
  if (!a.termin) return false;
  if (a.status === 'abgeschlossen' || a.status === 'storniert') return false;
  return new Date(a.termin) < new Date();
}

function sortList(list, key, dir) {
  return list.slice().sort(function(a, b) {
    var av, bv;
    if (key === 'termin') {
      av = new Date(a.termin || 0).getTime();
      bv = new Date(b.termin || 0).getTime();
    } else if (key === 'prioritaet') {
      av = PRIO_ORDER[a.prioritaet] || 0;
      bv = PRIO_ORDER[b.prioritaet] || 0;
    } else {
      av = (a[key] || '').toString().toLowerCase();
      bv = (b[key] || '').toString().toLowerCase();
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

export default function AuftraegePage() {
  var router = useRouter();
  var [auftraege, setAuftraege] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [search, setSearch] = useState('');
  var [filter, setFilter] = useState('alle');
  var [sortKey, setSortKey] = useState('termin');
  var [sortDir, setSortDir] = useState('asc');
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
          .from('auftraege')
          .select('id, auftragsnummer, status, prioritaet, termin, verantwortlicher, kunden_id, kunden(name)')
          .eq('company_id', member.company_id)
          .order('termin', { ascending: true, nullsFirst: false });
        if (!alive) return;
        if (err) { setError(err.message); return; }
        setAuftraege(data || []);
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

  var offene = auftraege.filter(function(a) { return a.status === 'offen'; }).length;
  var heuteCount = auftraege.filter(function(a) { return isToday(a.termin); }).length;
  var inBearbeitung = auftraege.filter(function(a) { return a.status === 'in_bearbeitung'; }).length;
  var abgeschlossenCount = auftraege.filter(function(a) { return a.status === 'abgeschlossen'; }).length;
  var ueberfaellig = auftraege.filter(function(a) { return isUeberfaellig(a); }).length;

  var visible = auftraege.filter(function(a) {
    if (filter === 'offen' && a.status !== 'offen') return false;
    if (filter === 'in_bearbeitung' && a.status !== 'in_bearbeitung') return false;
    if (filter === 'abgeschlossen' && a.status !== 'abgeschlossen') return false;
    if (filter === 'heute' && !isToday(a.termin)) return false;
    if (filter === 'ueberfaellig' && !isUeberfaellig(a)) return false;
    if (query) {
      var q = query.toLowerCase();
      var nr = (a.auftragsnummer || '').toLowerCase();
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
      setSortDir('asc');
    }
  }

  return (
    <Page>
      <Page.Header>
        <div className="flex items-center justify-between">
          <div>
            <Page.Title>Auftraege</Page.Title>
            <Page.Description>Auftragsverwaltung und Einsatzplanung</Page.Description>
          </div>
          <Link href="/dashboard-v2/auftraege/erstellen">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1 inline" />Neuer Auftrag
            </Button>
          </Link>
        </div>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <KpiCard title="Offene Auftraege" value={loading ? '--' : offene} icon={ClipboardList} loading={loading} />
          <KpiCard title="Heute geplant" value={loading ? '--' : heuteCount} icon={CalendarDays} iconColor="text-primary-600" iconBg="bg-primary-50" loading={loading} />
          <KpiCard title="In Bearbeitung" value={loading ? '--' : inBearbeitung} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" loading={loading} />
          <KpiCard title="Abgeschlossen" value={loading ? '--' : abgeschlossenCount} icon={CheckCircle} iconColor="text-success-600" iconBg="bg-success-50" loading={loading} />
          <KpiCard title="Ueberfaellig" value={loading ? '--' : ueberfaellig} icon={AlertCircle} iconColor="text-danger-600" iconBg="bg-danger-50" loading={loading} />
        </div>

        <Card className="mb-4">
          <Card.Content>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Auftragsnummer oder Kundenname suchen..."
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
            icon={ClipboardList}
            title={query || filter !== 'alle' ? 'Keine Ergebnisse' : 'Noch keine Auftraege'}
            description={query || filter !== 'alle' ? 'Passen Sie Suche oder Filter an.' : 'Erstellen Sie Ihren ersten Auftrag.'}
            action={query || filter !== 'alle' ? undefined : function() { router.push('/dashboard-v2/auftraege/erstellen'); }}
            actionLabel={query || filter !== 'alle' ? undefined : 'Neuer Auftrag'}
          />
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeaderCell>
                  <button onClick={function() { toggleSort('auftragsnummer'); }} className="flex items-center text-xs font-medium text-gray-500 hover:text-primary-600">
                    Auftragsnummer<SortIcon col="auftragsnummer" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </Table.HeaderCell>
                <Table.HeaderCell>Kunde</Table.HeaderCell>
                <Table.HeaderCell>
                  <button onClick={function() { toggleSort('status'); }} className="flex items-center text-xs font-medium text-gray-500 hover:text-primary-600">
                    Status<SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </Table.HeaderCell>
                <Table.HeaderCell>
                  <button onClick={function() { toggleSort('prioritaet'); }} className="flex items-center text-xs font-medium text-gray-500 hover:text-primary-600">
                    Prioritaet<SortIcon col="prioritaet" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </Table.HeaderCell>
                <Table.HeaderCell>
                  <button onClick={function() { toggleSort('termin'); }} className="flex items-center text-xs font-medium text-gray-500 hover:text-primary-600">
                    Termin<SortIcon col="termin" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </Table.HeaderCell>
                <Table.HeaderCell>Verantwortlicher</Table.HeaderCell>
                <Table.HeaderCell>Aktionen</Table.HeaderCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {visible.map(function(a) {
                return (
                  <Table.Row key={a.id} onClick={function() { router.push('/dashboard-v2/auftraege/' + a.id); }}>
                    <Table.Cell>
                      <span className="font-mono text-sm font-semibold text-gray-900">{a.auftragsnummer || '--'}</span>
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
                      <Badge variant={PRIO_VARIANT[a.prioritaet] || 'default'} size="sm">
                        {PRIO_LABEL[a.prioritaet] || a.prioritaet || '--'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <span className={'text-sm ' + (isUeberfaellig(a) ? 'text-danger-600 font-medium' : 'text-gray-500')}>{formatDate(a.termin)}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-gray-500">{a.verantwortlicher || '--'}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <Link href={'/dashboard-v2/auftraege/' + a.id} onClick={function(e) { e.stopPropagation(); }}>
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
