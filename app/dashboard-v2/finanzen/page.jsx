'use client';

import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';

export default function Finanzen() {
  return (
    <Page>
      <Page.Header>
        <Page.Title>Finanzen</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <Card.Header>
              <Card.Title>Umsatz</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-2xl font-semibold text-gray-900">0,00 EUR</p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Offene Rechnungen</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Offene Angebote</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Ueberfaellige Rechnungen</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </Card.Content>
          </Card>
        </div>
        <Card className="mt-6">
          <Card.Header>
            <Card.Title>Finanzuebersicht</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-sm text-gray-500">Finanzdaten werden im naechsten Schritt angebunden.</p>
          </Card.Content>
        </Card>
      </Page.Content>
    </Page>
  );
}
