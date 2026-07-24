'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PlanGate from '@/components/PlanGate';
import Page from '@/components/ui/v2/Page';
import Button from '@/components/ui/v2/Button';
import Badge from '@/components/ui/v2/Badge';
import KpiCard from '@/components/ui/v2/KpiCard';
import Input from '@/components/ui/v2/Input';
import EmptyState from '@/components/ui/v2/EmptyState';

const STATUS_CFG = {
  entwurf:     { label: 'Entwurf',      variant: 'default'  },
  versendet:   { label: 'Versendet',    variant: 'info'     },
  teilbezahlt: { label: 'Teilbezahlt',  variant: 'warning'  },
  bezahlt:     { label: 'Bezahlt',      variant: 'success'  },
  storniert:   { label: 'Storniert',    variant: 'error'    },
  ueberfaellig:{ label: 'Überfällig', variant: 'error' },
};

const FILTER_LABELS = {
  alle:         'Alle',
  entwurf:      'Entwurf',
  versendet:    'Versendet',
  ueberfaellig: 'Überfällig',
  teilbezahlt:  'Teilbezahlt',
  bezahlt:      'Bezahlt',
  storniert:    'Storniert',
};

function fmtEuro(n) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function fmtDatum(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE');
}

function getBrutto(r) {
  const pos = r.positionen || [];
  const netto = pos.reduce((s, p) => s + (Number(p.menge) || 0) * (Number(p.preis) || 0), 0);
  return netto * (1 + (Number(r.steuersatz) || 19) / 100);
}

function isUeberfaellig(r) {
  if (r.status === 'bezahlt' || r.status === 'storniert') return false;
  if (!r.faellig_am) return false;
  return new Date(r.faellig_am) < new Date();
}

function getEffStatus(r) {
  return isUeberfaellig(r) ? 'ueberfaellig' : (r.status || 'entwurf');
}

const IconDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconEuro = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

export default function RechnungenPage() {
  const router = useRouter();
  const [laden, setLaden] = useState(true);
  const [rechnungen, setRechnungen] = useState([]);
  const [suchInput, setSuchInput] = useState('');
  const [suche, setSuche] = useState('');
  const [filter, setFilter] = useState('alle');
  const debRef = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLaden(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLaden(false); return; }
    const { data: member } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (!member?.company_id) { setLaden(false); return; }
    const { data } = await supabase
      .from('rechnungen')
      .select('*, kunden(name)')
      .eq('company_id', member.company_id)
      .order('datum', { ascending: false });
    setRechnungen(data || []);
    setLaden(false);
  }

  function handleSuche(v) {
    setSuchInput(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setSuche(v), 300);
  }

  const heute = new Date();
  const monat = heute.getMonth();
  const jahr = heute.getFullYear();

  const offenSumme = rechnungen
    .filter(r => r.status === 'entwurf' || r.status === 'versendet')
    .reduce((s, r) => s + getBrutto(r), 0);
  const ueberfaelligCount = rechnungen.filter(isUeberfaellig).length;
  const bezahltSumme = rechnungen
    .filter(r => r.status === 'bezahlt')
    .reduce((s, r) => s + getBrutto(r), 0);
  const monatsumsatz = rechnungen
    .filter(r => r.datum && new Date(r.datum).getMonth() === monat && new Date(r.datum).getFullYear() === jahr)
    .reduce((s, r) => s + getBrutto(r), 0);

  const filtered = rechnungen.filter(r => {
    const eff = getEffStatus(r);
    if (filter === 'ueberfaellig' && !isUeberfaellig(r)) return false;
    if (filter !== 'alle' && filter !== 'ueberfaellig' && r.status !== filter) return false;
    if (!suche) return true;
    const q = suche.toLowerCase();
    return (r.rechnungsnummer || '').toLowerCase().includes(q) ||
           (r.kunden?.name || '').toLowerCase().includes(q);
  });

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Rechnungen</Page.Title></Page.Header>
        <Page.Content>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100" />)}
            </div>
            <div className="h-64 rounded-xl bg-gray-100" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <PlanGate feature="rechnungen">
      <Page>
        <Page.Header>
          <Page.Title>Rechnungen</Page.Title>
          <Button variant="primary" onClick={() => router.push('/dashboard-v2/rechnungen/neu')}>
            + Rechnung erstellen
          </Button>
        </Page.Header>
        <Page.Content>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
            <KpiCard
              label="Offen"
              value={fmtEuro(offenSumme)}
              icon={<IconDoc />}
              trend={`${rechnungen.filter(r => r.status === 'entwurf' || r.status === 'versendet').length} Rechnungen`}
            />
            <KpiCard
              label="Überfällig"
              value={ueberfaelligCount + ' Stk.'}
              icon={<IconAlert />}
              trend={ueberfaelligCount > 0 ? 'Sofort handeln' : 'Alles im grünen'}
            />
            <KpiCard
              label="Bezahlt"
              value={fmtEuro(bezahltSumme)}
              icon={<IconCheck />}
              trend={`${rechnungen.filter(r => r.status === 'bezahlt').length} Rechnungen`}
            />
            <KpiCard
              label="Monatsumsatz"
              value={fmtEuro(monatsumsatz)}
              icon={<IconEuro />}
              trend={heute.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
            />
          </div>

          {/* Suche + Filter */}
          <div className="flex flex-wrap gap-3 mb-4 items-start">
            <div className="w-72">
              <Input
                placeholder="Nr. oder Kunde suchen..."
                value={suchInput}
                onChange={e => handleSuche(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(FILTER_LABELS).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    filter === f
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Tabelle */}
          {filtered.length === 0 ? (
            <EmptyState
              title={suche || filter !== 'alle' ? 'Keine Rechnungen gefunden' : 'Noch keine Rechnungen'}
              description={
                suche || filter !== 'alle'
                  ? 'Bitte Suche oder Filter anpassen.'
                  : 'Erstelle jetzt deine erste Rechnung.'
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nummer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kunde</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fällig</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Betrag</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => {
                    const eff = getEffStatus(r);
                    const cfg = STATUS_CFG[eff] || { label: eff, variant: 'default' };
                    const ueberfaell = isUeberfaellig(r);
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => router.push('/dashboard-v2/rechnungen/' + r.id)}
                      >
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-600">
                          {r.rechnungsnummer || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {r.kunden?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtDatum(r.datum)}</td>
                        <td className={['px-4 py-3', ueberfaell ? 'text-red-600 font-semibold' : 'text-gray-500'].join(' ')}>
                          {fmtDatum(r.faellig_am)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {fmtEuro(getBrutto(r))}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Page.Content>
      </Page>
    </PlanGate>
  );
}
