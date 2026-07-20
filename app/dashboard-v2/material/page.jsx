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

var ZUSTAND_MAP = {
  aktiv:    { label: 'Aktiv',    variant: 'success' },
  gesperrt: { label: 'Gesperrt', variant: 'danger'  },
  leer:     { label: 'Leer',     variant: 'warning'  },
};

export default function Material() {
  var [materialien, setMaterialien] = useState([]);
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

  var q = suchbegriff.toLowerCase();
  var gefiltert = suchbegriff
    ? materialien.filter(function (m) {
        return (
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.typ && m.typ.toLowerCase().includes(q)) ||
          (m.einheit && m.einheit.toLowerCase().includes(q)) ||
          (m.zustand && m.zustand.toLowerCase().includes(q))
        );
      })
    : materialien;

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
            value={suchbegriff}
            onChange={function (e) { setSuchbegriff(e.target.value); }}
          />
          <Button variant="primary" onClick={function () { router.push('/dashboard/material'); }}>
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
                ) : gefiltert.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Kein passendes Material gefunden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  gefiltert.map(function (m) {
                    var zInfo = ZUSTAND_MAP[m.zustand] || { label: m.zustand || '—', variant: 'default' };
                    return (
                      <Table.Row key={m.id}>
                        <Table.Cell>{m.name || '—'}</Table.Cell>
                        <Table.Cell>{m.typ || '—'}</Table.Cell>
                        <Table.Cell>{m.bestand_aktuell != null ? m.bestand_aktuell : '—'}</Table.Cell>
                        <Table.Cell>{m.einheit || '—'}</Table.Cell>
                        <Table.Cell>
                          <Badge variant={zInfo.variant}>{zInfo.label}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Button variant="ghost" size="sm" onClick={function () { router.push('/dashboard/material/' + m.id); }}>
                            <Pencil size={14} />
                            Bearbeiten
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
