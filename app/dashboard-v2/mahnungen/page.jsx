'use client';

import { useState } from 'react';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

export default function Mahnungen() {
  var [suchbegriff, setSuchbegriff] = useState('');

  return (
    <Page>
      <Page.Header>
        <Page.Title>Mahnungen</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Mahnungen durchsuchen..."
            className="max-w-xs"
            value={suchbegriff}
            onChange={function (e) { setSuchbegriff(e.target.value); }}
          />
          <Button variant="primary">
            Mahnung erstellen
          </Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Rechnung</Table.HeaderCell>
                  <Table.HeaderCell>Kunde</Table.HeaderCell>
                  <Table.HeaderCell>Mahnstufe</Table.HeaderCell>
                  <Table.HeaderCell>Fällig seit</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                <Table.Row>
                  <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                    Keine Mahnungen vorhanden.
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
