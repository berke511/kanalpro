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

export default function AngeboteV2Page() {
  const [angebote, setAngebote] = useState([]);
  const [laden, setLaden] = useState(true);
  const [suchbegriff, setSuchbegriff] = useState('');
  const router = useRouter();

  useEffect(function() { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLaden(false); return; }
    const { data: member } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    if (!member) { setLaden(false); return; }
    const { data } = await supabase
      .from('angebote')
      .select('id, angebotsnummer, status, gueltig_bis, kunden(name)')
      .eq('company_id', member.company_id)
      .order('erstellt_am', { ascending: false });
    setAngebote(data ?? []);
    setLaden(false);
  }

  function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('de-DE') : '-';
  }

  function statusVariant(s) {
    if (s === 'entwurf') return 'default';
    if (s === 'gesendet') return 'info';
    if (s === 'angenommen') return 'success';
    if (s === 'abgelehnt') return 'danger';
    if (s === 'in_auftrag') return 'warning';
    return 'default';
  }

  var q = suchbegriff.toLowerCase();
  var gefilterteAngebote = angebote.filter(function(a) {
    var nr = (a.angebotsnummer ?? '').toLowerCase();
    var kunde = (a.kunden && a.kunden.name ? a.kunden.name : '').toLowerCase();
    var status = (a.status ?? '').toLowerCase();
    return nr.includes(q) || kunde.includes(q) || status.includes(q);
  });

  return (
    <Page>
      <Page.Header>
        <Page.Title>Angebote</Page.Title>
        <Page.Description>Alle Angebote im Ueberblick</Page.Description>
      </Page.Header>
      <Page.Content>
        <Card>
          <Card.Content>
            <div className="mb-4 flex items-center justify-between gap-4">
              <Input
                placeholder="Angebote durchsuchen..."
                className="max-w-xs"
                value={suchbegriff}
                onChange={function(e) { setSuchbegriff(e.target.value); }}
              />
              <Button variant="primary" onClick={function() { router.push('/dashboard/angebote/neu'); }}>Angebot erstellen</Button>
            </div>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Angebotsnummer</Table.HeaderCell>
                  <Table.HeaderCell>Kunde</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Gueltig bis</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {laden ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Laedt...
                    </Table.Cell>
                  </Table.Row>
                ) : angebote.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Noch keine Angebote vorhanden.
                    </Table.Cell>
                  </Table.Row>
                ) : gefilterteAngebote.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Keine passenden Angebote gefunden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  gefilterteAngebote.map(function(a) {
                    return (
                      <Table.Row key={a.id}>
                        <Table.Cell>{a.angebotsnummer ?? '-'}</Table.Cell>
                        <Table.Cell>{a.kunden && a.kunden.name ? a.kunden.name : '-'}</Table.Cell>
                        <Table.Cell>
                          <Badge variant={statusVariant(a.status)}>{a.status ?? '-'}</Badge>
                        </Table.Cell>
                        <Table.Cell>{formatDate(a.gueltig_bis)}</Table.Cell>
                        <Table.Cell>
                          <Button variant="ghost" size="sm" onClick={function() { router.push('/dashboard/angebote/' + a.id); }}>
                            <Pencil size={16} />
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
