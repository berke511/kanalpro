'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { checkAndDowngrade, getSubscriptionStatus } from '@/lib/subscription';
import { getPlan } from '@/lib/plans';

function formatMb(mb) {
  if (mb === null || mb === undefined) return '∞';
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

// StorageBar — zeigt Speicherverbrauch vs. Plan-Limit
// Verwendung: <StorageBar /> auf billing/einstellungen
export default function StorageBar({ compact = false }) {
  const [data, setData] = useState(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLaden(false); return; }

      // Plan & Limit
      const abo = await checkAndDowngrade(supabase, user.id);
      const sub = getSubscriptionStatus(abo);
      const plan = getPlan(sub.plan);
      const limitMb = plan.limits.speicher_mb === Infinity ? null : plan.limits.speicher_mb;

      // Verwendeten Speicher aus dokumente-Tabelle lesen
      const { data: docs } = await supabase
        .from('dokumente')
        .select('groesse_bytes')
        .eq('user_id', user.id);

      const usedBytes = (docs ?? []).reduce((s, d) => s + (d.groesse_bytes || 0), 0);
      const usedMb = usedBytes / (1024 * 1024);
      const percent = limitMb ? Math.min(100, (usedMb / limitMb) * 100) : 0;

      setData({ usedMb, limitMb, percent, planName: plan.name, planId: sub.plan });
      setLaden(false);
    }
    load();
  }, []);

  if (laden || !data) {
    return <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />;
  }

  const { usedMb, limitMb, percent, planName, planId } = data;
  const barColor =
    percent >= 90 ? 'bg-red-500' :
    percent >= 70 ? 'bg-amber-500' :
    'bg-blue-500';

  const isUnlimited = limitMb === null;

  if (compact) {
    return (
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>💾 Speicher</span>
          <span>{formatMb(Math.round(usedMb))} / {isUnlimited ? '∞' : formatMb(limitMb)}</span>
        </div>
        {!isUnlimited && (
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">💾 Speicher</h3>
          <p className="text-xs text-gray-400 mt-0.5">Plan: {planName}</p>
        </div>
        <span className="text-sm font-medium text-gray-700">
          {formatMb(Math.round(usedMb * 10) / 10)} / {isUnlimited ? 'Unbegrenzt' : formatMb(limitMb)}
        </span>
      </div>

      {isUnlimited ? (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5">
          <span>✓</span>
          <span>Unbegrenzter Speicher in deinem Plan</span>
        </div>
      ) : (
        <>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
            <div
              className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-3">
            <span>{percent.toFixed(1)}% belegt</span>
            <span>{formatMb(limitMb - Math.round(usedMb))} frei</span>
          </div>

          {percent >= 90 && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <span>⚠️</span>
              <div>
                <p className="font-medium">Speicher fast voll</p>
                <p className="text-xs text-red-500 mt-0.5">
                  Upgrade für mehr Speicher oder lösche nicht benötigte Dokumente.
                </p>
              </div>
            </div>
          )}

          {percent >= 70 && percent < 90 && (
            <div className="bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <span>ℹ️</span>
              <p>Speicher zu {percent.toFixed(0)}% belegt.</p>
            </div>
          )}

          {percent >= 90 && (
            <Link
              href="/dashboard/billing"
              className="mt-3 block w-full text-center py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              ⭐ Mehr Speicher — Plan upgraden
            </Link>
          )}
        </>
      )}
    </div>
  );
}
