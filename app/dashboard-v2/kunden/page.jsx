'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Plus, Search, Phone, MapPin,
  ArrowUpDown, ChevronUp, ChevronDown, X,
  TrendingUp, AlertCircle, Building2,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import KpiCard from '@/components/ui/v2/KpiCard';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Page from '@/components/ui/v2/Page';
import EmptyState from '@/components/ui/v2/EmptyState';

var TYP_VARIANT = { Privat: 'default', Gewerbe: 'primary', Kommune: 'warning' };
var STATUS_VARIANT = { aktiv: 'success', inaktiv: 'default' };
var FILTERS = [
  { key: 'alle',    label: 'Alle' },
  { key: 'aktiv',   label: 'Aktiv' },
  { key: 'privat',  label: 'Privat' },
  { key: 'gewerbe', label: 'Gewerbe' },
  { key: 'kommune', label: 'Kommune' },
];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatEuro(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function sortList(list, field, dir) {
  return [...list].sort(function(a, b) {
    var va = a[field] || '';
    var vb = b[field] || '';
    if (field === 'created_at' || field === 'updated_at') {
      va = new Date(va).getTime() || 0;
      vb = new Date(vb).getTime() || 0;
    } else {
      va = (va + '').toLowerCase();
      vb = (vb + '').toLowerCase();
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}
function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="inline h-3 w-3 opacity-40 ml-1" />;
  if (sortDir === 'asc') return <ChevronUp className="inline h-3 w-3 text-primary-600 ml-1" />;
  return <ChevronDown className="inline h-3 w-3 text-primary-600 ml-1" />;
}

export default function KundenPage() {
  var router = useRouter();
  var [loading, setLoading]           = useState(true);
  var [err, setErr]                   = useState(null);
  var [allKunden, setAllKunden]       = useState([]);
  var [searchRaw, setSearchRaw]       = useState('');
  var [search, setSearch]             = useState('');
  var [filter, setFilter]             = useState('alle');
  var [sortField, setSortField]       = useState('firmenname');
  var [sortDir, setSortDir]           = useState('asc');
  var [kpiGesamt, setKpiGesamt]       = useState(null);
  var [kpiNeu, setKpiNeu]             = useState(null);
  var [kpiAktiv, setKpiAktiv]         = useState(null);
  var [kpiForderung, setKpiForderung] = useState(null);
  var debounceTimer = useRef(null);

  useEffect(function() {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(function() { setSearch(searchRaw); }, 300);
    return function() { clearTimeout(debounceTimer.current); };
  }, [searchRaw]);

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
        var cid = member.company_id;
        var { data: kunden, error: kErr } = await supabase
          .from('kunden')
          .select('id, firmenname, typ, status, ort, telefon, ansprechpartner, created_at, updated_at')
          .eq('company_id', cid)
          .order('firmenname', { ascending: true });
        if (!alive) return;
        if (kErr) throw kErr;
        var list = kunden || [];
        setAllKunden(list);
        var now = new Date();
        var monatsBeginn = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        setKpiGesamt(list.length);
        setKpiNeu(list.filter(function(k) { return k.created_at >= monatsBeginn; }).length);
        setKpiAktiv(list.filter(function(k) { return k.status === 'aktiv'; }).length);
        var ids = list.map(function(k) { return k.id; });
        if (ids.length > 0) {
          var { data: offene } = await supabase
            .from('rechnungen')
            .select('betrag')
            .in('kunden_id', ids)
            .in('status', ['offen', 'ausstehend', 'versendet']);
          if (alive) {
            var summe = (offene || []).reduce(function(acc, r) { return acc + (r.betrag || 0); }, 0);
            setKpiForderung(summe);
          }
        } else {
          if (alive) setKpiForderung(0);
        }
      } catch (e) {
        if (alive) setErr(e.message || 'Ladefehler');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return function() { alive = false; };
  }, []);

  var visible = allKunden.filter(function(k) {
    if (filter === 'aktiv'   && k.status !== 'aktiv')   return false;
    if (filter === 'privat'  && k.typ    !== 'Privat')  return false;
    if (filter === 'gewerbe' && k.typ    !== 'Gewerbe') return false;
    if (filter === 'kommune' && k.typ    !== 'Kommune') return false;
    if (search) {
      var q = search.toLowerCase();
      return (
        (k.firmenname      || '').toLowerCase().includes(q) ||
        (k.ansprechpartner || '').toLowerCase().includes(q) ||
        (k.ort             || '').toLowerCase().includes(q)
      );
    }
    return true;
  });
  visible = sortList(visible, sortField, sortDir);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(function(d) { return d === 'asc' ? 'desc' : 'asc'; });
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  if (err) {
    return (
      <Page>
        <Page.Content>
          <Card>
            <Card.Content>
              <div className="flex items-center gap-3 text-danger-600">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{err}</span>
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <Page.Title>Kunden</Page.Title>
            <Page.Description>Alle Kunden Ihres Unternehmens im Überblick.</Page.Description>
          </div>
          <Link href="/dashboard-v2/kunden/neu">
            <Button variant="primary" size="md">
              <Plus className="h-4 w-4" />
              Neuer Kunde
            </Button>
          </Link>
        </div>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard title="Kunden gesamt" value={loading ? null : kpiGesamt} icon={Users} loading={loading} iconColor="text-primary-600" iconBg="bg-primary-50" />
          <KpiCard title="Neue Kunden" value={loading ? null : kpiNeu} trendLabel="diesen Monat" icon={TrendingUp} loading={loading} iconColor="text-success-600" iconBg="bg-success-50" />
          <KpiCard title="Aktive Kunden" value={loading ? null : kpiAktiv} icon={Building2} loading={loading} iconColor="text-warning-600" iconBg="bg-warning-50" />
          <KpiCard title="Offene Forderungen" value={loading ? null : (kpiForderung !== null ? formatEuro(kpiForderung) : '—')} icon={AlertCircle} loading={loading} iconColor="text-danger-600" iconBg="bg-danger-50" />
        </div>

        <Card>
          <Card.Content>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Firmenname, Ansprechpartner, Ort ..."
                  value={searchRaw}
                  onChange={function(e) { setSearchRaw(e.target.value); }}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
                />
                {searchRaw && (
                  <button onClick={function() { setSearchRaw(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors" aria-label="Suche leeren">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map(function(f) {
                  return (
                    <button
                      key={f.key}
                      onClick={function() { setFilter(f.key); }}
                      className={'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' + (filter === f.key ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {!loading && (
              <p className="mt-2 text-xs text-gray-400">
                {visible.length} {visible.length === 1 ? 'Ergebnis' : 'Ergebnisse'}
                {filter !== 'alle' || search ? ' gefunden' : ' gesamt'}
              </p>
            )}
          </Card.Content>
        </Card>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map(function(i) { return <div key={i} className="skeleton h-12 w-full rounded-xl" />; })}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search || filter !== 'alle' ? 'Keine Ergebnisse' : 'Noch keine Kunden'}
            description={search || filter !== 'alle' ? 'Keine Kunden entsprechen den aktuellen Filtern.' : 'Legen Sie jetzt Ihren ersten Kunden an.'}
            action={!search && filter === 'alle' ? function() { router.push('/dashboard-v2/kunden/neu'); } : undefined}
            actionLabel={!search && filter === 'alle' ? 'Neuer Kunde' : undefined}
          />
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.HeaderCell>
                  <button onClick={function() { handleSort('firmenname'); }} className="inline-flex items-center hover:text-gray-900 transition-colors">
                    Firmenname<SortIcon field="firmenname" sortField={sortField} sortDir={sortDir} />
                  </button>
                </Table.HeaderCell>
                <Table.HeaderCell>Typ</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Ort</Table.HeaderCell>
                <Table.HeaderCell>Telefon</Table.HeaderCell>
                <Table.HeaderCell>
                  <button onClick={function() { handleSort('updated_at'); }} className="inline-flex items-center hover:text-gray-900 transition-colors">
                    Letzter Kontakt<SortIcon field="updated_at" sortField={sortField} sortDir={sortDir} />
                  </button>
                </Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </tr>
            </Table.Head>
            <Table.Body>
              {visible.map(function(k) {
                return (
                  <Table.Row key={k.id} onClick={function() { router.push('/dashboard-v2/kunden/' + k.id); }}>
                    <Table.Cell>
                      <div className="font-semibold text-gray-900">{k.firmenname || '—'}</div>
                      {k.ansprechpartner && <div className="mt-0.5 text-xs text-gray-400">{k.ansprechpartner}</div>}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={TYP_VARIANT[k.typ] || 'default'} size="sm">{k.typ || '—'}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={STATUS_VARIANT[k.status] || 'default'} size="sm" dot>{k.status || '—'}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {k.ort ? <span className="flex items-center gap-1.5 text-gray-600"><MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />{k.ort}</span> : <span className="text-gray-400">—</span>}
                    </Table.Cell>
                    <Table.Cell>
                      {k.telefon ? <span className="flex items-center gap-1.5 text-gray-600"><Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />{k.telefon}</span> : <span className="text-gray-400">—</span>}
                    </Table.Cell>
                    <Table.Cell className="text-gray-400 text-sm">{formatDate(k.updated_at || k.created_at)}</Table.Cell>
                    <Table.Cell>
                      <Link href={'/dashboard-v2/kunden/' + k.id} onClick={function(e) { e.stopPropagation(); }}>
                        <Button variant="ghost" size="xs">Details</Button>
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
