'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

export default function Material() {
  var [materialien, setMaterialien] = useState([]);
  var [laden, setLaden] = useState(true);
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
        .from('materialien')
        .select('id,name,typ,bestand_aktuell,einheit,zustand')
        .eq('company_id', cId)
        .order('name');
      setMaterialien(dataRes.data ?? []);
      setLaden(false);
    }
    init();
  }, [router]);

  if (laden) return null;

  return (
    <Page>
      <Page.Header>
        <Page.Title>Material</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Material durchsuchen..."
            className="max-w-xs"
          />
          <Button variant="primary">
            Material anlegen
          </Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Artikel</Table.HeaderCell>
                  <Table.HeaderCell>Kategorie</Table.HeaderCell>
                  <Table.HeaderCell>Bestand</Table.HeaderCell>
                  <Table.HeaderCell>Einheit</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {materialien.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Kein Material vorhanden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  materialien.map(function (m) {
                    return (
                      <Table.Row key={m.id}>
                        <Table.Cell>{m.name || '—'}</Table.Cell>
                        <Table.Cell>{m.typ || '—'}</Table.Cell>
                        <Table.Cell>{m.bestand_aktuell != null ? m.bestand_aktuell : '—'}</Table.Cell>
                        <Table.Cell>{m.einheit || '—'}</Table.Cell>
                        <Table.Cell>
                          <Badge variant="default">{m.zustand || '—'}</Badge>
                        </Table.Cell>
                        <Table.Cell></Table.Cell>
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
