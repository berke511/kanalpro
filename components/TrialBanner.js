'use client';
import Link from 'next/link';

// TrialBanner — Zeigt oben im Dashboard an, wie viele Tage die Testphase noch läuft.
// Props:
//   daysLeft     (number)  — verbleibende Tage
//   isTrialActive (bool)   — ist die Testphase noch aktiv?
//   isExpired    (bool)    — ist die Testphase abgelaufen?
//   plan         (string)  — aktueller Plan
//   upgradeHref  (string)  — Link zum Upgrade (Standard: /dashboard/billing)

export default function TrialBanner({
  daysLeft = 0,
  isTrialActive = false,
  isExpired = false,
  plan = 'starter',
  upgradeHref = '/dashboard/billing',
}) {
  const warnung = isTrialActive && daysLeft <= 7;

  // Trial aktiv
  if (isTrialActive && daysLeft > 0) {
    return (
      <div
        className={`px-6 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-3 ${
          warnung ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
        }`}
      >
        <span>
          {warnung ? '⚠️' : '🎉'}{' '}
          Noch {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tage'} kostenlose Testphase —{' '}
          <strong>Enterprise</strong>
        </span>
        <Link
          href={upgradeHref}
          className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-50 transition"
        >
          Jetzt upgraden
        </Link>
      </div>
    );
  }

  // Trial abgelaufen, Starter-Plan aktiv
  if (!isTrialActive && !isExpired && plan === 'starter') {
    return (
      <div className="px-6 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-3 bg-gray-700 text-white">
        <span>
          📦 Du nutzt den <strong>Starter-Plan</strong> — einige Funktionen sind gesperrt
        </span>
        <Link
          href={upgradeHref}
          className="bg-white text-gray-800 px-3 py-1 rounded-lg text-xs font-bold hover:bg-gray-100 transition"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return null;
}
