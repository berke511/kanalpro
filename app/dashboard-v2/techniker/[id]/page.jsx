'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Clock, MapPin, User, Truck, Wrench, FileText, Plus, Save, Package, ClipboardList, MessageSquare } from 'lucide-react';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';
import Select from '@/components/ui/v2/Select';
import Dialog from '@/components/ui/v2/Dialog';
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

var STATUS_WORKFLOW = ['geplant', 'unterwegs', 'vor_ort', 'in_bearbeitung', 'abgeschlossen'];

var TABS = ['Uebersicht', 'Material', 'Taetigkeiten', 'Notizen', 'Dokumente'];

var EINHEITEN = ['Stk.', 'Meter', 'Liter', 'kg', 'Rollen', 'Paar', 'Set', 'h'];

function datumFormatieren(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch (e) {
    return iso;
  }
}

function zeitFormatieren(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return iso;
  }
}

function naechsterStatus(aktuell) {
  var idx = STATUS_WORKFLOW.indexOf(aktuell);
  if (idx >= 0 && idx < STATUS_WORKFLOW.length - 1) {
    return STATUS_WORKFLOW[idx + 1];
  }
  return null;
}

export default function TechnikerEinsatzDetail() {
  var params = useParams();
  var router = useRouter();
  var auftragId = params.id;

  var [laden, setLaden] = useState(true);
  var [fehler, setFehler] = useState(null);
  var [auftrag, setAuftrag] = useState(null);
  var [mitarbeiter, setMitarbeiter] = useState([]);
  var [fahrzeuge, setFahrzeuge] = useState([]);
  var [maschinen, setMaschinen] = useState([]);
  var [companyId, setCompanyId] = useState(null);

  var [aktTab, setAktTab] = useState('Uebersicht');

  var [statusLaden, setStatusLaden] = useState(false);
  var [showAbschlussDialog, setShowAbschlussDialog] = useState(false);
  var [abschlussLaden, setAbschlussLaden] = useState(false);

  var [materialListe, setMaterialListe] = useState([]);
  var [verbrauch, setVerbrauch] = useState([]);
  var [verbrauchLaden, setVerbrauchLaden] = useState(true);
  var [matSelId, setMatSelId] = useState('');
  var [matMenge, setMatMenge] = useState('');
  var [matEinheit, setMatEinheit] = useState('Stk.');
  var [matSpeichern, setMatSpeichern] = useState(false);

  var [taetigkeiten, setTaetigkeiten] = useState([]);
  var [taetLaden, setTaetLaden] = useState(true);
  var [taetText, setTaetText] = useState('');
  var [taetSpeichern, setTaetSpeichern] = useState(false);

  var [notizen, setNotizen] = useState([]);
  var [notizenLaden, setNotizenLaden] = useState(true);
  var [notizText, setNotizText] = useState('');
  var [notizSpeichern, setNotizSpeichern] = useState(false);

  useEffect(function() {
    var alive = true;

    async function init() {
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
        if (alive) setCompanyId(cId);

        var aufRes = await supabase
          .from('auftraege')
          .select('id, titel, beschreibung, status, datum, adresse, prioritaet, kunden(id, name, firmenname, telefon, ansprechpartner), verantw_mitarbeiter:verantw_mitarbeiter_id(vorname, nachname)')
          .eq('id', auftragId)
          .eq('company_id', cId)
          .single();

        var amRes = await supabase
          .from('auftrag_mitarbeiter')
          .select('id, mitarbeiter_id, mitarbeiter(vorname, nachname)')
          .eq('auftrag_id', auftragId);

        var masRes = await supabase
          .from('auftrag_maschinen')
          .select('id, maschinen_id, maschinen(name, typ)')
          .eq('auftrag_id', auftragId);

        var fzData = [];
        var fzRes = await supabase
          .from('auftrag_fahrzeuge')
          .select('id, fahrzeug_id, fahrzeuge(kennzeichen, marke)')
          .eq('auftrag_id', auftragId);
        if (!fzRes.error) {
          fzData = fzRes.data || [];
        }

        var matRes = await supabase
          .from('materialien')
          .select('id, name, einheit')
          .eq('company_id', cId)
          .order('name');

        if (alive) {
          setAuftrag(aufRes.data || null);
          setMitarbeiter(amRes.data || []);
          setMaschinen(masRes.data || []);
          setFahrzeuge(fzData);
          setMaterialListe(matRes.data || []);
          setLaden(false);
        }

        ladeVerbrauch(auftragId, alive);
        ladeTaetigkeiten(auftragId, alive);
        ladeNotizen(auftragId, alive);

      } catch (err) {
        if (alive) { setFehler('Fehler beim Laden.'); setLaden(false); }
      }
    }

    init();
    return function() { alive = false; };
  }, [auftragId]);

  async function ladeVerbrauch(aid, alive) {
    var res = await supabase
      .from('auftrag_materialverbrauch')
      .select('id, material_name, menge, einheit, created_at')
      .eq('auftrag_id', aid)
      .order('created_at', { ascending: false });
    if ((alive === undefined || alive === null || alive === true) && !res.error) {
      setVerbrauch(res.data || []);
    }
    if (alive === undefined || alive === null || alive === true) {
      setVerbrauchLaden(false);
    }
  }

  async function ladeTaetigkeiten(aid, alive) {
    var res = await supabase
      .from('auftrag_taetigkeiten')
      .select('id, beschreibung, created_at')
      .eq('auftrag_id', aid)
      .order('created_at', { ascending: false });
    if ((alive === undefined || alive === null || alive === true) && !res.error) {
      setTaetigkeiten(res.data || []);
    }
    if (alive === undefined || alive === null || alive === true) {
      setTaetLaden(false);
    }
  }

  async function ladeNotizen(aid, alive) {
    var res = await supabase
      .from('auftrag_notizen')
      .select('id, text, created_at')
      .eq('auftrag_id', aid)
      .order('created_at', { ascending: false });
    if ((alive === undefined || alive === null || alive === true) && !res.error) {
      setNotizen(res.data || []);
    }
    if (alive === undefined || alive === null || alive === true) {
      setNotizenLaden(false);
    }
  }

  async function statusAendern(neuerStatus) {
    if (!auftrag || statusLaden) return;
    setStatusLaden(true);
    var res = await supabase
      .from('auftraege')
      .update({ status: neuerStatus })
      .eq('id', auftragId)
      .select('status')
      .single();
    if (res.data) {
      setAuftrag(function(prev) {
        return Object.assign({}, prev, { status: neuerStatus });
      });
    }
    setStatusLaden(false);
  }

  async function auftragAbschliessen() {
    setAbschlussLaden(true);
    var now = new Date().toISOString();
    var res = await supabase
      .from('auftraege')
      .update({ status: 'abgeschlossen', abgeschlossen_am: now })
      .eq('id', auftragId)
      .select('status')
      .single();
    if (res.error) {
      await supabase
        .from('auftraege')
        .update({ status: 'abgeschlossen' })
        .eq('id', auftragId);
    }
    setAuftrag(function(prev) {
      return Object.assign({}, prev, { status: 'abgeschlossen' });
    });
    setAbschlussLaden(false);
    setShowAbschlussDialog(false);
  }

  async function materialHinzufuegen() {
    if (!matMenge || !matSelId) return;
    setMatSpeichern(true);
    var gefunden = materialListe.find(function(m) { return m.id === matSelId; });
    var matName = gefunden ? gefunden.name : matSelId;
    await supabase
      .from('auftrag_materialverbrauch')
      .insert({
        auftrag_id: auftragId,
        company_id: companyId,
        material_id: matSelId,
        material_name: matName,
        menge: parseFloat(matMenge) || 0,
        einheit: matEinheit,
      });
    setMatSelId('');
    setMatMenge('');
    setMatEinheit('Stk.');
    ladeVerbrauch(auftragId, undefined);
    setMatSpeichern(false);
  }

  async function taetSpeichernFn() {
    if (!taetText.trim()) return;
    setTaetSpeichern(true);
    await supabase
      .from('auftrag_taetigkeiten')
      .insert({
        auftrag_id: auftragId,
        company_id: companyId,
        beschreibung: taetText.trim(),
      });
    setTaetText('');
    ladeTaetigkeiten(auftragId, undefined);
    setTaetSpeichern(false);
  }

  async function notizSpeichernFn() {
    if (!notizText.trim()) return;
    setNotizSpeichern(true);
    await supabase
      .from('auftrag_notizen')
      .insert({
        auftrag_id: auftragId,
        company_id: companyId,
        text: notizText.trim(),
      });
    setNotizText('');
    ladeNotizen(auftragId, undefined);
    setNotizSpeichern(false);
  }

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Einsatz</Page.Title></Page.Header>
        <Page.Content>
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-xl bg-gray-100" />
            <div className="h-12 rounded-xl bg-gray-100" />
            <div className="h-48 rounded-xl bg-gray-100" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (fehler || !auftrag) {
    return (
      <Page>
        <Page.Header><Page.Title>Einsatz</Page.Title></Page.Header>
        <Page.Content>
          <div className="py-20 text-center text-sm text-red-500">{fehler || 'Auftrag nicht gefunden.'}</div>
        </Page.Content>
      </Page>
    );
  }

  var kundeAnzeige = auftrag.kunden
    ? (auftrag.kunden.firmenname || auftrag.kunden.name || '—')
    : '—';
  var kundeTelefon = auftrag.kunden ? auftrag.kunden.telefon : null;
  var statusLabel = STATUS_LABELS[auftrag.status] || auftrag.status || '—';
  var statusVariant = STATUS_VARIANTEN[auftrag.status] || 'default';
  var nextStatus = naechsterStatus(auftrag.status);
  var istAbgeschlossen = auftrag.status === 'abgeschlossen';
  var istInBearbeitung = auftrag.status === 'in_bearbeitung';

  return (
    <Page>
      <Page.Header>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={function() { router.push('/dashboard-v2/techniker'); }}
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="min-w-0 flex-1">
            <Page.Title className="truncate">{auftrag.titel || 'Einsatz'}</Page.Title>
            <p className="text-sm text-gray-500 truncate">{kundeAnzeige}</p>
          </div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </Page.Header>
      <Page.Content>

        <Card className="mb-4">
          <Card.Content>
            {auftrag.adresse && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin size={15} className="mt-0.5 flex-shrink-0 text-gray-400" />
                <span>{auftrag.adresse}</span>
              </div>
            )}
            {auftrag.datum && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Clock size={15} className="flex-shrink-0 text-gray-400" />
                <span>{datumFormatieren(auftrag.datum)}</span>
              </div>
            )}
            {kundeTelefon && (
              <div className="mt-2">
                <a
                  href={'tel:' + kundeTelefon}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600"
                >
                  {kundeTelefon} anrufen
                </a>
              </div>
            )}
          </Card.Content>
        </Card>

        {!istAbgeschlossen && nextStatus && (
          <div className="mb-4">
            {istInBearbeitung ? (
              <Button
                variant="primary"
                className="w-full min-h-[52px] text-base"
                loading={statusLaden}
                onClick={function() { setShowAbschlussDialog(true); }}
              >
                <CheckCircle size={18} />
                Auftrag abschliessen
              </Button>
            ) : (
              <Button
                variant="primary"
                className="w-full min-h-[52px] text-base"
                loading={statusLaden}
                onClick={function() { statusAendern(nextStatus); }}
              >
                {STATUS_LABELS[nextStatus] + ' →'}
              </Button>
            )}
          </div>
        )}

        {istAbgeschlossen && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3">
            <CheckCircle size={18} className="flex-shrink-0 text-success-600" />
            <div>
              <p className="text-sm font-semibold text-success-700">Auftrag abgeschlossen</p>
              <p className="text-xs text-success-600">Bereit fuer Rechnungserstellung</p>
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-0 overflow-x-auto border-b border-gray-200">
          {TABS.map(function(tab) {
            return (
              <button
                key={tab}
                onClick={function() { setAktTab(tab); }}
                className={
                  'min-w-max px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
                  (aktTab === tab
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700')
                }
              >
                {tab}
              </button>
            );
          })}
        </div>

        {aktTab === 'Uebersicht' && (
          <div className="space-y-4">
            {auftrag.beschreibung && (
              <Card>
                <Card.Header><Card.Title>Beschreibung</Card.Title></Card.Header>
                <Card.Content>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{auftrag.beschreibung}</p>
                </Card.Content>
              </Card>
            )}
            <Card>
              <Card.Header><Card.Title>Team & Ressourcen</Card.Title></Card.Header>
              <Card.Content>
                {mitarbeiter.length === 0 && fahrzeuge.length === 0 && maschinen.length === 0 ? (
                  <p className="text-sm text-gray-400">Keine Ressourcen zugewiesen.</p>
                ) : (
                  <div className="space-y-4">
                    {mitarbeiter.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Mitarbeiter</p>
                        <div className="space-y-1.5">
                          {mitarbeiter.map(function(m) {
                            var name = m.mitarbeiter
                              ? ((m.mitarbeiter.vorname || '') + ' ' + (m.mitarbeiter.nachname || '')).trim()
                              : m.mitarbeiter_id;
                            return (
                              <div key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                                <User size={13} className="flex-shrink-0 text-gray-400" />
                                {name || '—'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {fahrzeuge.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Fahrzeuge</p>
                        <div className="space-y-1.5">
                          {fahrzeuge.map(function(f) {
                            var name = f.fahrzeuge
                              ? ((f.fahrzeuge.kennzeichen || '') + (f.fahrzeuge.marke ? ' — ' + f.fahrzeuge.marke : ''))
                              : f.fahrzeug_id;
                            return (
                              <div key={f.id} className="flex items-center gap-2 text-sm text-gray-700">
                                <Truck size={13} className="flex-shrink-0 text-gray-400" />
                                {name || '—'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {maschinen.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Maschinen</p>
                        <div className="space-y-1.5">
                          {maschinen.map(function(m) {
                            var name = m.maschinen
                              ? (m.maschinen.name || m.maschinen.typ || '')
                              : m.maschinen_id;
                            return (
                              <div key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                                <Wrench size={13} className="flex-shrink-0 text-gray-400" />
                                {name || '—'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        )}

        {aktTab === 'Material' && (
          <div className="space-y-4">
            <Card>
              <Card.Header><Card.Title>Material erfassen</Card.Title></Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <Select
                    label="Material"
                    value={matSelId}
                    onChange={function(e) { setMatSelId(e.target.value); }}
                    placeholder="Material auswaehlen"
                  >
                    {materialListe.map(function(m) {
                      return <option key={m.id} value={m.id}>{m.name}</option>;
                    })}
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      label="Menge"
                      type="number"
                      placeholder="0"
                      value={matMenge}
                      onChange={function(e) { setMatMenge(e.target.value); }}
                    />
                    <Select
                      label="Einheit"
                      value={matEinheit}
                      onChange={function(e) { setMatEinheit(e.target.value); }}
                    >
                      {EINHEITEN.map(function(e) {
                        return <option key={e} value={e}>{e}</option>;
                      })}
                    </Select>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full min-h-[48px]"
                    loading={matSpeichern}
                    onClick={materialHinzufuegen}
                  >
                    <Plus size={16} />
                    Hinzufuegen
                  </Button>
                </div>
              </Card.Content>
            </Card>
            <Card>
              <Card.Header><Card.Title>Verbrauch</Card.Title></Card.Header>
              <Card.Content>
                {verbrauchLaden ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-10 rounded bg-gray-100" />
                    <div className="h-10 rounded bg-gray-100" />
                  </div>
                ) : verbrauch.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Kein Verbrauch erfasst"
                    description="Verwendetes Material hier eintragen."
                  />
                ) : (
                  <div className="space-y-2">
                    {verbrauch.map(function(v) {
                      return (
                        <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                          <span className="text-sm text-gray-900">{v.material_name}</span>
                          <span className="text-sm font-medium text-gray-700">{v.menge} {v.einheit}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        )}

        {aktTab === 'Taetigkeiten' && (
          <div className="space-y-4">
            <Card>
              <Card.Header><Card.Title>Taetigkeit dokumentieren</Card.Title></Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <textarea
                    className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[100px]"
                    placeholder="Was wurde gemacht?"
                    value={taetText}
                    onChange={function(e) { setTaetText(e.target.value); }}
                  />
                  <Button
                    variant="primary"
                    className="w-full min-h-[48px]"
                    loading={taetSpeichern}
                    onClick={taetSpeichernFn}
                  >
                    <Save size={16} />
                    Speichern
                  </Button>
                </div>
              </Card.Content>
            </Card>
            <Card>
              <Card.Header><Card.Title>Dokumentiert</Card.Title></Card.Header>
              <Card.Content>
                {taetLaden ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-12 rounded bg-gray-100" />
                  </div>
                ) : taetigkeiten.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="Keine Taetigkeiten"
                    description="Dokumentieren Sie was waehrend des Einsatzes gemacht wurde."
                  />
                ) : (
                  <div className="space-y-3">
                    {taetigkeiten.map(function(t) {
                      return (
                        <div key={t.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{t.beschreibung}</p>
                          {t.created_at && (
                            <p className="mt-1 text-xs text-gray-400">{zeitFormatieren(t.created_at)}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        )}

        {aktTab === 'Notizen' && (
          <div className="space-y-4">
            <Card>
              <Card.Header><Card.Title>Notiz hinzufuegen</Card.Title></Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <textarea
                    className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[100px]"
                    placeholder="Notiz eingeben..."
                    value={notizText}
                    onChange={function(e) { setNotizText(e.target.value); }}
                  />
                  <Button
                    variant="primary"
                    className="w-full min-h-[48px]"
                    loading={notizSpeichern}
                    onClick={notizSpeichernFn}
                  >
                    <Save size={16} />
                    Speichern
                  </Button>
                </div>
              </Card.Content>
            </Card>
            <Card>
              <Card.Header><Card.Title>Notizen</Card.Title></Card.Header>
              <Card.Content>
                {notizenLaden ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-12 rounded bg-gray-100" />
                  </div>
                ) : notizen.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="Keine Notizen"
                    description="Wichtige Beobachtungen und Hinweise hier festhalten."
                  />
                ) : (
                  <div className="space-y-3">
                    {notizen.map(function(n) {
                      return (
                        <div key={n.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.text}</p>
                          {n.created_at && (
                            <p className="mt-1 text-xs text-gray-400">{zeitFormatieren(n.created_at)}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        )}

        {aktTab === 'Dokumente' && (
          <Card>
            <Card.Content>
              <EmptyState
                icon={FileText}
                title="Dokumente"
                description="Unterschrift und Dokumenten-Upload werden in einem spaeteren Sprint ergaenzt."
              />
            </Card.Content>
          </Card>
        )}

      </Page.Content>

      <Dialog
        open={showAbschlussDialog}
        onClose={function() { setShowAbschlussDialog(false); }}
        size="sm"
      >
        <Dialog.Header>
          <Dialog.Title>Auftrag abschliessen?</Dialog.Title>
          <Dialog.Description>
            Der Auftrag wird als abgeschlossen markiert. Anschliessend kann eine Rechnung erstellt werden.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button
            variant="secondary"
            onClick={function() { setShowAbschlussDialog(false); }}
          >
            Abbrechen
          </Button>
          <Button
            variant="primary"
            loading={abschlussLaden}
            onClick={auftragAbschliessen}
          >
            <CheckCircle size={16} />
            Abschliessen
          </Button>
        </Dialog.Footer>
      </Dialog>

    </Page>
  );
}
