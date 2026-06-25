'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PlanGate from '@/components/PlanGate';

const statusConfig = {
  entwurf:  { label: 'Entwurf',  cls: 'bg-gray-100 text-gray-600'   },
  gesendet: { label: 'Gesendet', cls: 'bg-blue-50 text-blue-700'    },
  bezahlt:  { label: 'Bezahlt',  cls: 'bg-green-50 text-green-700'  },
  mahnung:  { label: 'Mahnung',  cls: 'bg-orange-50 text-orange-600'},
};

export default function Rechnungen() {
  const router = useRouter();
  const [tab, setTab] = useState('liste');
  const [rechnungen, setRechnungen] = useState([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: rech } = await supabase
        .from('rechnungen')
        .select('*, kunden(name)')
        .eq('user_id', user.id)
        .order('erstellt_am', { ascending: false });
      setRechnungen(rech ?? []);
      setLaden(false);
    }
    load();
  }, []);

  function brutto(r) {
    const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + r.steuersatz / 100);
  }

  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const mahnungen = rechnungen.filter(r =>
    r.status !== 'bezahlt' && r.faellig_am && new Date(r.faellig_am) < heute
  ).sort((a, b) => new Date(a.faellig_am) - new Date(b.faellig_am));

  async function handleGemahnt(id) {
    await supabase.from('rechnungen').update({ status: 'mahnung' }).eq('id', id);
    setRechnungen(prev => prev.map(r => r.id === id ? { ...r, status: 'mahnung' } : r));
  }

  return (
    <PlanGate feature="rechnungen">
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
        {tab === 'liste' && (
          <Link href="/dashboard/rechnungen/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">+ Neue Rechnung</Link>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {[
          { key: 'liste',     label: 'Rechnungen' },
          { key: 'mahnungen', label: 'Mahnungen'  },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'liste' && (
        laden ? <p className="text-gray-400">Wird geladen...</p> : rechnungen.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Noch keine Rechnungen</p>
            <p className="text-sm mt-1">Erstelle deine erste Rechnung.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Nummer</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Datum</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Betrag (brutto)</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rechnungen.map(r => {
                  const cfg = statusConfig[r.status] ?? statusConfig.entwurf;
                  return (
                    <tr key={r.id} onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)} className="hover:bg-gray-50 transition cursor-pointer">
                      <td className="px-5 py-3 font-mono font-medium text-gray-900">{r.rechnungsnummer}</td>
                      <td className="px-5 py-3 text-gray-500">{r.kunden?.name ?? '–'}</td>
                      <td className="px-5 py-3 text-gray-500">{r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '–'}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{brutto(r).toFixed(2).replace('.', ',')} €</td>
                      <td className="px-5 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>{cfg.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'mahnungen' && (
        laden ? <p className="text-gray-400">Wird geladen...</p> : mahnungen.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">Keine überfälligen Rechnungen</p>
            <p className="text-sm mt-1">Alle Rechnungen sind bezahlt oder noch nicht fällig.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-1">{mahnungen.length} überfällige Rechnung{mahnungen.length !== 1 ? 'en' : ''}</p>
            {mahnungen.map(r => {
              const tage = Math.max(0, Math.floor((new Date() - new Date(r.faellig_am)) / 86400000));
              const cfg = statusConfig[r.status] ?? statusConfig.gesendet;
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-medium text-gray-900">{r.rechnungsnummer}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${cfg.cls}`}>{cfg.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600 font-medium">{tage} Tag{tage !== 1 ? 'e' : ''} überfällig</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {r.kunden?.name ?? '–'} · {brutto(r).toFixed(2).replace('.', ',')} € · Fällig: {new Date(r.faellig_am).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status !== 'mahnung' && (
                      <button
                        onClick={() => handleGemahnt(r.id)}
                        className="text-xs px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg font-medium hover:bg-orange-100 transition">
                        Mahnung setzen
                      </button>
                    )}
                    <button
                      onClick={() => router.push('/dashboard/rechnungen/' + r.id)}
                      className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition">
                      Öffnen →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
    </PlanGate>
  );
}
