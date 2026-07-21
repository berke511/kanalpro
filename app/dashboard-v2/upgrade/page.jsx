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

var EMPFOHLENER_PLAN = 'pro';

var FAQ_ITEMS = [
  { frage: 'Kann ich jederzeit kündigen?', antwort: 'Ja — du kannst monatlich kündigen, ohne Mindestlaufzeit.' },
  { frage: 'Was passiert nach der Testphase?', antwort: 'Du wählst einen Plan. Ohne Abo werden die Daten für 30 Tage gespeichert.' },
  { frage: 'Wie läuft die Zahlung ab?', antwort: 'Sicher über Stripe — Kreditkarte, SEPA-Lastschrift oder PayPal.' },
  { frage: 'Sind meine Daten DSGVO-konform?', antwort: 'Ja — alle Daten liegen auf EU-Servern in Frankfurt.' },
  { frage: 'Kann ich den Plan jederzeit wechseln?', antwort: 'Ja — Upgrades werden sofort wirksam, Downgrades zum Ende des Abrechnungszeitraums.' },
];

export default function UpgradePage() {
  var router = useRouter();
  var [abo, setAbo] = useState(null);
  var [laden, setLaden] = useState(true);
  var [fehler, setFehler] = useState(false);

  useEffect(function() {
    async function aboLaden() {
      try {
        var authResult = await supabase.auth.getUser();
        var user = authResult.data && authResult.data.user;
        if (!user) { router.push('/login'); return; }

        var memberResult = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (memberResult.error || !(memberResult.data && memberResult.data.company_id)) {
          setFehler(true); setLaden(false); return;
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
          <Page.Title>Plan wählen</Page.Title>
          <Page.Description>Alle verfügbaren KanalPro-Pläne im Überblick.</Page.Description>
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
          <Page.Title>Plan wählen</Page.Title>
          <Page.Description>Alle verfügbaren KanalPro-Pläne im Überblick.</Page.Description>
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
  var aktiverPlanName = PLANS[sub.plan] ? PLANS[sub.plan].name : 'Starter';

  return (
    <Page>
      <Page.Header>
        <Page.Title>Plan wählen</Page.Title>
        <Page.Description>
          {sub.isPaid
            ? 'Wechsle deinen Plan oder behalte deinen aktuellen.'
            : '14 Tage kostenlos testen — danach ohne Risiko kündbar.'}
        </Page.Description>
      </Page.Header>
      <Page.Content>

        {/* Status-Banner */}
        {sub.isTrialActive && (
          <div className={'px-6 py-4 rounded-xl text-center border ' + (sub.daysLeft <= 7 ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100')}>
            <p className={'font-semibold ' + (sub.daysLeft <= 7 ? 'text-orange-700' : 'text-blue-700')}>
              {'Noch ' + String(sub.daysLeft) + (sub.daysLeft === 1 ? ' Tag' : ' Tage') + ' kostenlose Testphase'}
            </p>
            <p className={'text-sm mt-1 ' + (sub.daysLeft <= 7 ? 'text-orange-500' : 'text-blue-500')}>
              Wähle einen Plan um nach der Testphase nahtlos weiterzumachen.
            </p>
          </div>
        )}

        {sub.isExpired && (
          <div className="px-6 py-4 rounded-xl text-center bg-red-50 border border-red-100">
            <p className="font-semibold text-red-700">Deine Testphase ist abgelaufen</p>
            <p className="text-sm text-red-500 mt-1">Wähle einen Plan um KanalPro weiterzunutzen.</p>
          </div>
        )}

        {sub.isPaid && (
          <div className="px-6 py-4 rounded-xl text-center bg-green-50 border border-green-100">
            <p className="font-semibold text-green-700">Dein Abo ist aktiv</p>
            <p className="text-sm text-green-500 mt-1">{'Aktueller Plan: ' + aktiverPlanName}</p>
          </div>
        )}

        {/* Plan-Karten */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLAN_ORDER.map(function(planId) {
            var plan = PLANS[planId];
            var istAktuell = planId === sub.plan;
            var istEmpfohlen = planId === EMPFOHLENER_PLAN;
            var istEnterprise = planId === 'enterprise';
            var ringClass = istEmpfohlen ? ' ring-2 ring-blue-500' : (istAktuell ? ' ring-2 ring-green-500' : '');
            return (
              <Card key={planId} className={ringClass}>
                <Card.Header>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Card.Title>{plan.name}</Card.Title>
                    <div className="flex gap-1 flex-wrap">
                      {istEmpfohlen && <Badge variant="info">Empfohlen</Badge>}
                      {istAktuell && (
                        <Badge variant="success">
                          {sub.isTrialActive ? 'Testphase' : 'Dein Plan'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Card.Description>{plan.beschreibung}</Card.Description>
                </Card.Header>
                <Card.Content>
                  <div className="mb-4">
                    {istEnterprise
                      ? <p className="text-xl font-bold text-gray-900">Auf Anfrage</p>
                      : plan.preis === 0
                        ? <p className="text-xl font-bold text-gray-900">Kostenlos</p>
                        : (
                          <div>
                            <span className="text-xl font-bold text-gray-900">{String(plan.preis) + ' €'}</span>
                            <span className="text-gray-400 text-sm ml-1">/Monat</span>
                          </div>
                        )
                    }
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
                    <div className="w-full py-2 rounded-lg text-center text-xs font-semibold bg-green-50 text-green-700">
                      {sub.isTrialActive ? 'Kostenlose Testphase' : 'Aktiver Plan'}
                    </div>
                  ) : istEnterprise ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={function() { router.push('/dashboard-v2/billing'); }}
                    >
                      Kontakt aufnehmen
                    </Button>
                  ) : (
                    <Button
                      variant={istEmpfohlen ? 'primary' : 'secondary'}
                      size="sm"
                      className="w-full"
                      onClick={function() { router.push('/dashboard-v2/billing'); }}
                    >
                      {sub.isPaid ? ('Zu ' + plan.name + ' wechseln') : (plan.name + ' wählen')}
                    </Button>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <Card>
          <Card.Header><Card.Title>Häufige Fragen</Card.Title></Card.Header>
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
