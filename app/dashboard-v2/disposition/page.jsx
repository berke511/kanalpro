'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

var datumFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

function fmtDatum(str) {
  if (!str) return '—';
  try { return datumFormat.format(new Date(str)); }
  catch (e) { return str; }
}

// Statuswerte: erstellen→'offen', statussystem→neu/geplant/zugewiesen/unterwegs/vor_ort/in_arbeit/wartend/abgeschlossen/storniert, abschluss→'dokumentiert'
var STATUS_VARIANT = {
  offen:          'warning',
  in_bearbeitung: 'info',
  neu:            'info',
  geplant:        'warning',
  zugewiesen:     'info',
  unterwegs:      'warning',
  vor_ort:        'info',
  in_arbeit:      'warning',
  wartend:        'default',
  abgeschlossen:  'success',
  dokumentiert:   'success',
  storniert:      'danger',
};

var STATUS_LABEL = {
  offen:          'Offen',
  in_bearbeitung: 'In Bearbeitung',
  neu:            'Neu',
  geplant:        'Geplant',
  zugewiesen:     'Zugewiesen',
  unterwegs:      'Unterwegs',
  vor_ort:        'Vor Ort',
  in_arbeit:      'In Arbeit',
  wartend:        'Wartend',
  abgeschlossen:  'Abgeschlossen',
  dokumentiert:   'Dokumentiert',
  storniert:      'Storniert',
};

export default function Disposition() {
  const router = useRouter();
  const [laden, setLaden] = useState(true);
  const [einsaetze, setEinsaetze] = useState([]);
  const [suchbegriff, setSuchbegriff] = useState('');

  useEffect(function() {
    async function load() {
      try {
        var authResult = await supabase.auth.getUser();
        var user = authResult.data && authResult.data.user;
        if (!user) { setLaden(false); return; }

        var memberResult = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        var companyId = memberResult.data && memberResult.data.company_id;
        if (!companyId) { setLaden(false); return; }

        var result = await supabase
          .from('auftraege')
          .select('id, titel, datum, status, kunden(name, firmenname), verantw_mitarbeiter:verantw_mitarbeiter_id(vorname, nachname)')
          .eq('company_id', companyId)
          .order('datum', { ascending: true });

        setEinsaetze(result.data ?? []);
        setLaden(false);
      } catch (err) {
        setLaden(false);
      }
    }
    load();
  }, []);

  var gefilterteEinsaetze = einsaetze.filter(function(e) {
    if (!suchbegriff) return true;
    var q = suchbegriff.toLowerCase();
    var titel = (e.titel ?? '').toLowerCase();
    var kunde = e.kunden ? ((e.kunden.firmenname || e.kunden.name) ?? '').toLowerCase() : '';
    var vn = e.verantw_mitarbeiter ? (e.verantw_mitarbeiter.vorname ?? '') : '';
    var nn = e.verantw_mitarbeiter ? (e.verantw_mitarbeiter.nachname ?? '') : '';
    var techniker = (vn + ' ' + nn).trim().toLowerCase();
    var status = (e.status ?? '').toLowerCase();
    return titel.includes(q) || kunde.includes(q) || techniker.includes(q) || status.includes(q);
  });

  function technikerName(e) {
    if (!e.verantw_mitarbeiter) return '—';
    var v = e.verantw_mitarbeiter.vorname ?? '';
    var n = e.verantw_mitarbeiter.nachname ?? '';
    return (v + ' ' + n).trim() || '—';
  }

  function kundeName(e) {
    if (!e.kunden) return '—';
    return e.kunden.firmenname || e.kunden.name || '—';
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Disposition</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Input
            placeholder="Einsaetze durchsuchen..."
            className="max-w-xs"
            value={suchbegriff}
            onChange={function(e) { setSuchbegriff(e.target.value); }}
          />
          <Button
            variant="primary"
            onClick={function() { router.push('/dashboard-v2/auftraege/erstellen'); }}
          >
            Einsatz planen
          </Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Auftrag</Table.HeaderCell>
                  <Table.HeaderCell>Kunde</Table.HeaderCell>
                  <Table.HeaderCell>Termin</Table.HeaderCell>
                  <Table.HeaderCell>Techniker</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {laden ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Laedt...
                    </Table.Cell>
                  </Table.Row>
                ) : einsaetze.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Keine Einsaetze vorhanden.
                    </Table.Cell>
                  </Table.Row>
                ) : gefilterteEinsaetze.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Keine passenden Einsaetze gefunden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  gefilterteEinsaetze.map(function(e) {
                    return (
                      <Table.Row key={e.id}>
                        <Table.Cell className="font-medium text-gray-900">{e.titel || '—'}</Table.Cell>
                        <Table.Cell>{kundeName(e)}</Table.Cell>
                        <Table.Cell>{fmtDatum(e.datum)}</Table.Cell>
                        <Table.Cell>{technikerName(e)}</Table.Cell>
                        <Table.Cell>
                          <Badge variant={STATUS_VARIANT[e.status] || 'default'}>
                            {STATUS_LABEL[e.status] || e.status || '—'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={function() { router.push('/dashboard-v2/auftraege/' + e.id); }}
                          >
                            <Pencil size={14} />
                            Bearbeiten
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table>
          </Card.Content>
        </Card>
      </Page.Content>
    </Page>
  );
}
