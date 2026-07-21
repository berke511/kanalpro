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
    var router = useRouter();
    var [kunden, setKunden] = useState([]);
    var [laden, setLaden] = useState(true);
    var [suchbegriff, setSuchbegriff] = useState('');

    useEffect(function() { load(); }, []);

    async function load() {
        var authResult = await supabase.auth.getUser();
        var user = authResult.data.user;
        if (!user) { setLaden(false); return; }
        var memberResult = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        var member = memberResult.data;
        if (!member) { setLaden(false); return; }
        var kundenResult = await supabase
          .from('kunden')
          .select('id, name, firma, firmenname, kundentyp, adresse')
          .eq('company_id', member.company_id)
          .order('name');
        setKunden(kundenResult.data ?? []);
        setLaden(false);
    }

    function firmaAnzeige(k) {
        if (k.kundentyp === 'firma') return k.firma || k.firmenname || k.name || '-';
        return k.name || '-';
    }

    function ansprechpartnerAnzeige(k) {
        if (k.kundentyp === 'firma') return k.name || '-';
        return '-';
    }

    function typVariant(typ) {
        if (typ === 'firma') return 'info';
        return 'default';
    }

    var gefilterteKunden = kunden.filter(function(k) {
        var q = suchbegriff.toLowerCase();
        return (k.name || '').toLowerCase().includes(q)
          || (k.firma || '').toLowerCase().includes(q)
          || (k.firmenname || '').toLowerCase().includes(q)
          || (k.adresse || '').toLowerCase().includes(q);
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
                  <Input
                    placeholder="Kunden durchsuchen..."
                    className="max-w-xs"
                    value={suchbegriff}
                    onChange={function(e) { setSuchbegriff(e.target.value); }}
                  />
                  <Button variant="primary" onClick={function() { router.push('/dashboard-v2/kunden/neu'); }}>
                    Kunde anlegen
                  </Button>
                </div>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.HeaderCell>Firma / Name</Table.HeaderCell>
                      <Table.HeaderCell>Ansprechpartner</Table.HeaderCell>
                      <Table.HeaderCell>Typ</Table.HeaderCell>
                      <Table.HeaderCell>Aktionen</Table.HeaderCell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {laden ? (
                      <Table.Row>
                        <Table.Cell colSpan={4} className="py-8 text-center text-sm text-gray-400">
                          Lädt...
                        </Table.Cell>
                      </Table.Row>
                    ) : gefilterteKunden.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={4} className="py-8 text-center text-sm text-gray-400">
                          {suchbegriff ? 'Keine passenden Kunden gefunden.' : 'Keine Kunden vorhanden.'}
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      gefilterteKunden.map(function(k) {
                        return (
                          <Table.Row key={k.id}>
                            <Table.Cell className="font-medium">{firmaAnzeige(k)}</Table.Cell>
                            <Table.Cell>{ansprechpartnerAnzeige(k)}</Table.Cell>
                            <Table.Cell>
                              <Badge variant={typVariant(k.kundentyp)}>
                                {k.kundentyp === 'firma' ? 'Firma' : 'Privat'}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <Button variant="ghost" size="sm" onClick={function() { router.push('/dashboard-v2/kunden/' + k.id); }}>
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
