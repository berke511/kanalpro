'use client';

import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

export default function AngeboteV2Page() {
  return (
    <Page>
      <Page.Header>
        <Page.Title>Angebote</Page.Title>
        <Page.Description>Angebotsverwaltung</Page.Description>
      </Page.Header>
      <Page.Content>
        <Card>
          <Card.Content>
            <div className="mb-4 flex items-center justify-between gap-4">
              <Input placeholder="Angebote durchsuchen..." className="max-w-xs" />
              <Button variant="primary">Angebot erstellen</Button>
            </div>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Angebotsnummer</Table.HeaderCell>
                  <Table.HeaderCell>Kunde</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Gueltig bis</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                <Table.Row>
                  <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                    Noch keine Angebote vorhanden.
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
          </Card.Content>
        </Card>
      </Page.Content>
    </Page>
  );
}
