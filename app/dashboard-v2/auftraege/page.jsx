'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

export default function AuftraegeV2Page() {
    const [auftraege, setAuftraege] = useState([]);
    const [laden, setLaden] = useState(true);
    const router = useRouter();

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
          .from('auftraege')
          .select('id, titel, status, datum, kunden(name)')
          .eq('company_id', member.company_id)
          .order('erstellt_am', { ascending: false });
        setAuftraege(data ?? []);
        setLaden(false);
    }

    function formatDate(d) {
        return d ? new Date(d).toLocaleDateString('de-DE') : '-';
    }

    return (
        <Page>
          <Page.Header>
            <Page.Title>Auftraege</Page.Title>
            <Page.Description>Auftragsverwaltung</Page.Description>
          </Page.Header>
          <Page.Content>
            <Card>
              <Card.Content>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <Input placeholder="Auftraege durchsuchen..." className="max-w-xs" />
                  <Button variant="primary" onClick={function() { router.push('/dashboard/auftraege/erstellen'); }}>Auftrag anlegen</Button>
                </div>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.HeaderCell>Auftragsnummer</Table.HeaderCell>
                      <Table.HeaderCell>Kunde</Table.HeaderCell>
                      <Table.HeaderCell>Status</Table.HeaderCell>
                      <Table.HeaderCell>Termin</Table.HeaderCell>
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
                    ) : auftraege.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                          Keine Auftraege vorhanden.
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      auftraege.map(function(a) {
                        return (
                          <Table.Row key={a.id}>
                            <Table.Cell>{a.titel ?? '-'}</Table.Cell>
                            <Table.Cell>{a.kunden?.name ?? '-'}</Table.Cell>
                            <Table.Cell>
                              <Badge variant="default">{a.status ?? '-'}</Badge>
                            </Table.Cell>
                            <Table.Cell>{formatDate(a.datum)}</Table.Cell>
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
