'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';

var euroFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

function fmtEuro(n) {
  return euroFormat.format(n || 0);
}

function calcBrutto(item) {
  var netto = (item.positionen ?? []).reduce(
    function(s, p) { return s + (p.menge ?? 0) * (p.preis ?? 0); },
    0
  );
  return netto * (1 + (item.steuersatz ?? 19) / 100);
}

function istUeberfaellig(r) {
  if (r.status === 'bezahlt') return false;
  if (!r.faellig_am) return false;
  return new Date(r.faellig_am) < new Date();
}

export default function Finanzen() {
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState(false);
  const [kpis, setKpis] = useState({
    umsatz: 0,
    offeneRechnungen: 0,
    offeneAngebote: 0,
    ueberfaelligeRechnungen: 0,
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

        var rechResult = await supabase
          .from('rechnungen')
          .select('status, positionen, steuersatz, faellig_am')
          .eq('company_id', companyId);

        var angResult = await supabase
          .from('angebote')
          .select('status')
          .eq('company_id', companyId);

        if (rechResult.error || angResult.error) {
          setFehler(true);
          setLaden(false);
          return;
        }

        var rech = rechResult.data ?? [];
        var ang = angResult.data ?? [];

        var umsatz = rech
          .filter(function(r) { return r.status === 'bezahlt'; })
          .reduce(function(s, r) { return s + calcBrutto(r); }, 0);

        var offeneRechnungen = rech.filter(function(r) {
          return r.status === 'gesendet' || r.status === 'versendet';
        }).length;

        var offeneAngebote = ang.filter(function(a) {
          return a.status !== 'angenommen' && a.status !== 'abgelehnt' && a.status !== 'in_auftrag';
        }).length;

        var ueberfaelligeRechnungen = rech.filter(function(r) {
          return istUeberfaellig(r);
        }).length;

        setKpis({
          umsatz: Number(umsatz || 0),
          offeneRechnungen: Number(offeneRechnungen || 0),
          offeneAngebote: Number(offeneAngebote || 0),
          ueberfaelligeRechnungen: Number(ueberfaelligeRechnungen || 0),
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
        <Page.Title>Finanzen</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <Card.Header>
              <Card.Title>Umsatz</Card.Title>
            </Card.Header>
            <Card.Content>
              {laden
                ? <p className="text-2xl font-semibold text-gray-400">Laedt...</p>
                : <p className="text-2xl font-semibold text-gray-900">{fmtEuro(kpis.umsatz)}</p>
              }
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Offene Rechnungen</Card.Title>
            </Card.Header>
            <Card.Content>
              {laden
                ? <p className="text-2xl font-semibold text-gray-400">Laedt...</p>
                : <p className="text-2xl font-semibold text-gray-900">{Number(kpis.offeneRechnungen || 0)}</p>
              }
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Offene Angebote</Card.Title>
            </Card.Header>
            <Card.Content>
              {laden
                ? <p className="text-2xl font-semibold text-gray-400">Laedt...</p>
                : <p className="text-2xl font-semibold text-gray-900">{Number(kpis.offeneAngebote || 0)}</p>
              }
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Ueberfaellige Rechnungen</Card.Title>
            </Card.Header>
            <Card.Content>
              {laden
                ? <p className="text-2xl font-semibold text-gray-400">Laedt...</p>
                : <p className="text-2xl font-semibold text-gray-900">{Number(kpis.ueberfaelligeRechnungen || 0)}</p>
              }
            </Card.Content>
          </Card>
        </div>
        <Card className="mt-6">
          <Card.Header>
            <Card.Title>Finanzuebersicht</Card.Title>
          </Card.Header>
          <Card.Content>
            {fehler
              ? <p className="text-sm text-red-500">Finanzdaten konnten nicht geladen werden.</p>
              : <p className="text-sm text-gray-500">Detailansicht wird im naechsten Schritt implementiert.</p>
            }
          </Card.Content>
        </Card>
      </Page.Content>
    </Page>
  );
}
