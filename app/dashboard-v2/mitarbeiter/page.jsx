'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { ROLE_LABELS } from '@/lib/roles';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

export default function Mitarbeiter() {
  var [laden, setLaden] = useState(true);
  var [mitarbeiter, setMitarbeiter] = useState([]);
  var [suchbegriff, setSuchbegriff] = useState('');

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

        var result = await supabase
          .from('mitarbeiter')
          .select('id, vorname, nachname, rolle, email, telefon, status')
          .eq('company_id', companyId)
          .order('nachname');

        setMitarbeiter(result.data ?? []);
        setLaden(false);
      } catch (err) {
        setLaden(false);
      }
    }
    load();
  }, []);

  function vollname(m) {
    var vorname = m.vorname ?? '';
    var nachname = m.nachname ?? '';
    var name = (vorname + ' ' + nachname).trim();
    return name || '\u2014';
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Mitarbeiter</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Mitarbeiter durchsuchen..."
            className="max-w-xs"
            value={suchbegriff}
            onChange={function(e) { setSuchbegriff(e.target.value); }}
          />
          <Button variant="primary">
            Mitarbeiter anlegen
          </Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Name</Table.HeaderCell>
                  <Table.HeaderCell>Rolle</Table.HeaderCell>
                  <Table.HeaderCell>E-Mail</Table.HeaderCell>
                  <Table.HeaderCell>Telefon</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {laden ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Laedt...
                    </Table.Cell>
                  </Table.Row>
                ) : mitarbeiter.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Keine Mitarbeiter vorhanden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  mitarbeiter.map(function(m) {
                    return (
                      <Table.Row key={m.id}>
                        <Table.Cell className="font-medium text-gray-900">{vollname(m)}</Table.Cell>
                        <Table.Cell>{ROLE_LABELS[m.rolle] || m.rolle || '\u2014'}</Table.Cell>
                        <Table.Cell>{m.email || '\u2014'}</Table.Cell>
                        <Table.Cell>{m.telefon || '\u2014'}</Table.Cell>
                        <Table.Cell>
                          <Badge variant="default">{m.status || '\u2014'}</Badge>
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
