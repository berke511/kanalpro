'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

export default function RechnungenV2Page() {
  const [rechnungen, setRechnungen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [suchbegriff, setSuchbegriff] = useState('');

  useEffect(function() { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLaden(false); return; }
    const { data: member } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    if (!member) { setLaden(false); return; }
    const { data } = await supabase
      .from('rechnungen')
      .select('id, rechnungsnummer, status, faellig_am, kunden(name)')
      .eq('company_id', member.company_id)
      .order('erstellt_am', { ascending: false });
    setRechnungen(data ?? []);
    setLaden(false);
  }

  function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('de-DE') : '-';
  }

  function statusVariant(s) {
    if (s === 'entwurf') return 'default';
    if (s === 'gesendet') return 'info';
    if (s === 'bezahlt') return 'success';
    return 'default';
  }

  var q = suchbegriff.toLowerCase();
  var gefilterteRechnungen = rechnungen.filter(function(r) {
    var nr = (r.rechnungsnummer ?? '').toLowerCase();
    var kunde = (r.kunden && r.kunden.name ? r.kunden.name : '').toLowerCase();
    var status = (r.status ?? '').toLowerCase();
    return nr.includes(q) || kunde.includes(q) || status.includes(q);
  });

  return (
    <Page>
      <Page.Header>
        <Page.Title>Rechnungen</Page.Title>
        <Page.Description>Alle Rechnungen im Ueberblick</Page.Description>
      </Page.Header>
      <Page.Content>
        <Card>
          <Card.Content>
            <div className="mb-4 flex items-center justify-between gap-4">
              <Input
                placeholder="Rechnungen durchsuchen..."
                className="max-w-xs"
                value={suchbegriff}
                onChange={function(e) { setSuchbegriff(e.target.value); }}
              />
              <Button variant="primary">Rechnung erstellen</Button>
            </div>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Rechnungsnummer</Table.HeaderCell>
                  <Table.HeaderCell>Kunde</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Faellig am</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {laden ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Laedt...
                    </Table.Cell>
                  </Table.Row>
                ) : rechnungen.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Noch keine Rechnungen vorhanden.
                    </Table.Cell>
                  </Table.Row>
                ) : gefilterteRechnungen.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Keine passenden Rechnungen gefunden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  gefilterteRechnungen.map(function(r) {
                    return (
                      <Table.Row key={r.id}>
                        <Table.Cell>{r.rechnungsnummer ?? '-'}</Table.Cell>
                        <Table.Cell>{r.kunden && r.kunden.name ? r.kunden.name : '-'}</Table.Cell>
                        <Table.Cell>
                          <Badge variant={statusVariant(r.status)}>{r.status ?? '-'}</Badge>
                        </Table.Cell>
                        <Table.Cell>{formatDate(r.faellig_am)}</Table.Cell>
                        <Table.Cell></Table.Cell>
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
