'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus } from '@/lib/subscription';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import StorageBar from '@/components/StorageBar';

// ── Hilfs-Komponente: Plan-Karte ─────────────────────────────────────────────
function PlanCard({ plan, isAktuell, isTrialing }) {
  const istEnterprise = plan.id === 'enterprise';
  const hervorheben = plan.highlight && !isAktuell;

  return (
    <div
      className={`relative bg-white rounded-2xl p-7 border-2 flex flex-col transition ${
        isAktuell
          ? 'border-blue-500 shadow-lg shadow-blue-100'
          : hervorheben
          ? 'border-blue-300 shadow-md'
          : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      {/* Badge */}
      {isAktuell && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
          {isTrialing ? 'AKTUELLE TESTPHASE' : 'DEIN PLAN'}
        </span>
      )}
      {hervorheben && !isAktuell && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-700 text-xs font-bold px-4 py-1 rounded-full">
          EMPFOHLEN
        </span>
      )}

      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
      <p className="text-sm text-gray-500 mt-1 mb-4">{plan.beschreibung}</p>

      {/* Preis */}
      <div className="mb-5">
        {istEnterprise ? (
          <span className="text-2xl font-bold text-gray-900">Auf Anfrage</span>
        ) : (
          <>
            <span className="text-3xl font-bold text-gray-900">{plan.preis} €</span>
            <span className="text-gray-400 text-sm ml-1">/Monat</span>
          </>
        )}
      </div>

      {/* Feature-Liste */}
      <ul className="space-y-2 mb-7 flex-1">
        {plan.featureListe.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-green-500 mt-0.5 shrink-0"></span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isAktuell ? (
        <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-blue-50 text-blue-700">
          {isTrialing ? ' Kostenlose Testphase' : ' Aktiver Plan'}
        </div>
      ) : istEnterprise ? (
        <a
          href="mailto:support@kanalpro.de?subject=Enterprise%20Anfrage"
          className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition block"
        >
          Kontakt aufnehmen
        </a>
      ) : (
        <button
          onClick={() =>
            alert(
              'Stripe-Zahlung wird in Kürze freigeschaltet.\nKontakt: support@kanalpro.de'
            )
          }
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
            hervorheben
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {plan.name} wählen
        </button>
      )}
    </div>
  );
}

// ── Hauptseite ───────────────────────────────────────────────────────────────
export default function BillingPage() {
  const router = useRouter();
  const [abo, setAbo] = useState(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const aboData = await checkAndDowngrade(supabase, user.id);
      setAbo(aboData);
      setLaden(false);
    }
    load();
  }, [router]);

  const sub = getSubscriptionStatus(abo);
  const { isTrialActive, isExpired, daysLeft, plan, isPaid } = sub;

  if (laden)
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-400 text-sm">Wird geladen…</p>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Seitentitel ──────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Verwalte deinen Plan und sieh dir alle verfügbaren Optionen an.
        </p>
      </div>

      {/* ── Status-Karte ─────────────────────────────────────────── */}
      <div
        className={`rounded-2xl p-6 mb-8 border ${
          isTrialActive && daysLeft > 7
            ? 'bg-blue-50 border-blue-100'
            : isTrialActive && daysLeft <= 7
            ? 'bg-orange-50 border-orange-100'
            : isExpired
            ? 'bg-red-50 border-red-100'
            : isPaid
            ? 'bg-green-50 border-green-100'
            : 'bg-gray-50 border-gray-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Aktueller Plan
            </p>
            <p className="text-xl font-bold text-gray-900">
              {PLANS[plan]?.name ?? 'Starter'}
              {isTrialActive && (
                <span className="ml-2 text-sm font-normal text-blue-600">
                  (Kostenlose Testphase)
                </span>
              )}
            </p>
            {isTrialActive && (
              <p
                className={`text-sm mt-1 font-medium ${
                  daysLeft <= 7 ? 'text-orange-600' : 'text-blue-600'
                }`}
              >
                Noch{' '}
                <strong>
                  {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tage'}
                </strong>{' '}
                kostenlos testen
              </p>
            )}
            {isExpired && (
              <p className="text-sm mt-1 text-red-600 font-medium">
                Testphase abgelaufen — bitte wähle einen Plan
              </p>
            )}
            {isPaid && (
              <p className="text-sm mt-1 text-green-600 font-medium">
                Abo aktiv
              </p>
            )}
          </div>

          {(isTrialActive || isExpired) && (
            <div className="text-sm text-gray-500">
              <p>
                Testphase endet:{' '}
                <strong>
                  {abo?.trial_end
                    ? new Date(abo.trial_end).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Speicher ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <StorageBar />
      </div>

      {/* ── Plan-Karten ──────────────────────────────────────────── */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {isPaid ? 'Plan wechseln' : 'Plan auswählen'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {PLAN_ORDER.map((planId) => (
          <PlanCard
            key={planId}
            plan={PLANS[planId]}
            isAktuell={planId === plan}
            isTrialing={isTrialActive && planId === plan}
          />
        ))}
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-7">
        <h3 className="font-bold text-gray-900 text-base mb-5">Häufige Fragen</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            {
              f: 'Kann ich jederzeit kündigen?',
              a: 'Ja — du kannst monatlich kündigen, ohne Mindestlaufzeit.',
            },
            {
              f: 'Was passiert nach der Testphase?',
              a: 'Du wählst einen Plan. Ohne Abo wird der Account auf Starter herabgestuft.',
            },
            {
              f: 'Wie läuft die Zahlung ab?',
              a: 'Sicher über Stripe — Kreditkarte, SEPA-Lastschrift oder PayPal.',
            },
            {
              f: 'Sind meine Daten DSGVO-konform?',
              a: 'Ja — alle Daten liegen auf EU-Servern in Frankfurt.',
            },
            {
              f: 'Was ist im Enterprise-Plan enthalten?',
              a: 'Unbegrenzte Nutzer, API-Zugang, dedizierter Support und SLA. Schreib uns für ein individuelles Angebot.',
            },
            {
              f: 'Kann ich den Plan jederzeit wechseln7?',
              a: 'Ja — Upgrades werden sofort wirksam, Downgrades zum Ende des Abrechnungszeitraums.',
            },
          ].map((item) => (
            <div key={item.f}>
              <p className="font-medium text-gray-900 text-sm">{item.f}</p>
              <p className="text-gray-500 text-sm mt-1">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-gray-400 text-xs mt-6">
        Sichere Zahlung · Jederzeit kündbar · DSGVO-konform · Made in Germany
      </p>
    </div>
  );
}
