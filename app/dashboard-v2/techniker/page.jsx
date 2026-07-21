'use client';

import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Badge from '@/components/ui/v2/Badge';

export default function TechnikerPage() {
  return (
    <Page>
      <Page.Header>
        <Page.Title>Techniker</Page.Title>
        <Page.Description>Uebersicht ueber alle Techniker und ihren aktuellen Einsatzstatus.</Page.Description>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Techniker im Einsatz</Card.Title>
                <Badge variant="info">0</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Keine Techniker derzeit im Einsatz.</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Heute verfuegbar</Card.Title>
                <Badge variant="success">0</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Keine Techniker heute verfuegbar.</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Abwesend</Card.Title>
                <Badge variant="warning">0</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Keine Techniker derzeit abwesend.</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Teamuebersicht</Card.Title>
                <Badge variant="default">0</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Kennzahlen werden hier angezeigt.</p>
            </Card.Content>
          </Card>

        </div>
      </Page.Content>
    </Page>
  );
}
