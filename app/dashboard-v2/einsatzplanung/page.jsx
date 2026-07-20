'use client';

import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

export default function Einsatzplanung() {
  return (
    <Page>
      <Page.Header>
        <Page.Title>Einsatzplanung</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Einsaetze durchsuchen..."
            className="max-w-xs"
          />
          <Button variant="primary">Einsatz planen</Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Auftrag</Table.HeaderCell>
                  <Table.HeaderCell>Kunde</Table.HeaderCell>
                  <Table.HeaderCell>Datum</Table.HeaderCell>
                  <Table.HeaderCell>Uhrzeit</Table.HeaderCell>
                  <Table.HeaderCell>Techniker</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                <Table.Row>
                  <Table.Cell colSpan={7} className="py-8 text-center text-sm text-gray-400">
                    Keine Einsaetze vorhanden.
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
