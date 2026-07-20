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

export default function Mahnungen() {
  var [mahnungen, setMahnungen] = useState([]);
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
        .from('rechnungen')
        .select('id,rechnungsnummer,faellig_am,status,mahnstufe,kunden(name)')
        .eq('company_id', cId)
        .eq('status', 'mahnung')
        .order('erstellt_am', { ascending: false });
      setMahnungen(dataRes.data ?? []);
      setLaden(false);
    }
    init();
  }, [router]);

  if (laden) return null;

  var q = suchbegriff.toLowerCase();
  var gefilterteMahnungen = suchbegriff.trim() === '' ? mahnungen : mahnungen.filter(function (m) {
    var datum = m.faellig_am ? new Date(m.faellig_am).toLocaleDateString('de-DE') : '';
    return [
      m.rechnungsnummer || '',
      m.kunden && m.kunden.name ? m.kunden.name : '',
      m.mahnstufe != null ? String(m.mahnstufe) : '',
      m.status || '',
      datum,
      m.faellig_am || ''
    ].some(function (v) { return v.toLowerCase().indexOf(q) !== -1; });
  });

  return (
    <Page>
      <Page.Header>
        <Page.Title>Mahnungen</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Mahnungen durchsuchen..."
            className="max-w-xs"
            value={suchbegriff}
            onChange={function (e) { setSuchbegriff(e.target.value); }}
          />
          <Button variant="primary" onClick={function () { router.push('/dashboard/rechnungen'); }}>
            Mahnung erstellen
          </Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Rechnung</Table.HeaderCell>
                  <Table.HeaderCell>Kunde</Table.HeaderCell>
                  <Table.HeaderCell>Mahnstufe</Table.HeaderCell>
                  <Table.HeaderCell>Fällig seit</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {mahnungen.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Keine Mahnungen vorhanden.
                    </Table.Cell>
                  </Table.Row>
                ) : gefilterteMahnungen.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Keine passenden Mahnungen gefunden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  gefilterteMahnungen.map(function (m) {
                    return (
                      <Table.Row key={m.id}>
                        <Table.Cell>{m.rechnungsnummer || '—'}</Table.Cell>
                        <Table.Cell>{m.kunden && m.kunden.name ? m.kunden.name : '—'}</Table.Cell>
                        <Table.Cell>{m.mahnstufe != null ? m.mahnstufe : '—'}</Table.Cell>
                        <Table.Cell>{m.faellig_am ? new Date(m.faellig_am).toLocaleDateString('de-DE') : '—'}</Table.Cell>
                        <Table.Cell>
                          <Badge variant="default">{m.status || '—'}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Button variant="ghost" size="sm" onClick={function () { router.push('/dashboard/rechnungen/' + m.id); }}>
                            <Pencil className="w-4 h-4 mr-1" />
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
