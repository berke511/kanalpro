'use client';

import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Badge from '@/components/ui/v2/Badge';

export default function MeinTagPage() {
  const heute = new Date();
  const datumText = heute.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Page>
      <Page.Header>
        <Page.Title>Guten Tag!</Page.Title>
        <Page.Description>{datumText}</Page.Description>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Meine heutigen Aufträge</Card.Title>
                <Badge variant="info">0</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Noch keine Aufträge für heute.</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Heute geplant</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Keine Termine geplant.</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Offene Aufgaben</Card.Title>
                <Badge variant="warning">0</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Keine offenen Aufgaben.</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Hinweise</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Keine Hinweise.</p>
            </Card.Content>
          </Card>

        </div>
      </Page.Content>
    </Page>
  );
}
