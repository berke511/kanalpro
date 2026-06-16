'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';

const PLANS = [
  {
    name: 'Starter',
    preis: '29',
    id: 'starter',
    highlight: false,
    features: [
      'Unbegrenzte Kunden & Aufträge',
      'Rechnungen mit PDF-Export',
      'Firmendaten & Steuerdaten',
      'E-Mail & Telefon-Support',
      'DSGVO-konform (EU-Server)',
    ],
  },
  {
    name: 'Pro',
    preis: '59',
    id: 'pro',
    highlight: true,
    features: [
      'Alles aus Starter',
      'Bis zu 5 Benutzer / Techniker',
      'Foto-Upload bei Aufträgen',
      'Wartungsverträge & Erinnerungen',
      'Prioritäts-Support',
    ],
  },
];

export default function Upgrade() {
  const router = useRouter();
  const [abo, setAbo] = useState(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('abonnements').select('*').eq('user_id', user.id).single();
      setAbo(data);
      setLaden(false);
    }
    load();
  }, [router]);

  function trialTage() {
    if (!abo?.trial_end) return 0;
    const diff = new Date(abo.trial_end) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  if (laden) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Wird geladen...</p></div>;

  const tage = trialTage();
  const istAktiv = abo?.status === 'aktiv';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <span className="font-bold text-lg">KanalPro</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Zurück zum Dashboard</Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Status-Banner */}
        {!istAktiv && tage > 0 && (
          <div className={`mb-10 px-6 py-4 rounded-2xl text-center border ${tage > 7 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
            <p className={`font-semibold text-lg ${tage > 7 ? 'text-blue-700' : 'text-orange-700'}`}>
              {tage > 7 ? '' : ''} Noch {tage} {tage === 1 ? 'Tag' : 'Tage'} kostenlose Testphase
            </p>
            <p className={`text-sm mt-1 ${tage > 7 ? 'text-blue-500' : 'text-orange-500'}`}>
              Wähle einen Plan um nach der Testphase nahtlos weiterzumachen.
            </p>
          </div>
        )}

        {!istAktiv && tage === 0 && (
          <div className="mb-10 px-6 py-4 rounded-2xl text-center bg-red-50 border border-red-100">
            <p className="font-semibold text-lg text-red-700">Deine Testphase ist abgelaufen</p>
            <p className="text-sm text-red-500 mt-1">Wähle einen Plan um KanalPro weiterzunutzen.</p>
          </div>
        )}

        {istAktiv && (
          <div className="mb-10 px-6 py-4 rounded-2xl text-center bg-green-50 border border-green-100">
            <p className="font-semibold text-lg text-green-700">Dein Abo ist aktiv</p>
            <p className="text-sm text-green-500 mt-1">
              Plan: {abo?.plan === 'pro' ? 'Pro' : 'Starter'}
            </p>
          </div>
        )}

        {/* Überschrift */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Einfache Preise, volle Kontrolle</h1>
          <p className="text-xl text-gray-500">14 Tage kostenlos testen — danach ohne Risiko kündbar</p>
        </div>

        {/* Pläne */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {PLANS.map(plan => (
            <div key={plan.id}
              className={`bg-white rounded-2xl p-8 border-2 ${plan.highlight ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-gray-100'}`}>
              {plan.highlight && (
                <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                  EMPFOHLEN
                </span>
              )}
              <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
              <div className="mt-3 mb-6">
                <span className="text-4xl font-bold text-gray-900">{plan.preis} €</span>
                <span className="text-gray-400 ml-1">/Monat</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {/* Stripe Payment Link wird hier eingefügt */}
              <button
                onClick={() => alert('Stripe-Zahlung wird in Kürze freigeschaltet. Kontakt: support@kanalpro.de')}
                className={`w-full py-3 rounded-xl font-semibold transition ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {istAktiv ? 'Plan wechseln' : plan.name + ' wählen'}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h3 className="font-bold text-gray-900 text-lg mb-6">Häufige Fragen</h3>
          <div className="space-y-5">
            {[
              { f: 'Kann ich jederzeit kündigen?', a: 'Ja — du kannst monatlich kündigen, ohne Mindestlaufzeit.' },
              { f: 'Was passiert nach der Testphase?', a: 'Du wählst einfach einen Plan. Ohne Abo werden die Daten für 30 Tage gespeichert.' },
              { f: 'Wie läuft die Zahlung ab?', a: 'Sicher über Stripe — Kreditkarte, SEPA-Lastschrift oder PayPal.' },
              { f: 'Sind meine Daten DSGVO-konform?', a: 'Ja — alle Daten liegen auf EU-Servern in Frankfurt.' },
            ].map(item => (
              <div key={item.f}>
                <p className="font-medium text-gray-900 text-sm">{item.f}</p>
                <p className="text-gray-500 text-sm mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          Sichere Zahlung · Jederzeit kündbar · DSGVO-konform · Made in Germany
        </p>
      </div>
    </div>
  );
}
