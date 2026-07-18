'use client';

import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';

export default function DashboardV2Page() {
  return (
    <Page>
      <Page.Header>
        <Page.Title>Dashboard</Page.Title>
        <Page.Description>Willkommen in KanalPro V3.</Page.Description>
      </Page.Header>
      <Page.Content>
        <Card>
          <Card.Content>
            <p className="text-sm text-gray-600">Dashboard V2 erfolgreich eingerichtet.</p>
          </Card.Content>
        </Card>
      </Page.Content>
    </Page>
  );
}
