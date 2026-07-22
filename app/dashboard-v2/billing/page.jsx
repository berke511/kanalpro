'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus } from '@/lib/subscription';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Badge from '@/components/ui/v2/Badge';
import Button from '@/components/ui/v2/Button';

var STATUS_BADGE = {
  trial: 'info',
  aktiv: 'success',
  abgelaufen: 'danger',
  zahlung_fehlgeschlagen: 'warning',
  free: 'default',
};

var STATUS_LABEL = {
  trial: 'Testphase aktiv',
  aktiv: 'Aktiv',
  abgelaufen: 'Abgelaufen',
  zahlung_fehlgeschlagen: 'Zahlung fehlgeschlagen',
  free: 'Kostenlos',
};

var FAQ_ITEMS = [
  {
    frage: 'Kann ich jederzeit kündigen?',
    antwort: 'Ja — du kannst monatlich kündigen, ohne Mindestlaufzeit.',
  },
  {
    frage: 'Was passiert nach der Testphase?',
    antwort: 'Du wählst einen Plan. Ohne Abo wird der Account auf Starter herabgestuft.',
  },
  {
    frage: 'Wie läuft die Zahlung ab?',
    antwort: 'Sicher über Stripe — Kreditkarte, SEPA-Lastschrift oder PayPal.',
  },
  {
    frage: 'Sind meine Daten DSGVO-konform?',
    antwort: 'Ja — alle Daten liegen auf EU-Servern in Frankfurt.',
  },
  {
    frage: 'Was ist im Enterprise-Plan ethalten?',
    antwort: 'Unbegrenzte Nutzer, API-Zugang, dedizierter Support und SLA. Schreib uns für ein individuelles Angebot.',
  },
  {
    frage: 'Kann ich den Plan jederzeit wechseln?',
    antwort: 'Ja — Upgrades werden sofort wirksam, Downgrades zum Ende des Abrechnungszeitraums.',
  },
];

