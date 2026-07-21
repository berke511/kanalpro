'use client';

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Badge from '@/components/ui/v2/Badge';

var MA_STATUS_BADGE = {
  im_einsatz: 'info',
  verfuegbar:  'success',
  urlaub:      'warning',
  krank:       'danger',
};

var MA_STATUS_LABEL = {
  im_einsatz: 'Im Einsatz',
  verfuegbar:  'Verfügbar',
  urlaub:      'Urlaub',
  krank:       'Krank',
};

export default function TechnikerPage() {
  var [imEinsatz, setImEinsatz] = useState([]);
  var [imEinsatzLaden, setImEinsatzLaden] = useState(true);
  var [imEinsatzFehler, setImEinsatzFehler] = useState(false);

  var [verfuegbar, setVerfuegbar] = useState([]);
  var [verfuegbarLaden, setVerfuegbarLaden] = useState(true);
  var [verfuegbarFehler, setVerfuegbarFehler] = useState(false);

  useEffect(function() {
    async function laden() {
      try {
        var authResult = await supabase.auth.getUser();
        var user = authResult.data && authResult.data.user;
        if (!user) {
          setImEinsatzLaden(false);
          setVerfuegbarLaden(false);
          return;
        }

        var memberResult = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        var companyId = memberResult.data && memberResult.data.company_id;
        if (!companyId) {
          setImEinsatzLaden(false);
          setVerfuegbarLaden(false);
          return;
        }

        var techResult = await supabase
          .from('mitarbeiter')
          .select('id, vorname, nachname, position, status')
          .eq('company_id', companyId)
          .eq('status', 'im_einsatz')
          .order('nachname', { ascending: true });

        if (techResult.error) {
          setImEinsatzFehler(true);
        } else {
          var techList = techResult.data ?? [];

          if (techList.length > 0) {
            var ids = techList.map(function(t) { return t.id; });
            var aufResult = await supabase
              .from('auftraege')
              .select('id, titel, adresse, uhrzeit, mitarbeiter_id')
              .eq('company_id', companyId)
              .in('mitarbeiter_id', ids)
              .not('status', 'in', '(abgeschlossen,dokumentiert,storniert)');

            var aufMap = {};
            if (!aufResult.error) {
              (aufResult.data ?? []).forEach(function(a) {
                if (!aufMap[a.mitarbeiter_id]) {
                  aufMap[a.mitarbeiter_id] = a;
                }
              });
            }

            techList = techList.map(function(t) {
              return Object.assign({}, t, { auftrag: aufMap[t.id] || null });
            });
          }

          setImEinsatz(techList);
        }
        setImEinsatzLaden(false);

        var verfResult = await supabase
          .from('mitarbeiter')
          .select('id, vorname, nachname, position, status')
          .eq('company_id', companyId)
          .eq('status', 'verfuegbar')
          .order('nachname', { ascending: true });

        if (verfResult.error) {
          setVerfuegbarFehler(true);
        } else {
          setVerfuegbar(verfResult.data ?? []);
        }
        setVerfuegbarLaden(false);

      } catch (err) {
        setImEinsatzFehler(true);
        setImEinsatzLaden(false);
        setVerfuegbarFehler(true);
        setVerfuegbarLaden(false);
      }
    }
    laden();
  }, []);

  var einsatzZahl = imEinsatzLaden ? '...' : String(imEinsatz.length);
  var einsatzVariant = imEinsatzLaden ? 'default' : (imEinsatz.length > 0 ? 'info' : 'default');

  var verfuegbarZahl = verfuegbarLaden ? '...' : String(verfuegbar.length);
  var verfuegbarVariant = verfuegbarLaden ? 'default' : (verfuegbar.length > 0 ? 'success' : 'default');

  return (
    <Page>
      <Page.Header>
        <Page.Title>Techniker</Page.Title>
        <Page.Description>Uebersicht ueber alle Techniker und ihren aktuellen Einsatzstatus.</Page.Description>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Techniker im Einsatz</Card.Title>
                <Badge variant={einsatzVariant}>{einsatzZahl}</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              {imEinsatzLaden ? (
                <p className="text-sm text-gray-400">Laedt...</p>
              ) : imEinsatzFehler ? (
                <p className="text-sm text-red-500">Daten konnten nicht geladen werden.</p>
              ) : imEinsatz.length === 0 ? (
                <p className="text-sm text-gray-500">Aktuell befindet sich kein Techniker im Einsatz.</p>
              ) : (
                <ul className="space-y-3">
                  {imEinsatz.map(function(t) {
                    var name = (t.vorname || '') + ' ' + (t.nachname || '');
                    return (
                      <li key={t.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{name.trim() || '—'}</p>
                          <Badge variant={MA_STATUS_BADGE[t.status] || 'default'}>
                            {MA_STATUS_LABEL[t.status] || t.status || '—'}
                          </Badge>
                        </div>
                        {t.position ? <p className="text-xs text-gray-500 mt-1">{t.position}</p> : null}
                        {t.auftrag ? (
                          <div className="mt-1">
                            <p className="text-xs text-gray-600 font-medium">{t.auftrag.titel || '—'}</p>
                            {t.auftrag.adresse ? <p className="text-xs text-gray-400">{t.auftrag.adresse}</p> : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Heute verfuegbar</Card.Title>
                <Badge variant={verfuegbarVariant}>{verfuegbarZahl}</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              {verfuegbarLaden ? (
                <p className="text-sm text-gray-400">Laedt...</p>
              ) : verfuegbarFehler ? (
                <p className="text-sm text-red-500">Daten konnten nicht geladen werden.</p>
              ) : verfuegbar.length === 0 ? (
                <p className="text-sm text-gray-500">Heute sind keine Techniker verfuegbar.</p>
              ) : (
                <ul className="space-y-3">
                  {verfuegbar.map(function(t) {
                    var name = (t.vorname || '') + ' ' + (t.nachname || '');
                    return (
                      <li key={t.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{name.trim() || '—'}</p>
                          <Badge variant={MA_STATUS_BADGE[t.status] || 'default'}>
                            {MA_STATUS_LABEL[t.status] || t.status || '—'}
                          </Badge>
                        </div>
                        {t.position ? <p className="text-xs text-gray-500 mt-1">{t.position}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Abwesend</Card.Title>
                <Badge variant="warning">0</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Keine Techniker derzeit abwesend.</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Teamuebersicht</Card.Title>
                <Badge variant="default">0</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-gray-500">Kennzahlen werden hier angezeigt.</p>
            </Card.Content>
          </Card>

        </div>
      </Page.Content>
    </Page>
  );
}
