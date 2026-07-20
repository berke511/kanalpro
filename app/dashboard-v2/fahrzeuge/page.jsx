'use client';

import { useState } from 'react';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

export default function Fahrzeuge() {
  const [suchbegriff, setSuchbegriff] = useState('');

  return (
    <Page>
      <Page.Header>
        <Page.Title>Fahrzeuge</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Fahrzeuge durchsuchen..."
            className="max-w-xs"
            value={suchbegriff}
            onChange={function(e) { setSuchbegriff(e.target.value); }}
          />
          <Button variant="primary">
            Fahrzeug anlegen
          </Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Kennzeichen</Table.HeaderCell>
                  <Table.HeaderCell>Fahrzeug</Table.HeaderCell>
                  <Table.HeaderCell>Fahrer</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                <Table.Row>
                  <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                    Keine Fahrzeuge vorhanden.
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
