'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import supabase from '@/lib/supabase';
import { ROLE_LABELS } from '@/lib/roles';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

var STATUS_LABELS = {
  verfuegbar: 'Verfügbar',
  im_einsatz: 'Im Einsatz',
  urlaub: 'Urlaub',
  krank: 'Krank'
};
var STATUS_VARIANTEN = {
  verfuegbar: 'success',
  im_einsatz: 'warning',
  urlaub: 'info',
  krank: 'danger'
};

export default function Mitarbeiter() {
  var router = useRouter();
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
    return name || '—';
  }

  var q = suchbegriff.toLowerCase();
  var gefilterteMitarbeiter = q
    ? mitarbeiter.filter(function(m) {
        var vorname = (m.vorname ?? '').toLowerCase();
        var nachname = (m.nachname ?? '').toLowerCase();
        var name = (vorname + ' ' + nachname).trim();
        var rolle = (m.rolle ?? '').toLowerCase();
        var rolleLabel = (ROLE_LABELS[m.rolle] ?? '').toLowerCase();
        var email = (m.email ?? '').toLowerCase();
        var telefon = (m.telefon ?? '').toLowerCase();
        var status = (m.status ?? '').toLowerCase();
        return vorname.includes(q) || nachname.includes(q) || name.includes(q) ||
          rolle.includes(q) || rolleLabel.includes(q) ||
          email.includes(q) || telefon.includes(q) || status.includes(q);
      })
    : mitarbeiter;

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
          <Button variant="primary" onClick={function() { router.push('/dashboard-v2/mitarbeiter/neu'); }}>
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
                ) : gefilterteMitarbeiter.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Keine passenden Mitarbeiter gefunden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  gefilterteMitarbeiter.map(function(m) {
                    return (
                      <Table.Row key={m.id}>
                        <Table.Cell className="font-medium text-gray-900">{vollname(m)}</Table.Cell>
                        <Table.Cell>{ROLE_LABELS[m.rolle] || m.rolle || '—'}</Table.Cell>
                        <Table.Cell>{m.email || '—'}</Table.Cell>
                        <Table.Cell>{m.telefon || '—'}</Table.Cell>
                        <Table.Cell>
                          <Badge variant={STATUS_VARIANTEN[m.status] || 'default'}>
                            {STATUS_LABELS[m.status] || m.status || '—'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={function() { router.push('/dashboard-v2/mitarbeiter/' + m.id); }}
                          >
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
