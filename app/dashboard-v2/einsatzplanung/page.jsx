'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Table from '@/components/ui/v2/Table';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';

var datumFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

function fmtDatum(str) {
  if (!str) return '—';
  try { return datumFormat.format(new Date(str)); }
  catch (e) { return str; }
}

export default function Einsatzplanung() {
  var [einsaetze, setEinsaetze] = useState([]);
  var [laden, setLaden] = useState(true);

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
          .from('auftraege')
          .select('id, titel, datum, uhrzeit, status, kunden(name, firmenname), verantw_mitarbeiter:verantw_mitarbeiter_id(vorname, nachname)')
          .eq('company_id', companyId)
          .order('datum', { ascending: true });

        setEinsaetze(result.data ?? []);
        setLaden(false);
      } catch (err) {
        setLaden(false);
      }
    }
    load();
  }, []);

  function kundeName(e) {
    if (!e.kunden) return '—';
    return e.kunden.firmenname || e.kunden.name || '—';
  }

  function technikerName(e) {
    if (!e.verantw_mitarbeiter) return '—';
    var v = e.verantw_mitarbeiter.vorname || '';
    var n = e.verantw_mitarbeiter.nachname || '';
    return (v + ' ' + n).trim() || '—';
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Einsatzplanung</Page.Title>
      </Page.Header>
      <Page.Content>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Einsaetze durchsuchen..."
            className="max-w-xs"
          />
          <Button variant="primary">Einsatz planen</Button>
        </div>
        <Card>
          <Card.Content>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Auftrag</Table.HeaderCell>
                  <Table.HeaderCell>Kunde</Table.HeaderCell>
                  <Table.HeaderCell>Datum</Table.HeaderCell>
                  <Table.HeaderCell>Uhrzeit</Table.HeaderCell>
                  <Table.HeaderCell>Techniker</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Aktionen</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {laden ? (
                  <Table.Row>
                    <Table.Cell colSpan={7} className="py-8 text-center text-sm text-gray-400">
                      Laedt...
                    </Table.Cell>
                  </Table.Row>
                ) : einsaetze.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={7} className="py-8 text-center text-sm text-gray-400">
                      Keine Einsaetze vorhanden.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  einsaetze.map(function(e) {
                    return (
                      <Table.Row key={e.id}>
                        <Table.Cell className="font-medium text-gray-900">{e.titel || '—'}</Table.Cell>
                        <Table.Cell>{kundeName(e)}</Table.Cell>
                        <Table.Cell>{fmtDatum(e.datum)}</Table.Cell>
                        <Table.Cell>{e.uhrzeit || '—'}</Table.Cell>
                        <Table.Cell>{technikerName(e)}</Table.Cell>
                        <Table.Cell>
                          <Badge variant="default">{e.status || '—'}</Badge>
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
