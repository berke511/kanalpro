'use client';

import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';

export default function KundenV2Page() {
  return (
    <Page>
      <Page.Header>
        <Page.Title>Kunden</Page.Title>
        <Page.Description>Kundenverwaltung</Page.Description>
      </Page.Header>
      <Page.Content>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Firma</Table.HeaderCell>
                  <Table.HeaderCell>Ansprechpartner</Table.HeaderCell>
                  <Table.HeaderCell>Ort</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
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