export default function BillingPage() {
  var router = useRouter();
  var [abo, setAbo] = useState(null);
  var [laden, setLaden] = useState(true);
  var [fehler, setFehler] = useState(false);

  useEffect(function() {
    async function aboLaden() {
      try {
        var authResult = await supabase.auth.getUser();
        var user = authResult.data && authResult.data.user;
        if (!user) {
          router.push('/login');
          return;
        }

        var memberResult = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (memberResult.error || !(memberResult.data && memberResult.data.company_id)) {
          setFehler(true);
          setLaden(false);
          return;
        }

        var aboData = await checkAndDowngrade(supabase, user.id);
        setAbo(aboData);
      } catch (err) {
        setFehler(true);
      }
      setLaden(false);
    }
    aboLaden();
  }, []);

  if (laden) {
    return (
      <Page>
        <Page.Header>
          <Page.Title>Abonnement & Billing</Page.Title>
          <Page.Description>Verwalte deinen Plan und dein Abonnement.</Page.Description>
        </Page.Header>
        <Page.Content>
          <p className="text-sm text-gray-400">Wird geladen...</p>
        </Page.Content>
      </Page>
    );
  }

  if (fehler) {
    return (
      <Page>
        <Page.Header>
          <Page.Title>Abonnement & Billing</Page.Title>
          <Page.Description>Verwalte deinen Plan und dein Abonnement.</Page.Description>
        </Page.Header>
        <Page.Content>
          <Card>
            <Card.Content>
              <p className="text-sm text-red-500">Daten konnten nicht geladen werden.</p>
            </Card.Content>
          </Card>
        </Page.Content>
      </Page>
    );
  }

  var sub = getSubscriptionStatus(abo);
  var aktiverPlan = PLANS[sub.plan] || PLANS.starter;
  var statusBadgeVariant = STATUS_BADGE[sub.status] || 'default';
  var statusBadgeLabel = STATUS_LABEL[sub.status] || sub.status;

  var trialEndDatum = '';
  if (sub.trialEnd) {
    var d = new Date(sub.trialEnd);
    trialEndDatum = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  return (
    <Page>
      <Page.Header>
        <Page.Title>Abonnement & Billing</Page.Title>
        <Page.Description>Verwalte deinen Plan und sieh dir alle verfügbaren Optionen an.</Page.Description>
      </Page.Header>
      <Page.Content>

        {/* Status-Karte */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <Card.Title>Aktueller Plan</Card.Title>
              <Badge variant={statusBadgeVariant}>{statusBadgeLabel}</Badge>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{aktiverPlan.name}</p>
                <p className="text-sm text-gray-500 mt-1">{aktiverPlan.beschreibung}</p>
                {sub.isTrialActive && (
                  <p className={'text-sm mt-2 font-medium ' + (sub.daysLeft <= 7 ? 'text-orange-600' : 'text-blue-600')}>
                    {String(sub.daysLeft) + (sub.daysLeft === 1 ? ' Tag' : ' Tage') + ' Testphase verbleibend'}
                  </p>
                )}
                {sub.isExpired && (
                  <p className="text-sm mt-2 text-red-600 font-medium">
                    Testphase abgelaufen — bitte wähle einen Plan
                  </p>
                )}
                {sub.isPaid && (
                  <p className="text-sm mt-2 text-green-600 font-medium">Abo aktiv</p>
                )}
              </div>
              {trialEndDatum ? (
                <div className="text-sm text-gray-500">
                  <p>Testphase endet: <strong>{trialEndDatum}</strong></p>
                </div>
              ) : null}
            </div>
          </Card.Content>
        </Card>

        {/* Plan-Übersicht */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {sub.isPaid ? 'Plan wechseln' : 'Plan auswählen'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLAN_ORDER.map(function(planId) {
              var plan = PLANS[planId];
              var istAktuell = planId === sub.plan;
              var istEnterprise = planId === 'enterprise';
              var ringClass = istAktuell ? ' ring-2 ring-blue-500' : '';
              return (
                <Card key={planId} className={ringClass}>
                  <Card.Header>
                    <div className="flex items-center justify-between">
                      <Card.Title>{plan.name}</Card.Title>
                      {istAktuell && (
                        <Badge variant="info">
                          {sub.isTrialActive ? 'Testphase' : 'Dein Plan'}
                        </Badge>
                      )}
                    </div>
                    <Card.Description>{plan.beschreibung}</Card.Description>
                  </Card.Header>
                  <Card.Content>
                    <div className="mb-4">
                      {istEnterprise ? (
                        <p className="text-xl font-bold text-gray-900">Auf Anfrage</p>
                      ) : plan.preis === 0 ? (
                        <p className="text-xl font-bold text-gray-900">Kostenlos</p>
                      ) : (
                        <div>
                          <span className="text-xl font-bold text-gray-900">{String(plan.preis) + ' €'}</span>
                          <span className="text-gray-400 text-sm ml-1">/Monat</span>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-5">
                      {plan.featureListe.slice(0, 5).map(function(f) {
                        return (
                          <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                            {f}
                          </li>
                        );
                      })}
                    </ul>
                    {istAktuell ? (
                      <div className="w-full py-2 rounded-lg text-center text-xs font-semibold bg-blue-50 text-blue-700">
                        {sub.isTrialActive ? 'Kostenlose Testphase' : 'Aktiver Plan'}
                      </div>
                    ) : istEnterprise ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={function() { router.push('/dashboard-v2/upgrade'); }}
                      >
                        Kontakt aufnehmen
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={function() { router.push('/dashboard-v2/upgrade'); }}
                      >
                        {plan.name + ' wählen'}
                      </Button>
                    )}
                  </Card.Content>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <Card>
          <Card.Header>
            <Card.Title>Häufige Fragen</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid sm:grid-cols-2 gap-5">
              {FAQ_ITEMS.map(function(item) {
                return (
                  <div key={item.frage}>
                    <p className="font-medium text-gray-900 text-sm">{item.frage}</p>
                    <p className="text-gray-500 text-sm mt-1">{item.antwort}</p>
                  </div>
                );
              })}
            </div>
          </Card.Content>
        </Card>

        <p className="text-center text-gray-400 text-xs">
          Sichere Zahlung · Jederzeit kündbar · DSGVO-konform · Made in Germany
        </p>

      </Page.Content>
    </Page>
  );
}
