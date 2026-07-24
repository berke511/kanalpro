'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, CheckCircle, Search, MapPin, User } from 'lucide-react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';
import KpiCard from '@/components/ui/v2/KpiCard';
import EmptyState from '@/components/ui/v2/EmptyState';

var STATUS_LABELS = {
  offen: 'Offen',
  geplant: 'Geplant',
  unterwegs: 'Unterwegs',
  vor_ort: 'Vor Ort',
  in_bearbeitung: 'In Bearbeitung',
  abgeschlossen: 'Abgeschlossen',
  abgebrochen: 'Abgebrochen',
};

var STATUS_VARIANTEN = {
  offen: 'default',
  geplant: 'info',
  unterwegs: 'warning',
  vor_ort: 'warning',
  in_bearbeitung: 'warning',
  abgeschlossen: 'success',
  abgebrochen: 'danger',
};

function heuteStr() {
  var d = new Date();
  var y = String(d.getFullYear());
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var t = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + t;
}

function datumFormatieren(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return iso;
  }
}

function AuftragKarte(props) {
  var auftrag = props.auftrag;
  var onClick = props.onClick;
  var kundeAnzeige = auftrag.kunden
    ? (auftrag.kunden.firmenname || auftrag.kunden.name || '—')
    : '—';
  var statusLabel = STATUS_LABELS[auftrag.status] || auftrag.status || '—';
  var statusVariant = STATUS_VARIANTEN[auftrag.status] || 'default';

  return (
    <div
      onClick={onClick}
      className="flex items-start justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer active:bg-gray-50"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{auftrag.titel || '—'}</p>
        {kundeAnzeige !== '—' && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <User size={11} />
            {kundeAnzeige}
          </p>
        )}
        {auftrag.adresse && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 truncate">
            <MapPin size={11} />
            {auftrag.adresse}
          </p>
        )}
        {auftrag.datum && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
            <Calendar size={11} />
            {datumFormatieren(auftrag.datum)}
          </p>
        )}
      </div>
      <div className="ml-3 flex-shrink-0">
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>
    </div>
  );
}

