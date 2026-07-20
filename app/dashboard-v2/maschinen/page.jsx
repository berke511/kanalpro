'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

var MASCHINENTYP_LABELS = {
  hebebuehne: 'Hebebühne',
  kompressor: 'Kompressor',
  generator: 'Generator / Aggregat',
  kran: 'Kran',
  stapler: 'Stapler / Hubwagen',
  schweissgeraet: 'Schweißgerät',
  werkzeugmaschine: 'Werkzeugmaschine',
  pumpe: 'Pumpe',
  druckluftwerkzeug: 'Druckluftwerkzeug',
  hochdruckspueler: 'Hochdruckspüler',
  fraese: 'Fräse / Bohrwerk',
  messgeraet: 'Messgerät',
  pruefgeraet: 'Prüfgerät',
  kamera: 'Kamera / Optik',
  werkzeug: 'Werkzeug (Allg.)',
  roboter: 'Roboter',
  sonstiges: 'Sonstiges',
};

var ZUSTAND_LABELS = {
  aktiv: 'Aktiv',
  in_einsatz: 'Im Einsatz',
  wartung: 'In Wartung',
  defekt: 'Defekt',
  ausser_betrieb: 'Außer Betrieb',
};

var ZUSTAND_VARIANTE = {
  aktiv: 'success',
  in_einsatz: 'info',
  wartung: 'warning',
  defekt: 'danger',
  ausser_betrieb: 'default',
};

export default function Maschinen() {
  var [maschinen, setMaschinen] = useState([]);
  var [laden, setLaden] = useState(true);
  var [suchbegriff, setSuchbegriff] = useState('');
  var router = useRouter();

  useEffect(function () {
    async function init() {
      var userRes = await supabase.auth.getUser();
      var user = userRes.data.user;
      if (!user) { router.push('/login'); return; }
      var memberRes = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (!memberRes.data) { router.push('/login'); return; }
      var cId = memberRes.data.company_id;
      var dataRes = await supabase
        .from('maschinen')
        .select('id,name,typ,seriennummer,zustand')
        .eq('company_id', cId)
        .order('name');
      setMaschinen(dataRes.data ?? []);
      setLaden(false);
    }
    init();
  }, [router]);

  if (laden) return null;

  var q = suchbegriff.toLowerCase();
  var gefiltert = suchbegriff
    ? maschinen.filter(function (m) {
        return (
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.typ && m.typ.toLowerCase().includes(q)) ||
          (MASCHINENTYP_LABELS[m.typ] && MASCHINENTYP_LABELS[m.typ].toLowerCase().includes(q)) ||
          (m.seriennummer && m.seriennummer.toLowerCase().includes(q)) ||
          (m.zustand && m.zustand.toLowerCase().includes(q))
        );
      })
    : maschinen;

  return (
    <Page>
      <Page.Header>
        <Page.Title>Maschinen</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Maschinen durchsuchen..."
            className="max-w-xs"
            value={suchbegriff}
            onChange={function (e) { setSuchbegriff(e.target.value); }}
          />
          <Button variant="primary" onClick={function () { router.push('/dashboard/maschinen'); }}>
            Maschine anlegen
          </Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Bezeichnung</Table.HeaderCell>
                  <Table.HeaderCell>Typ</Table.HeaderCell>
                  <Table.HeaderCell>Seriennummer</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {maschinen.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Keine Maschinen vorhanden.
                    </Table.Cell>
                  </Table.Row>
                ) : gefiltert.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Keine passenden Maschinen gefunden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  gefiltert.map(function (m) {
                    return (
                      <Table.Row key={m.id}>
                        <Table.Cell>{m.name || '—'}</Table.Cell>
                        <Table.Cell>{MASCHINENTYP_LABELS[m.typ] || m.typ || '—'}</Table.Cell>
                        <Table.Cell>{m.seriennummer || '—'}</Table.Cell>
                        <Table.Cell>
                          <Badge variant={ZUSTAND_VARIANTE[m.zustand] || 'default'}>
                            {ZUSTAND_LABELS[m.zustand] || m.zustand || '—'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Button variant="ghost" size="sm" onClick={function () { router.push('/dashboard/maschinen/' + m.id); }}>
                            <Pencil size={14} /> Bearbeiten
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table>
          </Card.Content>
        </Card>
      </Page.Content>
    </Page>
  );
}
