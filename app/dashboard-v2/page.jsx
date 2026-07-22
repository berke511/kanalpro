'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';

export default function DashboardV2Page() {
  var [laden, setLaden] = useState(true);
  var [fehler, setFehler] = useState(false);
  var [kpis, setKpis] = useState({
    offeneAuftraege: 0,
    offeneRechnungen: 0,
    aktivekunden: 0,
    offeneAngebote: 0,
  });

  useEffect(function() {
    async function load() {
      try {
        var authResult = await supabase.auth.getUser();
        var user = authResult.data && authResult.data.user;
        if (!user) { setLaden(false); return; }

        var memberResult = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        var companyId = memberResult.data && memberResult.data.company_id;
        if (!companyId) { setLaden(false); return; }

        var auftraegeResult = await supabase
          .from('auftraege')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .not('status', 'in', '(abgeschlossen,dokumentiert,storniert)');

        var rechnungenResult = await supabase
          .from('rechnungen')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['gesendet', 'versendet']);

        var kundenResult = await supabase
          .from('kunden')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId);

        var angeboteResult = await supabase
          .from('angebote')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .not('status', 'in', '(angenommen,abgelehnt,in_auftrag)');

        if (auftraegeResult.error || rechnungenResult.error || kundenResult.error || angeboteResult.error) {
          setFehler(true);
          setLaden(false);
          return;
        }

        setKpis({
          offeneAuftraege: Number(auftraegeResult.count || 0),
          offeneRechnungen: Number(rechnungenResult.count || 0),
          aktivekunden: Number(kundenResult.count || 0),
          offeneAngebote: Number(angeboteResult.count || 0),
        });
        setLaden(false);
      } catch (err) {
        setFehler(true);
        setLaden(false);
      }
    }
    load();
  }, []);

  return (
    <Page>
      <Page.Header>
        <Page.Title>Dashboard</Page.Title>
        <Page.Description>Willkommen in KanalPro V3.</Page.Description>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <Card.Header>
              <Card.Title>Offene Auftraege</Card.Title>
            </Card.Header>
            <Card.Content>
              {laden
                ? <p className="text-2xl font-semibold text-gray-400">...</p>
                : <p className="text-2xl font-semibold text-gray-900">{String(kpis.offeneAuftraege)}</p>
              }
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Offene Rechnungen</Card.Title>
            </Card.Header>
            <Card.Content>
              {laden
                ? <p className="text-2xl font-semibold text-gray-400">...</p>
                : <p className="text-2xl font-semibold text-gray-900">{String(kpis.offeneRechnungen)}</p>
              }
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Kunden</Card.Title>
            </Card.Header>
            <Card.Content>
              {laden
                ? <p className="text-2xl font-semibold text-gray-400">...</p>
                : <p className="text-2xl font-semibold text-gray-900">{String(kpis.aktivekunden)}</p>
              }
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Offene Angebote</Card.Title>
            </Card.Header>
            <Card.Content>
              {laden
                ? <p className="text-2xl font-semibold text-gray-400">...</p>
                : <p className="text-2xl font-semibold text-gray-900">{String(kpis.offeneAngebote)}</p>
              }
            </Card.Content>
          </Card>
        </div>
        {fehler && (
          <Card>
            <Card.Content>
              <p className="text-sm text-red-500">Kennzahlen konnten nicht geladen werden.</p>
            </Card.Content>
          </Card>
        )}
      </Page.Content>
    </Page>
  );
}
