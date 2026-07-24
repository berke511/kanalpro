'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Calendar, Clock, Users, Search } from 'lucide-react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';
import KpiCard from '@/components/ui/v2/KpiCard';

var AUFTRAG_STATUS_LABELS = {
  offen: 'Offen',
  geplant: 'Geplant',
  in_bearbeitung: 'In Bearbeitung',
  abgeschlossen: 'Abgeschlossen',
  abgebrochen: 'Abgebrochen',
  dokumentiert: 'Dokumentiert',
};

var AUFTRAG_STATUS_VARIANTEN = {
  offen: 'default',
  geplant: 'info',
  in_bearbeitung: 'warning',
  abgeschlossen: 'success',
  abgebrochen: 'danger',
  dokumentiert: 'success',
};

var MA_STATUS_LABELS = {
  verfuegbar: 'Verfuegbar',
  im_einsatz: 'Im Einsatz',
  urlaub: 'Urlaub',
  krank: 'Krank',
};

var MA_STATUS_VARIANTEN = {
  verfuegbar: 'success',
  im_einsatz: 'warning',
  urlaub: 'info',
  krank: 'danger',
};

function heuteStr() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var t = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + t;
}

function AuftragListe({ titel, beschreibung, auftraege, anzahl, onKlick, emptyText }) {
  return (
    <Card className="mb-6">
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <Card.Title>{titel}</Card.Title>
            <Card.Description>{beschreibung}</Card.Description>
          </div>
          <Badge variant={anzahl > 0 ? 'warning' : 'default'}>{anzahl}</Badge>
        </div>
      </Card.Header>
      <Card.Content>
        {auftraege.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">{emptyText}</div>
        ) : (
          <div className="space-y-2">
            {auftraege.map(function(a) {
              var kName = a.kunden
                ? (a.kunden.firmenname || a.kunden.name || '—')
                : '—';
              var datStr = a.datum ? a.datum.substring(0, 10) : '';
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 transition-all hover:border-primary-200 hover:bg-primary-50 cursor-pointer"
                  onClick={function() { onKlick(a.id); }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {a.titel || '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {kName}{datStr ? ' · ' + datStr : ''}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                    <Badge variant={AUFTRAG_STATUS_VARIANTEN[a.status] || 'default'}>
                      {AUFTRAG_STATUS_LABELS[a.status] || a.status || '—'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={function(e) { e.stopPropagation(); onKlick(a.id); }}
                    >
                      Zuweisen
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function DispositionInner() {
  var router = useRouter();
  var searchParams = useSearchParams();
  var auftragIdParam = searchParams.get('auftrag_id');

  var [laden, setLaden] = useState(true);
  var [fehler, setFehler] = useState(null);
  var [auftraege, setAuftraege] = useState([]);
  var [mitarbeiter, setMitarbeiter] = useState([]);
  var [suchbegriff, setSuchbegriff] = useState('');
  var [suchDebounce, setSuchDebounce] = useState('');
  var [aktFilter, setAktFilter] = useState('alle');

  useEffect(function() {
    var timer = setTimeout(function() { setSuchDebounce(suchbegriff); }, 300);
    return function() { clearTimeout(timer); };
  }, [suchbegriff]);

  useEffect(function() {
    if (auftragIdParam) {
      router.push('/dashboard-v2/disposition/' + auftragIdParam);
    }
  }, [auftragIdParam, router]);

  useEffect(function() {
    var alive = true;
    async function load() {
      try {
        var authRes = await supabase.auth.getUser();
        var user = authRes.data && authRes.data.user;
        if (!user) { if (alive) setLaden(false); return; }

        var memberRes = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        var companyId = memberRes.data && memberRes.data.company_id;
        if (!companyId) { if (alive) setLaden(false); return; }

        var auftraegeRes = await supabase
          .from('auftraege')
          .select('id, titel, datum, status, kunden(name, firmenname), verantw_mitarbeiter:verantw_mitarbeiter_id(vorname, nachname)')
          .eq('company_id', companyId)
          .order('datum', { ascending: true, nullsFirst: true });

        var maRes = await supabase
          .from('mitarbeiter')
          .select('id, vorname, nachname, status')
          .eq('company_id', companyId)
          .order('nachname');

        if (alive) {
          setAuftraege(auftraegeRes.data ?? []);
          setMitarbeiter(maRes.data ?? []);
          setLaden(false);
        }
      } catch (err) {
        if (alive) { setFehler('Fehler beim Laden.'); setLaden(false); }
      }
    }
    load();
    return function() { alive = false; };
  }, []);

  function auftragKlick(id) {
    router.push('/dashboard-v2/disposition/' + id);
  }

  var heute = heuteStr();
  var q = suchDebounce.toLowerCase();

  function filterListe(list) {
    if (!q) return list;
    return list.filter(function(a) {
      var t = (a.titel || '').toLowerCase();
      var kn = a.kunden
        ? ((a.kunden.firmenname || a.kunden.name || '').toLowerCase())
        : '';
      return t.includes(q) || kn.includes(q);
    });
  }

  var ungeplante = filterListe(auftraege.filter(function(a) {
    return a.status === 'offen';
  }));

  var heutGeplante = filterListe(auftraege.filter(function(a) {
    if (!a.datum) return false;
    return a.datum.startsWith(heute);
  }));

  var inBearbeitung = filterListe(auftraege.filter(function(a) {
    return a.status === 'in_bearbeitung' || a.status === 'geplant';
  }));

  var nichtVerfuegbar = mitarbeiter.filter(function(m) {
    return m.status !== 'verfuegbar';
  });

  var showUngeplant = aktFilter === 'alle' || aktFilter === 'ungeplant';
  var showHeute = aktFilter === 'alle' || aktFilter === 'heute';
  var showBearbeitung = aktFilter === 'alle' || aktFilter === 'in_bearbeitung';
  var showRessourcen = aktFilter === 'alle' || aktFilter === 'ressourcen';

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Disposition</Page.Title></Page.Header>
        <Page.Content>
          <div className="py-20 text-center text-sm text-gray-400">Laedt...</div>
        </Page.Content>
      </Page>
    );
  }

  if (fehler) {
    return (
      <Page>
        <Page.Header><Page.Title>Disposition</Page.Title></Page.Header>
        <Page.Content>
          <div className="py-20 text-center text-sm text-red-500">{fehler}</div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Disposition</Page.Title>
      </Page.Header>
      <Page.Content>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            title="Ungeplant"
            value={ungeplante.length}
            icon={AlertCircle}
            iconColor="text-warning-600"
            iconBg="bg-warning-50"
            onClick={function() { setAktFilter(aktFilter === 'ungeplant' ? 'alle' : 'ungeplant'); }}
          />
          <KpiCard
            title="Heute geplant"
            value={heutGeplante.length}
            icon={Calendar}
            iconColor="text-primary-600"
            iconBg="bg-primary-50"
            onClick={function() { setAktFilter(aktFilter === 'heute' ? 'alle' : 'heute'); }}
          />
          <KpiCard
            title="In Bearbeitung"
            value={inBearbeitung.length}
            icon={Clock}
            iconColor="text-info-600"
            iconBg="bg-info-50"
            onClick={function() { setAktFilter(aktFilter === 'in_bearbeitung' ? 'alle' : 'in_bearbeitung'); }}
          />
          <KpiCard
            title="Nicht verfuegbar"
            value={nichtVerfuegbar.length}
            icon={Users}
            iconColor="text-danger-600"
            iconBg="bg-danger-50"
            onClick={function() { setAktFilter(aktFilter === 'ressourcen' ? 'alle' : 'ressourcen'); }}
          />
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
            <Input
              placeholder="Auftraege durchsuchen..."
              className="pl-9"
              value={suchbegriff}
              onChange={function(e) { setSuchbegriff(e.target.value); }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              {key: 'alle', label: 'Alle'},
              {key: 'ungeplant', label: 'Ungeplant'},
              {key: 'heute', label: 'Heute'},
              {key: 'in_bearbeitung', label: 'In Bearbeitung'},
              {key: 'ressourcen', label: 'Ressourcen'},
            ].map(function(f) {
              return (
                <Button
                  key={f.key}
                  variant={aktFilter === f.key ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={function() { setAktFilter(f.key); }}
                >
                  {f.label}
                </Button>
              );
            })}
          </div>
        </div>

        {showUngeplant && (
          <AuftragListe
            titel="Ungeplante Auftraege"
            beschreibung="Auftraege ohne Dispositionsplan"
            auftraege={ungeplante}
            anzahl={ungeplante.length}
            onKlick={auftragKlick}
            emptyText="Alle Auftraege sind eingeplant."
          />
        )}

        {showHeute && (
          <AuftragListe
            titel={'Heute geplant (' + heute + ')'}
            beschreibung="Auftraege mit heutigem Einsatzdatum"
            auftraege={heutGeplante}
            anzahl={heutGeplante.length}
            onKlick={auftragKlick}
            emptyText="Keine Auftraege fuer heute geplant."
          />
        )}

        {showBearbeitung && (
          <AuftragListe
            titel="In Bearbeitung"
            beschreibung="Laufende und geplante Auftraege"
            auftraege={inBearbeitung}
            anzahl={inBearbeitung.length}
            onKlick={auftragKlick}
            emptyText="Keine laufenden Auftraege."
          />
        )}

        {showRessourcen && (
          <Card className="mb-6">
            <Card.Header>
              <div className="flex items-center justify-between">
                <div>
                  <Card.Title>Nicht verfuegbare Ressourcen</Card.Title>
                  <Card.Description>Mitarbeiter die aktuell nicht disponierbar sind</Card.Description>
                </div>
                <Badge variant={nichtVerfuegbar.length > 0 ? 'danger' : 'success'}>
                  {nichtVerfuegbar.length}
                </Badge>
              </div>
            </Card.Header>
            <Card.Content>
              {nichtVerfuegbar.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  Alle Mitarbeiter sind verfuegbar.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nichtVerfuegbar.map(function(m) {
                    var name = ((m.vorname || '') + ' ' + (m.nachname || '')).trim() || '—';
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm"
                      >
                        <span className="text-sm font-medium text-gray-900">{name}</span>
                        <Badge variant={MA_STATUS_VARIANTEN[m.status] || 'default'}>
                          {MA_STATUS_LABELS[m.status] || m.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Content>
          </Card>
        )}

      </Page.Content>
    </Page>
  );
}

export default function DispositionPage() {
  return (
    <Suspense>
      <DispositionInner />
    </Suspense>
  );
}