function Sektion(props) {
  var titel = props.titel;
  var auftraege = props.auftraege;
  var IconKomponente = props.icon;
  var emptyText = props.emptyText;
  var onKlick = props.onKlick;
  var laden = props.laden;

  if (laden) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <Card.Title>{titel}</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="animate-pulse space-y-3">
            <div className="h-16 rounded-lg bg-gray-100" />
            <div className="h-16 rounded-lg bg-gray-100" />
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {IconKomponente && <IconKomponente size={16} className="text-gray-500" />}
            <Card.Title>{titel}</Card.Title>
          </div>
          <Badge variant={auftraege.length > 0 ? 'default' : 'default'}>{auftraege.length}</Badge>
        </div>
      </Card.Header>
      <Card.Content>
        {auftraege.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {auftraege.map(function(a) {
              return (
                <AuftragKarte
                  key={a.id}
                  auftrag={a}
                  onClick={function() { onKlick(a.id); }}
                />
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

export default function TechnikerEinsaetze() {
  var router = useRouter();
  var [laden, setLaden] = useState(true);
  var [fehler, setFehler] = useState(null);
  var [auftraege, setAuftraege] = useState([]);
  var [suchbegriff, setSuchbegriff] = useState('');
  var [suchDebounce, setSuchDebounce] = useState('');
  var [aktFilter, setAktFilter] = useState('alle');
  var [ohneProfilHinweis, setOhneProfilHinweis] = useState(false);

  useEffect(function() {
    var timer = setTimeout(function() {
      setSuchDebounce(suchbegriff);
    }, 300);
    return function() { clearTimeout(timer); };
  }, [suchbegriff]);

  useEffect(function() {
    var alive = true;

    async function laden() {
      try {
        var authRes = await supabase.auth.getUser();
        var user = authRes.data && authRes.data.user;
        if (!user) {
          if (alive) { setFehler('Nicht angemeldet.'); setLaden(false); }
          return;
        }

        var memberRes = await supabase
          .from('company_members')
          .select('company_id, email')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        var cId = memberRes.data && memberRes.data.company_id;
        if (!cId) {
          if (alive) { setFehler('Keine Firma gefunden.'); setLaden(false); }
          return;
        }

        var userEmail = (memberRes.data && memberRes.data.email) || user.email;

        var maRes = await supabase
          .from('mitarbeiter')
          .select('id')
          .eq('company_id', cId)
          .eq('email', userEmail)
          .maybeSingle();

        var auftragIds = null;

        if (maRes.data) {
          var amRes = await supabase
            .from('auftrag_mitarbeiter')
            .select('auftrag_id')
            .eq('mitarbeiter_id', maRes.data.id);

          if (!amRes.error && amRes.data && amRes.data.length > 0) {
            auftragIds = amRes.data.map(function(r) { return r.auftrag_id; });
          } else if (!amRes.error) {
            if (alive) { setAuftraege([]); setLaden(false); }
            return;
          }
        } else {
          if (alive) setOhneProfilHinweis(true);
        }

        var query = supabase
          .from('auftraege')
          .select('id, titel, datum, status, adresse, kunden(name, firmenname)')
          .eq('company_id', cId)
          .order('datum', { ascending: true });

        if (auftragIds !== null) {
          query = query.in('id', auftragIds);
        }

        var aufRes = await query;

        if (alive) {
          setAuftraege(aufRes.data || []);
          setLaden(false);
        }
      } catch (err) {
        if (alive) { setFehler('Fehler beim Laden.'); setLaden(false); }
      }
    }

    laden();
    return function() { alive = false; };
  }, []);

  function auftragKlich(id) {
    router.push('/dashboard-v2/techniker/' + id);
  }

  var heute = heuteStr();
  var q = suchDebounce.toLowerCase();

  function filterListe(list) {
    if (!q) return list;
    return list.filter(function(a) {
      var titel = (a.titel || '').toLowerCase();
      var kunde = a.kunden
        ? ((a.kunden.firmenname || a.kunden.name || '').toLowerCase())
        : '';
      var adresse = (a.adresse || '').toLowerCase();
      return titel.includes(q) || kunde.includes(q) || adresse.includes(q);
    });
  }

  var heuteAuftraege = filterListe(auftraege.filter(function(a) {
    return a.datum && a.datum.startsWith(heute);
  }));

  var offeneAuftraege = filterListe(auftraege.filter(function(a) {
    return a.status === 'geplant' || a.status === 'unterwegs' ||
      a.status === 'vor_ort' || a.status === 'in_bearbeitung' || a.status === 'offen';
  }));

  var abgeschlosseneAuftraege = filterListe(auftraege.filter(function(a) {
    return a.status === 'abgeschlossen';
  }));

  var FILTER_BUTTONS = [
    { key: 'alle', label: 'Alle' },
    { key: 'heute', label: 'Heute' },
    { key: 'offen', label: 'Offen' },
    { key: 'abgeschlossen', label: 'Abgeschlossen' },
  ];

  if (!laden && fehler) {
    return (
      <Page>
        <Page.Header>
          <Page.Title>Meine Einsaetze</Page.Title>
        </Page.Header>
        <Page.Content>
          <div className="py-20 text-center text-sm text-red-500">{fehler}</div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Meine Einsaetze</Page.Title>
      </Page.Header>
      <Page.Content>

        {!laden && (
          <div className="mb-5 grid grid-cols-3 gap-3">
            <KpiCard
              title="Heute"
              value={heuteAuftraege.length}
              icon={Calendar}
              iconColor="text-primary-600"
              iconBg="bg-primary-50"
              onClick={function() { setAktFilter(aktFilter === 'heute' ? 'alle' : 'heute'); }}
            />
            <KpiCard
              title="Offen"
              value={offeneAuftraege.length}
              icon={Clock}
              iconColor="text-warning-600"
              iconBg="bg-warning-50"
              onClick={function() { setAktFilter(aktFilter === 'offen' ? 'alle' : 'offen'); }}
            />
            <KpiCard
              title="Fertig"
              value={abgeschlosseneAuftraege.length}
              icon={CheckCircle}
              iconColor="text-success-600"
              iconBg="bg-success-50"
              onClick={function() { setAktFilter(aktFilter === 'abgeschlossen' ? 'alle' : 'abgeschlossen'); }}
            />
          </div>
        )}

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Einsaetze durchsuchen..."
            className="pl-9"
            value={suchbegriff}
            onChange={function(e) { setSuchbegriff(e.target.value); }}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTER_BUTTONS.map(function(f) {
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

        {ohneProfilHinweis && (
          <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
            Kein Mitarbeiterprofil gefunden. Es werden alle Firmen-Auftraege angezeigt.
          </div>
        )}

        {(aktFilter === 'alle' || aktFilter === 'heute') && (
          <Sektion
            titel="Heute"
            auftraege={heuteAuftraege}
            icon={Calendar}
            emptyText="Keine Einsaetze fuer heute geplant."
            onKlick={auftragKlick}
            laden={laden}
          />
        )}

        {(aktFilter === 'alle' || aktFilter === 'offen') && (
          <Sektion
            titel="Offen & In Bearbeitung"
            auftraege={offeneAuftraege}
            icon={Clock}
            emptyText="Keine offenen Einsaetze."
            onKlick={auftragKlick}
            laden={laden}
          />
        )}

        {(aktFilter === 'alle' || aktFilter === 'abgeschlossen') && (
          <Sektion
            titel="Abgeschlossen"
            auftraege={abgeschlosseneAuftraege}
            icon={CheckCircle}
            emptyText="Keine abgeschlossenen Einsaetze."
            onKlick={auftragKlick}
            laden={laden}
          />
        )}

      </Page.Content>
    </Page>
  );
}
