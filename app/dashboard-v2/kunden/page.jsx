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

export default function KundenV2Page() {
    const router = useRouter();
    const [kunden, setKunden] = useState([]);
    const [laden, setLaden] = useState(true);
    const [suchbegriff, setSuchbegriff] = useState('');

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
          .from('kunden')
          .select('id, firma, ansprechpartner, ort, status')
          .eq('company_id', member.company_id)
          .order('firma');
        setKunden(data ?? []);
        setLaden(false);
    }

    function statusVariant(status) {
        if (status === 'aktiv') return 'success';
        if (status === 'inaktiv') return 'default';
        return 'default';
    }

    const gefilterteKunden = kunden.filter(function(k) {
        const q = suchbegriff.toLowerCase();
        return (k.firma || '').toLowerCase().includes(q) || (k.ansprechpartner || '').toLowerCase().includes(q) || (k.ort || '').toLowerCase().includes(q);
    });

    return (
        <Page>
          <Page.Header>
            <Page.Title>Kunden</Page.Title>
            <Page.Description>Kundenverwaltung</Page.Description>
          </Page.Header>
          <Page.Content>
            <Card>
              <Card.Content>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <Input placeholder="Kunden durchsuchen..." className="max-w-xs" value={suchbegriff} onChange={function(e) { setSuchbegriff(e.target.value); }} />
                  <Button variant="primary" onClick={function() { router.push('/dashboard/kunden/neu'); }}>Kunde anlegen</Button>
                </div>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.HeaderCell>Firma</Table.HeaderCell>
                      <Table.HeaderCell>Ansprechpartner</Table.HeaderCell>
                      <Table.HeaderCell>Ort</Table.HeaderCell>
                      <Table.HeaderCell>Status</Table.HeaderCell>
                      <Table.HeaderCell>Aktionen</Table.HeaderCell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {laden ? (
                      <Table.Row>
                        <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                          Lädt...
                        </Table.Cell>
                      </Table.Row>
                    ) : gefilterteKunden.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                          {suchbegriff ? 'Keine passenden Kunden gefunden.' : 'Keine Kunden vorhanden.'}
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      gefilterteKunden.map(function(k) {
                        return (
                          <Table.Row key={k.id}>
                            <Table.Cell>{k.firma ?? '-'}</Table.Cell>
                            <Table.Cell>{k.ansprechpartner ?? '-'}</Table.Cell>
                            <Table.Cell>{k.ort ?? '-'}</Table.Cell>
                            <Table.Cell>
                              <Badge variant={statusVariant(k.status)}>{k.status ?? '-'}</Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <Button variant="ghost" size="sm" onClick={function() { router.push('/dashboard/kunden/' + k.id); }}>
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
