'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Users, Truck, Wrench } from 'lucide-react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';

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

var FZ_STATUS_LABELS = {
  aktiv: 'Aktiv',
  wartung: 'Wartung',
  reserviert: 'Reserviert',
  ausser_betrieb: 'Ausser Betrieb',
};
var FZ_STATUS_VARIANTEN = {
  aktiv: 'success',
  wartung: 'warning',
  reserviert: 'info',
  ausser_betrieb: 'danger',
};

var MAS_STATUS_LABELS = {
  aktiv: 'Aktiv',
  in_einsatz: 'Im Einsatz',
  wartung: 'Wartung',
  defekt: 'Defekt',
  ausser_betrieb: 'Ausser Betrieb',
};
var MAS_STATUS_VARIANTEN = {
  aktiv: 'success',
  in_einsatz: 'warning',
  wartung: 'info',
  defekt: 'danger',
  ausser_betrieb: 'default',
};

function RessourceRow({ name, subtitle, statusLabel, statusVariant, checked, onToggle }) {
  return (
    <div
      className={
        'flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer transition-all ' +
        (checked
          ? 'border-primary-300 bg-primary-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50')
      }
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          onClick={function(e) { e.stopPropagation(); }}
          className="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          {subtitle ? (
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="ml-3 flex-shrink-0">
        <Badge variant={statusVariant || 'default'}>{statusLabel}</Badge>
      </div>
    </div>
  );
}

function SektionKarte({ titel, icon: Icon, anzahlSel, anzahlGes, children }) {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-primary-600 flex-shrink-0" />
          <Card.Title>{titel}</Card.Title>
        </div>
        <Card.Description>
          {anzahlSel + ' von ' + anzahlGes + ' ausgewaehlt'}
        </Card.Description>
      </Card.Header>
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}

