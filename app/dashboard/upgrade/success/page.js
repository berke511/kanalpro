'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';
import { Suspense } from 'react';

function SuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const planId = params.get('plan') || 'pro';
  const plan = PLANS[planId];
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); router.push('/dashboard'); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-lg border border-gray-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {plan?.emoji} {plan?.name} aktiviert!
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Dein {plan?.name}-Plan ist jetzt aktiv. Du erhältst eine Bestätigungsmail.
        </p>
        <div className="bg-green-50 rounded-xl p-4 mb-6">
          <p className="text-green-700 text-sm font-medium">
            Zahlung erfolgreich verarbeitet
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          Zum Dashboard → ({countdown}s)
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Lädt…</p></div>}>
      <SuccessContent />
    </Suspense>
  );
}