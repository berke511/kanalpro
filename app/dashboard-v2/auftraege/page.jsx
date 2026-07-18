'use client';

import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';

export default function AuftraegeV2Page() {
    return (
        <Page>
          <Page.Header>
            <Page.Title>Auftraege</Page.Title>
            <Page.Description>Auftragsverwaltung</Page.Description>
          </Page.Header>
          <Page.Content>
            <Card>
              <Card.Content>
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
                  </Table.Body>
                </Table>
              </Card.Content>
            </Card>
          </Page.Content>
        </Page>
    );
}
