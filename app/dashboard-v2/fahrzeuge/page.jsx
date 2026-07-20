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

var ZUSTAND_VARIANT = {
  aktiv:          'success',
  wartung:        'warning',
  reserviert:     'info',
  ausser_betrieb: 'danger',
};

var ZUSTAND_LABEL = {
  aktiv:          'Aktiv',
  wartung:        'Wartung',
  reserviert:     'Reserviert',
  ausser_betrieb: 'Ausser Betrieb',
};

export default function Fahrzeuge() {
  const router = useRouter();
  const [laden, setLaden] = useState(true);
  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [suchbegriff, setSuchbegriff] = useState('');

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
          .from('fahrzeuge')
          .select('id, kennzeichen, marke, modell, typ, zustand')
          .eq('company_id', companyId)
          .order('kennzeichen');

        setFahrzeuge(result.data ?? []);
        setLaden(false);
      } catch (err) {
        setLaden(false);
      }
    }
    load();
  }, []);

  function fahrzeugName(f) {
    var marke = f.marke ?? '';
    var modell = f.modell ?? '';
    var name = (marke + ' ' + modell).trim();
    return name || '—';
  }

  var q = suchbegriff.toLowerCase();
  var gefilterteFahrzeuge = q
    ? fahrzeuge.filter(function(f) {
        var kennzeichen = (f.kennzeichen ?? '').toLowerCase();
        var name = fahrzeugName(f).toLowerCase();
        var fahrer = '';
        var status = (ZUSTAND_LABEL[f.zustand] ?? f.zustand ?? '').toLowerCase();
        return kennzeichen.includes(q) || name.includes(q) || fahrer.includes(q) || status.includes(q);
      })
    : fahrzeuge;

  return (
    <Page>
      <Page.Header>
        <Page.Title>Fahrzeuge</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Fahrzeuge durchsuchen..."
            className="max-w-xs"
            value={suchbegriff}
            onChange={function(e) { setSuchbegriff(e.target.value); }}
          />
          <Button variant="primary" onClick={function() { router.push('/dashboard/fahrzeuge'); }}>
            Fahrzeug anlegen
          </Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Kennzeichen</Table.HeaderCell>
                  <Table.HeaderCell>Fahrzeug</Table.HeaderCell>
                  <Table.HeaderCell>Fahrer</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
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
                ) : fahrzeuge.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Keine Fahrzeuge vorhanden.
                    </Table.Cell>
                  </Table.Row>
                ) : gefilterteFahrzeuge.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Keine passenden Fahrzeuge gefunden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  gefilterteFahrzeuge.map(function(f) {
                    return (
                      <Table.Row key={f.id}>
                        <Table.Cell className="font-medium text-gray-900">{f.kennzeichen || '—'}</Table.Cell>
                        <Table.Cell>{fahrzeugName(f)}</Table.Cell>
                        <Table.Cell>—</Table.Cell>
                        <Table.Cell>
                          <Badge variant={ZUSTAND_VARIANT[f.zustand] || 'default'}>
                            {ZUSTAND_LABEL[f.zustand] || f.zustand || '—'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={function() { router.push('/dashboard/fahrzeuge/' + f.id); }}
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
