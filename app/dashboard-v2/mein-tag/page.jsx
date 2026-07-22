'use client';

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { getNotifications } from '@/lib/notificationEngine';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Badge from '@/components/ui/v2/Badge';

var STATUS_VARIANT = {
  offen:           'warning',
  in_bearbeitung:  'info',
  neu:             'info',
  geplant:         'warning',
  zugewiesen:      'info',
  unterwegs:       'warning',
  vor_ort:         'info',
  in_arbeit:       'warning',
  wartend:         'default',
  abgeschlossen:   'success',
  dokumentiert:    'success',
  storniert:       'danger',
};

var STATUS_LABEL = {
  offen:           'Offen',
  in_bearbeitung:  'In Bearbeitung',
  neu:             'Neu',
  geplant:         'Geplant',
  zugewiesen:      'Zugewiesen',
  unterwegs:       'Unterwegs',
  vor_ort:         'Vor Ort',
  in_arbeit:       'In Arbeit',
  wartend:         'Wartend',
  abgeschlossen:   'Abgeschlossen',
  dokumentiert:    'Dokumentiert',
  storniert:       'Storniert',
};

var PRIO_ORDER = { critical: 0, warning: 1, info: 2, success: 3 };
var PRIO_BADGE = { critical: 'danger', warning: 'warning', info: 'info', success: 'success' };
var PRIO_LABEL = { critical: 'Kritisch', warning: 'Warnung', info: 'Info', success: 'OK' };

function heuteISO() {
  var d = new Date();
  var y = d.getFullYear().toString();
  var mo = (d.getMonth() + 1).toString().padStart(2, '0');
  var t = d.getDate().toString().padStart(2, '0');
  return y + '-' + mo + '-' + t;
}

function fmtUhrzeit(str) {
  if (!str) return '';
  return str.substring(0, 5);
}