export default function DispositionDetail() {
  var params = useParams();
  var router = useRouter();
  var auftragId = params.id;

  var [laden, setLaden] = useState(true);
  var [speicLaden, setSpeicLaden] = useState(false);
  var [fehler, setFehler] = useState(null);
  var [auftrag, setAuftrag] = useState(null);
  var [mitarbeiter, setMitarbeiter] = useState([]);
  var [fahrzeuge, setFahrzeuge] = useState([]);
  var [maschinen, setMaschinen] = useState([]);
  var [selMitarbeiter, setSelMitarbeiter] = useState({});
  var [selFahrzeuge, setSelFahrzeuge] = useState({});
  var [selMaschinen, setSelMaschinen] = useState({});

  useEffect(function() {
    var alive = true;
    async function load() {
      try {
        var authRes = await supabase.auth.getUser();
        var user = authRes.data && authRes.data.user;
        if (!user) {
          if (alive) { setFehler('Nicht angemeldet.'); setLaden(false); }
          return;
        }

        var memberRes = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        var cId = memberRes.data && memberRes.data.company_id;
        if (!cId) {
          if (alive) { setFehler('Keine Firma gefunden.'); setLaden(false); }
          return;
        }

        var aufRes = await supabase
          .from('auftraege')
          .select('id, titel, datum, status, kunden(name, firmenname)')
          .eq('id', auftragId)
          .eq('company_id', cId)
          .single();

        var maRes = await supabase
          .from('mitarbeiter')
          .select('id, vorname, nachname, status')
          .eq('company_id', cId)
          .order('nachname');

        var fzRes = await supabase
          .from('fahrzeuge')
          .select('id, kennzeichen, marke, modell, zustand')
          .eq('company_id', cId)
          .order('kennzeichen');

        var masRes = await supabase
          .from('maschinen')
          .select('id, name, typ, zustand')
          .eq('company_id', cId)
          .order('name');

        var amRes = await supabase
          .from('auftrag_mitarbeiter')
          .select('mitarbeiter_id')
          .eq('auftrag_id', auftragId);

        var amsRes = await supabase
          .from('auftrag_maschinen')
          .select('maschinen_id')
          .eq('auftrag_id', auftragId);

        var fzIds = {};
        try {
          var afzRes = await supabase
            .from('auftrag_fahrzeuge')
            .select('fahrzeug_id')
            .eq('auftrag_id', auftragId);
          if (afzRes.data) {
            afzRes.data.forEach(function(r) { fzIds[r.fahrzeug_id] = true; });
          }
        } catch (e) { /* auftrag_fahrzeuge may not exist */ }

        if (alive) {
          setAuftrag(aufRes.data);
          setMitarbeiter(maRes.data ?? []);
          setFahrzeuge(fzRes.data ?? []);
          setMaschinen(masRes.data ?? []);

          var maIds = {};
          if (amRes.data) {
            amRes.data.forEach(function(r) { maIds[r.mitarbeiter_id] = true; });
          }
          setSelMitarbeiter(maIds);

          var masIds = {};
          if (amsRes.data) {
            amsRes.data.forEach(function(r) { masIds[r.maschinen_id] = true; });
          }
          setSelMaschinen(masIds);

          setSelFahrzeuge(fzIds);
          setLaden(false);
        }
      } catch (err) {
        if (alive) { setFehler('Fehler beim Laden.'); setLaden(false); }
      }
    }
    load();
    return function() { alive = false; };
  }, [auftragId]);

  function toggleMitarbeiter(id) {
    setSelMitarbeiter(function(prev) {
      var next = Object.assign({}, prev);
      if (next[id]) { delete next[id]; } else { next[id] = true; }
      return next;
    });
  }

  function toggleFahrzeug(id) {
    setSelFahrzeuge(function(prev) {
      var next = Object.assign({}, prev);
      if (next[id]) { delete next[id]; } else { next[id] = true; }
      return next;
    });
  }

  function toggleMaschine(id) {
    setSelMaschinen(function(prev) {
      var next = Object.assign({}, prev);
      if (next[id]) { delete next[id]; } else { next[id] = true; }
      return next;
    });
  }

  async function speichern() {
    setSpeicLaden(true);
    setFehler(null);
    try {
      await supabase
        .from('auftrag_mitarbeiter')
        .delete()
        .eq('auftrag_id', auftragId);

      var maInserts = Object.keys(selMitarbeiter).map(function(id) {
        return { auftrag_id: auftragId, mitarbeiter_id: id };
      });
      if (maInserts.length > 0) {
        await supabase.from('auftrag_mitarbeiter').insert(maInserts);
      }

      await supabase
        .from('auftrag_maschinen')
        .delete()
        .eq('auftrag_id', auftragId);

      var masInserts = Object.keys(selMaschinen).map(function(id) {
        return { auftrag_id: auftragId, maschinen_id: id };
      });
      if (masInserts.length > 0) {
        await supabase.from('auftrag_maschinen').insert(masInserts);
      }

      try {
        await supabase
          .from('auftrag_fahrzeuge')
          .delete()
          .eq('auftrag_id', auftragId);
        var fzInserts = Object.keys(selFahrzeuge).map(function(id) {
          return { auftrag_id: auftragId, fahrzeug_id: id };
        });
        if (fzInserts.length > 0) {
          await supabase.from('auftrag_fahrzeuge').insert(fzInserts);
        }
      } catch (e) { /* auftrag_fahrzeuge may not exist */ }

      setSpeicLaden(false);
      router.push('/dashboard-v2/disposition');
    } catch (err) {
      setSpeicLaden(false);
      setFehler('Fehler beim Speichern: ' + ((err && err.message) || 'Unbekannter Fehler'));
    }
  }

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Ressourcenzuweisung</Page.Title></Page.Header>
        <Page.Content>
          <div className="py-20 text-center text-sm text-gray-400">Laedt...</div>
        </Page.Content>
      </Page>
    );
  }

  if (!auftrag && !fehler) {
    return (
      <Page>
        <Page.Header><Page.Title>Ressourcenzuweisung</Page.Title></Page.Header>
        <Page.Content>
          <div className="py-20 text-center text-sm text-gray-400">Auftrag nicht gefunden.</div>
        </Page.Content>
      </Page>
    );
  }

  var kName = auftrag && auftrag.kunden
    ? (auftrag.kunden.firmenname || auftrag.kunden.name || '')
    : '';
  var auftragTitel = auftrag ? (auftrag.titel || '—') : '—';

  return (
    <Page>
      <Page.Header>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={function() { router.push('/dashboard-v2/disposition'); }}
          >
            <ArrowLeft size={16} />
            Disposition
          </Button>
          <div>
            <Page.Title>Ressourcenzuweisung</Page.Title>
            <p className="text-sm text-gray-500">
              {auftragTitel}{kName ? ' · ' + kName : ''}
            </p>
          </div>
        </div>
      </Page.Header>
      <Page.Content>

        {fehler ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fehler}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <SektionKarte
            titel="Mitarbeiter"
            icon={Users}
            anzahlSel={Object.keys(selMitarbeiter).length}
            anzahlGes={mitarbeiter.length}
          >
            {mitarbeiter.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">
                Keine Mitarbeiter vorhanden.
              </div>
            ) : (
              <div className="space-y-2">
                {mitarbeiter.map(function(m) {
                  var name = ((m.vorname || '') + ' ' + (m.nachname || '')).trim() || '—';
                  return (
                    <RessourceRow
                      key={m.id}
                      name={name}
                      statusLabel={MA_STATUS_LABELS[m.status] || m.status}
                      statusVariant={MA_STATUS_VARIANTEN[m.status] || 'default'}
                      checked={!!selMitarbeiter[m.id]}
                      onToggle={function() { toggleMitarbeiter(m.id); }}
                    />
                  );
                })}
              </div>
            )}
          </SektionKarte>

          <SektionKarte
            titel="Fahrzeuge"
            icon={Truck}
            anzahlSel={Object.keys(selFahrzeuge).length}
            anzahlGes={fahrzeuge.length}
          >
            {fahrzeuge.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">
                Keine Fahrzeuge vorhanden.
              </div>
            ) : (
              <div className="space-y-2">
                {fahrzeuge.map(function(f) {
                  var name = f.kennzeichen || '—';
                  var sub = ((f.marke || '') + ' ' + (f.modell || '')).trim();
                  return (
                    <RessourceRow
                      key={f.id}
                      name={name}
                      subtitle={sub || null}
                      statusLabel={FZ_STATUS_LABELS[f.zustand] || f.zustand}
                      statusVariant={FZ_STATUS_VARIANTEN[f.zustand] || 'default'}
                      checked={!!selFahrzeuge[f.id]}
                      onToggle={function() { toggleFahrzeug(f.id); }}
                    />
                  );
                })}
              </div>
            )}
          </SektionKarte>

          <SektionKarte
            titel="Maschinen"
            icon={Wrench}
            anzahlSel={Object.keys(selMaschinen).length}
            anzahlGes={maschinen.length}
          >
            {maschinen.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">
                Keine Maschinen vorhanden.
              </div>
            ) : (
              <div className="space-y-2">
                {maschinen.map(function(m) {
                  var name = m.name || '—';
                  var sub = m.typ || null;
                  return (
                    <RessourceRow
                      key={m.id}
                      name={name}
                      subtitle={sub}
                      statusLabel={MAS_STATUS_LABELS[m.zustand] || m.zustand}
                      statusVariant={MAS_STATUS_VARIANTEN[m.zustand] || 'default'}
                      checked={!!selMaschinen[m.id]}
                      onToggle={function() { toggleMaschine(m.id); }}
                    />
                  );
                })}
              </div>
            )}
          </SektionKarte>

        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={function() { router.push('/dashboard-v2/disposition'); }}
          >
            Abbrechen
          </Button>
          <Button variant="primary" loading={speicLaden} onClick={speichern}>
            <Save size={16} />
            Zuweisung speichern
          </Button>
        </div>

      </Page.Content>
    </Page>
  );
}