function fmtDatum(str) {
  if (!str) return '';
  var parts = str.split('-');
  if (parts.length < 3) return str;
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function fmtTimestamp(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE');
}

function kundeName(a) {
  if (!a.kunden) return '';
  return a.kunden.firmenname || a.kunden.name || '';
}

export default function MeinTagPage() {
  const heute = new Date();
  const datumText = heute.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [auftraege, setAuftraege] = useState([]);
  const [auftraegeLaden, setAuftraegeLaden] = useState(true);
  const [auftraegeFehler, setAuftraegeFehler] = useState(false);

  const [geplant, setGeplant] = useState([]);
  const [geplantLaden, setGeplantLaden] = useState(true);
  const [geplantFehler, setGeplantFehler] = useState(false);

  const [offeneAufgaben, setOffeneAufgaben] = useState([]);
  const [offeneAufgabenLaden, setOffeneAufgabenLaden] = useState(true);
  const [offeneAufgabenFehler, setOffeneAufgabenFehler] = useState(false);

  const [hinweise, setHinweise] = useState([]);
  const [hinweiseLaden, setHinweiseLaden] = useState(true);
  const [hinweiseFehler, setHinweiseFehler] = useState(false);

  useEffect(function() {
    async function laden() {
      try {
        var authResult = await supabase.auth.getUser();
        var user = authResult.data && authResult.data.user;
        if (!user) {
          setAuftraegeLaden(false);
          setGeplantLaden(false);
          setOffeneAufgabenLaden(false);
          setHinweiseLaden(false);
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
          setAuftraegeLaden(false);
          setGeplantLaden(false);
          setOffeneAufgabenLaden(false);
          setHinweiseLaden(false);
          return;
        }

        var tagDatum = heuteISO();

        var result1 = await supabase
          .from('auftraege')
          .select('id, titel, uhrzeit, status, adresse, kunden(name, firmenname)')
          .eq('company_id', companyId)
          .eq('user_id', user.id)
          .eq('datum', tagDatum)
          .order('uhrzeit', { ascending: true, nullsFirst: false });

        if (result1.error) {
          setAuftraegeFehler(true);
        } else {
          setAuftraege(result1.data ?? []);
        }
        setAuftraegeLaden(false);

        var result2 = await supabase
          .from('auftraege')
          .select('id, titel, uhrzeit, status, adresse, kunden(name, firmenname)')
          .eq('company_id', companyId)
          .eq('datum', tagDatum)
          .neq('status', 'storniert')
          .order('uhrzeit', { ascending: true, nullsFirst: false });

        if (result2.error) {
          setGeplantFehler(true);
        } else {
          setGeplant(result2.data ?? []);
        }
        setGeplantLaden(false);

        var result3 = await supabase
          .from('auftraege')
          .select('id, titel, datum, status, kunden(name, firmenname)')
          .eq('company_id', companyId)
          .eq('user_id', user.id)
          .not('status', 'in', '(abgeschlossen,dokumentiert,storniert)')
          .order('datum', { ascending: true, nullsFirst: false });

        if (result3.error) {
          setOffeneAufgabenFehler(true);
        } else {
          setOffeneAufgaben(result3.data ?? []);
        }
        setOffeneAufgabenLaden(false);

        var hinweiseRaw = await getNotifications(supabase, companyId, { limit: 10 });
        var hinweiseSortiert = hinweiseRaw.slice().sort(function(a, b) {
          var pa = PRIO_ORDER[a.priority] !== undefined ? PRIO_ORDER[a.priority] : 99;
          var pb = PRIO_ORDER[b.priority] !== undefined ? PRIO_ORDER[b.priority] : 99;
          if (pa !== pb) return pa - pb;
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        setHinweise(hinweiseSortiert);
        setHinweiseLaden(false);

      } catch (err) {
        setAuftraegeFehler(true);
        setAuftraegeLaden(false);
        setGeplantFehler(true);
        setGeplantLaden(false);
        setOffeneAufgabenFehler(true);
        setOffeneAufgabenLaden(false);
        setHinweiseFehler(true);
        setHinweiseLaden(false);
      }
    }
    laden();
  }, []);

  var badgeZahl = auftraegeLaden ? '...' : String(auftraege.length);
  var badgeVariant = auftraegeLaden ? 'default' : 'info';

  var geplantZahl = geplantLaden ? '...' : String(geplant.length);
  var geplantVariant = geplantLaden ? 'default' : 'info';

  var offeneZahl = offeneAufgabenLaden ? '...' : String(offeneAufgaben.length);
  var offeneVariant = offeneAufgabenLaden ? 'default' : (offeneAufgaben.length > 0 ? 'warning' : 'default');

  var hinweiseZahl = hinweiseLaden ? '...' : String(hinweise.length);
  var hasCritical = hinweise.some(function(n) { return n.priority === 'critical'; });
  var hasWarning = hinweise.some(function(n) { return n.priority === 'warning'; });
  var hinweiseVariant = hinweiseLaden ? 'default' : (hasCritical ? 'danger' : (hasWarning ? 'warning' : (hinweise.length > 0 ? 'info' : 'default')));

  return (
    <Page>
      <Page.Header>
        <Page.Title>Guten Tag!</Page.Title>
        <Page.Description>{datumText}</Page.Description>
      </Page.Header>
      <Page.Content>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Meine heutigen Auftraege</Card.Title>
                <Badge variant={badgeVariant}>{badgeZahl}</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              {auftraegeLaden ? (
                <p className="text-sm text-gray-400">Laedt...</p>
              ) : auftraegeFehler ? (
                <p className="text-sm text-red-500">Auftraege konnten nicht geladen werden.</p>
              ) : auftraege.length === 0 ? (
                <p className="text-sm text-gray-500">Fuer heute sind keine Auftraege eingeplant.</p>
              ) : (
                <ul className="space-y-3">
                  {auftraege.map(function(a) {
                    var kn = kundeName(a);
                    var uz = fmtUhrzeit(a.uhrzeit);
                    return (
                      <li key={a.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{a.titel || 'â'}</p>
                          <Badge variant={STATUS_VARIANT[a.status] || 'default'}>
                            {STATUS_LABEL[a.status] || a.status || 'â'}
                          </Badge>
                        </div>
                        {kn ? <p className="text-xs text-gray-500 mt-1">{kn}</p> : null}
                        <div className="flex items-center gap-3 mt-1">
                          {uz ? <span className="text-xs text-gray-400">{uz} Uhr</span> : null}
                          {a.adresse ? <span className="text-xs text-gray-400 truncate">{a.adresse}</span> : null}
                        </div>
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
                <Card.Title>Heute geplant</Card.Title>
                <Badge variant={geplantVariant}>{geplantZahl}</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              {geplantLaden ? (
                <p className="text-sm text-gray-400">Laedt...</p>
              ) : geplantFehler ? (
                <p className="text-sm text-red-500">Termine konnten nicht geladen werden.</p>
              ) : geplant.length === 0 ? (
                <p className="text-sm text-gray-500">Fuer heute sind keine weiteren Termine geplant.</p>
              ) : (
                <ul className="space-y-3">
                  {geplant.map(function(a) {
                    var kn = kundeName(a);
                    var uz = fmtUhrzeit(a.uhrzeit);
                    return (
                      <li key={a.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{a.titel || 'â'}</p>
                          <Badge variant={STATUS_VARIANT[a.status] || 'default'}>
                            {STATUS_LABEL[a.status] || a.status || 'â'}
                          </Badge>
                        </div>
                        {kn ? <p className="text-xs text-gray-500 mt-1">{kn}</p> : null}
                        <div className="flex items-center gap-3 mt-1">
                          {uz ? <span className="text-xs text-gray-400">{uz} Uhr</span> : null}
                          {a.adresse ? <span className="text-xs text-gray-400 truncate">{a.adresse}</span> : null}
                        </div>
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
                <Card.Title>Offene Aufgaben</Card.Title>
                <Badge variant={offeneVariant}>{offeneZahl}</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              {offeneAufgabenLaden ? (
                <p className="text-sm text-gray-400">Laedt...</p>
              ) : offeneAufgabenFehler ? (
                <p className="text-sm text-red-500">Aufgaben konnten nicht geladen werden.</p>
              ) : offeneAufgaben.length === 0 ? (
                <p className="text-sm text-gray-500">Zurzeit sind keine offenen Aufgaben vorhanden.</p>
              ) : (
                <ul className="space-y-3">
                  {offeneAufgaben.map(function(a) {
                    var kn = kundeName(a);
                    var dt = fmtDatum(a.datum);
                    return (
                      <li key={a.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{a.titel || 'â'}</p>
                          <Badge variant={STATUS_VARIANT[a.status] || 'default'}>
                            {STATUS_LABEL[a.status] || a.status || 'â'}
                          </Badge>
                        </div>
                        {kn ? <p className="text-xs text-gray-500 mt-1">{kn}</p> : null}
                        {dt ? <p className="text-xs text-gray-400 mt-1">{dt}</p> : null}
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
                <Card.Title>Hinweise</Card.Title>
                <Badge variant={hinweiseVariant}>{hinweiseZahl}</Badge>
              </div>
            </Card.Header>
            <Card.Content>
              {hinweiseLaden ? (
                <p className="text-sm text-gray-400">Laedt...</p>
              ) : hinweiseFehler ? (
                <p className="text-sm text-red-500">Hinweise konnten nicht geladen werden.</p>
              ) : hinweise.length === 0 ? (
                <p className="text-sm text-gray-500">Aktuell liegen keine wichtigen Hinweise vor.</p>
              ) : (
                <ul className="space-y-3">
                  {hinweise.map(function(h) {
                    var dt = fmtTimestamp(h.timestamp);
                    return (
                      <li key={h.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{h.title || 'â'}</p>
                          <Badge variant={PRIO_BADGE[h.priority] || 'default'}>
                            {PRIO_LABEL[h.priority] || h.priority || 'â'}
                          </Badge>
                        </div>
                        {h.message ? <p className="text-xs text-gray-500 mt-1">{h.message}</p> : null}
                        {dt ? <p className="text-xs text-gray-400 mt-1">{dt}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Content>
          </Card>

        </div>
      </Page.Content>
    </Page>
  );
}
